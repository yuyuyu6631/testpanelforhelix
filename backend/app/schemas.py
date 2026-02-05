# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# ================= TestCase Schemas =================
class TestCaseBase(BaseModel):
    question: str
    expected_keywords: Optional[str] = None
    expected_conditions: Optional[str] = None
    expected_sql: Optional[str] = None  # New field
    is_active: bool = True


class TestCaseCreate(TestCaseBase):
    pass


class TestCaseUpdate(TestCaseBase):
    pass


class TestCase(TestCaseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ================= Interface Template Schemas =================
class TemplateBase(BaseModel):
    name: str
    code: str
    base_url: str
    endpoint: str
    method: str
    headers: Optional[str] = None
    body_type: Optional[str] = "json"
    body_template: Optional[str] = None
    auth_type: Optional[str] = "none"
    auth_config: Optional[str] = None
    timeout: int = 10

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(TemplateBase):
    pass

class TemplateResponse(TemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DebugRequest(BaseModel):
    template: TemplateBase
    variables: Optional[Dict[str, Any]] = None

# ================= Runner Schemas =================
class TestRunRequest(BaseModel):
    case_ids: Optional[List[int]] = None  # If None, run all active cases


class TestRunResponse(BaseModel):
    message: str
    batch_id: str
    cases: List[dict] # [{id, question}, ...]

class TestResult(BaseModel):
    case_id: int
    question: str
    actual_sql: str
    expected_sql: Optional[str] = None
    result: str  # "PASS" or "FAIL"
    message: str
    duration: float = 0.0

class TestBatch(BaseModel):
    id: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    status: str
    total_count: int
    pass_count: int

    class Config:
        from_attributes = True
