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
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8001",
    "*"  # Disable in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
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

@app.get("/")
def read_root():
    return {"message": "Welcome to API AutoTest Backend"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
