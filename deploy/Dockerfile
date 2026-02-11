# 使用官方 Python 3.9 轻量版镜像
FROM docker.io/library/python:3.9-slim

# 设置工作目录
WORKDIR /app

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 替换 apt 源为清华源 (加快构建速度)
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list && \
    sed -i 's/security.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y gcc python3-dev && \
    rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY backend/requirements.txt ./requirements.txt

# 安装依赖 (使用清华源)
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY backend ./backend

# 复制前端编译好的静态文件 (假设 build 上下文包含 frontend/dist)
# 注意：docker build 上下文应该是项目根目录
COPY frontend/dist ./dist

# 设置环境变量
ENV PYTHONPATH=/app/backend

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
