use crate::errors::ApiResult;
use crate::models::inbound::Inbound;
use crate::services::system_service::SharedMonitor;
use crate::services::xray_service;
use sqlx::SqlitePool;
use tokio::process::Command;
use tokio::time::{interval, Duration};

/// 启动流量统计定时任务周期性查询 Xray API
pub fn start_traffic_stats_task(pool: SqlitePool, monitor: SharedMonitor) {
    tokio::spawn(async move {
        // 5s 轮询
        let mut ticker = interval(Duration::from_secs(5));
        loop {
            ticker.tick().await;
            if let Err(e) = update_traffic_stats(&pool, monitor.clone()).await {
                tracing::warn!("Failed to update traffic stats: {:?}", e);
            }
        }
    });
    tracing::info!("Traffic stats task started (polling Xray every 5s)");
}

/// 执行流量统计更新
async fn update_traffic_stats(pool: &SqlitePool, monitor: SharedMonitor) -> ApiResult<()> {
    // 1. 获取所有启用的节点
    let inbounds = sqlx::query_as::<_, Inbound>("SELECT * FROM inbounds WHERE enable = 1")
        .fetch_all(pool)
        .await?;

    if inbounds.is_empty() {
        return Ok(());
    }

    // 2. 获取进程路径 (Xray bin path)
    let xray_bin = std::env::var("XRAY_BIN_PATH").unwrap_or_else(|_| "./bin/xray".to_string());
    let mut needs_reapply = false;

    // TODO: Consider batching API requests if possible, but Xray API is per-pattern usually.
    // However, Xray statsquery supports partial matching.
    // Optimizing: Query ALL inbound stats at once instead of one-by-one per inbound.
    // pattern="" queries all stats.

    let stats_map = query_all_xray_stats(&xray_bin).await.unwrap_or_default();

    if stats_map.is_empty() && !inbounds.is_empty() {
        // If we got no stats, maybe Xray API is down or just started.
        tracing::debug!("No stats retrieved from Xray API");
    }

    for inbound in inbounds {
        // 关键逻辑：获取节点标签
        let tag = inbound
            .tag
            .clone()
            .unwrap_or_else(|| format!("inbound-{}", inbound.id));

        let up_key = format!("inbound>>>{}>>>traffic>>>uplink", tag);
        let down_key = format!("inbound>>>{}>>>traffic>>>downlink", tag);

        let uplink = stats_map.get(&up_key).cloned().unwrap_or(0);
        let downlink = stats_map.get(&down_key).cloned().unwrap_or(0);

        if uplink > 0 || downlink > 0 {
            let new_up = inbound.up + uplink;
            let new_down = inbound.down + downlink;
            let mut enable = 1; // 1 = true (enabled)

            // 检查自动限额
            if inbound.total > 0 && (new_up + new_down) >= inbound.total {
                enable = 0; // Disable node
                needs_reapply = true;
                tracing::info!("Node {} reached traffic quota, disabling.", inbound.remark);
            }

            // 更新数据库
            sqlx::query("UPDATE inbounds SET up = ?, down = ?, enable = ? WHERE id = ?")
                .bind(new_up)
                .bind(new_down)
                .bind(enable)
                .bind(&inbound.id)
                .execute(pool)
                .await?;

            tracing::debug!(
                "Node {} ({}): up={}, down={}, total={}",
                inbound.remark,
                tag,
                new_up,
                new_down,
                inbound.total
            );

            // 稍微停顿，防止突发大量数据库写入锁定
            // tokio::time::sleep(Duration::from_millis(50)).await;
        }
    }

    // 如果因为超限额禁用了节点，重新应用 Xray 配置
    if needs_reapply {
        if let Err(e) = xray_service::apply_config(pool, monitor).await {
            tracing::error!("Failed to reapply config after quota reached: {}", e);
        }
    }

    Ok(())
}

/// 通过 Xray API 查询所有流量并返回 Map
async fn query_all_xray_stats(xray_bin: &str) -> ApiResult<std::collections::HashMap<String, i64>> {
    // pattern="" (empty) matches all stats
    // reset=true will reset the counter after reading
    let output = Command::new(xray_bin)
        .arg("api")
        .arg("statsquery")
        .arg("--server=127.0.0.1:10085")
        .arg("pattern=")
        .arg("reset=true")
        .output()
        .await
        .map_err(|e| {
            crate::errors::ApiError::SystemError(format!("Xray API call failed: {}", e))
        })?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        tracing::error!("Xray API error: {}", err);
        return Ok(std::collections::HashMap::new());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut stats = std::collections::HashMap::new();
    let mut current_name = String::new();

    // Output format is protobuf text format
    // stat: <
    //   name: "..."
    //   value: ...
    // >
    // We need to parse this robustly.

    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("name:") {
            if let Some(name_part) = line.split("name:").nth(1) {
                current_name = name_part.trim().trim_matches('"').to_string();
            }
        } else if line.starts_with("value:") {
            if let Some(value_str) = line.split("value:").nth(1) {
                // value might be followed by '>' if on same line, or not.
                // But typically: value: 123
                let clean_val = value_str.trim().trim_end_matches('>').trim();
                if let Ok(value) = clean_val.parse::<i64>() {
                    if !current_name.is_empty() {
                        stats.insert(current_name.clone(), value);
                    }
                }
            }
        }
    }

    Ok(stats)
}
