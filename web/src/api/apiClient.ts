import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { API_TIMEOUT } from '../config/constants';

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
    SERVER_RESTART_PANEL: '/server/restartPanel',
    SERVER_START_XRAY: '/server/startXray',
    SERVER_STOP_XRAY: '/server/stopXray',
    SERVER_UPDATE_XRAY: '/server/updateXray',
    SERVER_GET_LOGS: '/server/getLogs',
    SERVER_EXPORT_DB: '/server/export-db',
    SERVER_IMPORT_DB: '/server/import-db',
    SERVER_UPDATE_CONFIG: '/server/updateConfig',
    SERVER_XRAY_RELEASES: '/server/xrayReleases',
    // Inbound 相关
    INBOUNDS: '/inbounds',
    // 客户端相关
    CLIENTS: '/clients',
} as const;

// 动态获取 baseURL（自适应智能识别）
const getBaseURL = () => {
    // 1. 优先使用后端注入
    if (window.__WEB_ROOT__ && window.__WEB_ROOT__ !== "{{WEB_ROOT}}") {
        const root = window.__WEB_ROOT__;
        const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
        return `${normalizedRoot}api`;
    }

    // 2. 自动嗅探 (与 router.tsx 逻辑一致)
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    const topRoutes = ['login', 'inbounds', 'settings', 'dashboard'];

    if (segments.length > 0 && !topRoutes.includes(segments[0])) {
        return `/${segments[0]}/api`;
    }

    return '/api';
};

export const apiClient = axios.create({
    timeout: API_TIMEOUT,
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
