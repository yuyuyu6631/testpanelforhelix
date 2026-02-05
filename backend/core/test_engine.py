# -*- coding: utf-8 -*-
import json
import time
import logging
import requests
from typing import Optional, Any
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from .config import Config

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
logger = logging.getLogger("Backend.TestEngine")

class TestEngine:
    """
    负责执行测试用例：发送问题，解析SSE，提取SQL
    """
    def __init__(self, token: str, tenant_id: str):
        self.headers = {
            'Authorization': token,
            'Tenant-Id': tenant_id,
            'Accept': 'text/event-stream',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Content-Type': 'application/json',
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/144.0.0.0 Safari/537.36'
            ),
            'Origin': Config.ASK_ORIGIN,
            'Referer': f"{Config.ASK_REFERER}0/chat?robotId={Config.ROBOT_ID}"
        }

    def ask_question(self, question: str, row_index: int = 0) -> str:
        # Generate unique chat_id
        chat_id = int(time.time() * 1000) + row_index
        
        payload = {
            "robot_id": Config.ROBOT_ID,
            "robotBizId": Config.ROBOT_BIZ_ID,
            "incremental": False,
            "status": "1",
            "chatId": chat_id,
            "user_input": question,
            "pageNum": 1,
            "pageSize": 10,
            "appId": "0"
        }
        
        try:
            logger.debug(f"Sending question [{row_index}]: {question[:30]}...")
            
            response = requests.post(
                Config.ASK_URL,
                json=payload,
                headers=self.headers,
                verify=False,
                stream=True,
                proxies={"http": None, "https": None},
                timeout=Config.ASK_TIMEOUT
            )
            
            if response.status_code != 200:
                return f"Error: HTTP {response.status_code}"
            
            sql = self._parse_sse_stream(response)
            return sql.strip() if sql else "Error: No SQL found in stream"
            
        except requests.exceptions.Timeout:
            return f"Error: Request timeout ({Config.ASK_TIMEOUT}s)"
        except Exception as e:
            return f"Error: Exception {str(e)}"

    def _parse_sse_stream(self, response: requests.Response) -> Optional[str]:
        # found_sql = None  # Removed unused variable
        for line in response.iter_lines():
            if not line:
                continue
            decoded_line = line.decode('utf-8')
            if not decoded_line.startswith("data:"):
                continue
            
            json_str = decoded_line[5:].strip()
            if json_str == "[DONE]":
                continue
            
            try:
                data_obj = json.loads(json_str)
                sql = self._find_sql_recursively(data_obj)
                if sql and "SELECT" in sql.upper():
                    return sql
            except json.JSONDecodeError:
                pass
        return None

    def _find_sql_recursively(self, obj: Any, depth: int = 0) -> Optional[str]:
        if depth > 10:
            return None
        
        if isinstance(obj, dict):
            if "sql" in obj:
                sql_val = obj["sql"]
                if isinstance(sql_val, str) and sql_val.strip():
                    return sql_val
            
            for key, value in obj.items():
                if isinstance(value, str):
                    clean_sql = self._extract_sql_from_string(value)
                    if clean_sql:
                        return clean_sql
                
                result = self._find_sql_recursively(value, depth + 1)
                if result:
                    return result
                
        elif isinstance(obj, list):
            for item in obj:
                if isinstance(item, str):
                    clean_sql = self._extract_sql_from_string(item)
                    if clean_sql:
                        return clean_sql
                result = self._find_sql_recursively(item, depth + 1)
                if result:
                    return result
        
        return None

    def _extract_sql_from_string(self, text: str) -> Optional[str]:
        if not text:
            return None
        if "sql:" in text:
            parts = text.split("sql:", 1)
            if len(parts) > 1:
                potential = parts[1].strip()
                if "SELECT" in potential.upper():
                    return potential
        
        if text.strip().upper().startswith("SELECT") and "FROM" in text.upper():
            return text.strip()
        return None
