# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import init_db
from .routers import cases, runner, generator, config, reports, templates, tools

# Initialize DB tables
init_db()

app = FastAPI(
    title="API AutoTest Backend",
    description="Backend for Helix AutoTest System",
    version="1.0.0"
)

# 在应用启动时初始化数据库，确保表和 SQLite 文件已创建
@app.on_event("startup")
async def startup_event():
    init_db()

# CORS Configuration
# 开发环境下允许所有来源以支持局域网访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # 当 allow_origins 为 ["*"] 时，allow_credentials 必须为 False
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases.router)
app.include_router(runner.router)
app.include_router(generator.router)
app.include_router(config.router)
app.include_router(reports.router)
app.include_router(templates.router)
app.include_router(tools.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Serve frontend static files (Must be mounted last to not block API routes)
import os
from fastapi.staticfiles import StaticFiles
from fastapi import Request
from fastapi.responses import FileResponse

# Determine dist directory path relative to this file
# backend/app/main.py -> backend/app -> backend -> parent -> dist (if structure is standard)
# But standard deployment puts `backend` and `dist` in same parent dir.
# So from `backend/app` we go up two levels to `backend`, then up one to parent, then into `dist`.
# Wait, `main.py` is in `backend/app/`.
# `backend` is `backend/`.
# `dist` is sibling of `backend` in deployment.
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dist")

if os.path.exists(DIST_DIR):
    print(f"Mounting static files from {DIST_DIR}")
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")
else:
    print(f"Warning: Dist directory not found at {DIST_DIR}. Frontend will not be served.")
    @app.get("/")
    def read_root():
        return {"message": "Welcome to API AutoTest Backend (Frontend not found)"}
