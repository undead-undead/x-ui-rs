import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, ClipboardCheck } from 'lucide-react';
import { useQRCodeStore } from '../store/useQRCodeStore';
import { generateShareLink, copyToClipboard } from '../utils/linkUtils';

export const QRCodeModal: React.FC = () => {
    const { isOpen, inbound, close } = useQRCodeStore();
    const [copied, setCopied] = useState(false);

    // 生成真实有效的节点链接
    const nodeLink = useMemo(() => {
        if (!inbound) return '';
        // 使用工具类生成标准的 Xray 分享链接
        // 自动使用当前访问面板的域名/IP作为服务器地址
        return generateShareLink(inbound, window.location.hostname);
    }, [inbound]);

    if (!isOpen || !inbound) return null;

    const handleCopyLink = async () => {
        if (!nodeLink) return;
        const success = await copyToClipboard(nodeLink);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* 极简磨砂背景 */}
            <div
                className="absolute inset-0 bg-black/5 backdrop-blur-sm animate-in fade-in duration-500"
                onClick={close}
            />

            {/* 弹窗主体 - 采用更柔和的 Apple 腮红白设计 */}
            <div className="relative w-[340px] bg-[#FDFDFD] border border-gray-100 rounded-[44px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-400">

                {/* 顶部标题栏 */}
                <div className="flex items-center justify-between p-8 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black rounded-[20px] flex items-center justify-center text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)]">
                            <Share2 size={24} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">扫描二维码</h2>
                    </div>
                    <button
                        onClick={close}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100/50 hover:bg-gray-100 text-gray-400 transition-all active:scale-90"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* 二维码展示区域 */}
                <div className="px-8 pb-8 flex flex-col items-center">
                    <div className="p-6 bg-white border border-gray-50 rounded-[40px] shadow-[0_15px_30px_-10px_rgba(0,0,0,0.03)] mb-8 transform transition-transform hover:scale-[1.01]">
                        <QRCodeSVG
                            value={nodeLink}
                            size={200}
                            level="H"
                            includeMargin={false}
                        />
                    </div>

                    <div className="w-full space-y-4">
                        {/* 复制按钮 - 极简圆柱风格 */}
                        <div className="relative">
                            <button
                                onClick={handleCopyLink}
                                className={`
                                    w-full py-4 rounded-full text-[14px] font-bold transition-all duration-300
                                    flex items-center justify-center gap-2 border-2
                                    ${copied
                                        ? 'bg-green-500 border-green-500 text-white shadow-lg'
                                        : 'bg-white border-gray-100 text-gray-900 hover:border-gray-900 ring-4 ring-transparent hover:ring-gray-50'
                                    }
                                `}
                            >
                                {copied ? <ClipboardCheck size={18} /> : <div className="w-4 h-4" />}
                                <span>{copied ? '节点链接已成功复制' : '复制节点链接'}</span>
                            </button>
                            {/* 按钮底部的装饰线 */}
                            {!copied && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gray-100 rounded-full -z-10 blur-[2px]"></div>}
                        </div>

                        {/* 详情卡片 - 采用极简灰白配色 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="py-4 px-2 rounded-[28px] bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">协议</span>
                                <span className="text-[14px] font-bold text-gray-900 uppercase">{inbound.protocol}</span>
                            </div>
                            <div className="py-4 px-2 rounded-[28px] bg-gray-50/50 border border-transparent hover:border-gray-100 transition-all flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">端口</span>
                                <span className="text-[14px] font-bold text-gray-900">{inbound.port}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 底部版权/提示 */}
                <div className="pb-8 text-center px-8">
                    <p className="text-[12px] font-bold text-gray-300 leading-relaxed uppercase tracking-tighter">
                        使用支持 V2Ray 协议的客户端<br />
                        扫描上方二维码即可导入节点
                    </p>
                </div>
            </div>
        </div>
    );
};
