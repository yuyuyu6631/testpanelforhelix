#!/bin/bash

# Helix AutoTest 一键部署脚本 (升级版)
# 请在上传完代码后，进入 deploy 目录运行: ./setup.sh

# 目标部署目录
PROJECT_DIR="/var/www/helix"
# 服务运行用户
APP_USER="appuser"

echo "=== [1/6] 检查系统环境 ==="

# 1. 检查 Python3
# 针对 CentOS 8 EOL 的源修复
if grep -q "CentOS Linux 8" /etc/os-release 2>/dev/null; then
    echo "检测到 CentOS 8 (EOL)，正在临时修复 yum 源..."
    # 尝试修复 yum 源指向 vault.centos.org
    sudo sed -i 's/mirrorlist/#mirrorlist/g' /etc/yum.repos.d/CentOS-* 2>/dev/null
    sudo sed -i 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-* 2>/dev/null
fi

if ! command -v python3 &> /dev/null; then
    echo "正在安装 Python3..."
    if command -v yum &> /dev/null; then
        sudo yum install -y python3 python3-pip python3-venv
    else
        sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv
    fi
fi

# 2. 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo "正在安装 Nginx..."
    if command -v yum &> /dev/null; then
        sudo yum install -y epel-release && sudo yum install -y nginx
    else
        sudo apt-get install -y nginx
    fi
    sudo systemctl enable nginx
fi

echo "=== [2/6] 准备部署目录 ==="
# 创建目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "创建 $PROJECT_DIR ..."
    sudo mkdir -p "$PROJECT_DIR"
fi
sudo chown -R $USER:$USER "$PROJECT_DIR"

echo "=== [3/6] 部署代码 ==="
# 获取当前脚本所在目录的上一级目录 (源码根目录)
SOURCE_ROOT=$(dirname "$(pwd)")

# 检查并复制 backend
if [ -d "$SOURCE_ROOT/backend" ]; then
    echo "正在部署 backend ..."
    cp -r "$SOURCE_ROOT/backend" "$PROJECT_DIR/"
else
    echo "错误: 未找到 $SOURCE_ROOT/backend，请确保上传完整。"
fi

# 检查并复制 dist (处理不同的路径可能)
if [ -d "$SOURCE_ROOT/dist" ]; then
    echo "正在部署 dist ..."
    rm -rf "$PROJECT_DIR/dist"
    cp -r "$SOURCE_ROOT/dist" "$PROJECT_DIR/"
elif [ -d "$SOURCE_ROOT/frontend/dist" ]; then
    echo "正在部署 frontend/dist ..."
    rm -rf "$PROJECT_DIR/dist"
    cp -r "$SOURCE_ROOT/frontend/dist" "$PROJECT_DIR/"
else
    echo "警告: 未找到前端构建文件 (dist)，请检查上传路径。"
fi

# 确保权限正确
sudo chown -R $APP_USER:$APP_USER "$PROJECT_DIR"

echo "=== [4/6] 配置 Python 环境 ==="
cd "$PROJECT_DIR"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "虚拟环境已创建。"
fi

if [ -f "backend/requirements.txt" ]; then
    echo "正在安装/更新依赖..."
    ./venv/bin/pip install -r backend/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
fi

echo "=== [5/6] 配置后台服务 ==="
# 假设当前目录已经切回脚本目录或者绝对路径引用
SERVICE_FILE="$SOURCE_ROOT/deploy/helix-backend.service"
if [ -f "$SERVICE_FILE" ]; then
    sudo cp "$SERVICE_FILE" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable helix-backend
    echo "重启后端服务..."
    sudo systemctl restart helix-backend
    # 检查状态
    if systemctl is-active --quiet helix-backend; then
        echo "后端启动成功！"
    else
        echo "后端启动失败，请检查日志: sudo journalctl -u helix-backend -n 20"
    fi
else
    echo "错误: 未找到 service 文件。"
fi

echo "=== [6/6] 配置 Nginx ==="
NGINX_CONF="$SOURCE_ROOT/deploy/nginx.conf"
if [ -f "$NGINX_CONF" ]; then
    sudo cp "$NGINX_CONF" /etc/nginx/conf.d/helix.conf
    # 移除默认配置防止冲突 (如果存在)
    [ -f /etc/nginx/sites-enabled/default ] && sudo rm /etc/nginx/sites-enabled/default
    
    echo "重启 Nginx..."
    sudo systemctl restart nginx
    if systemctl is-active --quiet nginx; then
        echo "Nginx 启动成功！"
    else
        echo "Nginx 启动失败，请检查配置。"
    fi
else
    echo "错误: 未找到 nginx.conf 文件。"
fi

echo "=========================================="
echo "   部署完成！"
echo "   请访问: http://192.168.8.23"
echo "=========================================="
