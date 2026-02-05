# -*- coding: utf-8 -*-
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, create_engine, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# SQLite database URL
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../backend/app
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR)) # .../apiautotest
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
os.makedirs(DATA_DIR, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'autotest.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_config"
    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String, nullable=True)

class TestBatch(Base):
    """测试批次表"""
    __tablename__ = "test_batches"
    
    id = Column(String, primary_key=True, index=True) # UUID
    start_time = Column(DateTime, default=datetime.now)
    end_time = Column(DateTime, nullable=True)
    status = Column(String, default="RUNNING") # RUNNING, COMPLETED, STOPPED
    total_count = Column(Integer, default=0)
    pass_count = Column(Integer, default=0)

class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    expected_keywords = Column(Text, nullable=True)
    expected_conditions = Column(Text, nullable=True)
    expected_sql = Column(Text, nullable=True) # New field for SQL Diff
    category = Column(String, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class TestHistory(Base):
    __tablename__ = "test_history"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String, ForeignKey("test_batches.id"), index=True)
    case_id = Column(Integer, ForeignKey("test_cases.id"))
    question = Column(Text)
    actual_sql = Column(Text)
    result = Column(String) # PASS / FAIL
    error_message = Column(Text, nullable=True)
    run_at = Column(DateTime, default=datetime.now)

class InterfaceTemplate(Base):
    """API 接口定义模板表"""
    __tablename__ = "interface_templates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, default=1, index=True)
    code = Column(String, unique=True, index=True, nullable=False) # 唯一标识
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String, default="v1.0")
    
    # Request Config
    base_url = Column(String, nullable=False)
    method = Column(String, nullable=False) # GET/POST/PUT...
    endpoint = Column(String, nullable=False) # /api/v1/users/{id}
    
    body_type = Column(String, default="json") # json/form-data/raw/none
    body_template = Column(Text, nullable=True) # Jinja2 template
    query_params = Column(Text, nullable=True) # JSON String
    headers = Column(Text, nullable=True)      # JSON String
    
    # Auth Config
    auth_type = Column(String, default="none") # none/bearer/apikey...
    auth_config = Column(Text, nullable=True)  # JSON String
    
    # Response Config
    response_parser = Column(Text, nullable=True) # JSON String (parsing rules)
    
    # Advanced
    timeout = Column(Integer, default=10)
    retry_count = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_by = Column(String, default="system")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

# Create tables
def init_db():
    # 仅创建不存在的表，不再删除已有数据
    Base.metadata.create_all(bind=engine)
