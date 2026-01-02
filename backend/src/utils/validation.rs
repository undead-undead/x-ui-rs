// src/utils/validation.rs
// 输入验证工具

use crate::errors::ApiError;
use regex::Regex;

/// 验证用户名
/// 规则: 3-32 字符,只允许字母、数字、下划线、连字符
pub fn validate_username(username: &str) -> Result<(), ApiError> {
    // 长度检查
    if username.len() < 3 || username.len() > 32 {
        return Err(ApiError::BadRequest(
            "用户名长度必须在 3-32 个字符之间".to_string(),
        ));
    }

    // 格式检查
    let re = Regex::new(r"^[a-zA-Z0-9_-]+$").unwrap();
    if !re.is_match(username) {
        return Err(ApiError::BadRequest(
            "用户名只能包含字母、数字、下划线和连字符".to_string(),
        ));
    }

    Ok(())
}

/// 验证密码
/// 规则: 4-128 字符
pub fn validate_password(password: &str) -> Result<(), ApiError> {
    // 长度检查
    if password.len() < 4 {
        return Err(ApiError::BadRequest("密码长度至少为 4 个字符".to_string()));
    }

    if password.len() > 128 {
        return Err(ApiError::BadRequest(
            "密码长度不能超过 128 个字符".to_string(),
        ));
    }

    // 可选: 强制密码复杂度
    // let has_uppercase = password.chars().any(|c| c.is_uppercase());
    // let has_lowercase = password.chars().any(|c| c.is_lowercase());
    // let has_digit = password.chars().any(|c| c.is_numeric());

    // if !has_uppercase || !has_lowercase || !has_digit {
    //     return Err(ApiError::BadRequest(
    //         "密码必须包含大写字母、小写字母和数字".to_string(),
    //     ));
    // }

    Ok(())
}

/*
/// 验证端口号
/// 规则: 1024-65535 (避免使用系统保留端口)
pub fn validate_port(port: u16) -> Result<(), ApiError> {
    if port < 1024 {
        return Err(ApiError::BadRequest(
            "端口号必须大于等于 1024 (避免使用系统保留端口)".to_string(),
        ));
    }

    // u16 的最大值就是 65535,所以不需要检查上限

    Ok(())
}

/// 验证备注 (remark)
/// 规则: 1-100 字符,禁止危险字符串
pub fn validate_remark(remark: &str) -> Result<(), ApiError> {
    // 长度检查
    if remark.is_empty() {
        return Err(ApiError::BadRequest("备注不能为空".to_string()));
    }

    if remark.len() > 100 {
        return Err(ApiError::BadRequest(
            "备注长度不能超过 100 个字符".to_string(),
        ));
    }

    // 检查危险字符串 (防止 XSS)
    let dangerous_patterns = [
        "<script",
        "</script>",
        "javascript:",
        "onerror=",
        "onload=",
        "onclick=",
        "<iframe",
        "eval(",
    ];

    let remark_lower = remark.to_lowercase();
    for pattern in &dangerous_patterns {
        if remark_lower.contains(pattern) {
            return Err(ApiError::BadRequest(format!(
                "备注包含不允许的内容: {}",
                pattern
            )));
        }
    }

    Ok(())
}

/// 清理字符串 - 移除潜在的危险字符
pub fn sanitize_string(input: &str) -> String {
    input
        .chars()
        .filter(|c| {
            // 只保留可打印字符和常见的 Unicode 字符
            c.is_alphanumeric()
                || c.is_whitespace()
                || matches!(c, '-' | '_' | '.' | '@' | '/' | ':' | '(' | ')' | '[' | ']')
        })
        .collect()
}
*/

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_username() {
        // 有效的用户名
        assert!(validate_username("admin").is_ok());
        assert!(validate_username("user_123").is_ok());
        assert!(validate_username("test-user").is_ok());

        // 无效的用户名
        assert!(validate_username("ab").is_err()); // 太短
        assert!(validate_username("a".repeat(33).as_str()).is_err()); // 太长
        assert!(validate_username("user@123").is_err()); // 包含非法字符
        assert!(validate_username("user 123").is_err()); // 包含空格
    }

    #[test]
    fn test_validate_password() {
        // 有效的密码
        assert!(validate_password("1234").is_ok());
        assert!(validate_password("admin").is_ok());
        assert!(validate_password("password123").is_ok());

        // 无效的密码
        assert!(validate_password("123").is_err()); // 太短
        assert!(validate_password(&"a".repeat(129)).is_err()); // 太长
    }

    /*
    #[test]
    fn test_validate_port() {
        // 有效的端口
        assert!(validate_port(8080).is_ok());
        assert!(validate_port(1024).is_ok());
        assert!(validate_port(65535).is_ok());

        // 无效的端口
        assert!(validate_port(80).is_err()); // 系统保留端口
        assert!(validate_port(1023).is_err()); // 太小
    }

    #[test]
    fn test_validate_remark() {
        // 有效的备注
        assert!(validate_remark("测试节点").is_ok());
        assert!(validate_remark("Node-1").is_ok());

        // 无效的备注
        assert!(validate_remark("").is_err()); // 空字符串
        assert!(validate_remark(&"a".repeat(101)).is_err()); // 太长
        assert!(validate_remark("<script>alert(1)</script>").is_err()); // XSS
        assert!(validate_remark("javascript:alert(1)").is_err()); // XSS
    }

    #[test]
    fn test_sanitize_string() {
        assert_eq!(sanitize_string("hello<script>"), "helloscript");
        assert_eq!(sanitize_string("user@example.com"), "user@example.com");
        assert_eq!(sanitize_string("test\x00null"), "testnull");
    }
    */
}
