# -*- coding: utf-8 -*-
"""
用例自动生成服务 (Case Generator Service)
从业务数据库提取元数据，自动生成测试用例并写入本地数据库。
"""

import random
import urllib.parse
import logging
from typing import List, Dict, Tuple
from sqlalchemy import create_engine, text

logger = logging.getLogger("Backend.CaseGenerator")


# ==========================================
# 1. 业务数据库配置
# ==========================================
class BusinessDBConfig:
    """业务数据库连接配置 (MySQL)"""
    HOST = "39.101.74.52"
    PORT = 33356
    USER = "root"
    PASSWORD = "ly_root@passWd2025"
    DATABASE = "RSTAB"

    @classmethod
    def get_connection_url(cls) -> str:
        encoded_password = urllib.parse.quote_plus(cls.PASSWORD)
        return f"mysql+pymysql://{cls.USER}:{encoded_password}@{cls.HOST}:{cls.PORT}/{cls.DATABASE}?charset=utf8mb4"


# ==========================================
# 2. 业务规则定义
# ==========================================
TABLE_CATEGORY_MAP = {
    'A_SHARE_FINANCIAL_DATA': 'financial_statements',
    'A_SHARE_EOD_VALUATION': 'valuation',
    'A_SHARE_EOD_VALUATION_PERCENTILE': 'valuation',
    'A_SHARE_DIVIDEND_DERIVED': 'dividend',
    'A_SHARE_ACCUMULATED_DIVIDEND': 'dividend',
    'A_SHARE_EOD_PRICES': 'market',
    'A_SHARE_EOD_DERIVED_INDICATOR': 'market',
    'A_SHARE_SALES_SEGMENT': 'main_business',
    'A_SHARE_FINANCIAL_PREDICTION_DATA': 'prediction'
}

# 问句模板库
QUESTION_TEMPLATES = [
    {"txt": "{company}的{indicator}是多少", "time": "10y"},
    {"txt": "查一下{company}的{indicator}", "time": "10y"},
    {"txt": "{company}最近一年的{indicator}走势", "time": "1y"},
    {"txt": "{company}最新的{indicator}", "time": "latest"},
    {"txt": "2023年{company}的{indicator}", "time": "2023"},
]


# ==========================================
# 3. 数据提取服务
# ==========================================
class DataFetcher:
    """从业务数据库提取公司和指标元数据"""
    
    SQL_INDICATORS = f"""
    SELECT 
        COLUMN_CNAME as name,
        COLUMN_NAME as code,
        TABLE_NAME as table_name
    FROM TABLE_DICT
    WHERE 
        TABLE_NAME IN ({', '.join([f"'{t}'" for t in TABLE_CATEGORY_MAP.keys()])})
        AND COLUMN_CNAME IS NOT NULL
        AND COLUMN_NAME NOT IN (
            'S_INFO_WINDCODE', 'TRADE_DT', 'OBJECT_ID', 'CREATE_TIME', 'UPDATE_TIME', 
            'ID', 'S_INFO_CODE', 'S_INFO_NAME', 'S_INFO_COMPNAME', 'CRNCY_CODE',
            'S_SEGMENT_ITEMNAME', 'S_SEGMENT_ITEMCODE', 'S_SEGMENT_ITEMCODE_ENAME',
            'FISCAL_YEAR', 'REPORT_PERIOD', 'ANNUAL_CUM_CASH_DIV_TIMES', 'STATUS', 'IS_COVER',
            'REMOVE_FLAG', 'BEGIN_YEAR', 'BEGIN_DATE', 'END_DATE', 'rn'
        )
    """
    
    SQL_COMPANIES = """
    SELECT S_INFO_NAME as name, S_INFO_WINDCODE as symbol
    FROM A_SHARE_DESCRIPTION
    WHERE STATUS = 1 
    LIMIT 100
    """
    
    def __init__(self):
        self.engine = None
        try:
            # 检查依赖
            try:
                import pymysql
            except ImportError:
                logger.error("缺失依赖: pymysql。无法连接 MySQL 业务数据库。")
                print("! 警告: 缺失依赖 pymysql，请运行 'pip install pymysql'")
                return

            url = BusinessDBConfig.get_connection_url()
            # 增加连接超时和重试配置
            self.engine = create_engine(
                url, 
                pool_recycle=3600, 
                connect_args={"connect_timeout": 5}
            )
            # 尝试执行一个简单的心跳查询
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"业务数据库连接成功: {BusinessDBConfig.HOST}")
        except Exception as e:
            logger.error(f"业务数据库连接失败 ({BusinessDBConfig.HOST}): {e}")
            self.engine = None
    
    def fetch_metadata(self) -> Tuple[List[Dict], List[Dict]]:
        """提取指标和公司列表"""
        if not self.engine:
            logger.warning("由于数据库引擎未初始化，跳过元数据提取")
            return [], []
        
        try:
            with self.engine.connect() as conn:
                logger.info("正在执行指标提取查询...")
                # 提取指标
                result_ind = conn.execute(text(self.SQL_INDICATORS))
                indicators = [
                    {"name": row[0], "code": row[1], "table": row[2], 
                     "category": TABLE_CATEGORY_MAP.get(row[2], 'other')}
                    for row in result_ind
                ]
                
                logger.info(f"已提取 {len(indicators)} 个指标，正在提取公司...")
                # 提取公司
                result_corp = conn.execute(text(self.SQL_COMPANIES))
                companies = [{"name": row[0], "symbol": row[1]} for row in result_corp]
                
                logger.info(f"数据提取完成: 指标 {len(indicators)} 个, 公司 {len(companies)} 家")
                return indicators, companies
        except Exception as e:
            logger.error(f"执行 SQL 提取元数据失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return [], []


# ==========================================
# 4. 用例生成服务
# ==========================================
class CaseGeneratorService:
    """用例生成核心服务"""
    
    @staticmethod
    def generate_cases(indicators: List[Dict], companies: List[Dict], 
                       count_per_indicator: int = 2) -> List[Dict]:
        """
        生成测试用例列表
        
        Args:
            indicators: 指标列表
            companies: 公司列表
            count_per_indicator: 每个指标生成几条用例
            
        Returns:
            用例字典列表
        """
        cases = []
        
        for ind in indicators:
            ind_name = ind['name']
            ind_code = ind['code']
            category = ind['category']
            
            # 随机抽取公司
            sample_corps = random.sample(companies, min(len(companies), count_per_indicator))
            
            for corp in sample_corps:
                corp_name = corp['name']
                corp_symbol = corp['symbol']
                
                # 随机选择问句模板
                tmpl = random.choice(QUESTION_TEMPLATES)
                question = tmpl['txt'].format(company=corp_name, indicator=ind_name)
                
                # 生成关键字和条件
                keywords = ",".join([corp_name, corp_symbol, ind_name, ind_code])
                conditions = ""
                if tmpl['time'] == 'latest':
                    conditions = "ORDER BY,LIMIT 1"
                elif tmpl['time'] == '2023':
                    conditions = "2023"
                
                cases.append({
                    "question": question,
                    "expected_keywords": keywords,
                    "expected_conditions": conditions,
                    "category": category,
                    "is_active": True
                })
        
        return cases
    
    @staticmethod
    def generate_and_save(db_session, count_per_indicator: int = 2) -> int:
        """
        生成用例并直接保存到数据库
        
        Args:
            db_session: SQLAlchemy 数据库会话
            count_per_indicator: 每个指标生成几条
            
        Returns:
            生成的用例数量
        """
        from ..app.models import TestCase
        
        # 1. 提取元数据
        fetcher = DataFetcher()
        indicators, companies = fetcher.fetch_metadata()
        
        if not indicators or not companies:
            logger.warning("元数据为空，无法生成用例")
            return 0
        
        # 2. 生成用例
        cases = CaseGeneratorService.generate_cases(indicators, companies, count_per_indicator)
        
        # 3. 写入数据库
        count = 0
        for case_data in cases:
            db_case = TestCase(
                question=case_data['question'],
                expected_keywords=case_data['expected_keywords'],
                expected_conditions=case_data['expected_conditions'],
                category=case_data.get('category'),
                is_active=True
            )
            db_session.add(db_case)
            count += 1
        
        db_session.commit()
        logger.info(f"成功生成并保存 {count} 条用例")
        return count
