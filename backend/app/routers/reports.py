# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import models, schemas
from ..models import SessionLocal, TestBatch, TestHistory, TestCase

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.TestBatch])
def get_reports(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """
    获取历史测试报告列表 (分页)
    """
    batches = db.query(TestBatch).order_by(TestBatch.start_time.desc()).offset(skip).limit(limit).all()
    return batches

@router.get("/{batch_id}", response_model=schemas.TestBatch)
def get_report_summary(batch_id: str, db: Session = Depends(get_db)):
    """
    获取单个批次的概览信息
    """
    batch = db.query(TestBatch).filter(TestBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Report not found")
    return batch

@router.get("/{batch_id}/details", response_model=List[schemas.TestResult])
def get_report_details(batch_id: str, db: Session = Depends(get_db)):
    """
    获取单个批次的详细测试结果
    """
    # 检查批次是否存在
    batch = db.query(TestBatch).filter(TestBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Report not found")

    # 查询历史记录并关联用例信息
    results = db.query(TestHistory, TestCase).join(
        TestCase, TestHistory.case_id == TestCase.id
    ).filter(TestHistory.batch_id == batch_id).all()
    
    return [
        schemas.TestResult(
            case_id=h.case_id,
            question=h.question,
            actual_sql=h.actual_sql,
            expected_sql=c.expected_sql,
            result=h.result,
            message=h.error_message or "",
            duration=0.0 
        )
        for h, c in results
    ]

@router.get("/{batch_id}/export")
def export_report(batch_id: str, db: Session = Depends(get_db)):
    """
    导出测试报告 (Excel)
    """
    from fastapi.responses import FileResponse
    from backend.core.reporter import Reporter
    import os
    
    # 检查批次
    batch = db.query(TestBatch).filter(TestBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # 查询数据
    results = db.query(TestHistory, TestCase).join(
        TestCase, TestHistory.case_id == TestCase.id
    ).filter(TestHistory.batch_id == batch_id).all()
    
    if not results:
        raise HTTPException(status_code=400, detail="No results to export")
        
    # 生成报告
    reporter = Reporter()
    for idx, (h, c) in enumerate(results, 1):
        reporter.add_result({
            "Index": idx,
            "问题": h.question,
            "预期关键字": c.expected_keywords,
            "预期条件": c.expected_conditions, # Assuming this field exists on TestCase model based on usage in runner.py
            "实际生成的SQL": h.actual_sql,
            "测试结果": "通过" if h.result == "PASS" else "失败",
            "备注": h.error_message or ""
        })
    
    # 使用 absolute path 避免相对路径问题
    # 使用 batch_id 作为文件名的一部分
    filename = f"report_{batch_id}.xlsx"
    output_path = os.path.join(os.getcwd(), "data", "output", filename)
    
    file_path = reporter.generate_report(output_path)
    
    return FileResponse(
        path=file_path, 
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
