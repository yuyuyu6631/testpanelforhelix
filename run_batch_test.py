# -*- coding: utf-8 -*-
import sys
import os
import logging
import pandas as pd
import concurrent.futures
from typing import List, Dict, Any

# 添加当前目录到 sys.path
sys.path.append(os.getcwd())

from src.config import Config
from src.auth import AuthManager
from src.api_runner import APIRunner
from src.validator import Validator
from src.reporter import Reporter

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s'
)
logger = logging.getLogger("BatchTest")

def run_batch_test():
    logger.info("=== 开始批量集成测试 (V3.0 需求覆盖) ===")
    
    # 1. 登录获取 Token
    logger.info("[1] 执行自动登录...")
    try:
        auth_manager = AuthManager()
        token, tenant_id = auth_manager.login()
        logger.info(f"登录成功! TenantId: {tenant_id}")
    except Exception as e:
        logger.error(f"登录失败，无法开展批量测试: {e}")
        return

    # 2. 读取测试用例
    input_file = Config.INPUT_FILE
    logger.info(f"[2] 读取测试文件: {input_file}")
    try:
        if not os.path.exists(input_file):
            logger.error(f"错误: 测试文件不存在: {input_file}")
            return
        
        if input_file.endswith('.csv'):
            df = pd.read_csv(input_file)
        else:
            df = pd.read_excel(input_file)
    except Exception as e:
        logger.error(f"读取文件失败: {e}")
        return

    # 检查必要列
    required_cols = ['问题']
    if not all(col in df.columns for col in required_cols):
        logger.error(f"测试文件缺少必要列。需要: {required_cols}，当前: {df.columns.tolist()}")
        return

    # 3. 初始化组件
    runner = APIRunner(token, tenant_id)
    validator = Validator()
    reporter = Reporter()
    
    # 4. 并发执行
    max_workers = Config.MAX_WORKERS
    logger.info(f"[3] 开始并发执行测试用例 (并发数: {max_workers}, 总数: {len(df)})")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # 封装任务
        future_to_index = {}
        for index, row in df.iterrows():
            question = str(row['问题'])
            if pd.isna(question) or question.strip() == "":
                continue
            
            # 提交任务
            future = executor.submit(runner.ask_question, question, index)
            future_to_index[future] = (index, row)

        # 处理结果
        completed = 0
        total = len(future_to_index)
        
        for future in concurrent.futures.as_completed(future_to_index):
            idx, row = future_to_index[future]
            question = str(row['问题'])
            
            try:
                actual_sql = future.result()
                
                # 获取预期值
                exp_kw = row.get('预期关键字', '')
                exp_cond = row.get('预期条件', '')
                
                # 校验结果
                is_pass, msg = validator.validate(actual_sql, exp_kw, exp_cond)
                
                # 记录结果
                reporter.add_result({
                    "Index": idx + 2, # Excel 行号
                    "问题": question,
                    "预期关键字": exp_kw,
                    "预期条件": exp_cond,
                    "实际生成的SQL": actual_sql,
                    "测试结果": "通过" if is_pass else "失败",
                    "备注": msg
                })
                
            except Exception as e:
                logger.error(f"用例执行异常 [行 {idx+2}]: {e}")
                reporter.add_result({
                    "Index": idx + 2,
                    "问题": question,
                    "实际生成的SQL": f"Error: {str(e)}",
                    "测试结果": "失败",
                    "备注": f"运行时异常: {str(e)}"
                })
            
            completed += 1
            if completed % 5 == 0 or completed == total:
                logger.info(f"进度: {completed}/{total}")

    # 5. 生成报告
    logger.info(f"[4] 测试完成，正在生成报告...")
    output_path = reporter.generate_report()
    logger.info(f"=== 测试结束! 报告已保存至: {output_path} ===")

if __name__ == "__main__":
    run_batch_test()
