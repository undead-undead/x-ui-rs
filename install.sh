#!/bin/bash

red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
plain='\033[0m'

# Check Root
[[ $EUID -ne 0 ]] && echo -e "${red}错误: 必须使用 root 用户运行此脚本！${plain}" && exit 1

# Detect Arch
arch=$(arch)
if [[ $arch == "x86_64" || $arch == "x64" || $arch == "amd64" ]]; then
    arch="amd64"
elif [[ $arch == "aarch64" || $arch == "arm64" ]]; then
    arch="arm64"
else
    echo -e "${red}未检测到支持的系统架构: ${arch}${plain}"
    exit 1
fi

echo -e "${green}系统架构: ${arch}${plain}"

# Global Config
INSTALL_PATH="/usr/local/x-ui"
BIN_PATH="$INSTALL_PATH/bin/x-ui-backend"
XRAY_BIN_PATH="$INSTALL_PATH/bin/xray"
ENV_FILE="$INSTALL_PATH/.env"
SERVICE_FILE="/etc/systemd/system/x-ui.service"

RELEASE_URL="https://github.com/undead-undead/x-ui-rs/releases/download/v0.1.5/x-ui-linux-${arch}.tar.gz"

install_dependencies() {
    if [[ -f /usr/bin/apt ]]; then
        apt update -y
        apt install -y curl wget tar unzip
    elif [[ -f /usr/bin/yum ]]; then
        yum install -y curl wget tar unzip
    fi
}

enable_bbr() {
    echo -e "${yellow}正在检测 BBR 状态...${plain}"
    if sysctl net.ipv4.tcp_congestion_control | grep -q bbr; then
        echo -e "${green}BBR 已开启！${plain}"
        return
    fi

    echo -e "${yellow}正在尝试开启 BBR...${plain}"
    echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
    echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
    sysctl -p
    if sysctl net.ipv4.tcp_congestion_control | grep -q bbr; then
        echo -e "${green}BBR 开启成功！${plain}"
    else
        echo -e "${red}BBR 开启失败，您的内核可能不支持。建议升级内核。${plain}"
    fi
}

install_xray() {
    if [[ -f "$XRAY_BIN_PATH" ]]; then
        echo -e "${green}检测到 Xray Core 已存在，跳过安装${plain}"
        return
    fi

    echo -e "${green}正在安装 Xray Core...${plain}"
    local xray_arch=""
    if [[ $arch == "amd64" ]]; then
        xray_arch="64"
    elif [[ $arch == "arm64" ]]; then
        xray_arch="arm64-v8a"
    fi
    
    local xray_zip="Xray-linux-${xray_arch}.zip"
    # 使用官方最新版
    local xray_url="https://github.com/XTLS/Xray-core/releases/latest/download/${xray_zip}"
    
    echo -e "${yellow}下载地址: ${xray_url}${plain}"
    wget -N --no-check-certificate -q -O /tmp/xray.zip $xray_url
    
    if [[ $? -ne 0 ]]; then
        echo -e "${red}Xray Core 下载失败，请检查网络连接！${plain}"
        return 1
    fi
    
    mkdir -p /tmp/xray_temp
    unzip -o /tmp/xray.zip -d /tmp/xray_temp
    mv /tmp/xray_temp/xray $XRAY_BIN_PATH
    chmod +x $XRAY_BIN_PATH
    rm -rf /tmp/xray_temp /tmp/xray.zip
    echo -e "${green}Xray Core 安装完成${plain}"
}

install_x_ui() {
    echo -e "${green}开始安装 X-UI...${plain}"
    install_dependencies

    # Stop service if running
    systemctl stop x-ui 2>/dev/null

    # Create dirs
    mkdir -p $INSTALL_PATH/bin
    mkdir -p $INSTALL_PATH/data
    mkdir -p $INSTALL_PATH/logs

    # Download X-UI
    if [[ ! -f "x-ui-linux-${arch}.tar.gz" ]]; then
        echo -e "${yellow}正在下载发布包: ${RELEASE_URL}${plain}"
        wget -N --no-check-certificate -O x-ui-linux-${arch}.tar.gz $RELEASE_URL
        
        if [[ $? -ne 0 ]]; then
            echo -e "${red}下载失败，请检查网络连接或手动上传 x-ui-linux-${arch}.tar.gz${plain}"
            return 1
        fi
    fi

    # Extract
    tar -zxvf x-ui-linux-${arch}.tar.gz -C $INSTALL_PATH
    chmod +x $BIN_PATH
    
    # Install Xray
    install_xray

    # Init .env with default user inputs
    if [[ ! -f $ENV_FILE ]]; then
        read -p "请输入面板端口 (默认: 8080): " port
        [[ -z $port ]] && port="8080"
        
        read -p "请输入面板根路径 (直接回车使用根路径 /，不推荐自定义): " web_root
        [[ -z $web_root ]] && web_root="/"
        
        # Random JWT secret
        jwt_secret=$(cat /proc/sys/kernel/random/uuid)
        
        cat > $ENV_FILE <<EOF
DATABASE_URL=sqlite://$INSTALL_PATH/data/x-ui.db
JWT_SECRET=$jwt_secret
JWT_EXPIRATION_HOURS=24
SERVER_HOST=0.0.0.0
SERVER_PORT=$port
XRAY_BIN_PATH=$XRAY_BIN_PATH
XRAY_CONFIG_PATH=$INSTALL_PATH/data/xray.json
WEB_ROOT=$web_root
WEB_DIST_PATH=$INSTALL_PATH/bin/dist
RUST_LOG=info
EOF
    fi

    # Create Service
    cat > $SERVICE_FILE <<EOF
[Unit]
Description=X-UI Service
After=network.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_PATH
ExecStart=$BIN_PATH
Restart=always
User=root
EnvironmentFile=$INSTALL_PATH/.env

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    
    # Auto Enable BBR
    enable_bbr

    # 确保数据目录和数据库文件存在 (修复 musl SQLite 兼容性问题)
    mkdir -p $INSTALL_PATH/data
    touch $INSTALL_PATH/data/x-ui.db
    chmod 755 $INSTALL_PATH/data
    chmod 644 $INSTALL_PATH/data/x-ui.db

    systemctl enable x-ui
    systemctl start x-ui
    
    # 等待服务启动
    sleep 2
    
    # 设置初始账户密码
    echo -e "${green}正在设置管理员账户...${plain}"
    read -p "请输入管理员用户名 (默认: admin): " admin_user
    [[ -z $admin_user ]] && admin_user="admin"
    
    read -s -p "请输入管理员密码 (默认: admin): " admin_pass
    echo
    [[ -z $admin_pass ]] && admin_pass="admin"
    
    # 使用后端命令行工具设置账户
    cd $INSTALL_PATH
    $BIN_PATH -u "$admin_user" -p "$admin_pass" 2>/dev/null || echo -e "${yellow}注意: 账户设置可能需要手动执行${plain}"


    # Install x-ui management script
    cat > /usr/bin/x-ui <<'EOF'
#!/bin/bash
red='\033[0;31m'
green='\033[0;32m'
yellow='\033[0;33m'
plain='\033[0m'

INSTALL_PATH="/usr/local/x-ui"
ENV_FILE="$INSTALL_PATH/.env"
BIN_PATH="$INSTALL_PATH/bin/x-ui-backend"

check_root() {
    [[ $EUID -ne 0 ]] && echo -e "${red}错误: 必须使用 root 用户运行此脚本！${plain}" && exit 1
}

# 辅助函数：修改 .env
update_env() {
    local key=$1
    local val=$2
    if grep -q "^${key}=" $ENV_FILE; then
        sed -i "s|^${key}=.*|${key}=${val}|" $ENV_FILE
    else
        echo "${key}=${val}" >> $ENV_FILE
    fi
}

start() { systemctl start x-ui && echo -e "${green}X-UI 已启动${plain}"; }
stop() { systemctl stop x-ui && echo -e "${green}X-UI 已停止${plain}"; }
restart() { systemctl restart x-ui && echo -e "${green}X-UI 已重启${plain}"; }
status() { systemctl status x-ui; }

# 设置端口
set_port() {
    read -p "请输入新端口: " port
    [[ -z $port ]] && echo -e "${red}端口不能为空${plain}" && return
    update_env "SERVER_PORT" "$port"
    restart
    echo -e "${green}端口已修改为: $port${plain}"
}

# 设置 Web Root
set_web_root() {
    read -p "请输入面板根路径 (例如 /panel，默认为 /): " path
    [[ -z $path ]] && path="/"
    update_env "WEB_ROOT" "$path"
    restart
    echo -e "${green}根路径已修改为: $path${plain}"
    echo -e "${yellow}注意：修改根路径可能需要配合前端构建配置，否则可能会出现白屏。${plain}"
}

# 设置账户
set_account() {
    read -p "请输入新用户名: " username
    read -p "请输入新密码: " password
    [[ -z $username || -z $password ]] && echo -e "${red}用户名或密码不能为空${plain}" && return
    
    cd $INSTALL_PATH
    $BIN_PATH -u "$username" -p "$password"
    echo -e "${green}账户信息已更新${plain}"
}

# 卸载
uninstall() {
    read -p "确定要卸载 X-UI 吗？[y/N]: " confirm
    if [[ $confirm == "y" || $confirm == "Y" ]]; then
        systemctl stop x-ui
        systemctl disable x-ui
        rm -f /etc/systemd/system/x-ui.service
        rm -f /usr/bin/x-ui
        rm -rf $INSTALL_PATH
        systemctl daemon-reload
        echo -e "${green}X-UI 已卸载${plain}"
    else
        echo -e "${yellow}已取消卸载${plain}"
    fi
}

# BBR
enable_bbr() {
    if sysctl net.ipv4.tcp_congestion_control | grep -q bbr; then
        echo -e "${green}BBR 已经开启${plain}"
    else
        echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
        echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
        sysctl -p
        echo -e "${green}BBR 已开启${plain}"
    fi
}

show_menu() {
    echo -e "
  ${green}X-UI 管理脚本${plain}
  ${green}0.${plain} 退出脚本
  ${green}1.${plain} 启动 X-UI
  ${green}2.${plain} 停止 X-UI
  ${green}3.${plain} 重启 X-UI
  ${green}4.${plain} 查看状态
  ${green}5.${plain} 修改面板端口
  ${green}6.${plain} 修改面板根路径
  ${green}7.${plain} 修改账户密码
  ${green}8.${plain} 开启 BBR 加速
  ${green}9.${plain} 查看运行日志
  ${green}10.${plain} 卸载 X-UI
 "
    read -p "请输入选择 [0-10]: " num
    case $num in
        0) exit 0 ;;
        1) start ;;
        2) stop ;;
        3) restart ;;
        4) status ;;
        5) set_port ;;
        6) set_web_root ;;
        7) set_account ;;
        8) enable_bbr ;;
        9) journalctl -u x-ui -f ;;
        10) uninstall ;;
        *) echo -e "${red}请输入正确的数字 [0-10]${plain}" ;;
    esac
}

check_root
if [[ $# > 0 ]]; then
    case $1 in
        start) start ;;
        stop) stop ;;
        restart) restart ;;
        status) status ;;
        install_bbr) enable_bbr ;;
        uninstall) uninstall ;;
        *) show_menu ;;
    esac
else
    show_menu
fi
EOF
    
    chmod +x /usr/bin/x-ui
    
    # 获取公网IP (尝试多个源)
    public_ip=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me/ip || echo "YOUR_IP")
    
    # 从 .env 读取端口和根路径
    current_port=$(grep "SERVER_PORT" $ENV_FILE | cut -d '=' -f2)
    [[ -z $current_port ]] && current_port="8080"
    
    current_web_root=$(grep "WEB_ROOT" $ENV_FILE | cut -d '=' -f2)
    [[ -z $current_web_root ]] && current_web_root="/"

    echo -e ""
    echo -e "${green}X-UI 安装成功！${plain}"
    echo -e "${green}----------------------------------------------${plain}"
    echo -e "访问地址: ${yellow}http://${public_ip}:${current_port}${current_web_root}${plain}"
    echo -e "管理用户: ${yellow}${admin_user}${plain}"
    echo -e "管理密码: ${yellow}${admin_pass}${plain}"
    echo -e "管理菜单: ${yellow}x-ui${plain}"
    echo -e "${green}----------------------------------------------${plain}"
    echo -e "${yellow}如果是云服务器，请务必确保防火墙/安全组已放行 ${current_port} 端口${plain}"
}

# Install Entry
install_x_ui
