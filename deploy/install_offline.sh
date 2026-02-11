#!/bin/bash

# Helix AutoTest 离线安装脚本
# 需配合 prepare_offline_pack.ps1 使用
# 请确保 offline_packages 文件夹已上传到当前目录

PROJECT_DIR=$(dirname "$(dirname "$(readlink -f "$0")")")
OFFLINE_DIR="$PROJECT_DIR/deploy/offline_packages"
CONDA_DIR="$HOME/miniconda3"
ENV_NAME="helix-env"

echo "=== [离线模式] 开始部署 ==="

# 检查离线包
if [ ! -d "$OFFLINE_DIR" ]; then
    echo "错误: 未找到 offline_packages 目录。"
    echo "请先在本地运行 prepare_offline_pack.ps1，并将生成的文件夹上传到 deploy 目录下。"
    exit 1
fi

# 1. 安装 Miniconda
if [ ! -d "$CONDA_DIR" ]; then
    echo "[1/3] 安装 Miniconda..."
    INSTALLER="$OFFLINE_DIR/miniconda.sh"
    if [ ! -f "$INSTALLER" ]; then
        echo "错误: 未找到 miniconda.sh"
        exit 1
    fi
    bash "$INSTALLER" -b -p "$CONDA_DIR"
    echo "Miniconda 安装完成。"
else
    echo "[1/3] Miniconda 已存在，跳过。"
fi

# 2. 激活并配置环境
echo "[2/3] 配置 Python 环境..."
source "$CONDA_DIR/bin/activate"

if ! conda info --envs | grep -q "$ENV_NAME"; then
    # 离线创建环境（这里稍微有点 trick，conda create -n xxx python=3.9 默认需要联网）
    # 如果完全离线，建议直接用 base 环境或者尝试 clone
    # 为了简化，我们直接使用 base 环境 (就一个应用，没关系)
    echo "使用 base 环境进行配置..."
else
    source activate "$ENV_NAME"
fi

# 3. 离线安装依赖
echo "[3/3] 安装依赖 (从 offline_packages)..."
pip install --no-index --find-links="$OFFLINE_DIR" -r "$PROJECT_DIR/backend/requirements.txt"

# 4. 启动服务
echo "=== 启动服务 ==="
cd "$PROJECT_DIR"
pkill -f "uvicorn app.main:app" 2>/dev/null

cd backend
# 确保使用 conda 环境的 python
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &

echo "部署成功！"
echo "日志: backend.log"
