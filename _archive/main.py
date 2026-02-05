# -*- coding: utf-8 -*-
"""
API自动化测试框架 - 主入口

使用方法：
    python main.py
    
功能：
1. API直连登录获取Token
2. 读取Excel测试用例
3. 多线程并发执行测试
4. 生成Excel测试报告
"""

import sys
import logging
import pandas as pd
import concurrent.futures
from typing import Dict, Any

# 添加项目路径
sys.path.insert(0, r"D:\apiautotest")

from src.config import Config
from src.auth import AuthManager
from src.api_runner import APIRunner
from src.validator import Validator
from src.reporter import Reporter

# 配置日志
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format=Config.LOG_FORMAT
)
logger = logging.getLogger("AutoTest")


def process_single_case(
    runner: APIRunner,
    row_index: int,
    row_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    处理单个测试用例
    
    Args:
        runner: API运行器
        row_index: 行号
        row_data: 行数据
        
    Returns:
        Dict: 测试结果
    """
    question = str(row_data.get('问题', ''))
    exp_keywords = row_data.get('预期关键字', '')
    exp_conditions = row_data.get('预期条件', '')
    
    # 调用API获取SQL
    actual_sql = runner.ask_question(question, row_index)
    
    # 校验结果
    is_pass, message = Validator.validate(actual_sql, exp_keywords, exp_conditions)
    
    return {
        "Index": row_index + 2,  # Excel行号（从2开始，因为第1行是表头）
        "问题": question,
        "预期关键字": exp_keywords,
        "预期条件": exp_conditions,
        "实际生成的SQL": actual_sql,
        "测试结果": "通过" if is_pass else "失败",
        "备注": message
    }


def run_test():
    """主测试流程"""
    
    logger.info("=" * 60)
    logger.info("API自动化测试框架 V3.0")
    logger.info("=" * 60)
    
    # Step 1: 读取测试用例
    logger.info(f"读取测试用例: {Config.INPUT_FILE}")
    try:
        if Config.INPUT_FILE.endswith('.csv'):
            df = pd.read_csv(Config.INPUT_FILE)
        else:
            df = pd.read_excel(Config.INPUT_FILE)
    except Exception as e:
        logger.error(f"读取文件失败: {e}")
        return
    
    # 检查必要列
    if '问题' not in df.columns:
        logger.error(f"缺少必要列 '问题'。当前列: {list(df.columns)}")
        return
    
    logger.info(f"共加载 {len(df)} 条测试用例")
    
    # Step 2: 自动登录
    logger.info("-" * 40)
    auth_manager = AuthManager()
    try:
        token, tenant_id = auth_manager.login()
    except Exception as e:
        logger.error(f"登录失败，测试终止: {e}")
        return
    
    # Step 3: 初始化组件
    runner = APIRunner(token, tenant_id)
    reporter = Reporter()
    
    # Step 4: 并发执行测试
    logger.info("-" * 40)
    logger.info(f"开始执行测试，并发数: {Config.MAX_WORKERS}")
    
    completed = 0
    total = len(df)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
        # 提交所有任务
        future_to_index = {}
        for index, row in df.iterrows():
            question = str(row.get('问题', ''))
            if pd.isna(question) or question.strip() == "":
                continue
            
            row_data = row.to_dict()
            future = executor.submit(process_single_case, runner, index, row_data)
            future_to_index[future] = index
        
        # 处理完成的任务
        for future in concurrent.futures.as_completed(future_to_index):
            try:
                result = future.result()
                reporter.add_result(result)
                
                completed += 1
                if completed % 5 == 0 or completed == total:
                    logger.info(f"进度: {completed}/{len(future_to_index)} ({completed/len(future_to_index)*100:.1f}%)")
                    
            except Exception as e:
                idx = future_to_index[future]
                logger.error(f"用例 {idx} 执行失败: {e}")
                reporter.add_result({
                    "Index": idx + 2,
                    "问题": df.iloc[idx].get('问题', ''),
                    "预期关键字": "",
                    "预期条件": "",
                    "实际生成的SQL": f"Error: {str(e)}",
                    "测试结果": "失败",
                    "备注": str(e)
                })
    
    # Step 5: 生成报告
    logger.info("-" * 40)
    reporter.generate_report()
    reporter.print_summary()
    
    logger.info("测试执行完成!")


if __name__ == "__main__":
    run_test()
