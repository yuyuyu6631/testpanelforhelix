# -*- coding: utf-8 -*-
"""
脚本名称: 数据库驱动的自动用例生成器 (DB-to-Case)
功能描述: 连接业务数据库，读取基础数据（公司、指标），结合业务逻辑自动批量生成问答测试用例。
适用场景: 自动化测试数据准备，解决手动编写用例效率低的问题。
"""

import pandas as pd
from sqlalchemy import create_engine, text
import random
import urllib.parse
import sys
import os

# ==========================================
# 1. 数据库连接配置 (DB Config)
# ==========================================
class DBConfig:
    # 默认配置 (可根据实际环境修改)
    HOST = "39.101.74.52"  # 数据库IP
    PORT = 33356           # 端口
    USER = "root"          # 用户名
    PASSWORD = "ly_root@passWd2025"  # 密码
    DATABASE = "RSTAB"     # 数据库名

    @staticmethod
    def get_connection_url():
        """
        生成 SQLAlchemy 连接字符串，处理特殊字符
        """
        # 对密码进行 URL 编码，防止特殊字符（如 @）导致连接解析错误
        encoded_password = urllib.parse.quote_plus(DBConfig.PASSWORD)
        return f"mysql+pymysql://{DBConfig.USER}:{encoded_password}@{DBConfig.HOST}:{DBConfig.PORT}/{DBConfig.DATABASE}?charset=utf8mb4"

# ==========================================
# 2. 业务规则定义 (Business Logic)
# ==========================================
# 表名 -> 业务分类映射 (需与后端业务逻辑对齐)
TABLE_CATEGORY_MAP = {
    'A_SHARE_FINANCIAL_DATA': 'financial_statements',  # 财务三表
    'A_SHARE_EOD_VALUATION': 'valuation',              # 估值
    'A_SHARE_EOD_VALUATION_PERCENTILE': 'valuation',
    'A_SHARE_DIVIDEND_DERIVED': 'dividend',           # 分红
    'A_SHARE_ACCUMULATED_DIVIDEND': 'dividend',
    'A_SHARE_EOD_PRICES': 'market',                   # 行情
    'A_SHARE_EOD_DERIVED_INDICATOR': 'market',
    'A_SHARE_SALES_SEGMENT': 'main_business',         # 主营
    'A_SHARE_FINANCIAL_PREDICTION_DATA': 'prediction' # 盈利预测
}

# 核心 SQL 定义
class SQLManager:
    # SQL 1: 获取完整的指标定义列表
    # 逻辑：从数据字典表中提取，并过滤掉非业务字段（如ID、时间戳、标志位等）
    GET_INDICATORS = f"""
    SELECT 
        COLUMN_CNAME as name,
        COLUMN_NAME as code,
        TABLE_NAME as table_name
    FROM 
        TABLE_DICT
    WHERE 
        TABLE_NAME IN ({', '.join([f"'{t}'" for t in TABLE_CATEGORY_MAP.keys()])})
        AND COLUMN_CNAME IS NOT NULL
        -- 基础过滤: 排除系统字段
        AND COLUMN_NAME NOT IN (
            'S_INFO_WINDCODE', 'TRADE_DT', 'OBJECT_ID', 'CREATE_TIME', 'UPDATE_TIME', 
            'ID', 'S_INFO_CODE', 'S_INFO_NAME', 'S_INFO_COMPNAME', 'CRNCY_CODE',
            'S_SEGMENT_ITEMNAME', 'S_SEGMENT_ITEMCODE', 'S_SEGMENT_ITEMCODE_ENAME',
            'FISCAL_YEAR', 'REPORT_PERIOD', 'ANNUAL_CUM_CASH_DIV_TIMES', 'STATUS', 'IS_COVER',
            'REMOVE_FLAG', 'BEGIN_YEAR', 'BEGIN_DATE', 'END_DATE', 'rn'
        )
        -- 深度过滤: 排除描述性冗余字段 (保留核心比率指标如 PE, PB)
        AND NOT (
            (COLUMN_CNAME LIKE '%%名称%%' OR COLUMN_CNAME LIKE '%%代码%%' OR COLUMN_CNAME LIKE '%%英文%%' 
             OR COLUMN_CNAME LIKE '%%备注%%' OR COLUMN_CNAME LIKE '%%说明%%' OR COLUMN_CNAME LIKE '%%标志%%'
             OR COLUMN_CNAME LIKE '%%年份%%' OR COLUMN_CNAME LIKE '%%日期%%')
            AND COLUMN_NAME NOT IN ('PE', 'PB', 'PS', 'PE_TTM', 'PB_LF', 'TRADE_DT', 'S_DQ_CLOSE')
        )
    """

    # SQL 2: 获取活跃上市公司列表 (用于生成问句主体)
    GET_COMPANIES = """
    SELECT 
        S_INFO_NAME as name,
        S_INFO_WINDCODE as symbol
    FROM 
        A_SHARE_DESCRIPTION
    WHERE 
        STATUS = 1 
    LIMIT 100
    """

# ==========================================
# 3. 数据提取服务 (Data Service)
# ==========================================
class DataFetcher:
    def __init__(self):
        self.engine = None
        self._init_engine()

    def _init_engine(self):
        try:
            url = DBConfig.get_connection_url()
            self.engine = create_engine(url)
            print(f"[-] 数据库引擎初始化成功: {DBConfig.HOST}")
        except Exception as e:
            print(f"[!] 数据库引擎初始化失败: {e}")

    def fetch_all(self):
        """
        执行所有必要的数据提取
        """
        if not self.engine:
            print("[!] 未连接数据库，无法提取数据。")
            return None, None

        try:
            print("[-] 正在连接数据库并执行查询...")
            with self.engine.connect() as conn:
                # 1. 提取指标
                print("    > 正在提取指标定义 (Reading Indicators)...")
                df_ind = pd.read_sql(text(SQLManager.GET_INDICATORS), conn)
                # 补充业务分类列
                df_ind['category'] = df_ind['table_name'].map(TABLE_CATEGORY_MAP)
                
                # 2. 提取公司
                print("    > 正在提取公司列表 (Reading Companies)...")
                df_corp = pd.read_sql(text(SQLManager.GET_COMPANIES), conn)

                print(f"[√] 数据提取完成: 指标 {len(df_ind)} 个, 公司 {len(df_corp)} 家")
                return df_ind, df_corp
        except Exception as e:
            print(f"[!] 数据库查询执行异常: {e}")
            return None, None

# ==========================================
# 4. 用例生成逻辑 (Case Generator)
# ==========================================
class CaseGenerator:
    def __init__(self):
        # 问句模板库
        self.templates = [
            # 基础查询
            {"txt": "{company}的{indicator}是多少", "time": "10y"},
            {"txt": "查一下{company}的{indicator}", "time": "10y"},
            # 近期/最新
            {"txt": "{company}最近一年的{indicator}走势", "time": "1y"},
            {"txt": "{company}最新的{indicator}", "time": "latest"},
            # 特定时间
            {"txt": "2023年{company}的{indicator}", "time": "2023"},
            {"txt": "截至2023年底{company}的{indicator}", "time": "until_2023"},
        ]

    def _determine_chart_type(self, category, code):
        """
        根据业务分类和指标特征，推断预期的图表类型
        """
        code_upper = code.upper()
        if category == 'market':
            if any(x in code_upper for x in ['OPEN', 'CLOSE', 'HIGH', 'LOW', 'VOL', 'AMT']):
                return 'kline'
            return 'line'
        elif category == 'valuation':
            if any(x in code_upper for x in ['PE', 'PB', 'PS']):
                return 'band'
            return 'line'
        elif category == 'main_business':
            return 'bar'
        else:
            return 'table'

    def generate(self, df_ind, df_corp, count_per_ind=2):
        """
        生成测试用例集
        """
        cases = []
        print(f"[-] 开始生成用例，每个指标生成 {count_per_ind} 条...")

        # 遍历所有指标
        for idx, row in df_ind.iterrows():
            ind_name = row['name']
            ind_code = row['code']
            category = row['category']
            
            # 推断图表类型
            chart_type = self._determine_chart_type(category, ind_code)

            # 随机抽取公司进行组合
            # sample 是放回采样还是不放回？这里选择 min(len, count)
            sample_corps = df_corp.sample(n=min(len(df_corp), count_per_ind))

            for _, corp in sample_corps.iterrows():
                corp_name = corp['name']
                corp_symbol = corp['symbol']

                # 随机选择一个问句模板
                tmpl = random.choice(self.templates)
                query = tmpl['txt'].format(company=corp_name, indicator=ind_name)
                
                # 特殊逻辑：主营业务默认看近5年
                time_range = tmpl['time']
                if category == 'main_business' and time_range == '10y':
                    time_range = '5y'

                # 生成 keywords (逗号分隔): 公司名, 股票代码, 指标名, 指标Code
                # 过滤掉 None/Empty 值
                kw_list = [corp_name, corp_symbol, ind_name, ind_code]
                keywords = ",".join([str(k) for k in kw_list if k])

                # 生成 conditions (逗号分隔): 时间范围, SQL片段
                # 简单逻辑映射：根据 time_range 映射预期的 SQL 条件
                cond_list = []
                if time_range == 'latest':
                    cond_list.append("ORDER BY")
                    cond_list.append("LIMIT 1")
                elif time_range == '2023':
                    cond_list.append("2023")
                elif time_range == 'until_2023':
                    cond_list.append("<=")
                    cond_list.append("2023")
                
                # 补充图表隐含逻辑
                if chart_type == 'kline':
                    cond_list.append("TRADE_DT") # K线图通常需要交易日期
                
                conditions = ",".join(cond_list)

                case_data = {
                    "question": query,                        # 测试输入：问句
                    "expected_keywords": keywords,            # 预期关键字
                    "expected_conditions": conditions,        # 预期条件
                    # 保留调试用字段 (可选)
                    "expect_company": corp_name,
                    "expect_indicator": ind_name,
                    "expect_time": time_range,
                    "description": f"[{category}] 验证 {ind_name} ({chart_type})"
                }
                cases.append(case_data)
        
        return pd.DataFrame(cases)

# ==========================================
# 5. 主入口 (Main)
# ==========================================
if __name__ == "__main__":
    print("==========================================")
    print("      SQL驱动测试用例生成器 v2.0          ")
    print("==========================================")

    # 1. 实例化数据获取器
    fetcher = DataFetcher()
    
    # 2. 从数据库获取基础元数据
    df_indicators, df_companies = fetcher.fetch_all()

    if df_indicators is not None and not df_indicators.empty:
        # 3. 生成用例
        generator = CaseGenerator()
        df_result = generator.generate(df_indicators, df_companies, count_per_ind=2)
        
        # 4. 导出结果
        # 获取脚本所在目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        output_file = os.path.join(current_dir, "auto_generated_cases_db.csv")
        df_result.to_csv(output_file, index=False, encoding='utf-8-sig')
        
        print(f"\n[√] 成功生成 {len(df_result)} 条测试用例！")
        print(f"    文件路径: {output_file}")
    else:
        print("\n[!] 数据获取失败，请检查数据库配置或网络连接。")
        print("    提示: 确保 VPN 已连接或 IP 在白名单内。")

