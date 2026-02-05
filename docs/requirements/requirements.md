
# 接口自动化测试开发需求文档 (V3.0 - 最终实现版)

## 1. 项目概述

* **目标**：针对问答机器人接口 (`/brain/faq/session/ask`) 开发自动化测试脚本，验证 AI 根据自然语言生成的 SQL 语句是否符合预期。
* **核心策略**：采用 **API 直连登录** 获取鉴权凭证，使用 **SSE 流式解析** 获取响应，通过 **多线程并发** 执行 Excel 中的测试用例，并生成测试报告。

## 2. 核心模块设计需求

### 2.0 智能用例生成模块 (Smart Case Generation)

* **功能描述**：连接业务数据库，读取基础元数据（指标、公司），结合业务模板自动批量生成问答测试用例。
* **脚本位置**：`data/sqltocase/sql.py`
* **实现逻辑**：
    1. **数据源连接**：直连 MySQL 数据库 (`RSTAB`)读取指标和公司列表。
    2. **规则映射**：基于 `TABLE_CATEGORY_MAP` 映射业务分类。
    3. **模板生成**：组合“公司”与“指标”生成自然语言问句。
* **输出产物**：`data/sqltocase/auto_generated_cases_db.csv`
* **字段定义** (适配校验模块)：
    * `query`: 自动生成的自然语言问句。
    * `keywords`: **强制匹配关键字**，由 `[公司名, 股票代码, 指标名, 指标Code]` 自动拼接而成 (如 `"万科A,000002.SZ,市盈率,PE"`)。
    * `conditions`: **逻辑匹配条件**，根据时间范围 (`available_date`) 和 SQL 语法的特殊片段生成 (如 `"20231231", "ORDER BY"`).

### 2.1 鉴权模块 (Authentication)

不再使用 UI 自动化，改为接口直连，以确保绝对的稳定性。

* **登录接口地址**：`https://user.binarysee.com.cn/api/iam/sso/login-with-password`
* **请求方式**：`POST`
* **请求头**：
* `Content-Type`: `application/json`
* `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36` (必须模拟，防止拦截)


* **输入参数**：
* 账号：`13439427048`
* 密码：`Zsh@417418`


* **响应处理逻辑**：
1. **Token 提取**：优先查找 `accessToken` (驼峰) 或 `access_token`。自动识别 `tokenType` 并拼接 `Bearer` 前缀。
2. **Tenant-Id 提取**：从登录响应的 `data.data.tenantId` 中提取。如果提取失败，使用默认值 `1916705084137349121`。
3. **异常处理**：若登录非 200 或提取不到 Token，必须立即终止测试并报错。



### 2.2 业务交互模块 (Ask API Interaction)

解决流式输出和风控校验问题。

* **业务接口地址**：`http://52.82.11.208:8050/brain/faq/session/ask`
* **请求方式**：`POST` (开启流式 `stream=True`)
* **关键请求头 (必须包含)**：
* `Authorization`: `<Token>` (直接透传，视情况是否加 Bearer)
* `Tenant-Id`: `<TenantId>`
curl 'http://113.44.121.105:8910/sso/login' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7' \
  -H 'Content-Type: application/json;charset=UTF-8' \
  -H 'Origin: http://113.44.121.105' \
  -H 'Proxy-Connection: keep-alive' \
  -H 'Referer: http://113.44.121.105/' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' \
  --data-raw '{"ticket":"KAZ9sD80rnbC79DGYQ9osKuoSErSdhXWR2uypkCyB2Jgx4rgtobfZGP9pIxvSS8m"}' \
  --insecure
这个接口可以获取到租户id
* `Accept`: `text/event-stream` (声明接收流)
* **`Origin`**: `http://52.82.11.208:8050` (关键：防跨域校验)
* **`Referer`**: `http://52.82.11.208:8050/web-dashboard/0/chat...` (必须包含具体路径)
* **网络配置**：显式禁用系统代理 (`proxies={"http": None...}`)，防止本地代理导致超时。


* **参数构造**：
* `chatId`: **必须唯一**。实现方式：`当前时间戳(毫秒) + 行号`，防止服务器视作重复请求。
* `user_input`: 从 Excel 读取的问题。
* `incremental`: `false`


* **响应解析 (SSE Parsing)**：
* 按行读取 (`iter_lines`)。
* 过滤空行和心跳包。
* 识别 `data:` 开头的行，解析 JSON。
* 忽略 `[DONE]` 结束标记。
* **提取目标**：递归查找 JSON 中的 `sql` 字段。支持从**字符串值**中提取（如 `"sql: SELECT..."`）。一旦找到包含 `SELECT` 关键字的 SQL，即视为有效结果。



### 2.3 校验与断言模块 (Validation)

实现模糊匹配，而非严格的字符串相等。

* **输入数据Source**：
    * 承接 2.0 模块生成的 `auto_generated_cases_db.csv`。
    * 必须包含列：`query` (问题), `keywords` (预期关键字), `conditions` (预期条件)。
* **匹配策略调整**：
    * **多维度校验**：不仅校验关键词存在，还需校验 SQL 结构是否符合 Time/Chart 逻辑。
    * **分隔符处理**：`keywords` 和 `conditions` 支持使用英文逗号 `,` 或分号 `;` 分割多个值。
* **预处理**：
* 将实际 SQL 和预期内容统一转为 **大写**。
* 去除实际 SQL 中的换行符、多余空格。
* 去除预期条件和**实际生成的 SQL** 中的引号（如 `'证券'` 处理为 `证券`），避免因单双引号差异导致失败。


* **校验逻辑**：
1. **关键字校验**：预期关键字列表（逗号分隔）中的**每一个**词，都必须存在于实际 SQL 中。
2. **条件校验**：预期条件列表（逗号分隔）中的**每一个**片段，都必须存在于实际 SQL 中。


* **结果判定**：仅当关键字和条件全部匹配时，结果为“通过”；否则为“失败”，并记录缺失的内容。

### 2.4 执行与报告模块 (Execution & Report)

* **脚本入口**: `d:\apiautotest\run_batch_test.py`
* **功能特性**: 支持读取 Excel/CSV，自动生成带样式的 Excel 报告。

* **并发执行**：使用 `ThreadPoolExecutor` 实现多线程并发（建议调试时 `MAX_WORKERS=1`，稳定后 `MAX_WORKERS=3`）。
* **异常容错**：单个用例执行失败（如网络超时、解析错误）不应中断整体测试，应在报告中记录 "Error"。
* **输出产物**：
* 格式：Excel (`.xlsx`)
* 包含字段：`Index`, `问题`, `预期关键字`, `预期条件`, `实际生成的SQL`, `测试结果` (通过/失败), `备注` (失败原因)。



---

## 3. 环境与配置要求

### 3.1 运行环境

* Python 3.8+
* 依赖库：
```bash
pip install requests pandas openpyxl

```



### 3.2 配置文件结构 (`Config` 类)

代码中应包含以下可配置项，方便后续切换环境：

```python
class Config:
    INPUT_FILE = "路径/测试用例.xlsx"
    OUTPUT_FILE = "路径/测试报告.xlsx"
    LOGIN_URL = "..."
    LOGIN_ACCOUNT = "..."  # 13439427048
    LOGIN_PASSWORD = "..." # Zsh@417418
    ASK_URL = "..."
    MAX_WORKERS = 1  # 并发控制

```

---

## 4. 关键风险与应对 (FAQ)

* **Q: 为什么没返回数据？**
* **A**: 99% 是因为请求头缺少 `Origin` 或 `Referer`，或者 Token 过期。新代码已强制加上这些头。


* **Q: 为什么 SQL 提取不到？**
* **A**: AI 响应可能是分段的（流式）。代码逻辑必须是“持续监听流，直到找到包含 SQL 的那一段数据”，而不是只读第一行。


* **Q: chatId 重复怎么办？**
* **A**: 代码已改为 `int(time.time() * 1000) + index`，确保每次请求 ID 唯一。