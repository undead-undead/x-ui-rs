import { create } from 'zustand';
import type { AllSettings, SettingStore, PanelConfig } from '../types/setting';
import { useDialogStore } from './useDialogStore';

const INITIAL_DATA: AllSettings = {
    panel: {
        listenIp: '',
        // 自动获取当前运行端口
        port: Number(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
        // 自动获取注入的 WEB_ROOT (优先) 或从 URL 推测
        webRoot: (window as any).__WEB_ROOT__ || window.location.pathname,
        sslCertPath: '',
        sslKeyPath: ''
    },
    auth: { oldUsername: '', oldPassword: '', newUsername: '', newPassword: '' },
};

export const useSettingStore = create<SettingStore>((set, get) => ({
    ...INITIAL_DATA,
    isRestarting: false,
    savedPanel: null,  // 初始化为 null

    updatePanel: (data) => set((state) => {
        const { port, listenIp, webRoot, sslCertPath, sslKeyPath } = data;
        const nextPanel: PanelConfig = { ...state.panel };
        if (port !== undefined) nextPanel.port = Number(port) || 0;
        if (listenIp !== undefined) nextPanel.listenIp = String(listenIp);
        if (webRoot !== undefined) nextPanel.webRoot = String(webRoot);
        if (sslCertPath !== undefined) nextPanel.sslCertPath = String(sslCertPath);
        if (sslKeyPath !== undefined) nextPanel.sslKeyPath = String(sslKeyPath);
        return { panel: nextPanel };
    }),

    updateAuth: (data) => set((state) => ({
        auth: { ...state.auth, ...data }
    })),

    // 保存面板配置并重启
    savePanelConfig: () => {
        const { panel } = get();

        // 验证端口
        if (panel.port < 1 || panel.port > 65535) {
            useDialogStore.getState().showAlert("端口无效 (1-65535)", "配置错误");
            return;
        }

        // 规范化 webRoot 格式
        let normalizedWebRoot = panel.webRoot.trim();
        normalizedWebRoot = normalizedWebRoot.replace(/\/+/g, '/'); // 清理连续斜杠

        // 规范化：确保以 / 开头
        if (!normalizedWebRoot.startsWith('/')) {
            normalizedWebRoot = '/' + normalizedWebRoot;
        }

        // 如果不是根路径，确保以 / 结尾
        if (normalizedWebRoot.length > 1 && !normalizedWebRoot.endsWith('/')) {
            normalizedWebRoot = normalizedWebRoot + '/';
        }


        // 保存配置
        const updatedPanel = { ...panel, webRoot: normalizedWebRoot };
        set({
            panel: updatedPanel,
            savedPanel: updatedPanel
        });

        // 异步调用后端更新 .env
        (async () => {
            const { sysApi } = await import('../api/system');
            try {
                await sysApi.updateConfig(normalizedWebRoot, panel.port);
            } catch (e) {
                console.error("Failed to update backend config:", e);
                useDialogStore.getState().showAlert("后端配置写入失败，请检查日志", "错误");
                return;
            }

            // 构造新地址
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            const newPort = panel.port; // 使用用户刚设置的新端口
            const fullUrl = `${protocol}//${hostname}:${newPort}${normalizedWebRoot}`;

            // 提示并跳转
            useDialogStore.getState().showAlert(
                `配置已保存并写入后台！\n\n面板服务正在重启...\n页面将在 5 秒后尝试跳转到：\n${fullUrl}\n\n⚠️ 请务必记住新地址！\n\n注意：如果您在云服务器上修改了端口，请务必更新防火墙规则！`,
                "保存成功"
            );

            // 调用重启接口
            try {
                await sysApi.restartPanel();
            } catch (e) {
                console.warn("Restart signal failed (this is normal if process killed):", e);
            }

            // 3秒后跳转（面板重启通常很快）
            setTimeout(() => {
                window.location.href = fullUrl;
            }, 3000);
        })();
    },

    // 仅处理用户名密码修改（带确认弹窗）
    confirmUpdateAuth: () => {
        const { auth } = get();
        const { oldUsername, oldPassword, newUsername, newPassword } = auth;

        // 验证：只能包含字母和数字
        const alphanumericRegex = /^[a-zA-Z0-9]+$/;

        if (newUsername && !alphanumericRegex.test(newUsername)) {
            useDialogStore.getState().showAlert("新用户名只能包含字母和数字，不能包含空格或特殊字符", "格式错误");
            return;
        }

        if (newPassword && !alphanumericRegex.test(newPassword)) {
            useDialogStore.getState().showAlert("新密码只能包含字母和数字，不能包含空格或特殊字符", "格式错误");
            return;
        }

        // 验证：新用户名不能与原用户名相同（如果用户确实输入了新用户名且没有打算修改密码）
        if (newUsername && newUsername === oldUsername && !newPassword) {
            useDialogStore.getState().showAlert("新用户名不能与原用户名相同", "验证失败");
            return;
        }

        // 如果没有填写，则沿用原值（实现“只修改密码”或“只修改用户名”）
        const finalUsername = newUsername || oldUsername || 'admin';
        const finalPassword = newPassword || oldPassword;

        // 使用确认对话框
        useDialogStore.getState().showConfirm(
            `确定要修改管理员凭据吗？\n\n修改后将立即退出登录，且需要使用新凭据重新登录。`,
            () => {
                // 调用后端 API 保存用户名密码
                (async () => {
                    try {
                        const { sysApi } = await import('../api/system');

                        // 验证：原用户名和原密码必须填写
                        if (!oldUsername) {
                            useDialogStore.getState().showAlert("请输入原用户名以验证身份", "验证失败");
                            return;
                        }
                        if (!oldPassword) {
                            useDialogStore.getState().showAlert("请输入原密码以验证身份", "验证失败");
                            return;
                        }

                        await sysApi.updateCredentials({
                            oldUsername,
                            oldPassword,
                            newUsername: finalUsername,
                            newPassword: finalPassword
                        });

                        // 修改成功后清空表单状态，防止重新登录后残留
                        set({ auth: { oldUsername: '', oldPassword: '', newUsername: '', newPassword: '' } });

                        // 修改成功后立即退出登录，不弹出阻塞性对话框
                        const { useAuthStore } = await import('./useAuthStore');
                        useAuthStore.getState().logout();
                    } catch (error: any) {
                        console.error("更新凭据失败:", error);
                        const msg = error.response?.data?.msg || "原用户名或密码错误";
                        useDialogStore.getState().showAlert(
                            `修改失败：${msg}\n\n请确保"原用户名"和"原密码"填写正确。`,
                            "修改失败"
                        );
                    }
                })();
            },
            "确认修改"
        );
    },

    restartPanel: () => {
        useDialogStore.getState().showConfirm(
            "强制重启面板服务？这会导致当前所有连接断开。",
            async () => {
                const { panel } = get();
                const { sysApi } = await import('../api/system');
                set({ isRestarting: true });

                // 显示重启提示
                useDialogStore.getState().showAlert(
                    "面板正在重启，请稍候...",
                    "重启中"
                );

                try {
                    await sysApi.restartPanel();
                } catch (e) {
                    console.warn("Restart signal failed (this is normal if process killed):", e);
                }

                // 确保 webRoot 格式正确并构造跳转地址
                const cleanRoot = panel.webRoot.startsWith('/') ? panel.webRoot : `/${panel.webRoot}`;
                const origin = window.location.origin;
                const newAddress = `${origin}${cleanRoot}`;

                // 重启后等待 3 秒再刷新地址
                setTimeout(() => {
                    window.location.href = newAddress;
                }, 3000);
            },
            "确认重启"
        );
    },

    exportDb: async () => {
        try {
            const { sysApi } = await import('../api/system');
            await sysApi.exportDb();
        } catch (error) {
            console.error("Export failed:", error);
            useDialogStore.getState().showAlert("导出文件失败", "导出错误");
        }
    },

    importDb: async (file: File) => {
        try {
            const { sysApi } = await import('../api/system');
            const response = await sysApi.importDb(file);
            useDialogStore.getState().showAlert(
                response.msg || "数据库导入成功！请手动重启面板以生效。",
                "导入成功"
            );
        } catch (error: any) {
            console.error("Import failed:", error);
            const msg = error.response?.data?.msg || "导入文件失败";
            useDialogStore.getState().showAlert(msg, "导入错误");
        }
    }
}));