# Helix AutoTest - Docker/Podman 离线部署指南

如果您的服务器无法访问外网或手动安装环境太麻烦，使用 Docker (或 Podman) 是最简单的方案。

---

## 步骤 1：本地构建镜像

在**本地开发机**上操作：

1.  **构建前端**：
    在 `frontend` 目录运行：
    ```bash
    npm install
    npm run build
    ```
    *(这一步会生成 `frontend/dist` 文件夹)*

2.  **构建 Docker 镜像**：
    在项目**根目录**下运行：
    ```bash
    # 使用 docker-compose 构建 (推荐)
    docker-compose -f deploy/docker-compose.yml build
    
    # 或者手动 docker build
    docker build -t helix-server:latest -f deploy/Dockerfile .
    ```

3.  **保存镜像为文件**：
    将构建好的镜像导出为 `.tar` 包，以便离线传输：
    ```bash
    docker save -o helix-server.tar helix-server:latest
    ```

---

## 步骤 2：上传到服务器

将以下文件上传到服务器的 `~/helix` 目录：
1.  `helix-server.tar` (刚导出的镜像包)
2.  `deploy/docker-compose.yml`
3.  `deploy/docker_up.sh` (辅助启动脚本)

---

## 步骤 3：服务器端加载与启动

在服务器上操作：

1.  **加载镜像**：
    ```bash
    # 如果用 Podman (推荐 CentOS 8)
    podman load -i helix-server.tar

    # 如果用 Docker
    docker load -i helix-server.tar
    ```

2.  **启动服务**：
    使用提供的辅助脚本自动检测环境并启动：
    ```bash
    cd deploy
    chmod +x docker_up.sh
    ./docker_up.sh
    ```

    或者手动运行：
    ```bash
    # 使用 docker-compose (需安装)
    docker-compose -f docker-compose.yml up -d

    # 或者直接 run (Podman/Docker 通用)
    podman run -d --name helix-server \
      -p 8000:8000 \
      -v ~/helix/data:/app/data \
      --restart always \
      helix-server:latest
    ```

3.  **验证**：
    访问 `http://<服务器IP>:8000`

---

## 常见问题 (Podman)

CentOS 8 默认自带 Podman（Docker 的替代品）。
如果遇到 `docker-compose not found`，请直接使用 `podman run` 命令（脚本 `docker_up.sh` 会自动处理）。
