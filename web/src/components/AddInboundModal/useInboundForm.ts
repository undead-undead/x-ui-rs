import { useState, useEffect } from 'react';
import { generateUUID } from '../../utils/uuid';
import type { Inbound } from '../../types/inbound';

export const useInboundForm = (editingNode: Inbound | null, isOpen: boolean) => {
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
    const [uuid, setUuid] = useState<string>(generateUUID());
    const [flow, setFlow] = useState('');
    const [level, setLevel] = useState('0');
    const [email, setEmail] = useState('');
    const [alterId, setAlterId] = useState('0');
    const [password, setPassword] = useState('');
    const [ssMethod, setSsMethod] = useState('chacha20-ietf-poly1305');
    const [ssPassword, setSsPassword] = useState('');
    const [ssNetwork, setSsNetwork] = useState('tcp,udp');
    const [decryption, setDecryption] = useState('none');

    // === 传输层配置 ===
    const [network, setNetwork] = useState('tcp');
    const [wsPath, setWsPath] = useState('/');
    const [wsHost, setWsHost] = useState('');
    const [grpcServiceName, setGrpcServiceName] = useState('');
    const [grpcMultiMode, setGrpcMultiMode] = useState(false);
    const [h2Host, setH2Host] = useState('');
    const [h2Path, setH2Path] = useState('/');
    const [xhttpMode, setXhttpMode] = useState('auto');
    const [xhttpPath, setXhttpPath] = useState('/');
    const [xhttpHost, setXhttpHost] = useState('');

    // === 安全层配置 ===
    const [security, setSecurity] = useState('none');
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

            if (editingNode.settings) {
                const settings = editingNode.settings;
                if (settings.clients && settings.clients[0]) {
                    const client = settings.clients[0];
                    setUuid(client.id || generateUUID());
                    setFlow(client.flow || '');
                    setLevel(String(client.level || 0));
                    setEmail(client.email || '');
                    setPassword(client.password || '');
                    setAlterId(String(client.alterId || 0));
                }
                setDecryption(settings.decryption || 'none');

                if (editingNode.protocol === 'shadowsocks') {
                    setSsMethod(settings.method || 'chacha20-ietf-poly1305');
                    setSsPassword(settings.password || '');
                    setSsNetwork(settings.network || 'tcp,udp');
                }
            }

            if (editingNode.streamSettings) {
                const stream = editingNode.streamSettings;
                setNetwork(stream.network || 'tcp');
                setSecurity(stream.security || 'none');

                if (stream.wsSettings) {
                    setWsPath(stream.wsSettings.path || '/');
                    setWsHost(stream.wsSettings.headers?.Host || '');
                }

                if (stream.grpcSettings) {
                    setGrpcServiceName(stream.grpcSettings.serviceName || '');
                    setGrpcMultiMode(stream.grpcSettings.multiMode || false);
                }

                if (stream.httpSettings) {
                    setH2Host(stream.httpSettings.host?.join(',') || '');
                    setH2Path(stream.httpSettings.path || '/');
                }

                if (stream.xhttpSettings) {
                    setXhttpMode(stream.xhttpSettings.mode || 'auto');
                    setXhttpPath(stream.xhttpSettings.path || '/');
                    setXhttpHost(stream.xhttpSettings.host || '');
                }

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

                if (stream.sockopt) {
                    setTcpFastOpen(stream.sockopt.tcpFastOpen ?? true);
                    setTcpNoDelay(stream.sockopt.tcpNoDelay ?? true);
                }

                setAcceptProxyProtocol(stream.acceptProxyProtocol || false);
            }
        } else if (isOpen) {
            resetForm();
        }
    }, [isOpen, editingNode]);

    return {
        // 基础配置
        remark, setRemark,
        isEnable, setIsEnable,
        protocol, setProtocol,
        tag, setTag,
        listen, setListen,
        port, setPort,
        totalTraffic, setTotalTraffic,
        expiryTime, setExpiryTime,

        // 协议配置
        uuid, setUuid,
        flow, setFlow,
        level, setLevel,
        email, setEmail,
        alterId, setAlterId,
        password, setPassword,
        ssMethod, setSsMethod,
        ssPassword, setSsPassword,
        ssNetwork, setSsNetwork,
        decryption, setDecryption,

        // 传输层配置
        network, setNetwork,
        wsPath, setWsPath,
        wsHost, setWsHost,
        grpcServiceName, setGrpcServiceName,
        grpcMultiMode, setGrpcMultiMode,
        h2Host, setH2Host,
        h2Path, setH2Path,
        xhttpMode, setXhttpMode,
        xhttpPath, setXhttpPath,
        xhttpHost, setXhttpHost,

        // 安全层配置
        security, setSecurity,
        realityShow, setRealityShow,
        realityDest, setRealityDest,
        realityXver, setRealityXver,
        realityFingerprint, setRealityFingerprint,
        realityServerNames, setRealityServerNames,
        realityPrivateKey, setRealityPrivateKey,
        realityPublicKey, setRealityPublicKey,
        realityShortIds, setRealityShortIds,
        realityMinClientVer, setRealityMinClientVer,
        realityMaxClientVer, setRealityMaxClientVer,
        realityMaxTimeDiff, setRealityMaxTimeDiff,

        // Socket 选项
        acceptProxyProtocol, setAcceptProxyProtocol,
        tcpFastOpen, setTcpFastOpen,
        tcpNoDelay, setTcpNoDelay,

        // 工具方法
        resetForm,
    };
};
