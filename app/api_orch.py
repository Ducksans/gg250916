from fastapi import APIRouter
from .orch.models import RunRequest, RunStatus
from .orch.engine import InprocEngine

router = APIRouter(prefix="/api/orch", tags=["orchestrator"])
engine = InprocEngine()

@router.post("/flows/run", response_model=RunStatus)
def run_flow(req: RunRequest):
    return engine.run(req)

@router.get("/runs/{rid}", response_model=RunStatus)
def get_run(rid: str):
    rs = engine.get(rid)
    if rs is None:
        return RunStatus(id=rid, status='not_found', steps=[], artifacts=[])
    return rs

