#!/bin/bash

# Helix AutoTest 用户级启动脚本 (离线 Miniconda 版)
# 适用于: 离线环境、无 root 权限、已通过 install_offline_full.sh 安装依赖

# 部署目录 (当前脚本的上级目录的假设为 deploy，再上一级为项目根目录)
PROJECT_DIR=$(dirname "$(dirname "$(readlink -f "$0")")")
CONDA_DIR="$HOME/miniconda3"

echo "=== [非 Root 模式] 启动服务 ==="
echo "工作目录: $PROJECT_DIR"

# 1. 激活 Miniconda 环境
if [ -d "$CONDA_DIR" ]; then
    echo "激活 Miniconda 环境..."
    source "$CONDA_DIR/bin/activate"
else
    echo "警告: 未找到 Miniconda ($CONDA_DIR)，尝试使用系统 Python..."
fi

# 2. 检查依赖是否已安装 (简单检查)
# 我们假设 install_offline_full.sh 已经运行过，这里不再尝试联网安装
if ! python -c "import fastapi" 2>/dev/null; then
    echo "错误: 缺少必要的 Python 依赖 (fastapi)。"
    echo "请先运行 ./install_offline_full.sh 安装所有依赖。"
    exit 1
fi

# 3. 启动服务 (后台运行)
echo "启动服务 (端口 8000)..."

cd "$PROJECT_DIR"
# 杀死旧进程 (如果有)
pkill -f "uvicorn app.main:app" 2>/dev/null

# 启动新进程
# 使用 nohup 后台运行，日志输出到 backend.log
cd backend
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &

PID=$!
echo "----------------------------------------"
echo "服务已启动！进程ID: $PID"
echo "日志文件: $PROJECT_DIR/backend.log"
echo "访问地址: http://$(hostname -I | awk '{print $1}'):8000"
echo "----------------------------------------"
