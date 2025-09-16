import uuid
from typing import Dict, Any
from .models import RunRequest, RunStatus

class InprocEngine:
    def __init__(self):
        self._runs: Dict[str, RunStatus] = {}

    def run(self, req: RunRequest) -> RunStatus:
        rid = str(uuid.uuid4())
        status = RunStatus(id=rid, status='queued', steps=[], artifacts=[])
        self._runs[rid] = status
        # minimal synchronous simulation
        status.status = 'running'
        status.steps.append({'id': 'step_1', 'node': 'noop', 'status': 'ok'})
        status.status = 'succeeded'
        return status

    def get(self, rid: str) -> RunStatus:
        return self._runs.get(rid)  # type: ignore

