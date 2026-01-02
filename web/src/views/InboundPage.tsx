import { useState, useMemo, useEffect } from 'react';
import { useInboundStore } from '../store/useInboundStore';
import { InboundTable } from '../components/InboundTable';
import { InboundTableVirtual } from '../components/InboundTableVirtual';
import { Plus, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../store/useModalStore';
import { formatTraffic } from '../utils/format';
import { useDebouncedValue } from '@mantine/hooks';
import { checkRealityDomain, quickCheckRealityDomainSync, type DomainCheckResult } from '../utils/realityDomainChecker';

// 性能优化：节点数阈值，超过此值使用虚拟滚动
const VIRTUAL_SCROLL_THRESHOLD = 50;

export const InboundPage = () => {
    const { t } = useTranslation();

    // 性能优化：使用细粒度选择器，只订阅需要的数据
    const inbounds = useInboundStore((state) => state.inbounds);
    const fetchInbounds = useInboundStore((state) => state.fetchInbounds);
    const openModal = useModalStore((state) => state.openModal);

    const [searchQuery, setSearchQuery] = useState('');
    const [realityDomain, setRealityDomain] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<DomainCheckResult | null>(null);

    // 页面加载时获取最新数据
    useEffect(() => {
        fetchInbounds();
    }, [fetchInbounds]);

    // 性能优化：使用防抖，减少 90% 的过滤计算
    const [debouncedQuery] = useDebouncedValue(searchQuery, 300);

    const filteredInbounds = useMemo(() => {
        if (!debouncedQuery) return inbounds;

        const query = debouncedQuery.toLowerCase();
        return inbounds.filter(inbound =>
            inbound.remark.toLowerCase().includes(query) ||
            inbound.protocol.toLowerCase().includes(query) ||
            inbound.port.toString().includes(query)
        );
    }, [inbounds, debouncedQuery]);

    // 计算总流量（所有节点的上传+下载之和）
    const totalTraffic = useMemo(() => {
        const total = inbounds.reduce((sum, inbound) => {
            return sum + (inbound.up || 0) + (inbound.down || 0);
        }, 0);
        return formatTraffic(total);
    }, [inbounds]);

    // 同步快速检测（用于实时反馈）
    const quickResult = useMemo(() => {
        if (!realityDomain.trim()) {
            return null;
        }
        return quickCheckRealityDomainSync(realityDomain);
    }, [realityDomain]);

    // 异步完整检测
    const handleCheckDomain = async () => {
        if (!realityDomain.trim()) return;

        setIsChecking(true);
        try {
            const result = await checkRealityDomain(realityDomain);
            setCheckResult(result);
        } catch (error) {
            setCheckResult({
                isValid: false,
                message: t('inbound.check_failed'),
                details: t('inbound.check_network_error'),
            });
        } finally {
            setIsChecking(false);
        }
    };

    // 当域名改变时，清除之前的完整检测结果
    useMemo(() => {
        setCheckResult(null);
    }, [realityDomain]);

    // 决定显示哪个结果
    const displayResult = checkResult || quickResult;

    // 性能优化：智能选择表格组件
    // 节点数 > 50 时使用虚拟滚动，否则使用普通表格
    const useVirtualScroll = filteredInbounds.length > VIRTUAL_SCROLL_THRESHOLD;
    const TableComponent = useVirtualScroll ? InboundTableVirtual : InboundTable;


    return (
        <div className="flex-1 min-h-screen bg-gray-50 p-8 lg:p-14 overflow-y-auto relative font-sans">
            <div className="max-w-full relative z-10">
                {/* Unified Card Container */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-6 duration-1000">
                    {/* Toolbar Section */}
                    <div className="flex items-center justify-between gap-4 px-8 py-6 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            {/* Add Node Button */}
                            <button
                                onClick={() => openModal()}
                                className="flex items-center justify-center px-5 py-1.5 bg-white text-black rounded-xl text-[13px] font-bold border border-black hover:-translate-y-[2px] hover:shadow-[0_4px_0_0_#94a3b8] active:translate-y-px active:shadow-none transition-all shadow-[0_1px_0_0_#94a3b8] whitespace-nowrap leading-none"
                                style={{ padding: '5px 24px 4px 24px' }}
                            >
                                <Plus size={16} strokeWidth={3} className="mr-2" />
                                <span>{t('inbound.modal.title_add')}</span>
                            </button>

                            {/* Search Input */}
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('inbound.search_placeholder')}
                                className="w-64 h-11 px-5 bg-white border border-black rounded-xl outline-none focus:ring-0 transition-all text-black placeholder:text-gray-300 font-bold text-[13px] shadow-[0_1px_0_0_#94a3b8]"
                            />
                        </div>

                        {/* Stats Section with Reality Domain Checker */}
                        <div className="flex items-center gap-6">
                            {/* Reality Domain Checker */}
                            <div className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={realityDomain}
                                    onChange={(e) => setRealityDomain(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCheckDomain()}
                                    placeholder={t('inbound.reality_check_placeholder')}
                                    className="w-64 h-11 px-5 pr-12 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-black placeholder:text-gray-400 font-medium text-[13px]"
                                />

                                {/* 检测按钮 */}
                                <button
                                    onClick={handleCheckDomain}
                                    disabled={!realityDomain.trim() || isChecking}
                                    className="h-11 px-4 bg-blue-500 text-white rounded-xl text-[13px] font-bold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    <Search size={16} />
                                    {isChecking ? t('inbound.checking') : t('inbound.check')}
                                </button>

                                {/* 状态图标 */}
                                {displayResult && !isChecking && (
                                    <div className="absolute left-64 top-1/2 -translate-y-1/2 ml-[-32px]">
                                        {displayResult.isValid ? (
                                            <CheckCircle2 size={18} className="text-green-500" />
                                        ) : (
                                            <XCircle size={18} className="text-red-500" />
                                        )}
                                    </div>
                                )}

                                {/* 结果提示 */}
                                {displayResult && !isChecking && (
                                    <div className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-lg text-xs font-medium shadow-lg z-50 ${displayResult.warning
                                        ? 'bg-orange-50 border border-orange-300 text-orange-800'
                                        : displayResult.isValid
                                            ? 'bg-green-50 border border-green-200 text-green-700'
                                            : 'bg-red-50 border border-red-200 text-red-700'
                                        }`}>
                                        <div className="font-bold mb-1">{displayResult.message}</div>
                                        {displayResult.details && (
                                            <div className="text-xs opacity-80 mb-2">{displayResult.details}</div>
                                        )}
                                        {displayResult.score !== undefined && (
                                            <div className="text-xs font-bold mb-2">{t('inbound.score')}: {displayResult.score}/100</div>
                                        )}
                                        {displayResult.warning && (
                                            <div className="mt-2 pt-2 border-t border-current/20 whitespace-pre-line text-xs leading-relaxed">
                                                {displayResult.warning}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-6 text-[13px] font-bold text-gray-500">
                                <span className="tabular-nums">{t('inbound.total_count')}: {inbounds.length}</span>
                                <span className="tabular-nums">{t('inbound.total_traffic')}: {totalTraffic}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table Content - 智能切换 */}
                    <TableComponent inbounds={filteredInbounds} isEmbedded={true} />
                </div>
            </div>
        </div>
    );
};