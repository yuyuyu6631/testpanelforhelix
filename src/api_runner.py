# -*- coding: utf-8 -*-
"""
API交互模块 - 处理问答接口的SSE流式请求

实现：
1. 发送问题到 AI 问答接口
2. SSE 流式解析响应
3. 递归查找 SQL 字段
"""

import json
import time
import logging
import requests
from typing import Optional, Any
from requests.packages.urllib3.exceptions import InsecureRequestWarning

from .config import Config

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

logger = logging.getLogger("AutoTest.APIRunner")


class APIRunner:
    """
    API交互类
    
    负责：
    1. 构建请求头和请求体
    2. 发送 SSE 流式请求
    3. 解析响应并提取 SQL
    """
    
    def __init__(self, token: str, tenant_id: str):
        """
        初始化 API Runner
        
        Args:
            token: 认证 Token
            tenant_id: 租户 ID
        """
        self.headers = {
            'Authorization': token,
            'Tenant-Id': tenant_id,
            'Accept': 'text/event-stream',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'Origin': Config.ASK_ORIGIN,
            'Referer': f"{Config.ASK_REFERER}0/chat?robotId={Config.ROBOT_ID}"
        }
        self._request_count = 0
    
    def ask_question(self, question: str, row_index: int) -> str:
        """
        发送问题并解析 SSE 流，返回 SQL
        
        Args:
            question: 用户问题
            row_index: 行号（用于生成唯一 chatId）
            
        Returns:
            str: 提取到的 SQL 或错误信息
        """
        # 使用时间戳 + 行号确保 chatId 绝对唯一
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
            logger.debug(f"发送问题 [{row_index}]: {question[:30]}...")
            
            # 必须开启 verify=False 和 stream=True
            response = requests.post(
                Config.ASK_URL,
                json=payload,
                headers=self.headers,
                verify=False,
                stream=True,
                proxies={"http": None, "https": None},  # 禁用系统代理
                timeout=Config.ASK_TIMEOUT
            )
            
            if response.status_code != 200:
                error_msg = f"Error: HTTP {response.status_code}"
                logger.warning(f"请求失败 [{row_index}]: {error_msg}")
                return error_msg
            
            # 解析 SSE 流
            sql = self._parse_sse_stream(response, row_index)
            
            if sql:
                logger.debug(f"成功提取SQL [{row_index}]: {sql[:50]}...")
                return sql.strip()
            else:
                return "Error: No SQL found in stream"
            
        except requests.exceptions.Timeout:
            error_msg = f"Error: Request timeout ({Config.ASK_TIMEOUT}s)"
            logger.warning(f"请求超时 [{row_index}]: {error_msg}")
            return error_msg
        except Exception as e:
            error_msg = f"Error: Exception {str(e)}"
            logger.warning(f"请求异常 [{row_index}]: {error_msg}")
            return error_msg
    
    def _parse_sse_stream(self, response: requests.Response, row_index: int) -> Optional[str]:
        """
        解析 SSE 流式响应
        
        Args:
            response: HTTP 响应对象
            row_index: 行号（用于日志）
            
        Returns:
            Optional[str]: 提取到的 SQL
        """
        found_sql = None
        
        for line in response.iter_lines():
            if not line:
                continue
            
            decoded_line = line.decode('utf-8')
            
            # 只处理 data: 开头的行
            if not decoded_line.startswith("data:"):
                continue
            
            json_str = decoded_line[5:].strip()
            logger.debug(f"SSE收到数据: {json_str}")
            
            # 忽略结束标记
            if json_str == "[DONE]":
                continue
            
            try:
                data_obj = json.loads(json_str)
                
                # 递归查找 SQL 字段
                sql = self._find_sql_recursively(data_obj)
                
                if sql and "SELECT" in sql.upper():
                    found_sql = sql
                    logger.info(f"立即返回找到的 SQL: {sql[:30]}...")
                    return found_sql
                    
            except json.JSONDecodeError:
                # 忽略无效的 JSON 行
                pass
        
        return found_sql
    
    def _find_sql_recursively(self, obj: Any, depth: int = 0) -> Optional[str]:
        """
        递归查找 JSON 中的 sql 字段
        
        支持深度嵌套的 JSON 结构
        
        Args:
            obj: 要搜索的对象（dict、list 或其他）
            depth: 当前递归深度（防止无限递归）
            
        Returns:
            Optional[str]: 找到的 SQL 或 None
        """
        # 防止无限递归
        if depth > 10:
            return None
        
        if isinstance(obj, dict):
            # 1. 检查是否存在名为 'sql' 的字段
            if "sql" in obj:
                sql_value = obj["sql"]
                if isinstance(sql_value, str) and sql_value.strip():
                    return sql_value
            
            # 2. 递归搜索所有 value
            for key, value in obj.items():
                # 如果 value 是字符串，尝试检查是否包含 SQL
                if isinstance(value, str):
                    clean_sql = self._extract_sql_from_string(value)
                    if clean_sql:
                        return clean_sql
                
                # 递归
                result = self._find_sql_recursively(value, depth + 1)
                if result:
                    return result
                    
        elif isinstance(obj, list):
            # 递归搜索列表中的每个元素
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
        """从字符串中提取 SQL"""
        if not text:
            return None
            
        # 模式1: 以 "sql:" 开头
        if "sql:" in text:
            # 提取 sql: 之后的部分
            parts = text.split("sql:", 1)
            if len(parts) > 1:
                potential_sql = parts[1].strip()
                if "SELECT" in potential_sql.upper():
                    return potential_sql
        
        # 模式2: 也就是原本就是纯 SQL (包含 SELECT 和 FROM)
        # 但为了避免误判，稍微严格一点
        if text.strip().upper().startswith("SELECT") and "FROM" in text.upper():
            return text.strip()
            
        return None
