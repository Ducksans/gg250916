from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class Node(BaseModel):
    id: str
    type: str
    config: Dict[str, Any] = {}
    x: float = 0
    y: float = 0

class Edge(BaseModel):
    id: str
    src: str
    dst: str
    meta: Dict[str, Any] = {}

class Flow(BaseModel):
    id: str
    name: str
    version: int = 1
    nodes: List[Node] = []
    edges: List[Edge] = []
    meta: Dict[str, Any] = {}

class RunRequest(BaseModel):
    flow_id: Optional[str] = None
    flow: Optional[Flow] = None
    input: Dict[str, Any] = {}
    vars: Dict[str, Any] = {}

class RunStatus(BaseModel):
    id: str
    status: str
    steps: List[Dict[str, Any]] = []
    artifacts: List[Dict[str, Any]] = []

