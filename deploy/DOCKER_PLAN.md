# Docker 部署方案

由于服务器环境老旧且无 Root 权限（如果服务器装了 Docker），使用 Docker 是最佳选择。我们将构建一个基于 Python 3.9 的轻量级镜像，利用 FastAPI 直接托管前端页面，避开复杂的 Nginx 配置。

## 1. Dockerfile
- **基础镜像**: `python:3.9-slim` (解决 Python 3.6 环境问题)
- **依赖安装**: 利用 pip 镜像源快速安装 `requirements.txt` (版本无需降级！)
- **代码集成**: 
    - 复制 `backend` 代码
    - 复制 `frontend/dist` 静态资源 (复用之前修改的 `main.py` 托管逻辑)
- **启动命令**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## 2. docker-compose.yml
- **服务定义**: `helix-server`
- **端口映射**: `8000:8000`
- **Volume**: 挂载 `data/` 目录以持久化 SQLite 数据库

## 3. 部署脚本 (deploy/docker_up.sh)
- 检查 Docker 环境
- 构建镜像
- 启动服务
