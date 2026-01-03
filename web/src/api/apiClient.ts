import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 共享的 axios 实例配置
 * 所有 API 模块都应该使用这个实例，以共享拦截器配置
 */

// API 路径常量
export const API_PATHS = {
    // 认证相关
    AUTH_LOGIN: '/auth/login',
    AUTH_UPDATE: '/auth/update',
    // 服务器相关
    SERVER_SYS_STATS: '/server/sysStats',
    SERVER_RESTART_XRAY: '/server/restartXray',
    SERVER_START_XRAY: '/server/startXray',
    SERVER_STOP_XRAY: '/server/stopXray',
    SERVER_UPDATE_XRAY: '/server/updateXray',
    SERVER_GET_LOGS: '/server/getLogs',
    SERVER_EXPORT_DB: '/server/export-db',
    SERVER_IMPORT_DB: '/server/import-db',
    SERVER_XRAY_RELEASES: '/server/xrayReleases',
    // Inbound 相关
    INBOUNDS: '/inbounds',
    // 客户端相关
    CLIENTS: '/clients',
} as const;

// 动态获取 baseURL（每次请求时计算，确保 WEB_ROOT 已注入）
const getBaseURL = () => {
    const root = window.__WEB_ROOT__ && window.__WEB_ROOT__ !== "{{WEB_ROOT}}"
        ? window.__WEB_ROOT__
        : '/';
    // 确保以 / 结尾，并加上 api
    const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
    return `${normalizedRoot}api`;
};

export const apiClient = axios.create({
    timeout: 60000,
});

// 请求拦截器：动态设置 baseURL 和添加 token
apiClient.interceptors.request.use(
    (config) => {
        // 关键修复：每次请求时动态计算 baseURL
        config.baseURL = getBaseURL();

        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        console.error('[API Request Error]:', error.message);
        return Promise.reject(error);
    }
);

// 响应拦截器：处理 401 和其他错误
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const url = error.config?.url || '';
        const status = error.response?.status;

        // 处理 401 未授权错误
        if (status === 401) {
            // 排除登录和更新凭据接口，避免循环登出
            const isAuthEndpoint =
                url.includes(API_PATHS.AUTH_LOGIN) ||
                url.includes(API_PATHS.AUTH_UPDATE);

            if (!isAuthEndpoint) {
                console.warn('[API] 401 Unauthorized - Logging out');
                useAuthStore.getState().logout();
            }
        }

        // 记录其他错误
        if (status && status >= 500) {
            console.error('[API Server Error]:', {
                url,
                status,
                message: error.message,
            });
        }

        return Promise.reject(error);
    }
);
