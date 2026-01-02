// src/handlers/system.rs
// 系统管理处理函数

use crate::middleware::auth::AuthUser;
use axum::extract::{Json, State};

use crate::{
    errors::ApiResult,
    services::system_service::{self, SharedMonitor},
    utils::response::ApiResponse,
};

/// POST /api/server/sysStats
/// 获取服务器系统状态
pub async fn get_sys_stats(
    State(monitor): State<SharedMonitor>,
    _user: AuthUser,
) -> ApiResult<ApiResponse<system_service::SysStats>> {
    let stats = monitor.lock().unwrap().get_system_stats()?;
    Ok(ApiResponse::success(stats))
}

/// POST /api/server/restartXray
/// 重启Xray服务
pub async fn restart_xray(
    State(monitor): State<SharedMonitor>,
    _user: AuthUser,
) -> ApiResult<ApiResponse<()>> {
    system_service::restart_xray(monitor).await?;
    Ok(ApiResponse::success_no_data("Xray service restarted"))
}

/// POST /api/server/stopXray
/// 停止Xray服务
pub async fn stop_xray(
    State(monitor): State<SharedMonitor>,
    _user: AuthUser,
) -> ApiResult<ApiResponse<()>> {
    system_service::stop_xray(monitor).await?;
    Ok(ApiResponse::success_no_data("Xray service stopped"))
}

/// POST /api/server/startXray
/// 启动Xray服务
pub async fn start_xray(
    State(monitor): State<SharedMonitor>,
    _user: AuthUser,
) -> ApiResult<ApiResponse<()>> {
    system_service::start_xray(monitor).await?;
    Ok(ApiResponse::success_no_data("Xray service started"))
}

/// POST /api/server/updateXray
/// 更新Xray版本
pub async fn update_xray(
    State(monitor): State<SharedMonitor>,
    _user: AuthUser,
    Json(req): Json<system_service::UpdateXrayRequest>,
) -> ApiResult<ApiResponse<()>> {
    system_service::update_xray(monitor, req.version).await?;
    Ok(ApiResponse::success_no_data("Xray update started"))
}

/// POST /api/server/applyConfig
/// 生成配置文件并重启Xray
pub async fn apply_config(
    State(monitor): State<SharedMonitor>,
    axum::Extension(pool): axum::Extension<sqlx::SqlitePool>,
    _user: AuthUser,
) -> ApiResult<ApiResponse<()>> {
    crate::services::xray_service::apply_config(&pool, monitor).await?;
    Ok(ApiResponse::success_no_data(
        "Xray config applied and service restarted",
    ))
}

/// GET /api/server/xrayReleases
/// 获取Xray所有版本
pub async fn get_xray_releases(_user: AuthUser) -> ApiResult<ApiResponse<Vec<String>>> {
    let releases = system_service::get_xray_releases().await?;
    Ok(ApiResponse::success(releases))
}

/// POST /api/server/getLogs
/// 获取系统日志
pub async fn get_logs(_user: AuthUser) -> ApiResult<ApiResponse<Vec<String>>> {
    let logs = system_service::get_logs().await?;
    Ok(ApiResponse::success(logs))
}

/*
/// POST /api/server/backup
/// 备份配置
pub async fn backup(_user: AuthUser) -> ApiResult<ApiResponse<String>> {
    Ok(ApiResponse::success_with_msg(
        "Backup feature active".to_string(),
        "Success",
    ))
}
*/

/// GET /api/server/export-db
/// 导出数据库文件
pub async fn export_db(_user: AuthUser) -> impl axum::response::IntoResponse {
    use axum::body::Body;
    use axum::http::{header, StatusCode};
    use axum::response::IntoResponse;

    let db_path = "data/x-ui.db";

    match tokio::fs::read(db_path).await {
        Ok(contents) => {
            let filename = format!(
                "x-ui_backup_{}.db",
                chrono::Local::now().format("%Y%m%d_%H%M%S")
            );
            (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, "application/octet-stream"),
                    (
                        header::CONTENT_DISPOSITION,
                        &format!("attachment; filename=\"{}\"", filename),
                    ),
                ],
                Body::from(contents),
            )
                .into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "Database file not found").into_response(),
    }
}

/*
pub struct RestoreRequest {
    pub backup_id: String,
}

pub async fn restore(
    _user: AuthUser,
    Json(_req): Json<RestoreRequest>,
) -> ApiResult<ApiResponse<()>> {
    Ok(ApiResponse::success_no_data("Restore successful"))
}
*/

/// POST /api/server/import-db
/// 导入数据库文件
pub async fn import_db(
    _user: AuthUser,
    mut multipart: axum::extract::Multipart,
) -> ApiResult<ApiResponse<()>> {
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| crate::errors::ApiError::InternalError(format!("Multipart error: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "db" {
            let data = field.bytes().await.map_err(|e| {
                crate::errors::ApiError::InternalError(format!(
                    "Failed to read multipart data: {}",
                    e
                ))
            })?;

            // 写入数据库文件
            let db_path = "data/x-ui.db";
            // 备份原数据库
            let backup_path = "data/x-ui.db.bak";
            if tokio::fs::metadata(db_path).await.is_ok() {
                tokio::fs::copy(db_path, backup_path).await.map_err(|e| {
                    crate::errors::ApiError::InternalError(format!(
                        "Failed to backup database: {}",
                        e
                    ))
                })?;
            }

            tokio::fs::write(db_path, data).await.map_err(|e| {
                crate::errors::ApiError::InternalError(format!(
                    "Failed to write database file: {}",
                    e
                ))
            })?;

            return Ok(ApiResponse::success_no_data(
                "Database imported successfully. Please restart the panel to apply changes.",
            ));
        }
    }

    Err(crate::errors::ApiError::BadRequest(
        "No 'db' field found in request".to_string(),
    ))
}
