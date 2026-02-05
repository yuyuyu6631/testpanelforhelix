# -*- coding: utf-8 -*-
import re
import logging
from typing import Tuple, List, Optional

logger = logging.getLogger("Backend.Validator")

class Validator:
    """
    SQL 校验类
    实现模糊匹配，而非严格的字符串相等
    """
    
    @staticmethod
    def validate(actual_sql: str, exp_keywords: Optional[str], exp_conditions: Optional[str]) -> Tuple[bool, str]:
        """
        比对 SQL
        """
        # 如果 SQL 本身是错误信息，直接返回失败
        if not actual_sql or actual_sql.startswith("Error"):
            return False, actual_sql or "Empty SQL"
        
        # 标准化处理
        sql_normalized = Validator._normalize_sql(actual_sql)
        
        # 检查关键字
        missing_keywords = Validator._check_keywords(sql_normalized, exp_keywords)
        
        # 检查条件
        missing_conditions = Validator._check_conditions(sql_normalized, exp_conditions)
        
        if not missing_keywords and not missing_conditions:
            return True, "Pass"
        
        error_parts = []
        if missing_keywords:
            error_parts.append(f"缺关键字: {','.join(missing_keywords)}")
        if missing_conditions:
            error_parts.append(f"缺条件: {','.join(missing_conditions)}")
        
        return False, "; ".join(error_parts)
    
    @staticmethod
    def _normalize_sql(sql: str) -> str:
        normalized = sql.upper()
        normalized = normalized.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        normalized = re.sub(r'\s+', ' ', normalized)
        return normalized.strip()
    
    @staticmethod
    def _check_keywords(sql_normalized: str, exp_keywords: Optional[str]) -> List[str]:
        missing = []
        if not exp_keywords or not str(exp_keywords).strip():
            return missing
        
        keywords = re.split(r'[,\n\uff0c;]', str(exp_keywords))
        for kw in keywords:
            kw = kw.strip().upper()
            if not kw:
                continue
            if kw not in sql_normalized:
                missing.append(kw)
        return missing
    
    @staticmethod
    def _check_conditions(sql_normalized: str, exp_conditions: Optional[str]) -> List[str]:
        missing = []
        if not exp_conditions or not str(exp_conditions).strip():
            return missing
        
        conditions = re.split(r'[,\n\uff0c;]', str(exp_conditions))
        for cond in conditions:
            cond = cond.strip().upper()
            if not cond:
                continue
            
            clean_cond = cond.replace("'", "").replace('"', "")
            clean_sql = sql_normalized.replace("'", "").replace('"', "")
            
            if clean_cond not in clean_sql:
                missing.append(cond)
        return missing
