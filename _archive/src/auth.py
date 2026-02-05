# -*- coding: utf-8 -*-
"""
鉴权模块 - 处理自动登录和Token获取

采用 API 直连登录方式，确保稳定性
支持两步登录流程：
1. 用户登录获取 ticket
2. 使用 ticket 换取业务 token
"""

import json
import logging
import requests
from typing import Tuple, Optional
from requests.packages.urllib3.exceptions import InsecureRequestWarning

from .config import Config

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

logger = logging.getLogger("AutoTest.Auth")


class AuthManager:
    """
    鉴权管理器
    
    负责：
    1. 调用登录接口获取 Ticket
    2. 使用 Ticket 换取业务 Token
    3. 从响应中提取 Token 和 TenantId
    4. 处理登录失败的异常情况
    """
    
    def __init__(self):
        self._token: Optional[str] = None
        self._tenant_id: Optional[str] = None
    
    @property
    def token(self) -> Optional[str]:
        """获取当前Token"""
        return self._token
    
    @property
    def tenant_id(self) -> Optional[str]:
        """获取当前TenantId"""
        return self._tenant_id
    
    def login(self) -> Tuple[str, str]:
        """
        执行两步登录流程，返回 (token, tenant_id)
        
        步骤1: 调用登录接口获取 ticket/token
        步骤2: 如果有 SSO 配置，使用 ticket 换取业务 token
        
        Returns:
            Tuple[str, str]: (token, tenant_id)
            
        Raises:
            Exception: 登录失败时抛出异常
        """
        logger.info(f"正在尝试自动登录: {Config.LOGIN_URL}")
        
        # 构建请求体
        payload = {
            "account": Config.LOGIN_ACCOUNT,
            "password": Config.LOGIN_PASSWORD
        }
        
        # 构建请求头（必须模拟浏览器 UA，防止被拦截）
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9"
        }
        
        try:
            # ========== 步骤1: 登录获取 ticket ==========
            response = requests.post(
                Config.LOGIN_URL,
                json=payload,
                headers=headers,
                verify=False,
                proxies={"http": None, "https": None},  # 禁用系统代理
                timeout=Config.LOGIN_TIMEOUT
            )
            
            if response.status_code != 200:
                raise Exception(f"登录失败: HTTP {response.status_code} - {response.text}")
            
            data = response.json()
            logger.debug(f"登录响应数据: {json.dumps(data, ensure_ascii=False, indent=2)}")
            
            # 提取 ticket
            ticket = self._extract_ticket(data)
            
            token = None
            tenant_id = Config.DEFAULT_TENANT_ID
            
            # ========== 步骤2: 使用 ticket 换取业务 token ==========
            if hasattr(Config, 'SSO_URL') and Config.SSO_URL and ticket:
                logger.info(f"使用 ticket 换取业务 token: {Config.SSO_URL}")
                token, tenant_id = self._exchange_ticket_for_token(ticket, headers)
            else:
                # 直接使用登录接口返回的 token
                token = self._extract_token(data, response.headers)
                tenant_id = self._extract_tenant_id(data)
            
            if not token:
                raise Exception(f"无法获取有效 Token，请检查登录配置")
            
            # 保存到实例
            self._token = token
            self._tenant_id = tenant_id
            
            logger.info(f"✓ 登录成功! Token: {token[:15]}... TenantId: {tenant_id}")
            return token, tenant_id
            
        except requests.exceptions.Timeout:
            raise Exception(f"登录超时（{Config.LOGIN_TIMEOUT}秒）")
        except requests.exceptions.RequestException as e:
            raise Exception(f"登录请求失败: {e}")
        except json.JSONDecodeError:
            raise Exception(f"登录响应不是有效的 JSON: {response.text}")
        except Exception as e:
            logger.error(f"登录过程发生严重错误: {e}")
            raise
    
    def _extract_ticket(self, data: dict) -> Optional[str]:
        """
        从登录响应中提取 ticket
        
        Args:
            data: 响应JSON数据
            
        Returns:
            Optional[str]: ticket 或 None
        """
        # 路径1: data -> data -> ticket
        if "data" in data and isinstance(data["data"], dict):
            inner_data = data["data"]
            ticket = inner_data.get("ticket")
            if ticket:
                return ticket
        
        # 路径2: data -> ticket
        return data.get("ticket")
    
    def _exchange_ticket_for_token(self, ticket: str, headers: dict) -> Tuple[str, str]:
        """
        使用 ticket 换取业务 token
        
        根据需求文档中的 curl 命令：
        curl 'http://113.44.121.105:8910/sso/login' --data-raw '{"ticket":"..."}'
        
        注意：SSO 返回的 token 在 data.token 路径，且不需要 Bearer 前缀
        
        Args:
            ticket: 登录获取的 ticket
            headers: 请求头
            
        Returns:
            Tuple[str, str]: (token, tenant_id)
        """
        payload = {"ticket": ticket}
        
        response = requests.post(
            Config.SSO_URL,
            json=payload,
            headers=headers,
            verify=False,
            proxies={"http": None, "https": None},  # 禁用系统代理
            timeout=Config.LOGIN_TIMEOUT
        )
        
        if response.status_code != 200:
            raise Exception(f"SSO 换取 token 失败: HTTP {response.status_code}")
        
        data = response.json()
        logger.debug(f"SSO响应数据: {json.dumps(data, ensure_ascii=False)}")
        
        # SSO 接口的 token 在 data.data.token 路径，且不需要 Bearer 前缀
        token = None
        tenant_id = Config.DEFAULT_TENANT_ID
        
        if "data" in data and isinstance(data["data"], dict):
            inner_data = data["data"]
            token = inner_data.get("token")  # SSO token 不需要 Bearer 前缀
            if "tenantId" in inner_data:
                tenant_id = str(inner_data["tenantId"])
        
        if not token:
            raise Exception(f"SSO 接口未返回有效 token: {data}")
        
        return token, tenant_id
    
    def _extract_token(self, data: dict, response_headers: dict) -> Optional[str]:
        """
        从响应中提取 Token
        
        优先级：
        1. data.data.accessToken / token / access_token
        2. data.accessToken / token / access_token
        3. 响应头 Authorization
        
        Args:
            data: 响应JSON数据
            response_headers: 响应头
            
        Returns:
            Optional[str]: 提取到的Token，如果有tokenType会自动拼接
        """
        token = None
        token_type = None
        
        # 路径1: data -> data -> token
        if "data" in data and isinstance(data["data"], dict):
            inner_data = data["data"]
            token = (
                inner_data.get("accessToken") or 
                inner_data.get("token") or 
                inner_data.get("access_token")
            )
            token_type = inner_data.get("tokenType")
        
        # 路径2: data -> token（根节点）
        if not token:
            token = (
                data.get("accessToken") or 
                data.get("token") or 
                data.get("access_token")
            )
            token_type = data.get("tokenType")
        
        # 路径3: 响应头
        if not token:
            auth_header = response_headers.get("Authorization")
            if auth_header:
                token = auth_header
        
        # 如果有 tokenType（如 Bearer），且 token 没有此前缀，自动拼接
        if token and token_type and not token.startswith(token_type):
            token = f"{token_type} {token}"
        
        return token
    
    def _extract_tenant_id(self, data: dict) -> str:
        """
        从响应中提取 TenantId
        
        如果提取失败，返回默认值
        
        Args:
            data: 响应JSON数据
            
        Returns:
            str: TenantId
        """
        tenant_id = Config.DEFAULT_TENANT_ID
        
        # 路径: data -> data -> tenantId
        if "data" in data and isinstance(data["data"], dict):
            inner_data = data["data"]
            if "tenantId" in inner_data:
                tenant_id = str(inner_data["tenantId"])
        
        # 路径: data -> tenantId（根节点）
        if tenant_id == Config.DEFAULT_TENANT_ID and "tenantId" in data:
            tenant_id = str(data["tenantId"])
        
        return tenant_id
    
    def is_authenticated(self) -> bool:
        """检查是否已登录"""
        return self._token is not None
