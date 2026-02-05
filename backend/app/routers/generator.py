# -*- coding: utf-8 -*-
"""
用例生成 API 路由
提供接口触发自动用例生成
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..models import SessionLocal
from backend.core.case_generator import CaseGeneratorService, DataFetcher

router = APIRouter(
    prefix="/generate",
    tags=["generator"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/cases")
def generate_cases(
    count: int = Query(default=2, ge=1, le=10, description="每个指标生成几条用例"),
    db: Session = Depends(get_db)
):
    """
    自动生成测试用例
    
    从业务数据库提取公司/指标元数据，自动生成测试问句并写入本地数据库。
    
    - **count**: 每个指标生成几条用例 (1-10)
    """
    generated = CaseGeneratorService.generate_and_save(db, count_per_indicator=count)
    return {"generated": generated, "message": f"成功生成 {generated} 条用例"}


@router.get("/preview")
def preview_metadata():
    """
    预览可用元数据
    
    返回业务数据库中可用的指标和公司数量，用于前端展示。
    """
    fetcher = DataFetcher()
    indicators, companies = fetcher.fetch_metadata()
    return {
        "indicator_count": len(indicators),
        "company_count": len(companies),
        "sample_indicators": [ind['name'] for ind in indicators[:5]],
        "sample_companies": [corp['name'] for corp in companies[:5]]
    }
