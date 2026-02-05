# -*- coding: utf-8 -*-
import os
from typing import Dict, Any

class Config:
    """全局配置类"""
    
    # 默认配置字典 (用于兜底和类型转换参考)
    DEFAULTS = {
        # 登录
        "LOGIN_URL": "https://user.binarysee.com.cn/api/iam/sso/login-with-password",
        "LOGIN_ACCOUNT": "13439427048",
        "LOGIN_PASSWORD": "Zsh@417418",
        "SSO_URL": "http://113.44.121.105:8910/sso/login",
        # 业务
        "ASK_URL": "http://52.82.11.208:8050/brain/faq/session/ask",
        "ASK_ORIGIN": "http://52.82.11.208:8050",
        "ASK_REFERER": "http://52.82.11.208:8050/web-dashboard/",
        "DEFAULT_TENANT_ID": "1916705084137349121",
        # 机器人
        "ROBOT_ID": "89040136787200",
        "ROBOT_BIZ_ID": "89040136787201",
        # 系统
        "ASK_TIMEOUT": "60",
        "MAX_WORKERS": "5",
        # 文件路径
        "INPUT_FILE": r"D:\apiautotest\data\sqltocase\auto_generated_cases_db.csv",
        "OUTPUT_FILE": r"D:\apiautotest\data\output\report_result.xlsx"
    }

    # 动态配置缓存
    _cache: Dict[str, Any] = {}

    @classmethod
    def get(cls, key: str, default=None) -> Any:
        # 1. 优先从手动覆写的缓存中取
        if key in cls._cache:
            return cls._cache[key]
        
        # 2. 从环境变量取
        env_val = os.getenv(key)
        if env_val is not None:
            return env_val
            
        # 3. 返回默认值
        return cls.DEFAULTS.get(key, default)

    # 兼容旧代码的静态属性访问 (通过 __getattr__ 比较麻烦，这里保留常用属性映射)
    @property
    def LOGIN_URL(self): return self.get("LOGIN_URL")
    
    # ... 为了兼容性，实际使用时建议改为 Config.get('KEY') 或者在启动时加载到类属性
    
    @classmethod
    def load_from_db(cls, db_session):
        """从数据库加载配置到缓存"""
        from ..app.models import SystemConfig
        try:
            configs = db_session.query(SystemConfig).all()
            for cfg in configs:
                cls._cache[cfg.key] = cfg.value
        except Exception as e:
            print(f"Failed to load config from DB: {e}")

# 实例化单例
config = Config()

# 兼容旧代码的直接引用方式 (Monkey Patch style or explicit assignment)
# 这样旧代码 Config.LOGIN_URL 仍有效 (但它是不可变的字符串，除非我们重写 Config 类结构)
# 现阶段为了少改动代码，我们动态替换类属性
def refresh_config(db_session=None):
    if db_session:
        Config.load_from_db(db_session)
    
    for key, default_val in Config.DEFAULTS.items():
        val = Config.get(key)
        # 类型转换
        if key.endswith("TIMEOUT") or key == "ROBOT_BIZ_ID" or key == "MAX_WORKERS":
            try:
                val = int(val)
            except:
                pass
        setattr(Config, key, val)

# 初始加载
refresh_config()
