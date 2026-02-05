# -*- coding: utf-8 -*-
"""
调试脚本 - 测试登录流程（修正版）

运行此脚本查看登录接口返回的完整数据结构
"""

import sys
import json
import logging
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# 配置日志
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - [%(levelname)s] - %(message)s')
logger = logging.getLogger("Debug")

# 配置
LOGIN_URL = "https://user.binarysee.com.cn/api/iam/sso/login-with-password"
LOGIN_ACCOUNT = "13439427048"
LOGIN_PASSWORD = "Zsh@417418"
SSO_URL = "http://113.44.121.105:8910/sso/login"

def test_login():
    """测试登录流程"""
    
    # 请求头
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9"
    }
    
    # ========== 步骤1: 登录 ==========
    print("\n" + "="*60)
    print("步骤1: 登录接口")
    print("="*60)
    
    payload = {
        "account": LOGIN_ACCOUNT,
        "password": LOGIN_PASSWORD
    }
    
    response = requests.post(LOGIN_URL, json=payload, headers=headers, verify=False, timeout=10)
    
    print(f"状态码: {response.status_code}")
    
    data = response.json()
    print(f"响应数据:\n{json.dumps(data, ensure_ascii=False, indent=2)}")
    
    # 提取 ticket
    ticket = None
    if "data" in data and isinstance(data["data"], dict):
        ticket = data["data"].get("ticket")
        print(f"\n提取到 ticket: {ticket}")
    
    # ========== 步骤2: SSO 换取 token ==========
    sso_token = None
    sso_tenant_id = None
    
    if ticket:
        print("\n" + "="*60)
        print("步骤2: SSO 接口（使用 ticket 换取 token）")
        print("="*60)
        
        sso_payload = {"ticket": ticket}
        sso_response = requests.post(SSO_URL, json=sso_payload, headers=headers, verify=False, timeout=10)
        
        print(f"状态码: {sso_response.status_code}")
        
        if sso_response.status_code == 200:
            sso_data = sso_response.json()
            print(f"响应数据:\n{json.dumps(sso_data, ensure_ascii=False, indent=2)}")
            
            # SSO 返回的 token 在 data.token 路径
            if "data" in sso_data and isinstance(sso_data["data"], dict):
                sso_token = sso_data["data"].get("token")
                sso_tenant_id = sso_data["data"].get("tenantId")
                print(f"\n提取到:")
                print(f"  - SSO Token: {sso_token}")
                print(f"  - TenantId: {sso_tenant_id}")
    
    # ========== 步骤3: 测试问答接口 ==========
    if sso_token:
        print("\n" + "="*60)
        print("步骤3: 测试问答接口")
        print("="*60)
        
        print(f"使用 Token: {sso_token}")
        print(f"使用 TenantId: {sso_tenant_id}")
        
        ask_url = "http://52.82.11.208:8050/brain/faq/session/ask"
        ask_headers = {
            'Authorization': sso_token,  # 注意：不加 Bearer 前缀！
            'Tenant-Id': str(sso_tenant_id),
            'Accept': 'text/event-stream',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'http://52.82.11.208:8050',
            'Referer': 'http://52.82.11.208:8050/web-dashboard/'
        }
        
        ask_payload = {
            "robot_id": "89040136787200",
            "robotBizId": 89040136787201,
            "incremental": False,
            "status": "1",
            "chatId": 9999999999999,
            "user_input": "测试问题",
            "pageNum": 1,
            "pageSize": 10,
            "appId": "0"
        }
        
        ask_response = requests.post(ask_url, json=ask_payload, headers=ask_headers, verify=False, stream=True, timeout=30)
        
        print(f"\n问答接口状态码: {ask_response.status_code}")
        if ask_response.status_code != 200:
            print(f"错误响应: {ask_response.text[:500]}")
        else:
            print("✓ 问答接口连接成功！")
            # 只读取前几行
            count = 0
            for line in ask_response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    print(f"  {decoded[:150]}...")
                count += 1
                if count >= 5:
                    break
    else:
        print("\n无法获取 SSO token，测试终止！")

if __name__ == "__main__":
    test_login()
