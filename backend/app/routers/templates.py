# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
import requests
from datetime import datetime

from .. import models, schemas
from ..models import SessionLocal, InterfaceTemplate

router = APIRouter(
    prefix="/templates",
    tags=["templates"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# CRUD
@router.get("/", response_model=List[schemas.TemplateResponse])
def read_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(InterfaceTemplate).offset(skip).limit(limit).all()

@router.get("/{template_id}", response_model=schemas.TemplateResponse)
def read_template(template_id: int, db: Session = Depends(get_db)):
    item = db.query(InterfaceTemplate).filter(InterfaceTemplate.id == template_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Template not found")
    return item

@router.post("/", response_model=schemas.TemplateResponse)
def create_template(template: schemas.TemplateCreate, db: Session = Depends(get_db)):
    # Check duplicate code
    existing = db.query(InterfaceTemplate).filter(InterfaceTemplate.code == template.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Code '{template.code}' already exists")
        
    db_item = InterfaceTemplate(**template.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{template_id}", response_model=schemas.TemplateResponse)
def update_template(template_id: int, template: schemas.TemplateUpdate, db: Session = Depends(get_db)):
    db_item = db.query(InterfaceTemplate).filter(InterfaceTemplate.id == template_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Template not found")
        
    for key, value in template.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
        
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    db_item = db.query(InterfaceTemplate).filter(InterfaceTemplate.id == template_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(db_item)
    db.commit()
    return {"ok": True}

# Preview / Debug
@router.post("/debug")
def debug_template(request: schemas.DebugRequest, db: Session = Depends(get_db)):
    """
    Preview and Execute a template request
    """
    tmpl = request.template
    vars = request.variables or {}
    
    # 1. Render Template
    def render(text):
        if not text: return text
        try:
            import re
            for k, v in vars.items():
                # 使用 re.escape 防止变量名中的特殊字符干扰正则
                pattern = rf"{{{{\s*{re.escape(k)}\s*}}}}"
                text = re.sub(pattern, str(v), text)
            return text
        except Exception:
            return text

    # 初始化返回结构，防止前端崩溃
    debug_result = {
        "request": {"url": "", "method": tmpl.method, "headers": {}, "body": None},
        "response": {"status_code": 0, "headers": {}, "text": "", "json": None, "duration": 0},
        "error": None
    }

    try:
        # A. URL
        base = (tmpl.base_url or "").rstrip('/')
        endpoint = (tmpl.endpoint or "").lstrip('/')
        final_url = f"{base}/{endpoint}" if base else endpoint
        final_url = render(final_url)
        debug_result["request"]["url"] = final_url
        
        # B. Headers
        final_headers = {}
        if tmpl.headers:
            try:
                headers_json = json.loads(tmpl.headers)
                for k, v in headers_json.items():
                    final_headers[k] = render(str(v))
            except Exception as e:
                debug_result["error"] = f"Headers parse error: {str(e)}"
        
        debug_result["request"]["headers"] = final_headers
                
        # C. Body
        final_body = None
        if tmpl.body_template:
            rendered_body_str = render(tmpl.body_template)
            if tmpl.body_type == "json":
                try:
                    final_body = json.loads(rendered_body_str)
                except Exception as e:
                    final_body = rendered_body_str
                    debug_result["error"] = f"Body JSON parse warning: {str(e)}"
            else:
                final_body = rendered_body_str
        
        debug_result["request"]["body"] = final_body

        # D. Auth
        if tmpl.auth_type == "bearer" and tmpl.auth_config:
            try:
                auth_cfg = json.loads(tmpl.auth_config)
                token = render(str(auth_cfg.get("token", "")))
                final_headers["Authorization"] = f"Bearer {token}"
            except:
                pass

        if debug_result["error"]:
             # 如果之前有解析错误，提前返回
             return debug_result

        # Execute Request
        start_time = datetime.now()
        resp = requests.request(
            method=tmpl.method,
            url=final_url,
            headers=final_headers,
            json=final_body if tmpl.body_type == "json" and isinstance(final_body, dict) else None,
            data=final_body if tmpl.body_type != "json" or not isinstance(final_body, dict) else None,
            timeout=tmpl.timeout or 10
        )
        duration = round((datetime.now() - start_time).total_seconds(), 3)
        
        debug_result["response"] = {
            "status_code": resp.status_code,
            "headers": dict(resp.headers),
            "text": resp.text,
            "json": None,
            "duration": duration
        }
        
        # Try to parse response JSON
        try:
            if resp.headers.get('content-type', '').startswith('application/json'):
                debug_result["response"]["json"] = resp.json()
        except:
            pass
            
        return debug_result

    except Exception as e:
        debug_result["error"] = str(e)
        return debug_result
