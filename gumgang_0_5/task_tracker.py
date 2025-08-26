#!/usr/bin/env python3
"""
금강 2.0 Task 추적 시스템
- 모든 작업에 고유 ID 부여
- 계층적 Task 관리
- 실시간 진행상황 추적
- 시각적 인디케이터 데이터 제공

Author: Gumgang AI Team
Version: 2.0
Created: 2025-01-08
"""

import json
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
import logging

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] %(name)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/duksan/바탕화면/gumgang_0_5/task_tracking/task_tracker.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 프로젝트 루트
PROJECT_ROOT = Path("/home/duksan/바탕화면/gumgang_0_5")
TRACKING_DIR = PROJECT_ROOT / "task_tracking"
TRACKING_DIR.mkdir(exist_ok=True)

class TaskStatus(Enum):
    """Task 상태"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    """Task 우선순위"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class TaskCheckpoint:
    """Task 체크포인트"""
    checkpoint_id: str
    timestamp: str
    description: str
    progress: int
    artifacts: List[str] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Task:
    """Task 정보"""
    task_id: str
    name: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    progress: int  # 0-100
    created_at: str
    created_by: str  # 'human' or 'ai'
    session_id: str
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    estimated_duration: Optional[int] = None  # minutes
    actual_duration: Optional[int] = None  # minutes
    checkpoints: List[TaskCheckpoint] = field(default_factory=list)
    artifacts: List[str] = field(default_factory=list)
    error_log: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

class TaskTracker:
    """Task 추적 관리자"""

    def __init__(self):
        self.tracking_dir = TRACKING_DIR
        self.registry_file = self.tracking_dir / "master_registry.json"
        self.timeline_file = self.tracking_dir / "task_timeline.json"
        self.visual_config_file = self.tracking_dir / "visual_config.json"

        # 메모리 내 Task 저장소
        self.tasks: Dict[str, Task] = {}
        self.current_task_id: Optional[str] = None
        self.task_counter = 0

        # 초기화
        self._initialize_tracking_system()
        self._load_registry()

        logger.info("Task 추적 시스템 초기화 완료")

    def _initialize_tracking_system(self):
        """추적 시스템 초기화"""
        # Visual 설정 생성
        if not self.visual_config_file.exists():
            visual_config = {
                "indicators": {
                    "status_colors": {
                        "pending": "#6B7280",      # gray
                        "in_progress": "#3B82F6",  # blue
                        "completed": "#10B981",    # green
                        "failed": "#EF4444",       # red
                        "blocked": "#F59E0B",      # amber
                        "cancelled": "#9CA3AF"     # gray-400
                    },
                    "priority_icons": {
                        "critical": "🔴",
                        "high": "🟠",
                        "medium": "🟡",
                        "low": "🟢"
                    },
                    "progress_style": "circular",
                    "update_interval": 1000,
                    "animation_duration": 300
                },
                "dashboard": {
                    "layout": "kanban",  # kanban | timeline | tree | grid
                    "refresh_rate": 500,
                    "show_dependencies": True,
                    "show_timeline": True,
                    "max_visible_tasks": 50
                },
                "gantt_chart": {
                    "enabled": True,
                    "time_scale": "hours",  # hours | days | weeks
                    "show_critical_path": True,
                    "show_milestones": True
                }
            }

            with open(self.visual_config_file, 'w', encoding='utf-8') as f:
                json.dump(visual_config, f, indent=2, ensure_ascii=False)

    def _load_registry(self):
        """레지스트리 로드"""
        if self.registry_file.exists():
            try:
                with open(self.registry_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Task 객체로 변환
                for task_id, task_data in data.get("tasks", {}).items():
                    # Enum 변환
                    task_data["status"] = TaskStatus(task_data["status"])
                    task_data["priority"] = TaskPriority(task_data["priority"])

                    # Checkpoint 객체 변환
                    checkpoints = []
                    for cp_data in task_data.get("checkpoints", []):
                        checkpoints.append(TaskCheckpoint(**cp_data))
                    task_data["checkpoints"] = checkpoints

                    self.tasks[task_id] = Task(**task_data)

                self.task_counter = data.get("task_counter", 0)
                logger.info(f"레지스트리 로드: {len(self.tasks)}개 Task")
            except Exception as e:
                logger.error(f"레지스트리 로드 실패: {e}")

    def _save_registry(self):
        """레지스트리 저장"""
        registry_data = {
            "version": "2.0",
            "updated_at": datetime.now().isoformat(),
            "task_counter": self.task_counter,
            "current_task_id": self.current_task_id,
            "tasks": {}
        }

        # Task를 dict로 변환
        for task_id, task in self.tasks.items():
            task_dict = asdict(task)
            # Enum을 문자열로 변환
            task_dict["status"] = task.status.value
            task_dict["priority"] = task.priority.value
            registry_data["tasks"][task_id] = task_dict

        with open(self.registry_file, 'w', encoding='utf-8') as f:
            json.dump(registry_data, f, indent=2, ensure_ascii=False)

        # 타임라인 업데이트
        self._update_timeline()

    def _update_timeline(self):
        """Task 타임라인 업데이트"""
        timeline = {
            "updated_at": datetime.now().isoformat(),
            "sessions": {},
            "task_flow": []
        }

        # 세션별 Task 그룹화
        for task in self.tasks.values():
            session_id = task.session_id
            if session_id not in timeline["sessions"]:
                timeline["sessions"][session_id] = {
                    "tasks": [],
                    "start_time": None,
                    "end_time": None
                }

            timeline["sessions"][session_id]["tasks"].append({
                "task_id": task.task_id,
                "name": task.name,
                "status": task.status.value,
                "progress": task.progress,
                "started_at": task.started_at,
                "completed_at": task.completed_at
            })

            # 세션 시간 범위 업데이트
            if task.created_at:
                if not timeline["sessions"][session_id]["start_time"] or \
                   task.created_at < timeline["sessions"][session_id]["start_time"]:
                    timeline["sessions"][session_id]["start_time"] = task.created_at

            if task.completed_at:
                if not timeline["sessions"][session_id]["end_time"] or \
                   task.completed_at > timeline["sessions"][session_id]["end_time"]:
                    timeline["sessions"][session_id]["end_time"] = task.completed_at

        # Task 플로우 (시간순 정렬)
        sorted_tasks = sorted(self.tasks.values(), key=lambda t: t.created_at)
        for task in sorted_tasks:
            timeline["task_flow"].append({
                "task_id": task.task_id,
                "timestamp": task.created_at,
                "event": "created"
            })

            if task.started_at:
                timeline["task_flow"].append({
                    "task_id": task.task_id,
                    "timestamp": task.started_at,
                    "event": "started"
                })

            if task.completed_at:
                timeline["task_flow"].append({
                    "task_id": task.task_id,
                    "timestamp": task.completed_at,
                    "event": "completed"
                })

        with open(self.timeline_file, 'w', encoding='utf-8') as f:
            json.dump(timeline, f, indent=2, ensure_ascii=False)

    def generate_task_id(self, prefix: str = "GG") -> str:
        """고유 Task ID 생성"""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        self.task_counter += 1
        return f"{prefix}-{timestamp}-{self.task_counter:03d}"

    def create_task(
        self,
        name: str,
        description: str = "",
        priority: TaskPriority = TaskPriority.MEDIUM,
        parent_id: Optional[str] = None,
        dependencies: List[str] = None,
        estimated_duration: Optional[int] = None,
        created_by: str = "human",
        session_id: str = None
    ) -> Task:
        """새 Task 생성"""
        task_id = self.generate_task_id()

        # 세션 ID 자동 설정
        if not session_id:
            session_id = f"SESSION-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

        task = Task(
            task_id=task_id,
            name=name,
            description=description,
            status=TaskStatus.PENDING,
            priority=priority,
            progress=0,
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            session_id=session_id,
            parent_id=parent_id,
            dependencies=dependencies or [],
            estimated_duration=estimated_duration
        )

        # 부모 Task에 자식 추가
        if parent_id and parent_id in self.tasks:
            self.tasks[parent_id].children_ids.append(task_id)

        self.tasks[task_id] = task
        self._save_registry()

        logger.info(f"Task 생성: {task_id} - {name} (우선순위: {priority.value})")

        return task

    def start_task(self, task_id: str) -> bool:
        """Task 시작"""
        if task_id not in self.tasks:
            logger.error(f"Task를 찾을 수 없음: {task_id}")
            return False

        task = self.tasks[task_id]

        # 의존성 확인
        for dep_id in task.dependencies:
            if dep_id in self.tasks:
                dep_task = self.tasks[dep_id]
                if dep_task.status != TaskStatus.COMPLETED:
                    logger.warning(f"의존성 Task 미완료: {dep_id}")
                    task.status = TaskStatus.BLOCKED
                    self._save_registry()
                    return False

        task.status = TaskStatus.IN_PROGRESS
        task.started_at = datetime.now().isoformat()
        self.current_task_id = task_id

        self._save_registry()

        logger.info(f"Task 시작: {task_id} - {task.name}")

        return True

    def update_progress(
        self,
        task_id: str,
        progress: int,
        checkpoint_description: str = None,
        artifacts: List[str] = None,
        metrics: Dict[str, Any] = None
    ):
        """Task 진행상황 업데이트"""
        if task_id not in self.tasks:
            logger.error(f"Task를 찾을 수 없음: {task_id}")
            return

        task = self.tasks[task_id]
        task.progress = min(100, max(0, progress))

        # 체크포인트 생성
        if checkpoint_description:
            checkpoint = TaskCheckpoint(
                checkpoint_id=f"CP-{datetime.now().strftime('%H%M%S')}",
                timestamp=datetime.now().isoformat(),
                description=checkpoint_description,
                progress=progress,
                artifacts=artifacts or [],
                metrics=metrics or {}
            )
            task.checkpoints.append(checkpoint)

        # 아티팩트 추가
        if artifacts:
            task.artifacts.extend(artifacts)

        # 자동 완료 처리
        if progress >= 100 and task.status == TaskStatus.IN_PROGRESS:
            self.complete_task(task_id)
        else:
            self._save_registry()

        logger.info(f"Task 진행: {task_id} - {progress}% - {checkpoint_description}")

    def complete_task(self, task_id: str, artifacts: List[str] = None) -> bool:
        """Task 완료"""
        if task_id not in self.tasks:
            logger.error(f"Task를 찾을 수 없음: {task_id}")
            return False

        task = self.tasks[task_id]
        task.status = TaskStatus.COMPLETED
        task.progress = 100
        task.completed_at = datetime.now().isoformat()

        # 실제 소요 시간 계산
        if task.started_at:
            start_time = datetime.fromisoformat(task.started_at)
            end_time = datetime.fromisoformat(task.completed_at)
            task.actual_duration = int((end_time - start_time).total_seconds() / 60)

        # 아티팩트 추가
        if artifacts:
            task.artifacts.extend(artifacts)

        # 현재 Task 해제
        if self.current_task_id == task_id:
            self.current_task_id = None

        self._save_registry()

        logger.info(f"Task 완료: {task_id} - {task.name}")
        logger.info(f"  소요 시간: {task.actual_duration}분")
        logger.info(f"  생성된 아티팩트: {len(task.artifacts)}개")

        # 이 Task에 의존하는 Task들 확인
        self._check_blocked_tasks()

        return True

    def fail_task(self, task_id: str, error_message: str) -> bool:
        """Task 실패 처리"""
        if task_id not in self.tasks:
            logger.error(f"Task를 찾을 수 없음: {task_id}")
            return False

        task = self.tasks[task_id]
        task.status = TaskStatus.FAILED
        task.error_log.append(f"{datetime.now().isoformat()}: {error_message}")

        # 현재 Task 해제
        if self.current_task_id == task_id:
            self.current_task_id = None

        self._save_registry()

        logger.error(f"Task 실패: {task_id} - {task.name}")
        logger.error(f"  오류: {error_message}")

        return True

    def get_task(self, task_id: str) -> Optional[Task]:
        """Task 조회"""
        return self.tasks.get(task_id)

    def get_current_task(self) -> Optional[Task]:
        """현재 진행 중인 Task 조회"""
        if self.current_task_id:
            return self.tasks.get(self.current_task_id)
        return None

    def get_tasks_by_status(self, status: TaskStatus) -> List[Task]:
        """상태별 Task 목록 조회"""
        return [task for task in self.tasks.values() if task.status == status]

    def get_tasks_by_session(self, session_id: str) -> List[Task]:
        """세션별 Task 목록 조회"""
        return [task for task in self.tasks.values() if task.session_id == session_id]

    def get_task_hierarchy(self, root_task_id: str = None) -> Dict[str, Any]:
        """Task 계층 구조 조회"""
        def build_tree(task_id: str) -> Dict[str, Any]:
            if task_id not in self.tasks:
                return None

            task = self.tasks[task_id]
            tree = {
                "task_id": task.task_id,
                "name": task.name,
                "status": task.status.value,
                "priority": task.priority.value,
                "progress": task.progress,
                "children": []
            }

            for child_id in task.children_ids:
                child_tree = build_tree(child_id)
                if child_tree:
                    tree["children"].append(child_tree)

            return tree

        if root_task_id:
            return build_tree(root_task_id)

        # 루트 Task들 찾기 (parent_id가 없는 Task)
        root_tasks = [task for task in self.tasks.values() if not task.parent_id]
        hierarchy = {
            "root_tasks": []
        }

        for task in root_tasks:
            tree = build_tree(task.task_id)
            if tree:
                hierarchy["root_tasks"].append(tree)

        return hierarchy

    def get_progress_summary(self) -> Dict[str, Any]:
        """전체 진행상황 요약"""
        total_tasks = len(self.tasks)
        if total_tasks == 0:
            return {
                "total_tasks": 0,
                "overall_progress": 0,
                "status_distribution": {},
                "priority_distribution": {}
            }

        # 상태별 분포
        status_dist = {}
        for status in TaskStatus:
            count = len([t for t in self.tasks.values() if t.status == status])
            status_dist[status.value] = {
                "count": count,
                "percentage": round(count / total_tasks * 100, 1)
            }

        # 우선순위별 분포
        priority_dist = {}
        for priority in TaskPriority:
            count = len([t for t in self.tasks.values() if t.priority == priority])
            priority_dist[priority.value] = {
                "count": count,
                "percentage": round(count / total_tasks * 100, 1)
            }

        # 전체 진행률 계산
        total_progress = sum(task.progress for task in self.tasks.values())
        overall_progress = round(total_progress / total_tasks, 1)

        # 현재 진행 중인 Task
        in_progress_tasks = self.get_tasks_by_status(TaskStatus.IN_PROGRESS)

        return {
            "total_tasks": total_tasks,
            "overall_progress": overall_progress,
            "status_distribution": status_dist,
            "priority_distribution": priority_dist,
            "in_progress_count": len(in_progress_tasks),
            "completed_count": len(self.get_tasks_by_status(TaskStatus.COMPLETED)),
            "failed_count": len(self.get_tasks_by_status(TaskStatus.FAILED)),
            "blocked_count": len(self.get_tasks_by_status(TaskStatus.BLOCKED)),
            "current_task": self.current_task_id
        }

    def generate_visual_data(self) -> Dict[str, Any]:
        """시각화를 위한 데이터 생성"""
        visual_data = {
            "timestamp": datetime.now().isoformat(),
            "gantt_data": [],
            "kanban_data": {},
            "timeline_data": [],
            "dependency_graph": [],
            "progress_chart": self.get_progress_summary()
        }

        # Gantt 차트 데이터
        for task in self.tasks.values():
            gantt_item = {
                "id": task.task_id,
                "name": task.name,
                "start": task.started_at or task.created_at,
                "end": task.completed_at,
                "progress": task.progress,
                "status": task.status.value,
                "priority": task.priority.value,
                "dependencies": task.dependencies
            }
            visual_data["gantt_data"].append(gantt_item)

        # Kanban 보드 데이터
        for status in TaskStatus:
            visual_data["kanban_data"][status.value] = []
            for task in self.get_tasks_by_status(status):
                visual_data["kanban_data"][status.value].append({
                    "id": task.task_id,
                    "name": task.name,
                    "priority": task.priority.value,
                    "progress": task.progress,
                    "assigned_to": task.created_by
                })

        # 타임라인 데이터
        events = []
        for task in self.tasks.values():
            events.append({
                "timestamp": task.created_at,
                "type": "created",
                "task_id": task.task_id,
                "task_name": task.name
            })

            if task.started_at:
                events.append({
                    "timestamp": task.started_at,
                    "type": "started",
                    "task_id": task.task_id,
                    "task_name": task.name
                })

            if task.completed_at:
                events.append({
                    "timestamp": task.completed_at,
                    "type": "completed",
                    "task_id": task.task_id,
                    "task_name": task.name
                })

        # 시간순 정렬
        visual_data["timeline_data"] = sorted(events, key=lambda x: x["timestamp"])

        # 의존성 그래프
        for task in self.tasks.values():
            for dep_id in task.dependencies:
                visual_data["dependency_graph"].append({
                    "from": dep_id,
                    "to": task.task_id
                })

        return visual_data

    def _check_blocked_tasks(self):
        """차단된 Task 확인 및 해제"""
        for task in self.get_tasks_by_status(TaskStatus.BLOCKED):
            # 모든 의존성이 완료되었는지 확인
            all_deps_completed = True
            for dep_id in task.dependencies:
                if dep_id in self.tasks:
                    if self.tasks[dep_id].status != TaskStatus.COMPLETED:
                        all_deps_completed = False
                        break

            if all_deps_completed:
                task.status = TaskStatus.PENDING
                logger.info(f"Task 차단 해제: {task.task_id} - {task.name}")

        self._save_registry()

    def generate_handover_document(self) -> str:
        """인계 문서 생성"""
        doc = f"""# Task 인계 문서
생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 전체 현황
{json.dumps(self.get_progress_summary(), indent=2, ensure_ascii=False)}

## 현재 진행 중인 Task
"""

        current_task = self.get_current_task()
        if current_task:
            doc += f"""
- **ID**: {current_task.task_id}
- **이름**: {current_task.name}
- **진행률**: {current_task.progress}%
- **시작 시간**: {current_task.started_at}
- **체크포인트**: {len(current_task.checkpoints)}개
"""
        else:
            doc += "- 진행 중인 Task 없음\n"

        doc += "\n## 대기 중인 Task\n"
        pending_tasks = self.get_tasks_by_status(TaskStatus.PENDING)
        for task in pending_tasks[:10]:  # 상위 10개만
            doc += f"- [{task.priority.value}] {task.task_id}: {task.name}\n"

        if len(pending_tasks) > 10:
            doc += f"... 외 {len(pending_tasks) - 10}개\n"

        doc += "\n## 차단된 Task\n"
        blocked_tasks = self.get_tasks_by_status(TaskStatus.BLOCKED)
        for task in blocked_tasks:
            doc += f"- {task.task_id}: {task.name} (의존: {', '.join(task.dependencies)})\n"

        doc += "\n## 최근 완료된 Task\n"
        completed_tasks = sorted(
            self.get_tasks_by_status(TaskStatus.COMPLETED),
            key=lambda t: t.completed_at or "",
            reverse=True
        )[:5]

        for task in completed_tasks:
            doc += f"- {task.task_id}: {task.name} ({task.completed_at})\n"
            if task.artifacts:
                doc += f"  아티팩트: {', '.join(task.artifacts[:3])}\n"

        doc += f"\n## 다음 세션 권장 사항\n"
        doc += f"1. 진행 중인 Task 계속: {current_task.task_id if current_task else '없음'}\n"
        doc += f"2. 대기 중인 Task: {len(pending_tasks)}개\n"
        doc += f"3. 차단된 Task 해결: {len(blocked_tasks)}개\n"

        # 파일로 저장
        handover_file = self.tracking_dir / f"handover_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(handover_file, 'w', encoding='utf-8') as f:
            f.write(doc)

        logger.info(f"인계 문서 생성: {handover_file}")

        return doc


def main():
    """테스트 및 초기화"""
    print("🚀 Task 추적 시스템 초기화")
    print("="*50)

    tracker = TaskTracker()

    # 테스트 Task 생성
    task1 = tracker.create_task(
        name="세션 매니저 시스템 구축",
        description="세션 간 컨텍스트 영속화 시스템",
        priority=TaskPriority.HIGH,
        estimated_duration=30
    )

    task2 = tracker.create_task(
        name="Task 추적 시스템 구축",
        description="모든 작업의 고유 ID 부여 및 추적",
        priority=TaskPriority.HIGH,
        estimated_duration=45
    )

    # Task 시작 및 진행
    tracker.start_task(task1.task_id)
    tracker.update_progress(
        task1.task_id,
        50,
        "기본 구조 생성 완료",
        artifacts=["session_manager.py", "context/"]
    )

    # 요약 출력
    summary = tracker.get_progress_summary()
    print(f"\n📊 Task 현황")
    print(f"  전체: {summary['total_tasks']}개")
    print(f"  진행률: {summary['overall_progress']}%")
    print(f"  진행 중: {summary['in_progress_count']}개")
    print(f"  완료: {summary['completed_count']}개")

    # 시각화 데이터 생성
    visual_data = tracker.generate_visual_data()
    visual_file = tracker.tracking_dir / "visual_data.json"
    with open(visual_file, 'w', encoding='utf-8') as f:
        json.dump(visual_data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Task 추적 시스템 준비 완료!")
    print(f"📁 추적 데이터: {tracker.tracking_dir}")
    print(f"📊 시각화 데이터: {visual_file}")


if __name__ == "__main__":
    main()
