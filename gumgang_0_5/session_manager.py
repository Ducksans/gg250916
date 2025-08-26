#!/usr/bin/env python3
"""
금강 2.0 세션 관리 시스템
- 세션 간 컨텍스트 영속화
- 할루시네이션 방지
- 실제 상태 기반 의사결정
- 4계층 메모리 시스템

Author: Gumgang AI Team
Version: 2.0
Created: 2025-01-08
"""

import os
import json
import yaml
import hashlib
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
import logging
import time

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/duksan/바탕화면/gumgang_0_5/context/session.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 프로젝트 루트 경로
PROJECT_ROOT = Path("/home/duksan/바탕화면/gumgang_0_5")

@dataclass
class FileState:
    """파일 상태 정보"""
    path: str
    exists: bool
    size: int
    modified: str
    hash: Optional[str] = None
    content_preview: Optional[str] = None

@dataclass
class TaskInfo:
    """Task 정보"""
    task_id: str
    name: str
    status: str  # pending|in_progress|completed|failed
    progress: int
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    parent_id: Optional[str] = None
    checkpoints: List[Dict] = field(default_factory=list)
    artifacts: List[str] = field(default_factory=list)

@dataclass
class SessionContext:
    """세션 컨텍스트"""
    session_id: str
    timestamp: str
    previous_session: Optional[str]
    verified_facts: Dict[str, Any]
    warnings: List[str]
    tasks_completed: List[TaskInfo]
    tasks_pending: List[TaskInfo]
    tasks_in_progress: List[TaskInfo]
    file_states: Dict[str, FileState]
    memory_layers: Dict[str, Dict]
    session_metrics: Dict[str, Any]

class SessionManager:
    """세션 관리자 - AI와 인간의 협업을 위한 핵심 시스템"""

    def __init__(self):
        self.root = PROJECT_ROOT
        self.context_dir = self.root / "context"
        self.context_dir.mkdir(exist_ok=True)

        # 컨텍스트 파일 경로
        self.current_context_file = self.context_dir / "current_session.yaml"
        self.history_file = self.context_dir / "session_history.json"
        self.file_registry = self.context_dir / "file_registry.json"
        self.task_registry = self.context_dir / "task_registry.json"

        # 메모리 계층 파일
        self.memory_layers = {
            "ultra_short": self.context_dir / "memory_ultra_short.json",  # 현재 작업
            "short": self.context_dir / "memory_short.json",              # 오늘 세션
            "medium": self.context_dir / "memory_medium.json",            # 이번 주
            "long": self.context_dir / "memory_long.json"                 # 전체 프로젝트
        }

        # Task 추적
        self.current_task: Optional[TaskInfo] = None
        self.task_counter = 0

        logger.info("세션 매니저 초기화 완료")

    def generate_task_id(self, prefix: str = "GG") -> str:
        """Task ID 생성"""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        self.task_counter += 1
        return f"{prefix}-{timestamp}-{self.task_counter:03d}"

    def create_task(self, name: str, parent_id: Optional[str] = None) -> TaskInfo:
        """새 Task 생성"""
        task = TaskInfo(
            task_id=self.generate_task_id(),
            name=name,
            status="pending",
            progress=0,
            created_at=datetime.now().isoformat(),
            parent_id=parent_id
        )

        logger.info(f"Task 생성: {task.task_id} - {name}")

        # Task 레지스트리에 저장
        self._save_task_to_registry(task)

        return task

    def start_task(self, task: TaskInfo) -> TaskInfo:
        """Task 시작"""
        task.status = "in_progress"
        task.started_at = datetime.now().isoformat()
        self.current_task = task

        logger.info(f"Task 시작: {task.task_id} - {task.name}")

        # 초단기 메모리 업데이트
        self.update_memory("ultra_short", "current_task", {
            "task_id": task.task_id,
            "name": task.name,
            "started_at": task.started_at
        })

        return task

    def update_task_progress(self, task: TaskInfo, progress: int, checkpoint: Optional[str] = None):
        """Task 진행상황 업데이트"""
        task.progress = min(100, max(0, progress))

        if checkpoint:
            task.checkpoints.append({
                "timestamp": datetime.now().isoformat(),
                "description": checkpoint,
                "progress": progress
            })

        logger.info(f"Task 진행: {task.task_id} - {progress}% - {checkpoint}")

        # Task 레지스트리 업데이트
        self._save_task_to_registry(task)

    def complete_task(self, task: TaskInfo, artifacts: List[str] = None) -> TaskInfo:
        """Task 완료"""
        task.status = "completed"
        task.progress = 100
        task.completed_at = datetime.now().isoformat()

        if artifacts:
            task.artifacts = artifacts

        logger.info(f"Task 완료: {task.task_id} - {task.name}")
        logger.info(f"  생성된 아티팩트: {artifacts}")

        # Task 레지스트리 업데이트
        self._save_task_to_registry(task)

        # 현재 Task 해제
        if self.current_task and self.current_task.task_id == task.task_id:
            self.current_task = None

        return task

    def verify_project_structure(self) -> Dict[str, Any]:
        """프로젝트 구조 검증 - 할루시네이션 방지"""
        structure = {
            "timestamp": datetime.now().isoformat(),
            "directories": {},
            "critical_files": {},
            "issues": [],
            "recommendations": []
        }

        # 주요 디렉토리 확인
        key_dirs = {
            "frontend_legacy": "frontend",
            "frontend_v2": "gumgang-v2",
            "backend": "backend",
            "memory": "memory",
            "context": "context",
            "task_tracking": "task_tracking"
        }

        for key, dir_name in key_dirs.items():
            dir_path = self.root / dir_name
            structure["directories"][key] = {
                "path": str(dir_path),
                "exists": dir_path.exists(),
                "is_dir": dir_path.is_dir() if dir_path.exists() else False,
                "file_count": len(list(dir_path.glob("**/*"))) if dir_path.exists() and dir_path.is_dir() else 0
            }

            if key == "frontend_legacy" and dir_path.exists():
                structure["issues"].append("⚠️ 구버전 frontend 폴더가 여전히 존재합니다")
                structure["recommendations"].append("frontend 폴더를 legacy_backup으로 이동 필요")

        # 중요 파일 확인
        critical_files = [
            "gumgang-v2/package.json",
            "gumgang-v2/app/dashboard/page.tsx",
            "backend/app/api/routes/dashboard.py",
            "backend/main.py",
            "backend/app_new.py",
            "session_manager.py",
            "task_tracker.py"
        ]

        for file_path in critical_files:
            full_path = self.root / file_path
            if full_path.exists():
                stat = full_path.stat()
                structure["critical_files"][file_path] = {
                    "exists": True,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "hash": self._calculate_file_hash(full_path)
                }
            else:
                structure["critical_files"][file_path] = {"exists": False}

        return structure

    def check_running_services(self) -> Dict[str, Any]:
        """실행 중인 서비스 확인"""
        services = {
            "frontend": {"port": 3000, "running": False, "process": None},
            "backend": {"port": 8000, "running": False, "process": None}
        }

        for service, info in services.items():
            try:
                result = subprocess.run(
                    ["lsof", "-i", f":{info['port']}"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    info["running"] = True
                    info["process"] = result.stdout.strip()[:100]  # 처음 100자만
            except Exception as e:
                logger.error(f"서비스 확인 실패 {service}: {e}")

        return services

    def create_session(self, previous_session_id: Optional[str] = None) -> SessionContext:
        """새 세션 생성"""
        session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        # 프로젝트 구조 검증
        structure = self.verify_project_structure()
        services = self.check_running_services()

        # 이전 세션에서 Task 정보 로드
        tasks_completed = []
        tasks_pending = []
        tasks_in_progress = []

        if previous_session_id:
            prev_context = self._load_session_from_history(previous_session_id)
            if prev_context:
                # 완료되지 않은 Task는 이월
                tasks_pending = prev_context.get("tasks_pending", [])
                tasks_in_progress = prev_context.get("tasks_in_progress", [])

        # 세션 메트릭 생성
        session_metrics = {
            "token_usage": {"current": 0, "limit": 120000},
            "api_calls": 0,
            "files_created": 0,
            "files_modified": 0,
            "execution_time": 0
        }

        # 세션 컨텍스트 생성
        context = SessionContext(
            session_id=session_id,
            timestamp=datetime.now().isoformat(),
            previous_session=previous_session_id,
            verified_facts={
                "structure": structure,
                "services": services,
                "frontend_path": "/gumgang-v2",
                "backend_path": "/backend",
                "using_next_js": True,
                "monaco_editor": True,
                "tauri_enabled": True
            },
            warnings=structure["issues"],
            tasks_completed=tasks_completed,
            tasks_pending=tasks_pending,
            tasks_in_progress=tasks_in_progress,
            file_states={},
            memory_layers={},
            session_metrics=session_metrics
        )

        # 파일 상태 기록
        for file_path, info in structure["critical_files"].items():
            if info["exists"]:
                context.file_states[file_path] = FileState(
                    path=file_path,
                    exists=True,
                    size=info.get("size", 0),
                    modified=info.get("modified", ""),
                    hash=info.get("hash", ""),
                    content_preview=self._get_file_preview(self.root / file_path)
                )

        # 컨텍스트 저장
        self.save_context(context)

        logger.info(f"새 세션 생성: {session_id}")
        logger.info(f"  이전 세션: {previous_session_id}")
        logger.info(f"  대기 Task: {len(tasks_pending)}개")
        logger.info(f"  진행 중 Task: {len(tasks_in_progress)}개")

        return context

    def save_context(self, context: SessionContext):
        """컨텍스트 저장"""
        # YAML 형식으로 현재 컨텍스트 저장
        context_dict = asdict(context)

        with open(self.current_context_file, 'w', encoding='utf-8') as f:
            yaml.dump(context_dict, f, allow_unicode=True, default_flow_style=False, sort_keys=False)

        # JSON 형식으로 히스토리 추가
        history = []
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    history = json.load(f)
            except:
                history = []

        # 히스토리에 추가 (최대 100개 세션 유지)
        history.append(context_dict)
        if len(history) > 100:
            history = history[-100:]

        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)

        logger.info(f"세션 컨텍스트 저장: {context.session_id}")

    def load_context(self) -> Optional[SessionContext]:
        """현재 컨텍스트 로드"""
        if not self.current_context_file.exists():
            return None

        try:
            with open(self.current_context_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)

            # FileState와 TaskInfo 객체로 변환
            file_states = {}
            for path, state_dict in data.get("file_states", {}).items():
                file_states[path] = FileState(**state_dict)

            tasks_completed = [TaskInfo(**t) for t in data.get("tasks_completed", [])]
            tasks_pending = [TaskInfo(**t) for t in data.get("tasks_pending", [])]
            tasks_in_progress = [TaskInfo(**t) for t in data.get("tasks_in_progress", [])]

            data["file_states"] = file_states
            data["tasks_completed"] = tasks_completed
            data["tasks_pending"] = tasks_pending
            data["tasks_in_progress"] = tasks_in_progress

            return SessionContext(**data)
        except Exception as e:
            logger.error(f"컨텍스트 로드 실패: {e}")
            return None

    def verify_file_exists(self, relative_path: str) -> Tuple[bool, Optional[Dict]]:
        """파일 존재 검증 - 추측 방지"""
        full_path = self.root / relative_path
        exists = full_path.exists()

        info = {
            "path": relative_path,
            "exists": exists,
            "full_path": str(full_path)
        }

        if exists:
            stat = full_path.stat()
            info.update({
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "is_file": full_path.is_file(),
                "is_dir": full_path.is_dir()
            })
            logger.info(f"✅ 파일 확인: {relative_path}")
        else:
            logger.warning(f"❌ 파일 없음: {relative_path}")

            # 컨텍스트에 경고 추가
            context = self.load_context()
            if context:
                warning = f"파일 없음: {relative_path} ({datetime.now().strftime('%H:%M:%S')})"
                if warning not in context.warnings:
                    context.warnings.append(warning)
                    self.save_context(context)

        return exists, info

    def update_memory(self, layer: str, key: str, value: Any):
        """메모리 업데이트"""
        if layer not in self.memory_layers:
            raise ValueError(f"Unknown memory layer: {layer}")

        memory_file = self.memory_layers[layer]
        memory = {}

        if memory_file.exists():
            try:
                with open(memory_file, 'r', encoding='utf-8') as f:
                    memory = json.load(f)
            except:
                memory = {}

        memory[key] = {
            "value": value,
            "timestamp": datetime.now().isoformat(),
            "session_id": self.load_context().session_id if self.load_context() else "unknown"
        }

        with open(memory_file, 'w', encoding='utf-8') as f:
            json.dump(memory, f, indent=2, ensure_ascii=False)

        logger.info(f"메모리 업데이트: {layer}/{key}")

    def get_memory(self, layer: str, key: str = None) -> Any:
        """메모리 조회"""
        if layer not in self.memory_layers:
            raise ValueError(f"Unknown memory layer: {layer}")

        memory_file = self.memory_layers[layer]
        if not memory_file.exists():
            return None if key else {}

        try:
            with open(memory_file, 'r', encoding='utf-8') as f:
                memory = json.load(f)

            if key:
                return memory.get(key, {}).get("value")
            return memory
        except:
            return None if key else {}

    def create_checkpoint(self, name: str, description: str = "") -> Dict[str, Any]:
        """체크포인트 생성"""
        checkpoint_id = f"CP-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        checkpoint = {
            "id": checkpoint_id,
            "name": name,
            "description": description,
            "timestamp": datetime.now().isoformat(),
            "session_id": self.load_context().session_id if self.load_context() else None,
            "current_task": asdict(self.current_task) if self.current_task else None,
            "memory_snapshot": {
                "ultra_short": self.get_memory("ultra_short"),
                "short": self.get_memory("short")
            }
        }

        # 체크포인트 파일 저장
        checkpoint_file = self.context_dir / f"checkpoint_{checkpoint_id}.json"
        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(checkpoint, f, indent=2, ensure_ascii=False)

        logger.info(f"체크포인트 생성: {checkpoint_id} - {name}")

        return checkpoint

    def _calculate_file_hash(self, file_path: Path) -> str:
        """파일 해시 계산"""
        if not file_path.exists() or not file_path.is_file():
            return ""

        try:
            hasher = hashlib.md5()
            with open(file_path, 'rb') as f:
                # 큰 파일을 위해 청크 단위로 읽기
                for chunk in iter(lambda: f.read(65536), b''):
                    hasher.update(chunk)

            return hasher.hexdigest()
        except:
            return ""

    def _get_file_preview(self, file_path: Path, lines: int = 5) -> str:
        """파일 미리보기"""
        if not file_path.exists() or not file_path.is_file():
            return ""

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                preview_lines = []
                for i, line in enumerate(f):
                    if i >= lines:
                        break
                    preview_lines.append(line.rstrip())
                return '\n'.join(preview_lines)
        except:
            return ""

    def _save_task_to_registry(self, task: TaskInfo):
        """Task를 레지스트리에 저장"""
        registry = {}
        if self.task_registry.exists():
            try:
                with open(self.task_registry, 'r', encoding='utf-8') as f:
                    registry = json.load(f)
            except:
                registry = {}

        registry[task.task_id] = asdict(task)

        with open(self.task_registry, 'w', encoding='utf-8') as f:
            json.dump(registry, f, indent=2, ensure_ascii=False)

    def _load_session_from_history(self, session_id: str) -> Optional[Dict]:
        """히스토리에서 특정 세션 로드"""
        if not self.history_file.exists():
            return None

        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                history = json.load(f)

            for session in history:
                if session.get("session_id") == session_id:
                    return session
        except:
            pass

        return None

    def generate_status_report(self) -> str:
        """상태 보고서 생성"""
        context = self.load_context()
        if not context:
            return "세션 컨텍스트가 없습니다."

        structure = self.verify_project_structure()
        services = self.check_running_services()

        report = f"""
# 금강 2.0 세션 상태 보고서
생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 세션 정보
- 세션 ID: {context.session_id}
- 시작 시간: {context.timestamp}
- 이전 세션: {context.previous_session or '없음'}

## Task 현황
- 완료: {len(context.tasks_completed)}개
- 진행 중: {len(context.tasks_in_progress)}개
- 대기: {len(context.tasks_pending)}개

## 현재 Task
"""

        if self.current_task:
            report += f"""
- ID: {self.current_task.task_id}
- 이름: {self.current_task.name}
- 상태: {self.current_task.status}
- 진행률: {self.current_task.progress}%
"""
        else:
            report += "- 실행 중인 Task 없음\n"

        report += f"""
## 서비스 상태
- Frontend (포트 3000): {'🟢 실행 중' if services['frontend']['running'] else '🔴 중지'}
- Backend (포트 8000): {'🟢 실행 중' if services['backend']['running'] else '🔴 중지'}

## 프로젝트 구조
"""

        for key, info in structure["directories"].items():
            status = "✅" if info["exists"] else "❌"
            report += f"- {status} {key}: {info['path']}\n"

        if context.warnings:
            report += "\n## ⚠️ 경고\n"
            for warning in context.warnings:
                report += f"- {warning}\n"

        return report


def main():
    """테스트 및 초기 설정"""
    print("🚀 금강 2.0 세션 매니저 초기화")
    print("="*50)

    manager = SessionManager()

    # 새 세션 생성
    context = manager.create_session()

    # Task 생성 및 실행 예제
    task = manager.create_task("세션 매니저 시스템 구축")
    manager.start_task(task)
    manager.update_task_progress(task, 25, "디렉토리 구조 생성 완료")

    # 상태 보고서 출력
    print(manager.generate_status_report())

    print("\n✅ 세션 매니저 준비 완료!")
    print(f"📁 컨텍스트 위치: {manager.context_dir}")
    print(f"📋 현재 세션: {context.session_id}")


if __name__ == "__main__":
    main()
