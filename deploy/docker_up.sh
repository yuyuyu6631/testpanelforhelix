#!/bin/bash

# 容器一键启动脚本 (兼容 Docker/Podman)
# 请在 deploy 目录下运行此脚本

echo "=== [容器部署] 正在构建镜像并启动服务 ==="

DOCKER_CMD="docker"
DOCKER_COMPOSE_CMD=""

# 1. 检查容器引擎
if command -v docker &> /dev/null; then
    echo "使用引擎: Docker"
    DOCKER_CMD="docker"
elif command -v podman &> /dev/null; then
    echo "使用引擎: Podman"
    DOCKER_CMD="podman"
    # Podman 需要设置不用 sudo
    export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
else
    echo "错误: 未找到 docker 或 podman 命令。"
    exit 1
fi

# 2. 检查 Compose 工具
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif command -v podman-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="podman-compose"
elif $DOCKER_CMD compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="$DOCKER_CMD compose"
else
    echo "警告: 未找到 docker-compose 或 podman-compose。"
    echo "尝试手动单机启动..."
    
    # 手动模式 (无 compose / 兼容老版本 Podman)
    echo "使用兼容模式构建镜像..."
    # 尝试显式拉取基础镜像 (如果网络不通，这步也会挂，但值得尝试)
    $DOCKER_CMD pull docker.io/library/python:3.9-slim 2>/dev/null
    
    $DOCKER_CMD build -t helix-server -f Dockerfile ..
    
    echo "清理旧容器..."
    $DOCKER_CMD rm -f helix-server 2>/dev/null
    
    echo "启动容器 (Host 网络模式)..."
    # 使用 --net=host 规避老版本 Podman 的网络/端口映射问题
    # 移除 --restart always (老版本可能不支持无 root 的自启)
    $DOCKER_CMD run -d \
        --name helix-server \
        --net=host \
        -v $(pwd)/../data:/app/data \
        helix-server
        
    if [ $? -eq 0 ]; then
        echo "=== 部署成功 (兼容模式) ==="
        echo "请访问: http://192.168.8.23:8000"
        echo "查看日志: $DOCKER_CMD logs -f helix-server"
        exit 0
    else
        echo "部署失败"
        exit 1
    fi
fi

# 3. 使用 Compose 启动 (如果 check 到了 compose 但运行失败，也会回退)
echo "使用工具: $DOCKER_COMPOSE_CMD"
$DOCKER_COMPOSE_CMD down 2>/dev/null
if ! $DOCKER_COMPOSE_CMD up -d --build; then
    echo "Compose 启动失败，尝试回退到兼容模式..."
    $DOCKER_CMD build -t helix-server -f Dockerfile .. && \
    $DOCKER_CMD run -d --name helix-server --net=host -v $(pwd)/../data:/app/data helix-server
fi
