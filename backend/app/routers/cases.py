# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from .. import models, schemas
from ..models import SessionLocal, TestCase

router = APIRouter(
    prefix="/cases",
    tags=["cases"]
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.TestCase])
def read_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = db.query(TestCase).offset(skip).limit(limit).all()
    return cases

@router.post("/", response_model=schemas.TestCase)
def create_case(case: schemas.TestCaseCreate, db: Session = Depends(get_db)):
    db_case = TestCase(**case.dict())
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.put("/{case_id}", response_model=schemas.TestCase)
def update_case(case_id: int, case: schemas.TestCaseUpdate, db: Session = Depends(get_db)):
    db_case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    for key, value in case.dict(exclude_unset=True).items():
        setattr(db_case, key, value)
    
    db.commit()
    db.refresh(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.patch("/{case_id}", response_model=schemas.TestCase)
def patch_case(case_id: int, case: schemas.TestCaseUpdate, db: Session = Depends(get_db)):
    """
    Partial update for a test case
    """
    return update_case(case_id, case, db)

@router.post("/batch-status")
def batch_update_status(
    case_ids: List[int],
    is_active: bool,
    db: Session = Depends(get_db)
):
    """批量更新用例状态"""
    updated = db.query(TestCase).filter(TestCase.id.in_(case_ids)).update(
        {"is_active": is_active}, synchronize_session=False
    )
    db.commit()
    return {"updated": updated, "is_active": is_active}

@router.delete("/batch")
def batch_delete(case_ids: List[int], db: Session = Depends(get_db)):
    """批量删除用例"""
    deleted = db.query(TestCase).filter(TestCase.id.in_(case_ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted": deleted}

@router.delete("/clear-all")
def clear_all_cases(db: Session = Depends(get_db)):
    """清空所有用例及其关联数据"""
    try:
        # First clear history and batches to satisfy foreign key constraints
        db.query(models.TestHistory).delete(synchronize_session=False)
        db.query(models.TestBatch).delete(synchronize_session=False)
        # Then clear cases
        deleted = db.query(TestCase).delete(synchronize_session=False)
        db.commit()
        return {"deleted": deleted}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Clear failed: {str(e)}")

@router.delete("/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_db)):
    db_case = db.query(TestCase).filter(TestCase.id == case_id).first()
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(db_case)
    db.commit()
    return {"ok": True}

@router.post("/import")
async def import_cases(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Import cases from Excel/CSV.
    Compatible with existing V3.0 format.
    """
    contents = await file.read()
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        # 辅助函数：在 DataFrame 列中查找第一个匹配的列名
        def find_col(names):
            for name in names:
                if name in df.columns:
                    return name
            return None
        
        # 字段别名映射 (优先级从高到低)
        q_col = find_col(['question', '问题', 'query'])
        k_col = find_col(['expected_keywords', '预期关键字', 'keywords'])
        c_col = find_col(['expected_conditions', '预期条件', 'conditions'])
        s_col = find_col(['expected_sql', '预期SQL', 'sql', 'standard_sql'])
        
        if not q_col:
            raise HTTPException(status_code=400, detail="未找到问题列 (question/问题/query)")
        
        count = 0
        
        for _, row in df.iterrows():
            question = str(row.get(q_col, ''))
            if not question or question == 'nan':
                continue
                
            keywords = str(row.get(k_col, '')) if k_col else ''
            conditions = str(row.get(c_col, '')) if c_col else ''
            expected_sql = str(row.get(s_col, '')) if s_col else ''
            
            if keywords == 'nan': keywords = ""
            if conditions == 'nan': conditions = ""
            if expected_sql == 'nan': expected_sql = ""
            
            # Create case
            db_case = TestCase(
                question=question,
                expected_keywords=keywords,
                expected_conditions=conditions,
                expected_sql=expected_sql,
                is_active=True
            )
            db.add(db_case)
            count += 1
            
        db.commit()
        return {"imported": count}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
