# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json

from ..models import SessionLocal, SystemConfig

router = APIRouter(
    prefix="/config",
    tags=["config"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models for request/response
class ConfigUpdate(BaseModel):
    user_token: Optional[str] = None
    max_workers: Optional[int] = None
    headers: Optional[Dict[str, str]] = None

class ConfigResponse(BaseModel):
    user_token: str
    max_workers: int
    headers: Dict[str, str]

@router.get("/", response_model=ConfigResponse)
def get_config(db: Session = Depends(get_db)):
    """Get current system configuration"""
    # Helper to get value or default
    def get_val(key, default):
        item = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        return item.value if item else default

    token = get_val("user_token", "")
    workers = get_val("max_workers", "5")
    headers_str = get_val("headers", "{}")
    
    try:
        headers = json.loads(headers_str)
    except:
        headers = {}

    return {
        "user_token": token,
        "max_workers": int(workers),
        "headers": headers
    }

@router.post("/", response_model=ConfigResponse)
def update_config(config: ConfigUpdate, db: Session = Depends(get_db)):
    """Update system configuration"""
    def set_val(key, value):
        if value is None: return
        item = db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if not item:
            item = SystemConfig(key=key, value=str(value))
            db.add(item)
        else:
            item.value = str(value)

    if config.user_token is not None:
        set_val("user_token", config.user_token)
    
    if config.max_workers is not None:
        set_val("max_workers", str(config.max_workers))

    if config.headers is not None:
        set_val("headers", json.dumps(config.headers))
    
    db.commit()
    return get_config(db)
