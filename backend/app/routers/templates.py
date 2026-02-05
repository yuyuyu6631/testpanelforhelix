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
    
    # 1. Render Template (Simple string format or Jinja2 if needed)
    # Using simple .format() for now, can be upgraded to jinja2
    def render(text):
        if not text: return text
        try:
            # First try Jinja2 style {{var}} -> require jinja2 lib or simple replace
            # Let's use simple replace for {{key}} to value
            import re
            for k, v in vars.items():
                text = re.sub(f"{{{{\s*{k}\s*}}}}", str(v), text)
            return text
        except Exception as e:
            return text

    try:
        # A. URL
        final_url = f"{tmpl.base_url.rstrip('/')}/{tmpl.endpoint.lstrip('/')}"
        final_url = render(final_url)
        
        # B. Headers
        final_headers = {}
        if tmpl.headers:
            try:
                headers_json = json.loads(tmpl.headers)
                for k, v in headers_json.items():
                    final_headers[k] = render(v)
            except:
                pass
                
        # C. Body
        final_body = None
        if tmpl.body_type == "json" and tmpl.body_template:
            rendered_body_str = render(tmpl.body_template)
            try:
                final_body = json.loads(rendered_body_str)
            except:
                final_body = rendered_body_str # Fallback to string if invalid json
        elif tmpl.body_template:
            final_body = render(tmpl.body_template)

        # D. Auth
        # TODO: Implement auth logic (Bearer, etc)
        if tmpl.auth_type == "bearer" and tmpl.auth_config:
            try:
                auth_cfg = json.loads(tmpl.auth_config)
                token = render(auth_cfg.get("token", ""))
                final_headers["Authorization"] = f"Bearer {token}"
            except:
                pass

        # Execute Request
        start_time = datetime.now()
        resp = requests.request(
            method=tmpl.method,
            url=final_url,
            headers=final_headers,
            json=final_body if tmpl.body_type == "json" else None,
            data=final_body if tmpl.body_type != "json" else None,
            timeout=tmpl.timeout
        )
        duration = (datetime.now() - start_time).total_seconds()
        
        return {
            "request": {
                "url": final_url,
                "method": tmpl.method,
                "headers": final_headers,
                "body": final_body
            },
            "response": {
                "status_code": resp.status_code,
                "headers": dict(resp.headers),
                "text": resp.text,
                "json": resp.json() if resp.headers.get('content-type', '').startswith('application/json') else None,
                "duration": duration
            }
        }

    except Exception as e:
        return {
            "error": str(e),
            "step": "execution"
        }
