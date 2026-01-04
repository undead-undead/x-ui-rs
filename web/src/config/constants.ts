/**
 * 应用全局常量配置
 * 集中管理所有硬编码的数字，提升代码可维护性
 */

// ==================== 时间相关 ====================

/** Dashboard 状态轮询间隔（毫秒） */
export const DASHBOARD_POLLING_INTERVAL = 3000;

/** 设置页面重定向延迟（毫秒） */
export const SETTINGS_REDIRECT_DELAY = 3000;

/** API 请求超时时间（毫秒） */
export const API_TIMEOUT = 60000;

// ==================== 端口配置 ====================

/** 随机端口范围 */
export const PORT_RANGE = {
    MIN: 10000,
    MAX: 60000,
} as const;

/** 生成随机端口号 */
export const generateRandomPort = (): number => {
    return Math.floor(Math.random() * (PORT_RANGE.MAX - PORT_RANGE.MIN)) + PORT_RANGE.MIN;
};

// ==================== 存储相关 ====================

/** LocalStorage 键名 */
export const STORAGE_KEYS = {
    AUTH: 'x-ui-auth',
    SETTINGS: 'x-ui-settings',
} as const;

// ==================== 其他常量 ====================

/** 默认流量限制（GB） */
export const DEFAULT_TRAFFIC_LIMIT_GB = 0;

/** 默认过期时间（天） */
export const DEFAULT_EXPIRY_DAYS = 0;
