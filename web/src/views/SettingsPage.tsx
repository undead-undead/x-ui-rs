import { useState, useMemo, useCallback } from 'react';
import { useSettingStore } from '../store/useSettingStore';
import { Shield, User, Database, Eye, EyeOff } from 'lucide-react';
import { useBackupModalStore } from '../store/useBackupModalStore';

import { useTranslation } from 'react-i18next';

export const SettingsPage = () => {
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState('panel');

    // 性能优化：使用细粒度选择器
    const panel = useSettingStore((state) => state.panel);
    const auth = useSettingStore((state) => state.auth);
    const updatePanel = useSettingStore((state) => state.updatePanel);
    const updateAuth = useSettingStore((state) => state.updateAuth);
    const savePanelConfig = useSettingStore((state) => state.savePanelConfig);
    const confirmUpdateAuth = useSettingStore((state) => state.confirmUpdateAuth);

    const [errors, setErrors] = useState<{ newUsername?: string; newPassword?: string }>({});
    const [showPassword, setShowPassword] = useState(false);

    const validateField = (field: 'newUsername' | 'newPassword', value: string) => {
        if (!value) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
            return;
        }
        const alphanumericRegex = /^[a-zA-Z0-9]+$/;
        if (!alphanumericRegex.test(value)) {
            setErrors(prev => ({ ...prev, [field]: t('settings.errors.alphanumeric') }));
        } else {

            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    // 性能优化：使用 useMemo 缓存 tabs 数组
    const tabs = useMemo(() => [
        { id: 'panel', label: t('settings.tabs.panel'), icon: Shield },
        { id: 'user', label: t('settings.tabs.user'), icon: User },
        { id: 'backup', label: t('settings.tabs.backup'), icon: Database },

    ], [t]);


    // 性能优化：使用 useCallback 缓存回调函数
    const handleSave = useCallback(() => {
        console.log("handleSave 被调用，当前标签页:", activeTab);
        if (activeTab === 'panel') {
            console.log("调用 savePanelConfig");
            savePanelConfig();
        } else if (activeTab === 'user') {
            console.log("调用 confirmUpdateAuth");
            // 先验证并保存用户信息，然后调用 savePanelConfig 重启
            confirmUpdateAuth();
            // 注意：confirmUpdateAuth 内部会显示确认对话框
            // 用户确认后才会真正保存，所以这里不直接调用 savePanelConfig
        } else {
            console.log("当前标签页没有对应的保存逻辑:", activeTab);
        }
    }, [activeTab, savePanelConfig, confirmUpdateAuth]);


    return (
        <div className="flex-1 min-h-screen bg-gray-50 p-8 lg:p-14 overflow-y-auto relative font-sans">
            <div className="max-w-full relative z-10">
                <header className="flex flex-col md:flex-row md:items-center justify-start gap-8 mb-8 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSave}
                            className="flex items-center justify-center px-5 py-1.5 bg-white border border-black rounded-xl font-bold text-[13px] hover:-translate-y-[2px] hover:shadow-[0_4px_0_0_#94a3b8] active:translate-y-px active:shadow-none transition-all shadow-[0_1px_0_0_#94a3b8] text-black whitespace-nowrap leading-none"
                            style={{ padding: '5px 24px 4px 24px' }}
                        >
                            <span>{t('settings.save_restart')}</span>
                        </button>
                    </div>
                </header>

                {/* Unified Card Container */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-6 duration-1000 overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-gray-100/80 border-b border-gray-200">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 h-9 flex items-center justify-center rounded-[14px] font-bold text-[13px] transition-all duration-200 relative ${activeTab === tab.id
                                    ? 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.02)] border border-black/5'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Settings Form Content */}
                    <div className="p-10 md:p-14">
                        {activeTab === 'panel' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('settings.panel_config.title')}</h3>
                                    <p className="text-xs font-medium text-gray-500 mt-1">{t('settings.panel_config.desc')}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-bold text-gray-500 tracking-tight ml-1">{t('settings.panel_config.port')}</label>
                                        <input

                                            type="number"
                                            value={panel.port}
                                            onChange={(e) => updatePanel({ port: Number(e.target.value) })}
                                            className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 transition-all text-gray-900 font-semibold tabular-nums tracking-tight text-[16px]"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-bold text-gray-500 tracking-tight ml-1">{t('settings.panel_config.web_root')}</label>
                                        <input

                                            type="text"
                                            value={panel.webRoot}
                                            onChange={(e) => {
                                                let value = e.target.value;
                                                // 只允许英文字母、数字、斜杠、连字符、下划线和点
                                                value = value.replace(/[^a-zA-Z0-9\/_\-\.]/g, '');
                                                updatePanel({ webRoot: value });
                                            }}
                                            onBlur={(e) => {
                                                // 失去焦点时，如果为空则设置为默认值
                                                if (!e.target.value.trim()) {
                                                    updatePanel({ webRoot: '/panel/' });
                                                }
                                            }}
                                            className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 transition-all text-gray-900 font-semibold tracking-tight text-[16px]"
                                            placeholder="/panel/"
                                            title={t('settings.panel_config.web_root_desc')}
                                        />
                                        <p className="text-xs text-gray-400 ml-1">{t('settings.panel_config.web_root_desc')}</p>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-bold text-gray-500 tracking-tight ml-1">{t('settings.panel_config.ssl_cert')}</label>
                                        <input

                                            type="text"
                                            value={panel.sslCertPath}
                                            onChange={(e) => updatePanel({ sslCertPath: e.target.value })}
                                            className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 transition-all text-gray-900 font-semibold tracking-tight text-[16px]"
                                            placeholder="/root/cert.crt"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-bold text-gray-500 tracking-tight ml-1">{t('settings.panel_config.ssl_key')}</label>
                                        <input

                                            type="text"
                                            value={panel.sslKeyPath}
                                            onChange={(e) => updatePanel({ sslKeyPath: e.target.value })}
                                            className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-blue-500/50 transition-all text-gray-900 font-semibold tracking-tight text-[16px]"
                                            placeholder="/root/private.key"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'user' && (
                            <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">{t('settings.user_config.title')}</h3>
                                    <p className="text-xs font-medium text-gray-500 mt-1">{t('settings.user_config.desc')}</p>
                                </div>


                                <div className="space-y-6 max-w-md">
                                    {/* 原用户名 */}
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-bold text-gray-500 tracking-tight ml-1">{t('settings.user_config.old_username')}</label>
                                        <input
                                            type="text"
                                            value={auth.oldUsername}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                                updateAuth({ oldUsername: value });
                                            }}
                                            className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-gray-400 transition-all text-gray-900 font-semibold tracking-tight text-[16px]"
                                            placeholder={t('settings.user_config.old_username_placeholder')}
                                        />
                                    </div>


                                    {/* 原密码 */}
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-bold text-gray-500 tracking-tight ml-1">{t('settings.user_config.old_password')}</label>
                                        <input
                                            type="password"
                                            value={auth.oldPassword}
                                            onChange={(e) => updateAuth({ oldPassword: e.target.value })}
                                            className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:border-gray-400 transition-all text-gray-900 font-semibold tracking-tight text-[16px]"
                                            placeholder={t('settings.user_config.old_password_placeholder')}
                                        />
                                    </div>


                                    {/* 新用户名 */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end ml-1">
                                            <label className="text-[13px] font-bold text-gray-500 tracking-tight">{t('settings.user_config.new_username')}</label>
                                            {errors.newUsername ? (
                                                <span className="text-[11px] font-bold text-red-500 animate-pulse">{errors.newUsername}</span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-gray-400">{t('settings.user_config.alphanumeric_only')}</span>
                                            )}
                                        </div>

                                        <input
                                            type="text"
                                            value={auth.newUsername}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                                                updateAuth({ newUsername: value });
                                            }}
                                            onBlur={(e) => validateField('newUsername', e.target.value)}
                                            className={`w-full h-14 px-6 bg-gray-50 border ${errors.newUsername ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-200'} rounded-2xl outline-none focus:bg-white focus:border-gray-400 transition-all text-gray-900 font-semibold tracking-tight text-[16px]`}
                                            placeholder={t('settings.user_config.new_username_placeholder')}
                                        />
                                    </div>


                                    {/* 新密码 */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end ml-1">
                                            <label className="text-[13px] font-bold text-gray-500 tracking-tight">{t('settings.user_config.new_password')}</label>
                                            {errors.newPassword ? (
                                                <span className="text-[11px] font-bold text-red-500 animate-pulse">{errors.newPassword}</span>
                                            ) : (
                                                <span className="text-[11px] font-medium text-gray-400">{t('settings.user_config.alphanumeric_only')}</span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={auth.newPassword}
                                                onChange={(e) => updateAuth({ newPassword: e.target.value })}
                                                onBlur={(e) => validateField('newPassword', e.target.value)}
                                                className={`w-full h-14 px-6 pr-14 bg-gray-50 border ${errors.newPassword ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-200'} rounded-2xl outline-none focus:bg-white focus:border-gray-400 transition-all text-gray-900 font-semibold tracking-tight text-[16px]`}
                                                placeholder={t('settings.user_config.new_password_placeholder')}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'backup' && (
                            <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
                                <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded-4xl flex items-center justify-center text-gray-400 shadow-sm">
                                    <Database size={48} strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-700 tracking-tight">{t('settings.backup.title')}</h3>
                                    <p className="text-gray-500 text-[14px] mt-2.5 font-medium max-w-xs mx-auto">{t('settings.backup.desc')}</p>
                                </div>
                                <button
                                    onClick={() => useBackupModalStore.getState().open()}
                                    className="flex items-center justify-center px-5 py-1.5 bg-white text-black rounded-xl text-[13px] font-bold border border-black hover:-translate-y-[2px] hover:shadow-[0_4px_0_0_#94a3b8] active:translate-y-px active:shadow-none transition-all shadow-[0_1px_0_0_#94a3b8] whitespace-nowrap leading-none"
                                    style={{ padding: '5px 24px 4px 24px' }}
                                >
                                    <span>{t('settings.backup.manage_btn')}</span>
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};