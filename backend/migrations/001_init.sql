-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_version INTEGER NOT NULL DEFAULT 1,  -- 密码版本号,用于 Token 失效
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 入站节点表
CREATE TABLE IF NOT EXISTS inbounds (
    id TEXT PRIMARY KEY,
    remark TEXT NOT NULL,
    protocol TEXT NOT NULL,
    port INTEGER NOT NULL,
    enable BOOLEAN DEFAULT 1,
    settings TEXT,
    stream_settings TEXT,
    sniffing TEXT,
    tag TEXT,
    listen TEXT,
    allocate TEXT,
    up BIGINT DEFAULT 0,
    down BIGINT DEFAULT 0,
    total BIGINT DEFAULT 0,
    expiry BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 面板设置表
CREATE TABLE IF NOT EXISTS panel_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    listen_ip TEXT DEFAULT '',
    port INTEGER DEFAULT 33789,
    web_root TEXT DEFAULT '/',
    ssl_cert_path TEXT DEFAULT '',
    ssl_key_path TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_inbounds_enable ON inbounds(enable);
CREATE INDEX IF NOT EXISTS idx_inbounds_protocol ON inbounds(protocol);

-- 默认管理员 (用户名: admin, 密码: admin - 需要后续修改)
-- 这是临时密码，首次运行后会自动使用 Argon2 重新哈希
INSERT OR IGNORE INTO users (id, username, password_hash) 
VALUES (1, 'admin', 'temporary');

-- 默认面板配置
INSERT OR IGNORE INTO panel_settings (id, listen_ip, port, web_root)
VALUES (1, '', 33789, '/');
