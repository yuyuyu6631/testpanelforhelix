import os
import re
import json
import time
import logging
import requests
import pandas as pd
import concurrent.futures
from dataclasses import dataclass
from typing import List, Tuple, Optional
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# ================= 配置区域 =================
class Config:
    # 文件路径 (请根据实际情况修改)
    INPUT_FILE = r"D:\apiautotest\需求\52sql提取预期答案版.xlsx"  # 输入文件
    OUTPUT_FILE = "测试报告_Result.xlsx"             # 输出文件
    
    # 登录配置
    LOGIN_URL = "https://user.binarysee.com.cn/api/iam/sso/login-with-password"
    LOGIN_ACCOUNT = "13439427048"
    LOGIN_PASSWORD = "Zsh@417418"
    
    # 业务接口配置
    ASK_URL = "http://52.82.11.208:8050/brain/faq/session/ask"
    TENANT_ID = "1916705084137349121"  # 如果登录接口返回了新的 tenant_id，代码会自动覆盖这个
    
    # 并发设置
    MAX_WORKERS = 1  # 需求文档 V3.0 建议调试时设为 1，稳定后可改为 3

# ================= 日志配置 =================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s'
)
logger = logging.getLogger("AutoTest")

# ================= 1. 鉴权模块 =================
class AuthManager:
    """处理自动登录和 Token 获取"""
    
    @staticmethod
    def login_and_get_token() -> Tuple[str, str]:
        """
        执行登录，返回 (token, tenant_id)
        如果登录失败，抛出异常终止测试
        """
        logger.info(f"正在尝试自动登录: {Config.LOGIN_URL} ...")
        
        payload = {
            "account": Config.LOGIN_ACCOUNT,
            "password": Config.LOGIN_PASSWORD
        }
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        try:
            resp = requests.post(Config.LOGIN_URL, json=payload, headers=headers, verify=False, timeout=10)
            
            if resp.status_code != 200:
                raise Exception(f"登录失败: HTTP {resp.status_code} - {resp.text}")
            
            data = resp.json()
            
            # --- 调试：打印响应结构，方便定位字段 ---
            # logger.info(f"登录响应数据: {json.dumps(data, ensure_ascii=False)}") 
            
            # 假设标准路径 data -> data -> token (根据你的 API 风格猜测)
            # 如果实际路径不同，请在此处修改提取逻辑
            token = None
            tenant_id = Config.TENANT_ID 
            
            # 尝试多种常见的提取路径
            if "data" in data and isinstance(data["data"], dict):
                inner_data = data["data"]
                # 兼容多种字段名：accessToken, token, access_token
                token = inner_data.get("accessToken") or inner_data.get("token") or inner_data.get("access_token")
                
                # 如果有 tokenType (如 Bearer)，自动拼接前缀
                token_type = inner_data.get("tokenType")
                if token and token_type and not token.startswith(token_type):
                    token = f"{token_type} {token}"
                
                # 如果登录返回了 tenant_id，优先使用登录返回的
                if "tenantId" in inner_data:
                    tenant_id = str(inner_data["tenantId"])
                elif "userId" in inner_data:
                    # 备选：如果有些系统用 userId 作为租户标识（视情况而定）
                    # tenant_id = str(inner_data["userId"])
                    pass
            
            if not token:
                 # 备用尝试：直接在根目录
                token = data.get("accessToken") or data.get("token") or data.get("access_token")
            
            if not token:
                raise Exception(f"无法从响应中提取 Token，请检查响应结构: {data}")
                
            logger.info(f"登录成功! Token: {token[:10]}... TenantId: {tenant_id}")
            return token, tenant_id
            
        except Exception as e:
            logger.error(f"登录过程发生严重错误: {e}")
            raise

# ================= 2. 核心逻辑模块 =================
class APIRunner:
    def __init__(self, token, tenant_id):
        self.headers = {
            'Authorization': token,
            'Tenant-Id': tenant_id,
            'Accept': 'text/event-stream',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'http://52.82.11.208:8050',
            'Referer': 'http://52.82.11.208:8050/web-dashboard/'
        }
    
    def ask_question(self, question, row_index) -> str:
        """发送问题并解析 SSE 流，返回 SQL"""
        # 使用时间戳 + 行号确保 chatId 绝对唯一
        chat_id = int(time.time() * 1000) + row_index
        
        payload = {
            "robot_id": "89040136787200",
            "robotBizId": 89040136787201,
            "incremental": False,
            "status": "1",
            "chatId": chat_id,
            "user_input": question,
            "pageNum": 1,
            "pageSize": 10,
            "appId": "0"
        }
        
        try:
            # 必须开启 verify=False 和 stream=True
            response = requests.post(Config.ASK_URL, json=payload, headers=self.headers, 
                                   verify=False, stream=True, timeout=30)
            
            if response.status_code != 200:
                return f"Error: HTTP {response.status_code}"

            full_sql = ""
            
            # 解析 SSE 流
            for line in response.iter_lines():
                if not line: continue
                decoded_line = line.decode('utf-8')
                
                # 寻找包含 "sql" 字段的 JSON
                if decoded_line.startswith("data:"):
                    json_str = decoded_line[5:].strip()
                    try:
                        # 忽略结束标记
                        if json_str == "[DONE]": continue
                        
                        data_obj = json.loads(json_str)
                        
                        # 路径探测：data -> sql 或 data -> data -> sql
                        current_sql = ""
                        if "sql" in data_obj:
                            current_sql = data_obj["sql"]
                        elif "data" in data_obj and isinstance(data_obj["data"], dict):
                            current_sql = data_obj["data"].get("sql", "")
                        
                        # 只有当提取到有内容的 SQL 时才更新
                        if current_sql and "SELECT" in current_sql.upper():
                            full_sql = current_sql
                            
                    except json.JSONDecodeError:
                        pass
            
            if not full_sql:
                return "Error: No SQL found in stream"
                
            return full_sql.strip()

        except Exception as e:
            return f"Error: Exception {str(e)}"

# ================= 3. 校验与执行模块 =================
class Validator:
    @staticmethod
    def validate(actual_sql: str, exp_keywords: str, exp_conditions: str) -> Tuple[bool, str]:
        """
        比对 SQL。
        逻辑：
        1. 预期关键字 (expected_keywords): 检查 SQL 的 SELECT 部分是否包含这些词。
        2. 预期条件 (expected_conditions): 检查 SQL 的 WHERE/JOIN 部分是否包含这些词。
        """
        if actual_sql.startswith("Error"):
            return False, actual_sql
            
        # 标准化：转大写，去多余空格
        sql_upper = actual_sql.upper().replace('\n', ' ').replace('\t', ' ')
        
        # --- 1. 关键字检查 ---
        missing_kws = []
        if pd.notna(exp_keywords) and str(exp_keywords).strip():
            # 支持用 逗号 或 换行 分隔多个关键字
            keywords = re.split(r'[,\n\uff0c]', str(exp_keywords))
            for kw in keywords:
                kw = kw.strip().upper()
                if not kw: continue
                # 简单的字符串包含检查
                if kw not in sql_upper:
                    missing_kws.append(kw)
        
        # --- 2. 条件检查 ---
        missing_conds = []
        if pd.notna(exp_conditions) and str(exp_conditions).strip():
            conds = re.split(r'[,\n\uff0c]', str(exp_conditions))
            for cond in conds:
                cond = cond.strip().upper()
                if not cond: continue
                # 去除预期条件里的引号，避免格式差异 (例如预期 '证券'，实际 "证券")
                clean_cond = cond.replace("'", "").replace('"', "")
                clean_sql = sql_upper.replace("'", "").replace('"', "")
                
                if clean_cond not in clean_sql:
                    missing_conds.append(cond)
        
        # --- 判定结果 ---
        if not missing_kws and not missing_conds:
            return True, "Pass"
        
        error_msg = []
        if missing_kws: error_msg.append(f"缺关键字: {','.join(missing_kws)}")
        if missing_conds: error_msg.append(f"缺条件: {','.join(missing_conds)}")
        
        return False, "; ".join(error_msg)

def run_test():
    # 1. 读取数据
    logger.info(f"读取测试文件: {Config.INPUT_FILE}")
    try:
        if Config.INPUT_FILE.endswith('.csv'):
            df = pd.read_csv(Config.INPUT_FILE)
        else:
            df = pd.read_excel(Config.INPUT_FILE)
    except Exception as e:
        logger.error(f"读取文件失败: {e}")
        return

    # 检查列名
    required_cols = ['问题'] # 至少要有问题列
    if not all(col in df.columns for col in required_cols):
        logger.error(f"CSV 缺少必要列。请确保包含: {required_cols}。当前列: {df.columns}")
        return

    # 2. 自动登录
    try:
        token, tenant_id = AuthManager.login_and_get_token()
    except Exception:
        return # 登录失败直接退出

    runner = APIRunner(token, tenant_id)
    results = []

    # 3. 并发执行
    logger.info(f"开始执行 {len(df)} 条测试用例，并发数: {Config.MAX_WORKERS}...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
        # 封装任务
        future_to_index = {}
        for index, row in df.iterrows():
            question = str(row['问题'])
            if pd.isna(question) or question.strip() == "":
                continue
            future = executor.submit(runner.ask_question, question, index)
            future_to_index[future] = index

        # 处理结果
        completed = 0
        for future in concurrent.futures.as_completed(future_to_index):
            idx = future_to_index[future]
            row = df.iloc[idx]
            
            actual_sql = future.result()
            
            # 获取预期值 (处理 NaN)
            exp_kw = row.get('预期关键字', '')
            exp_cond = row.get('预期条件', '')
            
            # 校验
            is_pass, msg = Validator.validate(actual_sql, exp_kw, exp_cond)
            
            # 收集结果
            results.append({
                "Index": idx + 2, # Excel 行号
                "问题": row['问题'],
                "预期关键字": exp_kw,
                "预期条件": exp_cond,
                "实际生成的SQL": actual_sql,
                "测试结果": "通过" if is_pass else "失败",
                "备注": msg
            })
            
            completed += 1
            if completed % 5 == 0:
                logger.info(f"进度: {completed}/{len(future_to_index)}")

    # 4. 生成报告
    result_df = pd.DataFrame(results)
    # 按原始顺序排序
    result_df = result_df.sort_values(by="Index")
    
    logger.info(f"测试结束。保存报告至: {Config.OUTPUT_FILE}")
    result_df.to_excel(Config.OUTPUT_FILE, index=False)

if __name__ == "__main__":
    run_test()