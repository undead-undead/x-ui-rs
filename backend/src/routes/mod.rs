// src/routes/mod.rs
// 路由配置

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use sqlx::SqlitePool;

use crate::{handlers, middleware::auth::auth_middleware, services::system_service::SharedMonitor};

pub fn create_router(pool: SqlitePool, monitor: SharedMonitor) -> Router {
    // 认证路由组
    let auth_routes = Router::new()
        // 公开接口 (无需 JWT)
        .route("/login", post(handlers::auth::login))
        .route("/update", post(handlers::auth::update_credentials))
        // 需要认证的接口
        .nest(
            "/",
            Router::new()
                .route("/logout", post(handlers::auth::logout))
                .route("/change-password", post(handlers::auth::change_password))
                .route("/verify", get(handlers::auth::verify))
                // 安全改进: 中间件现在会验证 Token 是否在密码修改后失效
                .route_layer(middleware::from_fn_with_state(
                    pool.clone(),
                    auth_middleware,
                )),
        )
        .with_state(pool.clone());

    // 系统路由（需要认证）
    let system_routes = Router::new()
        .route("/sysStats", post(handlers::system::get_sys_stats))
        .route("/restartXray", post(handlers::system::restart_xray))
        .route("/startXray", post(handlers::system::start_xray))
        .route("/stopXray", post(handlers::system::stop_xray))
        .route("/applyConfig", post(handlers::system::apply_config))
        .route("/xrayReleases", get(handlers::system::get_xray_releases))
        .route("/updateXray", post(handlers::system::update_xray))
        .route("/getLogs", post(handlers::system::get_logs))
        .route("/export-db", get(handlers::system::export_db))
        .route("/import-db", post(handlers::system::import_db))
        // 安全改进: 中间件现在会验证 Token 是否在密码修改后失效
        .route_layer(middleware::from_fn_with_state(
            pool.clone(),
            auth_middleware,
        ))
        .layer(axum::Extension(pool.clone())) // 为 apply_config 提供 DB 连接池
        .with_state(monitor.clone());

    // 入站路由（需要认证）
    let inbound_routes = Router::new()
        .route("/list", get(handlers::inbound::list_inbounds))
        .route("/add", post(handlers::inbound::add_inbound))
        .route("/update", post(handlers::inbound::update_inbound))
        .route("/del", post(handlers::inbound::del_inbound_post))
        .route("/check-reality", post(handlers::inbound::check_reality))
        .route_layer(middleware::from_fn_with_state(
            pool.clone(),
            auth_middleware,
        ))
        .layer(axum::Extension(pool.clone()))
        .with_state(monitor.clone()); // SharedMonitor needed for apply_config

    // Xray 工具路由（无需认证，用于前端生成密钥）
    let xray_routes = Router::new().route(
        "/generate-reality-keys",
        get(crate::handlers::xray::generate_reality_keys),
    );

    // 组合所有路由
    Router::new()
        .nest("/auth", auth_routes)
        .nest("/server", system_routes)
        .nest("/inbound", inbound_routes)
        .nest("/xray", xray_routes)
}
