import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../store/useModalStore';
import { useInboundStore } from '../store/useInboundStore';
import { useDialogStore } from '../store/useDialogStore';
import { X } from 'lucide-react';
import { Switch } from './ui/Switch';
import { generateUUID } from '../utils/uuid';

export const AddInboundModal = () => {
    const { t } = useTranslation();
    const { isOpen, closeModal, editingNode } = useModalStore();
    const { addInbound, updateInbound } = useInboundStore();

    // === 基础配置 ===
    const [remark, setRemark] = useState('');
    const [isEnable, setIsEnable] = useState(true);
    const [protocol, setProtocol] = useState('vless');
    const [tag, setTag] = useState('');
    const [listen, setListen] = useState('');
    const [port, setPort] = useState('40754');
    const [totalTraffic, setTotalTraffic] = useState('0');
    const [expiryTime, setExpiryTime] = useState('');

    // === 协议配置 ===
    // VLESS/VMess
    const [uuid, setUuid] = useState<string>(generateUUID());
    const [flow, setFlow] = useState('');
    const [level, setLevel] = useState('0');
    const [email, setEmail] = useState('');

    // VMess 特有
    const [alterId, setAlterId] = useState('0');

    // Trojan 特有
    const [password, setPassword] = useState('');

    // Shadowsocks 特有
    const [ssMethod, setSsMethod] = useState('chacha20-ietf-poly1305');
    const [ssPassword, setSsPassword] = useState('');
    const [ssNetwork, setSsNetwork] = useState('tcp,udp');

    // 通用
    const [decryption, setDecryption] = useState('none');

    // === 传输层配置 ===
    const [network, setNetwork] = useState('tcp');

    // WebSocket
    const [wsPath, setWsPath] = useState('/');
    const [wsHost, setWsHost] = useState('');

    // gRPC
    const [grpcServiceName, setGrpcServiceName] = useState('');
    const [grpcMultiMode, setGrpcMultiMode] = useState(false);

    // HTTP/2
    const [h2Host, setH2Host] = useState('');
    const [h2Path, setH2Path] = useState('/');

    // XHTTP
    const [xhttpMode, setXhttpMode] = useState('auto');
    const [xhttpPath, setXhttpPath] = useState('/');
    const [xhttpHost, setXhttpHost] = useState('');

    // === 安全层配置 ===
    const [security, setSecurity] = useState('none');

    // Reality
    const [realityShow, setRealityShow] = useState(false);
    const [realityDest, setRealityDest] = useState('www.microsoft.com:443');
    const [realityXver, setRealityXver] = useState('0');
    const [realityFingerprint, setRealityFingerprint] = useState('chrome');
    const [realityServerNames, setRealityServerNames] = useState('www.microsoft.com');
    const [realityPrivateKey, setRealityPrivateKey] = useState('');
    const [realityPublicKey, setRealityPublicKey] = useState('');
    const [realityShortIds, setRealityShortIds] = useState('');
    const [realityMinClientVer, setRealityMinClientVer] = useState('');
    const [realityMaxClientVer, setRealityMaxClientVer] = useState('');
    const [realityMaxTimeDiff, setRealityMaxTimeDiff] = useState('');

    // === Socket 选项 ===
    const [acceptProxyProtocol, setAcceptProxyProtocol] = useState(false);
    const [tcpFastOpen, setTcpFastOpen] = useState(true);
    const [tcpNoDelay, setTcpNoDelay] = useState(true);




    useEffect(() => {
        if (isOpen && editingNode) {
            // 加载编辑数据
            setRemark(editingNode.remark || '');
            setIsEnable(editingNode.enable ?? true);
            setProtocol(editingNode.protocol || 'vless');
            setTag(editingNode.tag || '');
            setListen(editingNode.listen || '');
            setPort(String(editingNode.port || ''));
            setTotalTraffic(String((editingNode.total || 0) / (1024 * 1024 * 1024)));
            setExpiryTime(editingNode.expiry ? new Date(editingNode.expiry).toISOString().split('T')[0] : '');

            // 加载协议设置
            if (editingNode.settings) {
                const settings = editingNode.settings;
                if (settings.clients && settings.clients[0]) {
                    const client = settings.clients[0];
                    setUuid(client.id || crypto.randomUUID());
                    setFlow(client.flow || '');
                    setLevel(String(client.level || 0));
                    setEmail(client.email || '');
                    setPassword(client.password || '');
                    setAlterId(String(client.alterId || 0));
                }
                setDecryption(settings.decryption || 'none');

                // Shadowsocks
                if (editingNode.protocol === 'shadowsocks') {
                    setSsMethod(settings.method || 'chacha20-ietf-poly1305');
                    setSsPassword(settings.password || '');
                    setSsNetwork(settings.network || 'tcp,udp');
                }
            }

            // 加载传输层设置
            if (editingNode.streamSettings) {
                const stream = editingNode.streamSettings;
                setNetwork(stream.network || 'tcp');
                setSecurity(stream.security || 'none');

                // WebSocket
                if (stream.wsSettings) {
                    setWsPath(stream.wsSettings.path || '/');
                    setWsHost(stream.wsSettings.headers?.Host || '');
                }

                // gRPC
                if (stream.grpcSettings) {
                    setGrpcServiceName(stream.grpcSettings.serviceName || '');
                    setGrpcMultiMode(stream.grpcSettings.multiMode || false);
                }

                // HTTP/2
                if (stream.httpSettings) {
                    setH2Host(stream.httpSettings.host?.join(',') || '');
                    setH2Path(stream.httpSettings.path || '/');
                }

                // XHTTP
                if (stream.xhttpSettings) {
                    setXhttpMode(stream.xhttpSettings.mode || 'auto');
                    setXhttpPath(stream.xhttpSettings.path || '/');
                    setXhttpHost(stream.xhttpSettings.host || '');
                }



                // Reality
                if (stream.realitySettings) {
                    const rs = stream.realitySettings;
                    setRealityShow(rs.show || false);
                    setRealityDest(rs.dest || 'www.microsoft.com:443');
                    setRealityXver(String(rs.xver || 0));
                    setRealityFingerprint(rs.fingerprint || 'chrome');
                    setRealityServerNames(rs.serverNames?.join('\n') || 'www.microsoft.com');
                    setRealityPrivateKey(rs.privateKey || '');
                    setRealityPublicKey(rs.publicKey || '');
                    setRealityShortIds(rs.shortIds?.join('\n') || '');
                    setRealityMinClientVer(rs.minClientVer || '');
                    setRealityMaxClientVer(rs.maxClientVer || '');
                    setRealityMaxTimeDiff(String(rs.maxTimeDiff || ''));
                }

                // Socket 选项
                if (stream.sockopt) {
                    setTcpFastOpen(stream.sockopt.tcpFastOpen ?? true);
                    setTcpNoDelay(stream.sockopt.tcpNoDelay ?? true);
                }

                setAcceptProxyProtocol(stream.acceptProxyProtocol || false);
            }

        } else if (isOpen) {
            // 重置为默认值
            resetForm();
            // 自动生成 Reality 密钥对（Base64 格式）
            generateRealityKeys();
        }
    }, [isOpen, editingNode]);

    const resetForm = () => {
        setRemark('');
        setIsEnable(true);
        setProtocol('vless');
        setTag('');
        setListen('');
        setPort(String(Math.floor(Math.random() * 50000) + 10000));
        setTotalTraffic('0');
        setExpiryTime('');
        setUuid(generateUUID());
        setFlow('');
        setLevel('0');
        setEmail('');
        setAlterId('0');
        setPassword('');
        setSsMethod('chacha20-ietf-poly1305');
        setSsPassword('');
        setSsNetwork('tcp,udp');
        setDecryption('none');
        setNetwork('tcp');
        setWsPath('/');
        setWsHost('');
        setGrpcServiceName('');
        setGrpcMultiMode(false);
        setH2Host('');
        setH2Path('/');
        setXhttpMode('auto');
        setXhttpPath('/');
        setXhttpHost('');
        setSecurity('none');
        setRealityShow(false);
        setRealityDest('www.microsoft.com:443');
        setRealityXver('0');
        setRealityFingerprint('chrome');
        setRealityServerNames('www.microsoft.com');
        setRealityPrivateKey('');
        setRealityPublicKey('');
        setRealityShortIds('');
        setRealityMinClientVer('');
        setRealityMaxClientVer('');
        setRealityMaxTimeDiff('');
        setAcceptProxyProtocol(false);
        setTcpNoDelay(true);
    };

    const generateRealityKeys = () => {
        // 生成 32 字节随机数据
        const privBytes = crypto.getRandomValues(new Uint8Array(32));
        const pubBytes = crypto.getRandomValues(new Uint8Array(32));

        // 转换为 Base64 (Xray Reality 要求的格式)
        const privBase64 = btoa(String.fromCharCode(...privBytes));
        const pubBase64 = btoa(String.fromCharCode(...pubBytes));

        setRealityPrivateKey(privBase64);
        setRealityPublicKey(pubBase64);
    };

    const generateShortIds = () => {
        // 生成一个 8 位随机十六进制字符串
        const shortId = Array.from(crypto.getRandomValues(new Uint8Array(4)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        setRealityShortIds(shortId);
    };


    const handleConfirm = () => {
        // 验证必填项
        if (!remark.trim()) {
            useDialogStore.getState().showAlert(t('inbound.modal.remark_empty'), t('common.error') || 'Error');
            return;
        }
        if (!port || isNaN(Number(port))) {
            useDialogStore.getState().showAlert(t('inbound.modal.port_error'), t('common.error') || 'Error');
            return;
        }

        // 构建协议设置
        let settings: any = {};

        if (protocol === 'vless' || protocol === 'vmess') {
            if (!uuid) {
                useDialogStore.getState().showAlert(t('inbound.modal.uuid_empty'), t('common.error') || 'Error');
                return;
            }
            settings.clients = [{
                id: uuid,
                ...(flow && protocol === 'vless' && { flow }),
                ...(level && { level: Number(level) }),
                ...(email && { email }),
                ...(protocol === 'vmess' && { alterId: Number(alterId) }),
            }];
            if (protocol === 'vless') {
                settings.decryption = decryption;
            }
        } else if (protocol === 'trojan') {
            if (!password) {
                useDialogStore.getState().showAlert(t('inbound.modal.password_empty'), t('common.error') || 'Error');
                return;
            }
            settings.clients = [{
                password,
                ...(level && { level: Number(level) }),
                ...(email && { email }),
            }];
        } else if (protocol === 'shadowsocks') {
            if (!ssPassword) {
                useDialogStore.getState().showAlert(t('inbound.modal.password_empty'), t('common.error') || 'Error');
                return;
            }
            settings = {
                method: ssMethod,
                password: ssPassword,
                network: ssNetwork,
            };
        }

        // 构建传输层设置
        let streamSettings: any = {
            network,
            security,
        };

        // 添加传输协议特定配置
        if (network === 'ws') {
            streamSettings.wsSettings = {
                path: wsPath,
                ...(wsHost && { headers: { Host: wsHost } }),
            };
        } else if (network === 'grpc') {
            streamSettings.grpcSettings = {
                serviceName: grpcServiceName,
                multiMode: grpcMultiMode,
            };
        } else if (network === 'h2') {
            streamSettings.httpSettings = {
                ...(h2Host && { host: h2Host.split(',').map(h => h.trim()) }),
                path: h2Path,
            };
        } else if (network === 'xhttp') {
            streamSettings.xhttpSettings = {
                mode: xhttpMode,
                path: xhttpPath,
                ...(xhttpHost && { host: xhttpHost }),
            };
        }

        // 添加安全层配置
        if (security === 'reality') {
            if (!realityPrivateKey) {
                useDialogStore.getState().showAlert(t('inbound.modal.reality_private_key_empty'), t('common.error') || 'Error');
                return;
            }
            streamSettings.realitySettings = {
                show: realityShow,
                dest: realityDest,
                xver: Number(realityXver),
                serverNames: realityServerNames.split('\n').filter(s => s.trim()),
                privateKey: realityPrivateKey,
                publicKey: realityPublicKey, // 必须保存公钥，否则无法生成分享链接
                shortIds: realityShortIds.split('\n').filter(s => s.trim()),
                fingerprint: realityFingerprint,
                ...(realityMinClientVer && { minClientVer: realityMinClientVer }),
                ...(realityMaxClientVer && { maxClientVer: realityMaxClientVer }),
                ...(realityMaxTimeDiff && { maxTimeDiff: Number(realityMaxTimeDiff) }),
            };
        }

        // Socket 选项
        if (tcpFastOpen || tcpNoDelay || acceptProxyProtocol) {
            streamSettings.sockopt = {
                ...(tcpFastOpen && { tcpFastOpen: true }),
                ...(tcpNoDelay && { tcpNoDelay: true }),
            };
        }

        if (acceptProxyProtocol) {
            streamSettings.acceptProxyProtocol = true;
        }

        const data: any = {
            id: editingNode?.id || crypto.randomUUID(),
            remark,
            enable: isEnable,
            port: Number(port),
            protocol,
            ...(tag && { tag }),
            ...(listen && { listen }),
            settings,
            streamSettings,
            total: Number(totalTraffic) * 1024 * 1024 * 1024,
            expiry: expiryTime ? new Date(expiryTime).getTime() : 0,
            up: editingNode?.up || 0,
            down: editingNode?.down || 0,
        };

        if (editingNode) {
            updateInbound(data);
        } else {
            addInbound(data);
        }
        closeModal();
    };

    if (!isOpen) return null;



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-bold text-gray-800">
                        {editingNode ? t('inbound.modal.title_edit') : t('inbound.modal.title_add')}
                    </h2>
                    <button onClick={closeModal} className="text-gray-400 hover:text-black transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* 滚动区域 */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar text-black">
                    {/* 基础配置 */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm border-b pb-2">{t('inbound.modal.base_config')}</h3>

                        <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-8 flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">
                                    <span className="text-red-500 mr-1">*</span>{t('inbound.modal.remark')}:
                                </label>
                                <input
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                                    placeholder={t('inbound.modal.remark_placeholder')}
                                />
                            </div>
                            <div className="col-span-4 flex items-center gap-3 justify-end">
                                <label className="text-sm font-bold text-gray-600">{t('inbound.modal.enable')}:</label>
                                <Switch checked={isEnable} onChange={setIsEnable} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">
                                    <span className="text-red-500 mr-1">*</span>{t('inbound.modal.protocol')}:
                                </label>
                                <select
                                    value={protocol}
                                    onChange={(e) => setProtocol(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none cursor-pointer bg-white"
                                    disabled
                                >
                                    <option value="vless">VLESS</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">
                                    <span className="text-red-500 mr-1">*</span>{t('inbound.modal.port')}:
                                </label>
                                <input
                                    value={port}
                                    onChange={(e) => setPort(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                    placeholder={t('inbound.modal.port_placeholder')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.tag')}:</label>
                                <input
                                    value={tag}
                                    onChange={(e) => setTag(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                    placeholder={t('inbound.modal.tag_placeholder')}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.listen')}:</label>
                                <input
                                    value={listen}
                                    onChange={(e) => setListen(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                    placeholder={t('inbound.modal.listen_placeholder')}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.total_traffic')}:</label>
                                <input
                                    value={totalTraffic}
                                    onChange={(e) => setTotalTraffic(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                    placeholder={t('inbound.modal.total_traffic_placeholder')}
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.expiry_time')}:</label>
                                <input
                                    type="date"
                                    value={expiryTime}
                                    onChange={(e) => setExpiryTime(e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none cursor-pointer bg-white"
                                />
                            </div>
                        </div>
                    </div>


                    {/* UUID 和流控 */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm border-b pb-2">{t('inbound.modal.protocol_config')}</h3>

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">
                                <span className="text-red-500 mr-1">*</span>{t('inbound.modal.uuid')}:
                            </label>
                            <input
                                value={uuid}
                                onChange={(e) => setUuid(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono outline-none bg-white"
                            />
                            <button
                                onClick={() => setUuid(generateUUID())}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                            >
                                {t('inbound.modal.generate')}
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.flow')}:</label>
                            <select
                                value={flow}
                                onChange={(e) => setFlow(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                            >
                                <option value="">{t('inbound.modal.flow_none')}</option>
                                <option value="xtls-rprx-vision">xtls-rprx-vision</option>
                            </select>
                            <span className="text-xs text-red-500 font-medium shrink-0">{t('inbound.modal.flow_xhttp_tip')}</span>
                        </div>
                    </div>

                    {/* 传输层配置 */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm border-b pb-2">{t('inbound.modal.stream_config')}</h3>

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.network')}:</label>
                            <select
                                value={network}
                                onChange={(e) => setNetwork(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                            >
                                <option value="tcp">TCP</option>
                                <option value="xhttp">XHTTP</option>
                            </select>
                        </div>

                        {network === 'xhttp' && (
                            <>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.xhttp_mode')}:</label>
                                    <select
                                        value={xhttpMode}
                                        onChange={(e) => setXhttpMode(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                    >
                                        <option value="auto">{t('inbound.modal.xhttp_mode_auto')}</option>
                                        <option value="packet-up">{t('inbound.modal.xhttp_mode_packet')}</option>
                                        <option value="stream-up">{t('inbound.modal.xhttp_mode_stream')}</option>
                                        <option value="stream-one">{t('inbound.modal.xhttp_mode_one')}</option>
                                    </select>
                                    <span className="text-xs text-gray-500 shrink-0">{t('common.default')}: auto</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.xhttp_path')}:</label>
                                    <input
                                        value={xhttpPath}
                                        onChange={(e) => setXhttpPath(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                        placeholder={t('inbound.modal.xhttp_path_placeholder')}
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.xhttp_host')}:</label>
                                    <input
                                        value={xhttpHost}
                                        onChange={(e) => setXhttpHost(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                        placeholder={t('inbound.modal.xhttp_host_placeholder')}
                                    />
                                    <span className="text-xs text-gray-500 shrink-0">{t('inbound.modal.optional')}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 安全层配置 */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm border-b pb-2">{t('inbound.modal.security_config')}</h3>

                        <div className="flex items-center gap-3">
                            <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.security')}:</label>
                            <select
                                value={security}
                                onChange={(e) => {
                                    setSecurity(e.target.value);
                                    // 当选择 Reality 时自动生成短 ID
                                    if (e.target.value === 'reality' && !realityShortIds) {
                                        generateShortIds();
                                    }
                                }}
                                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                            >
                                <option value="none">{t('inbound.modal.security_none')}</option>
                                <option value="reality">Reality</option>
                            </select>
                        </div>



                        {security === 'reality' && (
                            <>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">
                                        <span className="text-red-500 mr-1">*</span>{t('inbound.modal.reality_dest')}:
                                    </label>
                                    <input
                                        value={realityDest}
                                        onChange={(e) => setRealityDest(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                        placeholder={t('inbound.modal.reality_dest_placeholder')}
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.reality_server_names')}:</label>
                                    <textarea
                                        value={realityServerNames}
                                        onChange={(e) => setRealityServerNames(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white resize-none"
                                        rows={2}
                                        placeholder={t('inbound.modal.reality_server_names_placeholder')}
                                    />
                                </div>


                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.reality_fingerprint')}:</label>
                                    <select
                                        value={realityFingerprint}
                                        onChange={(e) => setRealityFingerprint(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm outline-none bg-white"
                                    >
                                        <option value="chrome">Chrome</option>
                                        <option value="firefox">Firefox</option>
                                        <option value="safari">Safari</option>
                                        <option value="edge">Edge</option>
                                    </select>
                                </div>


                                <div className="flex gap-2">
                                    <button
                                        onClick={generateRealityKeys}
                                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-colors"
                                    >
                                        {t('inbound.modal.reality_keys_btn')}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">
                                        <span className="text-red-500 mr-1">*</span>{t('inbound.modal.reality_private_key')}:
                                    </label>
                                    <input
                                        value={realityPrivateKey}
                                        onChange={(e) => setRealityPrivateKey(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono outline-none bg-white"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.reality_public_key')}:</label>
                                    <input
                                        value={realityPublicKey}
                                        onChange={(e) => setRealityPublicKey(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono outline-none bg-white"
                                        readOnly
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-gray-600 w-24 text-right shrink-0">{t('inbound.modal.reality_short_ids')}:</label>
                                    <textarea
                                        value={realityShortIds}
                                        onChange={(e) => setRealityShortIds(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm font-mono outline-none bg-white resize-none"
                                        rows={2}
                                        placeholder={t('inbound.modal.reality_short_ids_placeholder')}
                                    />
                                    <button
                                        onClick={generateShortIds}
                                        className="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors shrink-0"
                                    >
                                        {t('inbound.modal.generate')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>




                    {/* Socket 选项 */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm border-b pb-2">{t('inbound.modal.socket_config')}</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-40 text-right shrink-0">Accept Proxy Protocol:</label>
                                <Switch checked={acceptProxyProtocol} onChange={setAcceptProxyProtocol} />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-40 text-right shrink-0">TCP Fast Open:</label>
                                <Switch checked={tcpFastOpen} onChange={setTcpFastOpen} />
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="text-sm font-bold text-gray-600 w-40 text-right shrink-0">TCP No Delay:</label>
                                <Switch checked={tcpNoDelay} onChange={setTcpNoDelay} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={closeModal}
                        className="px-6 py-2 bg-white text-black rounded-lg text-sm font-bold border border-black hover:bg-gray-50 transition-colors"
                    >
                        {t('inbound.modal.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        {editingNode ? t('common.save') : t('common.add')}
                    </button>
                </div>
            </div>
        </div>
    );
};
