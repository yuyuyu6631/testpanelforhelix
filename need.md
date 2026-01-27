1. 系统架构设计 (System Architecture)
为了实现“微调”和“界面化”，我们需要将之前的脚本逻辑剥离为后端服务，并增加前端页面。
• 前端 (Frontend): React + Ant Design或者nodejs+element。用于展示表格、图表、配置表单。
• 后端 (Backend): Python FastAPI (或 Flask)。利用你现有的 Python 基础，直接复用 testfile.py 和 validator.py 的逻辑。
• 数据层 (Data): SQLite (轻量级，无需安装) 或 MySQL。用于存储测试用例、配置项和历史报告，不再单纯依赖 Excel。

2. 核心功能模块设计
针对你的需求，我们将系统分为四个核心模块：
模块一：用例管理中心 (Case Management)
目标：替代 Excel 手动修改，实现“测试细节微调”。
• 功能点：
• 在线编辑：像 Excel 一样在网页上直接编辑 Prompt、预期SQL、预期结果。
• 参数微调：为特定用例单独设置 chatId 前缀或特定参数，而不必修改代码。
• 导入/导出：保留 V3.0 的功能，支持 Excel/CSV 批量上传到数据库。
• 用例标记：可以开启/禁用某条用例（is_active 字段），测试时只跑选中的用例。
模块二：环境与配置面板 (Config & Tuning)
目标：将 src/config.py 和 Header 伪装逻辑界面化。
• 功能点：
• Token 管理：提供一个输入框更新 User Token，后端自动处理 Bearer 拼接。
• 请求头定制：界面上提供 Key-Value 表单，允许你动态修改 User-Agent、Referer 或 Origin，以此应对不同的风控策略，无需重启服务。
• 并发控制：一个滑动条（Slider）调整 ThreadPoolExecutor 的 max_workers（例如 1~10 线程）。
• 数据库连接配置：在界面配置测试库的连接串（用于 SQL 校验）。
模块三：执行控制台 (Execution Dashboard)
目标：可视化运行 run_batch_test.py。
• 功能点：
• 一键运行：点击“开始测试”按钮。
• 实时进度条：利用 WebSocket 或 轮询，前端实时显示“已完成 10/100 条...”。
• 实时日志：在网页右侧展示类似 PyCharm 控制台的日志（如：Login Success, Checking SQL...），方便出错时立即暂停。
模块四：可视化报告 (Visual Reporting)
目标：替代 report_result.xlsx 的静态查看。
• 功能点：
• 仪表盘：饼图展示 成功/失败/跳过 率。
• SQL 差异对比：使用“代码对比视图（Diff View）”高亮显示 预期 SQL 和 实际解析 SQL的差异（解决引号、空格导致的人眼难辨问题）。
• 历史回溯：点击历史记录，查看上一次 V3.0 跑测的结果。

3. 技术落地路线图
第一步：后端改造 (FastAPI 示例)
你需要将原本的脚本封装成 API 接口。
目录结构建议：
backend/
├── app/
│   ├── main.py            # FastAPI 入口
│   ├── models.py          # 数据库模型 (SQLAlchemy)
│   ├── schemas.py         # Pydantic 模型
│   └── routers/           # 路由
│       ├── cases.py       # 用例增删改查
│       └── runner.py      # 执行测试的接口
├── core/
│   ├── test_engine.py     # 原 testfile.py 的类化封装
│   └── validator.py       # 原 validator.py
└── data/                  # 存放 SQLite db






# 智能接口自动化测试平台需求规格说明书 (V4.0 - Web 平台版)

**版本**: V4.0
**状态**: 待开发
**目标**: 将基于 Python 脚本的测试工具升级为 B/S 架构的可视化管理平台，解决配置繁琐、报告不直观、无法实时监控等痛点。

---

## 1. 系统架构设计 (Architecture)

采用 **前后端分离** 架构，将现有的业务逻辑封装为 API 服务。

* **前端 (Frontend)**:
* **技术栈**: React + Ant Design (或 Vue 3 + Element Plus)。
* **职责**: 提供用户交互界面，通过 HTTP/WebSocket 与后端通信，渲染图表和日志。


* **后端 (Backend)**:
* **技术栈**: Python FastAPI。
* **核心逻辑**: 复用 V3.0 的 `APIRunner` (请求)、`Validator` (校验) 和 `AuthManager` (鉴权)。
* **异步处理**: 使用 `BackgroundTasks` 或 `Celery` 处理批量测试任务。


* **数据层 (Database)**:
* **技术栈**: SQLite (推荐，单文件易部署) 或 MySQL。
* **ORM**: SQLAlchemy 或 Tortoise-ORM。



---

## 2. 核心功能模块详细需求

### 2.1 模块一：用例管理中心 (Test Case Management)

*不再依赖修改 Excel 文件，实现数据库级别的用例管理。*

* **功能列表**:
1. **用例列表展示**: 分页展示测试用例，字段包括：ID、问题 (Question)、预期关键字、预期条件、优先级、启用状态。
2. **CRUD 操作**:
* **新增/编辑**: 弹窗表单，支持录入问题及多行预期结果。
* **删除**: 支持单条和批量删除。
* **状态切换**: 提供开关 (Switch)，一键启用/禁用某条用例（`is_active`），测试时仅执行启用的用例。


3. **Excel 导入/导出**:
* **导入**: 上传 V3.0 格式的 Excel，后端解析并存入数据库（去重逻辑：按“问题”字段去重）。
* **导出**: 将数据库中的用例导出为 `.xlsx` 文件。





### 2.2 模块二：配置与环境微调 (Configuration Dashboard)

*将 `src/config.py` 中的常量转化为动态可配置的数据库字段，支持热更新。*

* **功能列表**:
1. **鉴权参数配置**:
* **Token 覆写**: 提供文本域输入临时 Token。若为空，后端自动走 `AuthManager` 的登录逻辑。
* **账号密码管理**: 界面可修改登录用的手机号和密码（加密存储）。


2. **风控与请求头微调**:
* **Headers编辑器**: Key-Value 表格，允许动态添加/修改 `User-Agent`、`Referer`、`Origin`，应对突发风控。


3. **运行策略配置**:
* **并发数控制**: 滑块 (Slider) 调节 `MAX_WORKERS` (范围 1-20)。
* **超时设置**: 设置单条用例的 Timeout 时间。





### 2.3 模块三：执行控制台 (Execution Console)

*核心痛点解决：替代命令行，提供可视化的运行过程。*

* **功能列表**:
1. **任务触发**: “开始测试”按钮。点击后，后端在后台线程启动 `ThreadPoolExecutor`。
2. **实时进度监控**:
* **进度条**: 实时显示 `已完成 / 总数` (例如: 45/100)。
* **状态指示**: 运行中、已完成、已停止。


3. **实时日志流 (Log Stream)**:
* 利用 **WebSocket** 或 **SSE (Server-Sent Events)** 技术。
* 前端展示类似 IDE 的黑色控制台窗口。
* **内容**: 实时打印 `[INFO] Case 1001: Pass`, `[ERROR] Case 1002: Timeout` 等信息。


4. **紧急停止**: “终止任务”按钮，强制停止当前的线程池任务。



### 2.4 模块四：可视化测试报告 (Visual Reporting)

*替代 `report_result.xlsx` 的静态查看，提供深度分析。*

* **功能列表**:
1. **测试概览 (Dashboard)**:
* **饼图**: 成功 vs 失败 vs 跳过。
* **耗时分析**: 本次测试总耗时、平均接口响应时间。


2. **详细结果列表**:
* 表格展示：ID、问题、测试结果 (Tag: Pass/Fail)、备注。
* **筛选**: 仅看失败用例。


3. **SQL 智能对比视图 (Diff View) [重点]**:
* 点击某条结果，弹出详情模态框。
* **左侧**: 预期结果 (关键字/条件)。
* **右侧**: 实际生成的 SQL (支持 SQL 语法高亮)。
* **差异高亮**: 使用 Diff 算法高亮显示不一致的部分（解决肉眼难以区分单双引号、空格差异的问题）。


4. **历史报告归档**: 查看过往的测试批次记录。



---

## 3. 数据库设计 (Schema Design)

建议使用以下三张核心表：

### 3.1 `test_cases` (用例表)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Integer (PK) | 自增主键 |
| `question` | String | 测试问题 (必填) |
| `expected_kw` | Text | 预期关键字 (逗号分隔) |
| `expected_cond` | Text | 预期条件 |
| `is_active` | Boolean | 是否启用 (默认 True) |
| `create_time` | DateTime | 创建时间 |

### 3.2 `test_reports` (报告主表)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Integer (PK) | 批次 ID |
| `batch_no` | String | 批次号 (如 20260126-1030) |
| `total_count` | Integer | 总用例数 |
| `pass_count` | Integer | 通过数 |
| `status` | Enum | Running / Completed / Stopped |

### 3.3 `test_results` (结果详情表)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | Integer (PK) |  |
| `report_id` | Integer (FK) | 关联报告主表 |
| `case_id` | Integer (FK) | 关联用例表 |
| `actual_sql` | Text | AI 生成的 SQL |
| `result_status` | String | PASS / FAIL / ERROR |
| `error_msg` | Text | 失败原因或异常堆栈 |

### 3.4 `system_config` (配置表)

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `key` | String (PK) | 配置键 (如 `user_token`) |
| `value` | Text | 配置值 |
| `description` | String | 描述 |

---

## 4. 接口 API 定义 (Draft)

后端 `FastAPI` 需要提供的核心接口：

* **配置管理**:
* `GET /api/config` : 获取当前配置
* `POST /api/config` : 更新配置 (并发数, Token)


* **用例管理**:
* `GET /api/cases` : 获取用例列表 (支持分页)
* `POST /api/cases/upload` : 上传 Excel 导入
* `PATCH /api/cases/{id}` : 更新单个用例状态/内容


* **测试执行**:
* `POST /api/test/run` : 启动测试 (异步)
* `POST /api/test/stop` : 停止测试
* `GET /api/test/status` : 轮询获取当前进度
* `WS /api/ws/logs` : WebSocket 接口，推送实时日志


* **报告查询**:
* `GET /api/reports` : 获取历史报告列表
* `GET /api/reports/{id}/details` : 获取某次测试的详细结果



---

## 5. 开发路线图 (Roadmap)

1. **Phase 1: 核心服务化 (Backend First)**
* 搭建 FastAPI 脚手架。
* 将 `src/auth.py`, `src/api_runner.py` 改造为 Class 调用方式。
* 实现 SQLite 数据库模型，并写好 CRUD 接口。


2. **Phase 2: 基础前端搭建 (Frontend Basic)**
* 初始化 React/Vue 项目。
* 实现“用例管理”页面 (表格展示 + 导入 Excel)。


3. **Phase 3: 执行与通信 (The Hard Part)**
* 后端实现 `ThreadPoolExecutor` 的状态回调机制。
* 前端接入 WebSocket/轮询，实现进度条和日志窗口。


4. **Phase 4: 报告与优化 (UI Polish)**
* 实现 SQL Diff 对比视图。
* 美化 Dashboard 图表。
* 添加配置管理页面。


