# -*- coding: utf-8 -*-
"""
校验模块 - 实现模糊匹配验证逻辑

实现：
1. SQL 标准化处理（大小写、空白字符）
2. 关键字校验
3. 条件校验
4. 详细失败原因记录
"""

import re
import logging
import pandas as pd
from typing import Tuple, List

logger = logging.getLogger("AutoTest.Validator")


class Validator:
    """
    SQL 校验类
    
    实现模糊匹配，而非严格的字符串相等
    """
    
    @staticmethod
    def validate(actual_sql: str, exp_keywords: str, exp_conditions: str) -> Tuple[bool, str]:
        """
        比对 SQL
        
        逻辑：
        1. 预期关键字 (expected_keywords): 检查 SQL 中是否包含这些词
        2. 预期条件 (expected_conditions): 检查 SQL 中是否包含这些片段
        
        Args:
            actual_sql: 实际生成的 SQL
            exp_keywords: 预期关键字（逗号或换行分隔）
            exp_conditions: 预期条件（逗号或换行分隔）
            
        Returns:
            Tuple[bool, str]: (是否通过, 备注信息)
        """
        # 如果 SQL 本身是错误信息，直接返回失败
        if actual_sql.startswith("Error"):
            return False, actual_sql
        
        # 标准化处理：转大写，去除换行和多余空格
        sql_normalized = Validator._normalize_sql(actual_sql)
        
        # 检查关键字
        missing_keywords = Validator._check_keywords(sql_normalized, exp_keywords)
        
        # 检查条件
        missing_conditions = Validator._check_conditions(sql_normalized, exp_conditions)
        
        # 判定结果
        if not missing_keywords and not missing_conditions:
            return True, "Pass"
        
        # 构建错误信息
        error_parts = []
        if missing_keywords:
            error_parts.append(f"缺关键字: {','.join(missing_keywords)}")
        if missing_conditions:
            error_parts.append(f"缺条件: {','.join(missing_conditions)}")
        
        return False, "; ".join(error_parts)
    
    @staticmethod
    def _normalize_sql(sql: str) -> str:
        """
        标准化 SQL
        
        - 转大写
        - 去除换行符
        - 合并多余空格
        
        Args:
            sql: 原始 SQL
            
        Returns:
            str: 标准化后的 SQL
        """
        normalized = sql.upper()
        normalized = normalized.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        # 合并多个空格为一个
        normalized = re.sub(r'\s+', ' ', normalized)
        return normalized.strip()
    
    @staticmethod
    def _check_keywords(sql_normalized: str, exp_keywords: str) -> List[str]:
        """
        检查关键字
        
        Args:
            sql_normalized: 标准化后的 SQL
            exp_keywords: 预期关键字（逗号或换行分隔）
            
        Returns:
            List[str]: 缺失的关键字列表
        """
        missing = []
        
        if pd.isna(exp_keywords) or not str(exp_keywords).strip():
            return missing
        
        # 支持用 逗号、换行、中文逗号、分号 分隔多个关键字
        keywords = re.split(r'[,\n\uff0c;]', str(exp_keywords))
        
        for kw in keywords:
            kw = kw.strip().upper()
            if not kw:
                continue
            # 简单的字符串包含检查
            if kw not in sql_normalized:
                missing.append(kw)
        
        return missing
    
    @staticmethod
    def _check_conditions(sql_normalized: str, exp_conditions: str) -> List[str]:
        """
        检查条件
        
        Args:
            sql_normalized: 标准化后的 SQL
            exp_conditions: 预期条件（逗号或换行分隔）
            
        Returns:
            List[str]: 缺失的条件列表
        """
        missing = []
        
        if pd.isna(exp_conditions) or not str(exp_conditions).strip():
            return missing
        
        # 支持用 逗号、换行、中文逗号、分号 分隔多个条件
        conditions = re.split(r'[,\n\uff0c;]', str(exp_conditions))
        
        for cond in conditions:
            cond = cond.strip().upper()
            if not cond:
                continue
            
            # 去除预期条件里的引号，避免格式差异
            # 例如预期 '证券'，实际 "证券"
            clean_cond = cond.replace("'", "").replace('"', "")
            clean_sql = sql_normalized.replace("'", "").replace('"', "")
            
            if clean_cond not in clean_sql:
                missing.append(cond)
        
        return missing
