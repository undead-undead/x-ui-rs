mod config;
mod db;
mod errors;
mod handlers;
mod middleware;
mod models;
mod routes;
mod services;
mod utils;

use axum::http::Method;
use axum::Router;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// 自动初始化环境：如果没有 .env 文件，自动创建一个并生成随机密钥
fn auto_init_env() {
    let env_path = std::path::Path::new(".env");
    if !env_path.exists() {
        let secret = uuid::Uuid::new_v4().to_string();
        let content = format!(
            r#"# 自动生成的配置文件 - 首次启动创建
DATABASE_URL=sqlite://data/x-ui.db

# JWT 认证密钥 - 已自动生成强加密随机字符串
JWT_SECRET={}
JWT_EXPIRATION_HOURS=24

# 面板监听配置
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Xray 核心路径
XRAY_BIN_PATH=./bin/xray
XRAY_CONFIG_PATH=./data/xray.json

# 日志输出详细程度
RUST_LOG=debug,sqlx=warn
"#,
            secret
        );
        if let Err(e) = std::fs::write(env_path, content) {
            eprintln!("无法自动创建 .env 文件: {}", e);
        } else {
            println!("首次运行: 已自动生成 .env 配置文件和随机加密密钥");
        }
    }

    // 确保必要目录存在
    let _ = std::fs::create_dir_all("data");
    let _ = std::fs::create_dir_all("logs");
    let _ = std::fs::create_dir_all("bin");
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 0. 自动初始化环境 (实现傻瓜式一键运行)
    auto_init_env();

    // 1. 优先处理命令行参数
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        // 简单参数解析
        if args.contains(&"--help".to_string()) || args.contains(&"-h".to_string()) {
            println!("X-UI Backend CLI");
            println!("Usage:");
            println!("  --reset, -r                        Reset admin to defaults (admin/admin)");
            println!("  --user, -u <username>              Set admin username");
            println!("  --password, -p <password>          Set admin password");
            println!("  --port <port>                      Update port in .env");
            println!("  --web-root <path>                  Update web root in .env");
            return Ok(());
        }

        if args.contains(&"--reset".to_string()) || args.contains(&"-r".to_string()) {
            dotenvy::dotenv().ok();
            let pool = db::init_pool().await?;
            services::auth_service::reset_admin(&pool).await?;
            println!("管理员账号已重置为: admin / admin");
            return Ok(());
        }

        // 处理自定义账号设置
        if let Some(u_idx) = args.iter().position(|r| r == "--user" || r == "-u") {
            if let Some(username) = args.get(u_idx + 1) {
                if let Some(p_idx) = args.iter().position(|r| r == "--password" || r == "-p") {
                    if let Some(password) = args.get(p_idx + 1) {
                        dotenvy::dotenv().ok();
                        let pool = db::init_pool().await?;
                        // 调用 update_credentials 的核心逻辑（复用或直接更新）
                        // 这里简单起见直接哈希并更新，因为我们要的是强制重置
                        let hashed = utils::password::hash_password(password)?;
                        sqlx::query("UPDATE users SET username = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
                            .bind(username)
                            .bind(&hashed)
                            .execute(&pool)
                            .await?;
                        println!("管理员账号已更新为: {} / ***", username);
                        return Ok(());
                    }
                }
            }
        }
    }

    // 2. 加载环境变量并继续正常启动
    dotenvy::dotenv().ok();

    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "debug,sqlx=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 初始化数据库
    let pool = db::init_pool().await?;
    db::run_migrations(&pool).await?;

    // 初始化默认管理员密码
    services::auth_service::init_default_admin(&pool).await?;

    // 初始化系统监控
    let monitor = std::sync::Arc::new(std::sync::Mutex::new(
        services::system_service::SystemMonitor::new(),
    ));

    // 默认环境变量优化
    if std::env::var("XRAY_BIN_PATH").is_err() {
        std::env::set_var("XRAY_BIN_PATH", "./bin/xray");
    }
    if std::env::var("XRAY_CONFIG_PATH").is_err() {
        std::env::set_var("XRAY_CONFIG_PATH", "./data/xray.json");
    }

    // 启动时自动应用一次配置
    if let Err(e) = services::xray_service::apply_config(&pool, monitor.clone()).await {
        tracing::error!("启动时应用配置失败: {}", e);
    } else {
        tracing::info!("初始 Xray 核心已成功启动或更新");
    }

    // CORS 配置
    #[cfg(debug_assertions)]
    let cors_layer = match std::env::var("SERVER_HOST") {
        Ok(_) => CorsLayer::new().allow_origin(tower_http::cors::Any), // 开发环境允许所有
        Err(_) => CorsLayer::new()
            .allow_origin(
                "http://localhost:5173"
                    .parse::<axum::http::HeaderValue>()
                    .unwrap(),
            )
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PUT,
                Method::DELETE,
                Method::PATCH,
            ])
            .allow_headers([
                axum::http::header::CONTENT_TYPE,
                axum::http::header::AUTHORIZATION,
            ])
            .allow_credentials(true),
    };

    #[cfg(not(debug_assertions))]
    let cors_layer = CorsLayer::new()
        .allow_origin(tower_http::cors::Any) // 生产环境允许任意来源
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
        ])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
        ]); // 移除 allow_credentials(true) 以兼容 wildcard origin

    // 构建 API 路由
    let api_router = routes::create_router(pool, monitor)
        .layer(axum::middleware::from_fn(
            middleware::security::security_headers_middleware,
        ))
        .layer(cors_layer);

    // 静态文件服务
    // 默认寻找同级目录下的 web/dist 或 ./dist（部署时结构）
    let dist_path = std::env::var("WEB_DIST_PATH").unwrap_or_else(|_| "./bin/dist".to_string());
    // 如果找不到，尝试 fallback 到相对路径（开发模式）
    let dist_path = if std::path::Path::new(&dist_path).exists() {
        dist_path
    } else if std::path::Path::new("../web/dist").exists() {
        "../web/dist".to_string()
    } else {
        "./dist".to_string()
    };

    let static_service = tower_http::services::ServeDir::new(dist_path).fallback(
        tower_http::services::ServeFile::new(format!(
            "{}/index.html",
            if std::path::Path::new("../web/dist").exists() {
                "../web/dist"
            } else {
                "./bin/dist"
            }
        )),
    );

    // 获取 WEB_ROOT (默认 /)
    let web_root = std::env::var("WEB_ROOT").unwrap_or_else(|_| "/".to_string());
    let web_root = if !web_root.starts_with('/') {
        format!("/{}", web_root)
    } else {
        web_root
    };
    // 确保以 / 结尾以便正确嵌套，或者不以 / 结尾
    let web_root = web_root.trim_end_matches('/');
    // root 路由逻辑：如果 web_root 为空，直接挂载 /；否则挂载 /path

    let app = if web_root.is_empty() {
        Router::new()
            .merge(api_router)
            .fallback_service(static_service)
    } else {
        Router::new().nest(
            web_root,
            Router::new()
                .merge(api_router)
                .fallback_service(static_service),
        )
    };

    tracing::info!(
        "Web Root: {}",
        if web_root.is_empty() { "/" } else { web_root }
    );
    tracing::info!("安全中间件已启用: CSP, X-Frame-Options, X-XSS-Protection");

    let port = std::env::var("SERVER_PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!(
        "X-UI Backend listening on http://{}",
        listener.local_addr()?
    );

    axum::serve(listener, app).await?;

    Ok(())
}
