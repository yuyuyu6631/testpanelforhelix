from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Set
import uuid
import logging
import time
import asyncio
import json

from .. import models, schemas
from ..models import SessionLocal, TestCase, TestHistory, SystemConfig, TestBatch
from backend.core.auth import AuthManager
from backend.core.test_engine import TestEngine
from backend.core.validator import Validator

router = APIRouter(
    prefix="/run",
    tags=["runner"]
)

logger = logging.getLogger("Backend.Runner")

# Global dict to track running status: { batch_id: {"stop": False}}
RUNNING_BATCHES: Dict[str, Dict] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, batch_id: str, websocket: WebSocket):
        await websocket.accept()
        if batch_id not in self.active_connections:
            self.active_connections[batch_id] = set()
        self.active_connections[batch_id].add(websocket)

    def disconnect(self, batch_id: str, websocket: WebSocket):
        if batch_id in self.active_connections:
            self.active_connections[batch_id].remove(websocket)
            if not self.active_connections[batch_id]:
                del self.active_connections[batch_id]

    async def broadcast(self, batch_id: str, message: dict):
        if batch_id in self.active_connections:
            for connection in self.active_connections[batch_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error broadcasting to {batch_id}: {e}")

manager = ConnectionManager()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def run_tests_background(case_ids: List[int], batch_id: str, preloaded_cases: List[TestCase] = None):
    """
    Background task to run tests
    """
    logger.info(f"Starting background task for batch {batch_id}")
    RUNNING_BATCHES[batch_id] = {"stop": False}
    
    # Wait a bit longer to ensure frontend WS is connected before broadcasting 'running'
    await asyncio.sleep(1.0)
    
    db = SessionLocal()
    try:
        # 0. Update batch in DB
        batch = db.query(TestBatch).filter(TestBatch.id == batch_id).first()
        if not batch:
            batch = TestBatch(id=batch_id, status="RUNNING")
            db.add(batch)
            db.commit()

        # Load Config (Token, Workers, etc.)
        def get_config(key, default):
            item = db.query(SystemConfig).filter(SystemConfig.key == key).first()
            return item.value if item else default

        user_token = get_config("user_token", "")
        
        # 1. Login
        tenant_id = ""
        if user_token:
            token = user_token
            logger.info("Using configured User Token")
        else:
            auth = AuthManager()
            try:
                token, tenant_id = auth.login()
                logger.info(f"Login success: {tenant_id}")
            except Exception as e:
                logger.error(f"Login failed: {e}")
                await manager.broadcast(batch_id, {"type": "error", "message": f"Login failed: {str(e)}"})
                return

        engine = TestEngine(token, tenant_id)
        
        # 2. Get cases
        if preloaded_cases:
            cases = preloaded_cases
        elif not case_ids:
            cases = db.query(TestCase).filter(TestCase.is_active == True).all()
        else:
            cases = db.query(TestCase).filter(TestCase.id.in_(case_ids)).all()
            
        batch.total_count = len(cases)
        db.commit()

        # Notify UI about initial state
        await manager.broadcast(batch_id, {
            "type": "init", 
            "cases": [{"id": c.id, "question": c.question} for c in cases]
        })

        # 3. Execute
        pass_count = 0
        for i, case in enumerate(cases):
            # CHECK STOP SIGNAL
            if RUNNING_BATCHES.get(batch_id, {}).get("stop"):
                logger.warning(f"Batch {batch_id} stopped by user.")
                batch.status = "STOPPED"
                break

            # Notify UI that this case is now running
            await manager.broadcast(batch_id, {
                "type": "running",
                "case_id": case.id
            })

            start_time = time.time()
            # Ask
            try:
                actual_sql = engine.ask_question(case.question, case.id)
            except Exception as e:
                actual_sql = f"Error: {str(e)}"
            
            duration = round(time.time() - start_time, 2)
            
            # Validate
            is_pass, message = Validator.validate(
                actual_sql, 
                case.expected_keywords, 
                case.expected_conditions
            )
            
            if is_pass:
                pass_count += 1

            # Save Result
            history = TestHistory(
                batch_id=batch_id,
                case_id=case.id,
                question=case.question,
                actual_sql=actual_sql,
                result="PASS" if is_pass else "FAIL",
                error_message=message
            )
            db.add(history)
            
            # Notify UI
            await manager.broadcast(batch_id, {
                "type": "update",
                "case_id": case.id,
                "result": {
                    "case_id": case.id,
                    "question": case.question,
                    "actual_sql": actual_sql,
                    "expected_sql": case.expected_sql,
                    "result": "PASS" if is_pass else "FAIL",
                    "message": message,
                    "duration": duration
                }
            })
            
            db.commit()
            await asyncio.sleep(0.1) # Yield
            
        batch.status = "COMPLETED" if batch.status == "RUNNING" else batch.status
        batch.pass_count = pass_count
        batch.end_time = models.datetime.now()
        db.commit()
        
        await manager.broadcast(batch_id, {"type": "done"})
    
    except Exception as e:
        logger.error(f"Batch run failed: {e}")
        await manager.broadcast(batch_id, {"type": "error", "message": str(e)})
    finally:
        if batch_id in RUNNING_BATCHES:
            del RUNNING_BATCHES[batch_id]
        db.close()

@router.post("/", response_model=schemas.TestRunResponse)
def trigger_run(request: schemas.TestRunRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Trigger a test run in the background
    """
    batch_id = str(uuid.uuid4())
    case_ids = request.case_ids if request.case_ids else []
    
    # Pre-fetch cases to return to frontend immediately
    if not case_ids:
        cases = db.query(TestCase).filter(TestCase.is_active == True).all()
    else:
        cases = db.query(TestCase).filter(TestCase.id.in_(case_ids)).all()
    
    case_list = [{"id": c.id, "question": c.question} for c in cases]
    
    # Wrap the async function to be run in the background
    def run_wrapper():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        # Pass pre-fetched cases to avoid redundant DB call
        loop.run_until_complete(run_tests_background(case_ids, batch_id, cases))
        loop.close()
    
    import threading
    thread = threading.Thread(target=run_wrapper)
    thread.start()
    
    return {
        "message": "Test run started", 
        "batch_id": batch_id,
        "cases": case_list
    }

@router.post("/stop")
def stop_run(batch_id: str):
    """
    Signal a batch to stop
    """
    if batch_id in RUNNING_BATCHES:
        RUNNING_BATCHES[batch_id]["stop"] = True
        return {"message": "Stop signal sent"}
    return {"message": "Batch not found or already finished"}

@router.get("/active-batches")
def get_active_batches(db: Session = Depends(get_db)):
    """
    获取所有正在运行的批次
    用于页面刷新后恢复运行状态
    """
    batches = db.query(TestBatch).filter(
        TestBatch.status == "RUNNING"
    ).order_by(TestBatch.start_time.desc()).all()
    
    result = []
    for batch in batches:
        completed_count = db.query(TestHistory).filter(
            TestHistory.batch_id == batch.id
        ).count()
        
        result.append({
            "batch_id": batch.id,
            "start_time": batch.start_time.isoformat() if batch.start_time else None,
            "total_count": batch.total_count,
            "completed_count": completed_count,
            "pass_count": batch.pass_count
        })
    
    return result

@router.get("/history/{batch_id}", response_model=List[schemas.TestResult])
def get_run_history(batch_id: str, db: Session = Depends(get_db)):
    # Join TestCase to get expected_sql
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
            duration=0.0 # Historical data might not have duration saved yet
        )
        for h, c in results
    ]

@router.websocket("/ws/{batch_id}")
async def websocket_endpoint(websocket: WebSocket, batch_id: str):
    await manager.connect(batch_id, websocket)
    
    # 获取数据库会话来查询批次状态
    db = SessionLocal()
    try:
        # 发送当前批次状态和已完成的结果（用于重连恢复）
        batch = db.query(TestBatch).filter(TestBatch.id == batch_id).first()
        if batch:
            # 1. 发送批次基本信息
            await websocket.send_text(json.dumps({
                "type": "batch_status",
                "status": batch.status,
                "total_count": batch.total_count,
                "pass_count": batch.pass_count,
                "start_time": batch.start_time.isoformat() if batch.start_time else None
            }))
            
            # 2. 发送已完成的测试结果（用于恢复进度显示）
            completed_results = db.query(TestHistory, TestCase).join(
                TestCase, TestHistory.case_id == TestCase.id
            ).filter(TestHistory.batch_id == batch_id).all()
            
            for h, c in completed_results:
                await websocket.send_text(json.dumps({
                    "type": "update",
                    "case_id": h.case_id,
                    "result": {
                        "case_id": h.case_id,
                        "question": h.question,
                        "actual_sql": h.actual_sql,
                        "expected_sql": c.expected_sql,
                        "result": h.result,
                        "message": h.error_message or "",
                        "duration": 0.0
                    }
                }))
            
            # 3. 如果批次已完成，发送完成消息
            if batch.status in ["COMPLETED", "STOPPED"]:
                await websocket.send_text(json.dumps({"type": "done"}))
        
        # 保持连接，等待客户端消息或关闭
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(batch_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(batch_id, websocket)
    finally:
        db.close()
