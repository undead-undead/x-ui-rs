import { apiClient, API_PATHS } from './apiClient';
import type {
    ApiSysStatus,
    ApiLogsResponse,
    UpdateCredentialsRequest,
    UpdateXrayVersionRequest,
    ApiResponse,
} from '../types/api';
import { downloadFile, generateTimestampedFilename } from '../utils/fileUtils';

/**
 * 系统 API 接口
 */
export const sysApi = {
    /**
     * 更新面板配置 (.env)
     */
    updateConfig: async (webRoot: string, port: number): Promise<ApiResponse> => {
        return (await apiClient.post<ApiResponse>(API_PATHS.SERVER_UPDATE_CONFIG, { webRoot, port })).data;
    },

    /**
     * 获取系统实时状态
     */
    getSystemStatus: async (): Promise<ApiSysStatus> => {
        const response = await apiClient.post<ApiSysStatus>(API_PATHS.SERVER_SYS_STATS);
        return response.data;
    },

    /**
     * 重启 Xray 服务
     */
    restartXray: async (): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(API_PATHS.SERVER_RESTART_XRAY);
        return response.data;
    },
    restartPanel: async (): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(API_PATHS.SERVER_RESTART_PANEL);
        return response.data;
    },

    /**
     * 启动 Xray 服务
     */
    startXray: async (): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(API_PATHS.SERVER_START_XRAY);
        return response.data;
    },

    /**
     * 停止 Xray 服务
     */
    stopXray: async (): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(API_PATHS.SERVER_STOP_XRAY);
        return response.data;
    },

    /**
     * 切换 Xray 版本
     * @param version - 目标版本号
     */
    switchXrayVersion: async (version: string): Promise<ApiResponse> => {
        const payload: UpdateXrayVersionRequest = { version };
        const response = await apiClient.post<ApiResponse>(API_PATHS.SERVER_UPDATE_XRAY, payload);
        return response.data;
    },

    /**
     * 获取 Xray 所有发布版本
     */
    getXrayReleases: async (): Promise<ApiResponse<string[]>> => {
        const response = await apiClient.get<ApiResponse<string[]>>(API_PATHS.SERVER_XRAY_RELEASES);
        return response.data;
    },

    /**
     * 更新用户凭据（用户名和密码）
     * @param data - 包含旧凭据和新凭据的对象
     */
    updateCredentials: async (data: UpdateCredentialsRequest): Promise<ApiResponse> => {
        const response = await apiClient.post<ApiResponse>(API_PATHS.AUTH_UPDATE, data);
        return response.data;
    },

    /**
     * 获取运行日志
     */
    getLogs: async (): Promise<ApiLogsResponse> => {
        const response = await apiClient.post<ApiLogsResponse>(API_PATHS.SERVER_GET_LOGS);
        return response.data;
    },

    /**
     * 导出数据库
     * 自动下载数据库备份文件
     */
    exportDb: async (): Promise<void> => {
        try {
            const response = await apiClient.get(API_PATHS.SERVER_EXPORT_DB, {
                responseType: 'blob',
            });

            const blob = new Blob([response.data]);
            const filename = generateTimestampedFilename('x-ui_backup', 'db');
            downloadFile(blob, filename);
        } catch (error) {
            console.error('[Export DB Error]:', error);
            throw error;
        }
    },

    /**
     * 导入数据库
     * @param file - 数据库文件
     */
    importDb: async (file: File): Promise<ApiResponse> => {
        const formData = new FormData();
        formData.append('db', file);

        const response = await apiClient.post<ApiResponse>(
            API_PATHS.SERVER_IMPORT_DB,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    },
};
