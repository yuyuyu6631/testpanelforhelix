# 🤖 Helix AutoTest: 智能接口自动化测试平台 (V6.0)

[![Backend](https://img.shields.io/badge/Backend-FastAPI-green.svg)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React_18-blue.svg)](https://react.dev/)
[![Status](https://img.shields.io/badge/Status-Beta-orange.svg)]()

> 一款专为 AI 机器人设计的高级自动化测试平台。
> 从 V6.0 开始，项目由传统的 Python 脚本完整演进为 **FastAPI + React** 的现代化全栈系统。

---

## 🏗️ 核心架构
本系统采用 **后端引擎(Engine) + Web 控制台(UI)** 的解耦设计：

- **后端 ($8001$)**: 提供多并发测试执行、SSE 解析、SQL 提取及业务库元数据同步。
- **前端 ($3000$)**: 提供用例管理看板、实时执行监控、Diff 报告可视化。

> 📌 **架构详情请参见**：[Architecture_V6.md](./docs/Architecture_V6.md)

---

## 🌟 关键特性 (V6.0+)
- 🧠 **智能用例生成** - 直接从业务库提取指标元数据，自动填充提问并建立校验点。
- ⚡ **实时运行监控** - 基于 WebSocket 实时推送每一个用例的执行状态和 SQL 对比。
- 🔍 **防抖检索与筛选** - 毫秒级响应海量测试用例的搜索与多维度（模块/优先级）过滤。
- 📊 **交互式报告** - 在线查看 SQL 差异高亮，支持离线 Excel 报告导出。
- 🛠️ **一体化管理** - “执行即管理”，一键触发选中项或全量项的回归测试。

---

## 📂 目录结构
```text
apiautotest/
├── backend/                # FastAPI 后端源码
│   ├── app/                # 业务路由与 Schema 定义
│   └── core/               # 核心执行引擎与验证逻辑
├── frontend/               # React 前端源码
│   ├── src/pages/          # 各业务功能页面
│   └── vite.config.ts      # 前后端对齐配置
├── data/                   # 本地存储 (SQLite + Excel 报告)
├── docs/                   # 核心设计文档与接口方案
└── start_project.py        # 【推荐】一键启动脚本
```

---

## 🚀 快速启动
1. **安装环境**：
   ```bash
   pip install -r requirements.txt
   npm install --prefix frontend
   ```
2. **一键运行**：
   运行根目录下的 `start_project.py`，它将自动启动后端服务及前端开发服务器。

---

## 🛠️ 技术栈
- **后端**: FastAPI, SQLAlchemy, Pydantic, WebSocket
- **前端**: React 18, TypeScript, Ant Design 5, Zustand, TanStack Query
- **数据**: SQLite (本地), MySQL (业务库集成)
