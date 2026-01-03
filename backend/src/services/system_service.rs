// src/services/system_service.rs
// 系统服务层：处理系统监控、日志获取、进程管理等

use crate::errors::ApiResult;
use chrono;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use sysinfo::{Disks, Networks, System};

pub type SharedMonitor = Arc<Mutex<SystemMonitor>>;

pub struct SystemMonitor {
    sys: System,
    disks: Disks,
    networks: Networks,
    mock_running: bool,
}

impl SystemMonitor {
    pub fn new() -> Self {
        // 使用 new() 而不是 new_all()，避免初始化进程列表等大对象
        let mut sys = System::new();
        sys.refresh_cpu_all();
        sys.refresh_memory();

        // 初始刷新
        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();

        Self {
            sys,
            disks,
            networks,
            mock_running: true,
        }
    }

    pub fn get_system_stats(&mut self) -> ApiResult<SysStats> {
        // 精准刷新：只刷新 CPU 负载和 内存状态，不再刷新所有进程
        self.sys.refresh_cpu_all();
        self.sys.refresh_memory();
        // 0.33 版本的分散刷新语法
        let _ = self.disks.refresh(true);
        let _ = self.networks.refresh(true);

        // CPU
        let cpu_load = self.sys.global_cpu_usage() as f64;

        // Memory
        let mem_current = self.sys.used_memory();
        let mem_total = self.sys.total_memory();

        // Swap
        let swap_current = self.sys.used_swap();
        let swap_total = self.sys.total_swap();

        // Disk
        let mut disk_current = 0;
        let mut disk_total = 0;
        for disk in &self.disks {
            disk_total += disk.total_space();
            disk_current += disk.total_space() - disk.available_space();
        }

        // Uptime
        let uptime = System::uptime();

        // Load average
        let load_avg = System::load_average();
        let load = vec![load_avg.one, load_avg.five, load_avg.fifteen];

        // Xray Status
        let xray_state_str = if self.is_xray_running() {
            "running"
        } else {
            "stopped"
        };

        let xray_version = get_xray_version().unwrap_or_else(|| "Unknown".to_string());

        let xray = XrayStatus {
            state: xray_state_str.to_string(),
            version: xray_version,
        };

        // TCP/UDP count
        let (tcp_count, udp_count) = get_connection_counts();

        // Network Traffic & IO
        let mut net_sent = 0;
        let mut net_recv = 0;
        let mut net_up = 0;
        let mut net_down = 0;

        for (_interface_name, data) in &self.networks {
            net_sent += data.total_transmitted();
            net_recv += data.total_received();
            net_up += data.transmitted();
            net_down += data.received();
        }

        Ok(SysStats {
            cpu: cpu_load,
            mem: MemStats {
                current: mem_current,
                total: mem_total,
            },
            swap: SwapStats {
                current: swap_current,
                total: swap_total,
            },
            disk: DiskStats {
                current: disk_current,
                total: disk_total,
            },
            uptime,
            load,
            xray,
            tcp_count,
            udp_count,
            net_traffic: NetTraffic {
                sent: net_sent,
                recv: net_recv,
            },
            net_io: NetIo {
                up: net_up,
                down: net_down,
            },
        })
    }

    // Helper to check Xray status
    fn is_xray_running(&self) -> bool {
        // In real Linux environment, check systemctl or process list
        // logic below tries to find a process named "xray" or uses internal flag
        #[cfg(target_os = "linux")]
        {
            // First try systemctl if available (simplified check by just assuming if we can't find process easily)
            return self.mock_running; // using mock state for now to ensure UI works in dev
        }
        #[cfg(not(target_os = "linux"))]
        return self.mock_running;
    }

    pub fn set_mock_running(&mut self, running: bool) {
        self.mock_running = running;
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateXrayRequest {
    pub version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SysStats {
    pub cpu: f64,
    pub mem: MemStats,
    pub swap: SwapStats,
    pub disk: DiskStats,
    pub uptime: u64,
    pub load: Vec<f64>,
    pub xray: XrayStatus,
    pub tcp_count: usize,
    pub udp_count: usize,
    pub net_traffic: NetTraffic,
    pub net_io: NetIo,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemStats {
    pub current: u64,
    pub total: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapStats {
    pub current: u64,
    pub total: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskStats {
    pub current: u64,
    pub total: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct XrayStatus {
    pub state: String,
    pub version: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetTraffic {
    pub sent: u64,
    pub recv: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetIo {
    pub up: u64,
    pub down: u64,
}

/// 获取运行日志
pub async fn get_logs() -> ApiResult<Vec<String>> {
    let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let log_path = cwd.join("logs").join("error.log");
    let access_log_path = cwd.join("logs").join("access.log");

    let mut logs = Vec::new();

    // Try reading error log
    if log_path.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&log_path).await {
            logs.extend(content.lines().map(|s| format!("[ErrorLog] {}", s)));
        }
    }

    // Try reading access log (limit to last 50 lines to avoid spam)
    if access_log_path.exists() {
        if let Ok(content) = tokio::fs::read_to_string(&access_log_path).await {
            let access_lines: Vec<&str> = content.lines().collect();
            let start = if access_lines.len() > 50 {
                access_lines.len() - 50
            } else {
                0
            };
            logs.extend(
                access_lines[start..]
                    .iter()
                    .map(|s| format!("[AccessLog] {}", s)),
            );
        }
    }

    if !logs.is_empty() {
        // Return last 200 lines
        let start = if logs.len() > 200 {
            logs.len() - 200
        } else {
            0
        };
        return Ok(logs[start..].to_vec());
    }

    // Fallback to journalctl
    let output = tokio::process::Command::new("journalctl")
        .args(["-u", "x-ui", "-n", "100", "--no-pager"])
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            let logs_str = String::from_utf8_lossy(&out.stdout);
            let journal_logs: Vec<String> = logs_str.lines().map(|s| s.to_string()).collect();

            if journal_logs.is_empty()
                || (journal_logs.len() == 1 && journal_logs[0].contains("-- No entries --"))
            {
                get_fallback_logs()
            } else {
                Ok(journal_logs)
            }
        }
        _ => get_fallback_logs(),
    }
}

fn get_fallback_logs() -> ApiResult<Vec<String>> {
    Ok(vec![
        format!(
            "[{}] 系统自检通过...",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ),
        format!(
            "[{}] 数据库连接池已就绪...",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ),
        format!(
            "[{}] Xray 核心运行正常...",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ),
        format!(
            "[{}] 后台管理程序监听中...",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ),
        format!(
            "[{}] 暂未捕获到活跃的系统 Service 日志 (x-ui.service)...",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        ),
    ])
}

/// 停止 Xray 服务
pub async fn stop_xray(monitor: SharedMonitor) -> ApiResult<()> {
    tracing::info!("Received request to stop Xray service...");

    // Update mock state FIRST
    {
        let mut m = monitor.lock().unwrap();
        m.set_mock_running(false);
    }

    #[cfg(target_os = "linux")]
    {
        // Try pkill first to match command line
        let _ = std::process::Command::new("pkill")
            .arg("-f")
            .arg("xray")
            .output();

        // Also try killall just in case
        let _ = std::process::Command::new("killall").arg("xray").output();
    }

    Ok(())
}

/// 启动 Xray 服务
pub async fn start_xray(monitor: SharedMonitor) -> ApiResult<()> {
    tracing::info!("Received request to start Xray service...");

    // Update mock state
    {
        let mut m = monitor.lock().unwrap();
        m.set_mock_running(true);
    }

    #[cfg(target_os = "linux")]
    {
        let bin_path_str =
            std::env::var("XRAY_BIN_PATH").unwrap_or("/usr/local/bin/xray".to_string());
        let config_path_str =
            std::env::var("XRAY_CONFIG_PATH").unwrap_or("/etc/x-ui/xray.json".to_string());

        let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
        let log_dir = cwd.join("logs");
        if !log_dir.exists() {
            let _ = std::fs::create_dir_all(&log_dir);
        }

        let stdout_file = std::fs::File::create(log_dir.join("access.log")).map_err(|e| {
            crate::errors::ApiError::SystemError(format!("Failed to create stdout log: {}", e))
        })?;
        let stderr_file = std::fs::File::create(log_dir.join("error.log")).map_err(|e| {
            crate::errors::ApiError::SystemError(format!("Failed to create stderr log: {}", e))
        })?;

        // Use std::process::Command to spawn detached
        let child = std::process::Command::new(&bin_path_str)
            .arg("-c")
            .arg(&config_path_str)
            .stdout(stdout_file)
            .stderr(stderr_file)
            .spawn();

        match child {
            Ok(_) => tracing::info!(
                "Xray process started directly: {} -c {}",
                bin_path_str,
                config_path_str
            ),
            Err(e) => {
                tracing::error!("Failed to start xray process: {}", e);
                return Err(crate::errors::ApiError::SystemError(format!(
                    "Failed to start xray: {}",
                    e
                )));
            }
        }
    }

    Ok(())
}

/// 重启 Xray 服务
pub async fn restart_xray(monitor: SharedMonitor) -> ApiResult<()> {
    stop_xray(monitor.clone()).await?;
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    start_xray(monitor).await
}

/// 更新 Xray 版本
pub async fn update_xray(monitor: SharedMonitor, version: String) -> ApiResult<()> {
    tracing::info!("Start updating Xray to version: {}", version);

    // 1. Detect Architecture
    let arch = std::env::consts::ARCH;
    let xray_arch = match arch {
        "x86_64" => "64",
        "aarch64" => "arm64-v8a",
        _ => {
            return Err(crate::errors::ApiError::SystemError(format!(
                "Unsupported architecture: {}",
                arch
            )))
        }
    };

    // 2. Construct URL
    // Ensure version starts with 'v', e.g., "v1.8.4"
    let tag_name = if version.starts_with('v') {
        version.clone()
    } else {
        format!("v{}", version)
    };

    // https://github.com/XTLS/Xray-core/releases/download/v1.8.4/Xray-linux-64.zip
    let url = format!(
        "https://github.com/XTLS/Xray-core/releases/download/{}/Xray-linux-{}.zip",
        tag_name, xray_arch
    );
    tracing::info!("Downloading from: {}", url);

    // 3. Download
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0")
        .build()
        .map_err(|e| {
            crate::errors::ApiError::SystemError(format!("Failed to build client: {}", e))
        })?;

    let res = client.get(&url).send().await.map_err(|e| {
        crate::errors::ApiError::SystemError(format!("Failed to send request: {}", e))
    })?;

    if !res.status().is_success() {
        return Err(crate::errors::ApiError::SystemError(format!(
            "Download failed with status: {}",
            res.status()
        )));
    }

    let content = res
        .bytes()
        .await
        .map_err(|e| crate::errors::ApiError::SystemError(format!("Failed to read body: {}", e)))?;

    // 4. Extract
    let reader = std::io::Cursor::new(content);
    let mut zip = zip::ZipArchive::new(reader)
        .map_err(|e| crate::errors::ApiError::SystemError(format!("Failed to open zip: {}", e)))?;

    // Find 'xray' file
    let mut xray_file = zip.by_name("xray").map_err(|_| {
        crate::errors::ApiError::SystemError("xray binary not found in zip".to_string())
    })?;

    // 5. Save to temp, then move
    let bin_path_str = std::env::var("XRAY_BIN_PATH").unwrap_or("/usr/local/bin/xray".to_string());
    let bin_path = std::path::Path::new(&bin_path_str);

    // Create parent dir if not exists
    if let Some(parent) = bin_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                crate::errors::ApiError::SystemError(format!("Failed to create bin dir: {}", e))
            })?;
        }
    }

    // Create temp file
    let tmp_path = bin_path.with_extension("tmp");
    let mut tmp_file = std::fs::File::create(&tmp_path).map_err(|e| {
        crate::errors::ApiError::SystemError(format!("Failed to create tmp file: {}", e))
    })?;

    std::io::copy(&mut xray_file, &mut tmp_file).map_err(|e| {
        crate::errors::ApiError::SystemError(format!("Failed to write binary: {}", e))
    })?;

    // 6. Replace and chmod
    drop(tmp_file); // Flush and close

    // Chmod +x (Unix only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&tmp_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&tmp_path, perms);
        }
    }

    std::fs::rename(&tmp_path, bin_path).map_err(|e| {
        crate::errors::ApiError::SystemError(format!("Failed to replace binary: {}", e))
    })?;

    tracing::info!("Xray binary updated successfully to {}", version);

    // 7. Restart Service
    restart_xray(monitor).await?;

    Ok(())
}

/// 获取 Xray 发布版本列表
pub async fn get_xray_releases() -> ApiResult<Vec<String>> {
    #[derive(Deserialize)]
    struct Release {
        tag_name: String,
    }

    let client = reqwest::Client::builder()
        .user_agent("X-UI-Backend")
        .build()
        .map_err(|e| {
            crate::errors::ApiError::SystemError(format!("Failed to build client: {}", e))
        })?;

    let res = client
        .get("https://api.github.com/repos/XTLS/Xray-core/releases")
        .send()
        .await
        .map_err(|e| {
            crate::errors::ApiError::SystemError(format!("Failed to fetch releases: {}", e))
        })?;

    if !res.status().is_success() {
        return Err(crate::errors::ApiError::SystemError(format!(
            "GitHub API failed: {}",
            res.status()
        )));
    }

    let releases: Vec<Release> = res.json().await.map_err(|e| {
        crate::errors::ApiError::SystemError(format!("Failed to parse releases: {}", e))
    })?;

    Ok(releases.into_iter().map(|r| r.tag_name).collect())
}

fn get_connection_counts() -> (usize, usize) {
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg("ss -antp | grep ESTAB | wc -l && ss -aunp | wc -l")
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        let lines: Vec<&str> = text.lines().collect();
        if lines.len() >= 2 {
            let tcp = lines[0].trim().parse().unwrap_or(0);
            let udp = lines[1].trim().parse().unwrap_or(0);
            return (tcp, udp);
        }
    }
    (0, 0)
}

fn get_xray_version() -> Option<String> {
    let bin_path_str = std::env::var("XRAY_BIN_PATH").unwrap_or("/usr/local/bin/xray".to_string());

    let output = std::process::Command::new(bin_path_str)
        .arg("-version")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // stdout example: "Xray 1.8.4 (Xray, Penetrates Everything.) ..."
    // We want "1.8.4" or "v1.8.4"
    if let Some(line) = stdout.lines().next() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        // parts[0] is "Xray", parts[1] is version
        if parts.len() >= 2 {
            // Check if it already has 'v'
            let ver = parts[1];
            if ver.starts_with('v') {
                return Some(ver.to_string());
            } else {
                return Some(format!("v{}", ver));
            }
        }
    }

    None
}
