# -*- coding: utf-8 -*-
"""
配置模块 - 集中管理所有可配置项
"""

import os

class Config:
    """全局配置类"""
    
    # ================= 文件路径配置 =================
    # 测试用例输入文件 (由 data/sqltocase/sql.py 自动生成)
    INPUT_FILE = r"D:\apiautotest\data\sqltocase\auto_generated_cases_db.csv"
    # 测试报告输出文件 (输出到 data/output/)
    OUTPUT_FILE = r"D:\apiautotest\data\output\report_result.xlsx"
    
    # ================= 登录接口配置 =================
    # 登录接口地址
    LOGIN_URL = "https://user.binarysee.com.cn/api/iam/sso/login-with-password"
    # 登录账号
    LOGIN_ACCOUNT = "13439427048"
    # 登录密码
    LOGIN_PASSWORD = "Zsh@417418"
    
    # SSO 接口地址（用于 ticket 换取 token，可选）
    # 根据需求文档中的 curl 命令: http://113.44.121.105:8910/sso/login
    SSO_URL = "http://113.44.121.105:8910/sso/login"
    
    # ================= 业务接口配置 =================
    # 问答接口地址
    ASK_URL = "http://52.82.11.208:8050/brain/faq/session/ask"
    # 业务接口的 Origin（防跨域校验）
    ASK_ORIGIN = "http://52.82.11.208:8050"
    # 业务接口的 Referer（防盗链校验）
    ASK_REFERER = "http://52.82.11.208:8050/web-dashboard/"
    
    # 默认租户ID（如果登录接口未返回，使用此默认值）
    DEFAULT_TENANT_ID = "1916705084137349121"
    
    # ================= 机器人配置 =================
    ROBOT_ID = "89040136787200"
    ROBOT_BIZ_ID = 89040136787201
    
    # ================= 并发配置 =================
    # 最大并发线程数（调试时建议设为1，稳定后可改为3）
    MAX_WORKERS = 1
    
    # ================= 超时配置 =================
    # 登录超时时间（秒）
    LOGIN_TIMEOUT = 10
    # 问答接口超时时间（秒）
    ASK_TIMEOUT = 60
    
    # ================= 日志配置 =================
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "%(asctime)s - [%(levelname)s] - %(message)s"
