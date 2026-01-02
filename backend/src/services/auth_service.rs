// src/services/auth_service.rs
// 认证服务层

use sqlx::SqlitePool;

use crate::{
    errors::{ApiError, ApiResult},
    models::user::{ChangePasswordRequest, LoginRequest, LoginResponse, User},
    utils::{jwt, password, validation},
};

/// 初始化默认管理员账号
pub async fn init_default_admin(pool: &SqlitePool) -> ApiResult<()> {
    // 检查是否已经初始化
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = 1")
        .fetch_optional(pool)
        .await?;

    if let Some(user) = user {
        // 如果密码是临时的，更新为正确的哈希
        if user.password_hash == "temporary" {
            let hashed = password::hash_password("admin")?; // 4个字符或以上即可
            sqlx::query("UPDATE users SET password_hash = ? WHERE id = 1")
                .bind(&hashed)
                .execute(pool)
                .await?;
            tracing::info!("Default admin password initialized to: admin");
        }
    }

    Ok(())
}

/// 强制重置管理员账号和密码
pub async fn reset_admin(pool: &SqlitePool) -> ApiResult<()> {
    let hashed = password::hash_password("admin")?; // 4个字符
    sqlx::query("UPDATE users SET username = 'admin', password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1")
        .bind(&hashed)
        .execute(pool)
        .await?;

    tracing::info!("Admin credentials has been reset to admin/admin");
    Ok(())
}

/// 用户登录
pub async fn login(pool: &SqlitePool, req: LoginRequest) -> ApiResult<LoginResponse> {
    // 安全改进: 验证输入
    validation::validate_username(&req.username)?;
    validation::validate_password(&req.password)?;

    // 查询用户
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = ?")
        .bind(&req.username)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::Unauthorized("Invalid username or password".to_string()))?;

    // 验证密码
    let is_valid = password::verify_password(&req.password, &user.password_hash)?;

    if !is_valid {
        return Err(ApiError::Unauthorized(
            "Invalid username or password".to_string(),
        ));
    }

    // 生成 JWT Token (包含 password_version 用于 Token 失效机制)
    let token = jwt::generate_token(user.id, &user.username, user.password_version)?;

    Ok(LoginResponse {
        token,
        username: user.username,
    })
}

/// 修改密码
pub async fn change_password(
    pool: &SqlitePool,
    user_id: i64,
    req: ChangePasswordRequest,
) -> ApiResult<()> {
    // 安全改进: 验证输入
    validation::validate_username(&req.new_username)?;
    validation::validate_password(&req.old_password)?;
    validation::validate_password(&req.new_password)?;

    // 查询用户
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(pool)
        .await?;

    // 验证旧密码
    let is_valid = password::verify_password(&req.old_password, &user.password_hash)?;

    if !is_valid {
        return Err(ApiError::Unauthorized("Invalid old password".to_string()));
    }

    // 哈希新密码
    let new_hash = password::hash_password(&req.new_password)?;

    // 更新数据库 - 递增密码版本号
    sqlx::query(
        "UPDATE users 
         SET username = ?, 
             password_hash = ?, 
             password_version = password_version + 1,  -- 递增版本号
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
    )
    .bind(&req.new_username)
    .bind(&new_hash)
    .bind(user_id)
    .execute(pool)
    .await?;

    tracing::info!(
        "Password changed for user_id: {}, password version incremented, all old tokens invalidated",
        user_id
    );

    Ok(())
}

/*
/// 验证用户是否存在
pub async fn get_user_by_id(pool: &SqlitePool, user_id: i64) -> ApiResult<User> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::NotFound("User not found".to_string()))?;

    Ok(user)
}
*/

/// 更新用户凭据（用户名和密码）
pub async fn update_credentials(
    pool: &SqlitePool,
    req: crate::models::user::UpdateCredentialsRequest,
) -> ApiResult<()> {
    tracing::debug!(
        "Updating credentials: old_user={}, new_user={}",
        req.old_username,
        req.new_username
    );

    // 安全改进: 验证基本格式
    validation::validate_username(&req.old_username)?;
    validation::validate_username(&req.new_username)?;
    validation::validate_password(&req.old_password)?;
    validation::validate_password(&req.new_password)?;

    // 查询用户（通过旧用户名）
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = ?")
        .bind(&req.old_username)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::Unauthorized("原用户名或密码错误".to_string()))?;

    // 验证旧密码
    let is_valid = password::verify_password(&req.old_password, &user.password_hash)?;

    if !is_valid {
        return Err(ApiError::Unauthorized("原用户名或密码错误".to_string()));
    }

    // 哈希新密码
    let new_hash = password::hash_password(&req.new_password)?;

    // 更新数据库 - 递增密码版本号
    sqlx::query(
        "UPDATE users 
         SET username = ?, 
             password_hash = ?, 
             password_version = password_version + 1,  -- 递增版本号
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?",
    )
    .bind(&req.new_username)
    .bind(&new_hash)
    .bind(user.id)
    .execute(pool)
    .await?;

    tracing::info!(
        "User credentials updated successfully: {} -> {}",
        req.old_username,
        req.new_username
    );

    Ok(())
}
