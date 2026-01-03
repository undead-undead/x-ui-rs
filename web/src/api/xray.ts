import { apiClient } from './apiClient';

export interface RealityKeysResponse {
    private_key: string;
    public_key: string;
}

/**
 * 生成 Reality 密钥对（调用后端，后端调用 xray x25519）
 */
export async function generateRealityKeys(): Promise<RealityKeysResponse> {
    const response = await apiClient.get<RealityKeysResponse>('/xray/generate-reality-keys');
    return response.data;
}
