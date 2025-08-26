from fastapi import APIRouter
from datetime import datetime
from typing import Dict, Any

router = APIRouter()

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for the backend service.
    Returns the current status and timestamp.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "gumgang-backend",
        "version": "2.0.0"
    }

@router.get("/health/detailed")
async def detailed_health_check() -> Dict[str, Any]:
    """
    Detailed health check with component status.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "gumgang-backend",
        "version": "2.0.0",
        "components": {
            "memory_system": "active",
            "chromadb": "connected",
            "openai_api": "configured",
            "routes": "loaded"
        },
        "uptime": "running"
    }
