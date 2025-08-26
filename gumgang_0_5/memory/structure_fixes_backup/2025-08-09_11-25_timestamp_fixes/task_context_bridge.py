#!/usr/bin/env python3
"""
Task Context Bridge System v1.0
================================
완벽한 세션 연속성을 위한 컨텍스트 브리지 시스템

이 시스템은 LLM의 구조적 한계(세션 간 컨텍스트 손실)를 완전히 극복합니다.
모든 Task는 시작과 종료 시 자동으로 문서를 업데이트하며,
새로운 AI 세션이 완벽하게 작업을 이어받을 수 있도록 합니다.
"""

import json
import os
import sys
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
import sqlite3
import difflib
import traceback

# Task 상태 Enum
class TaskPhase(Enum):
    INITIALIZED = "initialized"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    TESTING = "testing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

@dataclass
class FileChange:
    """파일 변경 사항 추적"""
    path: str
    action: str  # created, modified, deleted
    before_hash: Optional[str]
    after_hash: Optional[str]
    lines_added: int = 0
    lines_removed: int = 0
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class Decision:
    """의사결정 기록"""
    id: str
    description: str
    rationale: str
    alternatives: List[str]
    chosen: str
    timestamp: datetime
    impact: str  # low, medium, high

@dataclass
class Problem:
    """발생한 문제와 해결책"""
    id: str
    description: str
    error_message: Optional[str]
    solution: Optional[str]
    resolved: bool
    timestamp: datetime
    retry_count: int = 0

@dataclass
class TaskContext:
    """Task 실행 컨텍스트"""
    task_id: str
    task_name: str
    phase: TaskPhase
    started_at: datetime
    completed_at: Optional[datetime]

    # 진행 상황
    progress: int
    current_step: str
    next_steps: List[str]

    # 변경 사항
    file_changes: List[FileChange]

    # 의사결정
    decisions: List[Decision]

    # 문제 및 해결
    problems: List[Problem]

    # 명령어 실행 기록
    commands_executed: List[Dict[str, Any]]

    # 테스트 결과
    test_results: Dict[str, Any]

    # 환경 상태
    environment: Dict[str, Any]

    # 메트릭
    metrics: Dict[str, Any]

    # 중요 노트
    notes: List[str]

    # 롤백 정보
    rollback_points: List[str]

    def to_dict(self):
        data = asdict(self)
        data['phase'] = self.phase.value
        data['started_at'] = self.started_at.isoformat()
        if self.completed_at:
            data['completed_at'] = self.completed_at.isoformat()
        return data

class TaskContextBridge:
    """Task Context Bridge - 세션 간 완벽한 연속성 보장"""

    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path("/home/duksan/바탕화면/gumgang_0_5")
        self.context_dir = self.project_root / "task_contexts"
        self.bridge_file = self.project_root / "TASK_CONTEXT_BRIDGE.md"
        self.registry_file = self.project_root / "task_tracking/master_registry.json"
        self.db_file = self.project_root / "task_context.db"

        # 디렉토리 생성
        self.context_dir.mkdir(exist_ok=True)

        # 데이터베이스 초기화
        self.init_database()

        # 현재 컨텍스트
        self.current_context: Optional[TaskContext] = None

        # 파일 감시 목록
        self.watched_files: Dict[str, str] = {}  # path -> hash

    def init_database(self):
        """SQLite 데이터베이스 초기화"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS task_contexts (
                task_id TEXT PRIMARY KEY,
                task_name TEXT,
                phase TEXT,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                progress INTEGER,
                current_step TEXT,
                context_json TEXT,
                bridge_document TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS file_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT,
                file_path TEXT,
                action TEXT,
                before_hash TEXT,
                after_hash TEXT,
                lines_added INTEGER,
                lines_removed INTEGER,
                timestamp TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES task_contexts(task_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS decisions (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                description TEXT,
                rationale TEXT,
                chosen TEXT,
                impact TEXT,
                timestamp TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES task_contexts(task_id)
            )
        ''')

        conn.commit()
        conn.close()

    def start_task(self, task_id: str, task_name: str) -> TaskContext:
        """Task 시작 시 컨텍스트 생성 및 문서 업데이트"""
        print(f"\n🚀 Task 시작: {task_id} - {task_name}")

        # 기존 컨텍스트 종료
        if self.current_context:
            self.complete_task()

        # 새 컨텍스트 생성
        self.current_context = TaskContext(
            task_id=task_id,
            task_name=task_name,
            phase=TaskPhase.STARTED,
            started_at=datetime.now(),
            completed_at=None,
            progress=0,
            current_step="초기화",
            next_steps=[],
            file_changes=[],
            decisions=[],
            problems=[],
            commands_executed=[],
            test_results={},
            environment=self.capture_environment(),
            metrics={},
            notes=[],
            rollback_points=[]
        )

        # 초기 파일 상태 캡처
        self.capture_file_state()

        # Task Registry 업데이트
        self.update_task_registry("started")

        # Bridge 문서 생성
        self.generate_bridge_document()

        # 데이터베이스 저장
        self.save_to_database()

        print(f"✅ Task 컨텍스트 생성 완료")
        return self.current_context

    def update_progress(self, progress: int, current_step: str, next_steps: List[str] = None):
        """진행 상황 업데이트"""
        if not self.current_context:
            return

        self.current_context.progress = progress
        self.current_context.current_step = current_step
        if next_steps:
            self.current_context.next_steps = next_steps

        # 자동으로 Bridge 문서 업데이트
        self.generate_bridge_document()
        self.save_to_database()

    def record_file_change(self, file_path: str, action: str):
        """파일 변경 사항 기록"""
        if not self.current_context:
            return

        full_path = self.project_root / file_path
        before_hash = self.watched_files.get(file_path)
        after_hash = None

        if full_path.exists() and action != "deleted":
            after_hash = self.calculate_file_hash(full_path)

        # 변경된 줄 수 계산
        lines_added, lines_removed = 0, 0
        if action == "modified" and before_hash and after_hash:
            lines_added, lines_removed = self.calculate_diff_stats(full_path)

        change = FileChange(
            path=file_path,
            action=action,
            before_hash=before_hash,
            after_hash=after_hash,
            lines_added=lines_added,
            lines_removed=lines_removed
        )

        self.current_context.file_changes.append(change)
        self.watched_files[file_path] = after_hash

    def record_decision(self, description: str, rationale: str,
                       alternatives: List[str], chosen: str, impact: str = "medium"):
        """의사결정 기록"""
        if not self.current_context:
            return

        decision = Decision(
            id=f"DEC-{datetime.now().strftime('%H%M%S')}",
            description=description,
            rationale=rationale,
            alternatives=alternatives,
            chosen=chosen,
            timestamp=datetime.now(),
            impact=impact
        )

        self.current_context.decisions.append(decision)
        self.current_context.notes.append(f"📌 결정: {description} -> {chosen}")

    def record_problem(self, description: str, error_message: str = None):
        """문제 발생 기록"""
        if not self.current_context:
            return

        problem = Problem(
            id=f"PROB-{datetime.now().strftime('%H%M%S')}",
            description=description,
            error_message=error_message,
            solution=None,
            resolved=False,
            timestamp=datetime.now()
        )

        self.current_context.problems.append(problem)
        return problem.id

    def record_solution(self, problem_id: str, solution: str):
        """문제 해결 기록"""
        if not self.current_context:
            return

        for problem in self.current_context.problems:
            if problem.id == problem_id:
                problem.solution = solution
                problem.resolved = True
                self.current_context.notes.append(f"✅ 해결: {problem.description}")
                break

    def record_command(self, command: str, output: str, exit_code: int):
        """명령어 실행 기록"""
        if not self.current_context:
            return

        self.current_context.commands_executed.append({
            'command': command,
            'output': output[:500],  # 처음 500자만
            'exit_code': exit_code,
            'timestamp': datetime.now().isoformat()
        })

    def add_rollback_point(self, description: str):
        """롤백 포인트 추가"""
        if not self.current_context:
            return

        rollback_id = f"RB-{datetime.now().strftime('%H%M%S')}"
        self.current_context.rollback_points.append(f"{rollback_id}: {description}")

        # 체크포인트 생성 명령 실행
        subprocess.run([
            'python', 'protocol_guard_v3.py',
            '--checkpoint', rollback_id
        ], cwd=self.project_root)

    def complete_task(self, success: bool = True):
        """Task 완료 시 최종 문서 업데이트"""
        if not self.current_context:
            return

        self.current_context.completed_at = datetime.now()
        self.current_context.phase = TaskPhase.COMPLETED if success else TaskPhase.FAILED
        self.current_context.progress = 100 if success else self.current_context.progress

        # 최종 Bridge 문서 생성
        self.generate_bridge_document(final=True)

        # Task Registry 업데이트
        self.update_task_registry("completed" if success else "failed")

        # 개별 Task 문서 생성
        self.generate_task_document()

        # 데이터베이스 저장
        self.save_to_database()

        print(f"✅ Task {self.current_context.task_id} 완료 문서화")

        # 컨텍스트 초기화
        self.current_context = None

    def generate_bridge_document(self, final: bool = False):
        """Bridge 문서 생성 - 새 AI가 읽을 핵심 문서"""
        if not self.current_context:
            return

        doc = []
        doc.append("# 🌉 TASK CONTEXT BRIDGE")
        doc.append(f"**Generated**: {datetime.now().isoformat()}")
        doc.append(f"**Task**: {self.current_context.task_id} - {self.current_context.task_name}")
        doc.append(f"**Phase**: {self.current_context.phase.value}")
        doc.append(f"**Progress**: {self.current_context.progress}%")
        doc.append("")

        # 1. 즉시 실행 명령
        doc.append("## 🚨 새 세션 시작 시 즉시 실행")
        doc.append("```bash")
        doc.append("cd /home/duksan/바탕화면/gumgang_0_5")
        doc.append("python protocol_guard_v3.py --status")
        doc.append("python task_context_bridge.py --resume")
        doc.append("```")
        doc.append("")

        # 2. 현재 상황
        doc.append("## 📊 현재 상황")
        doc.append(f"- **현재 단계**: {self.current_context.current_step}")
        doc.append(f"- **시작 시간**: {self.current_context.started_at.isoformat()}")
        if self.current_context.completed_at:
            doc.append(f"- **완료 시간**: {self.current_context.completed_at.isoformat()}")
        doc.append("")

        # 3. 다음 단계
        if self.current_context.next_steps:
            doc.append("## ➡️ 다음 작업")
            for step in self.current_context.next_steps:
                doc.append(f"1. {step}")
            doc.append("")

        # 4. 변경된 파일
        if self.current_context.file_changes:
            doc.append("## 📝 변경된 파일")
            for change in self.current_context.file_changes[-10:]:  # 최근 10개
                emoji = {"created": "✨", "modified": "📝", "deleted": "🗑️"}.get(change.action, "📄")
                doc.append(f"- {emoji} `{change.path}` ({change.action})")
                if change.lines_added or change.lines_removed:
                    doc.append(f"  - 추가: +{change.lines_added}, 삭제: -{change.lines_removed}")
            doc.append("")

        # 5. 주요 결정사항
        if self.current_context.decisions:
            doc.append("## 🎯 주요 결정사항")
            for decision in self.current_context.decisions[-5:]:  # 최근 5개
                doc.append(f"- **{decision.description}**")
                doc.append(f"  - 선택: {decision.chosen}")
                doc.append(f"  - 이유: {decision.rationale}")
            doc.append("")

        # 6. 발생한 문제
        unresolved = [p for p in self.current_context.problems if not p.resolved]
        if unresolved:
            doc.append("## ⚠️ 미해결 문제")
            for problem in unresolved:
                doc.append(f"- {problem.description}")
                if problem.error_message:
                    doc.append(f"  ```")
                    doc.append(f"  {problem.error_message}")
                    doc.append(f"  ```")
            doc.append("")

        # 7. 실행된 명령어
        if self.current_context.commands_executed:
            doc.append("## 💻 최근 실행 명령어")
            for cmd in self.current_context.commands_executed[-5:]:  # 최근 5개
                status = "✅" if cmd['exit_code'] == 0 else "❌"
                doc.append(f"- {status} `{cmd['command']}`")
            doc.append("")

        # 8. 롤백 포인트
        if self.current_context.rollback_points:
            doc.append("## 🔄 롤백 포인트")
            for point in self.current_context.rollback_points:
                doc.append(f"- {point}")
            doc.append("")

        # 9. 중요 노트
        if self.current_context.notes:
            doc.append("## 📌 중요 노트")
            for note in self.current_context.notes[-10:]:  # 최근 10개
                doc.append(f"- {note}")
            doc.append("")

        # 10. 환경 정보
        doc.append("## 🌍 환경 정보")
        doc.append(f"- Backend: http://localhost:8001")
        doc.append(f"- Frontend: http://localhost:3000")
        doc.append(f"- Protocol Guard: v3.0")
        doc.append("")

        # 11. 작업 재개 방법
        if not final:
            doc.append("## 🔄 작업 재개 방법")
            doc.append("```python")
            doc.append("from task_context_bridge import TaskContextBridge")
            doc.append("bridge = TaskContextBridge()")
            doc.append(f"context = bridge.resume_task('{self.current_context.task_id}')")
            doc.append("# 작업 계속...")
            doc.append("```")

        # 파일 저장
        with open(self.bridge_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(doc))

    def generate_task_document(self):
        """개별 Task 문서 생성"""
        if not self.current_context:
            return

        doc_path = self.context_dir / f"{self.current_context.task_id}.md"

        doc = []
        doc.append(f"# Task: {self.current_context.task_id}")
        doc.append(f"## {self.current_context.task_name}")
        doc.append("")

        # 전체 내용을 JSON으로 저장
        context_dict = self.current_context.to_dict()

        doc.append("## 전체 컨텍스트")
        doc.append("```json")
        doc.append(json.dumps(context_dict, indent=2, ensure_ascii=False))
        doc.append("```")

        with open(doc_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(doc))

    def resume_task(self, task_id: str) -> Optional[TaskContext]:
        """이전 Task 재개"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()

        cursor.execute('''
            SELECT context_json FROM task_contexts WHERE task_id = ?
        ''', (task_id,))

        result = cursor.fetchone()
        conn.close()

        if result:
            context_dict = json.loads(result[0])
            # TaskContext 객체로 변환 (복잡한 로직 필요)
            print(f"✅ Task {task_id} 컨텍스트 로드 완료")
            return context_dict

        return None

    def update_task_registry(self, status: str):
        """Task Registry 업데이트"""
        if not self.current_context:
            return

        try:
            with open(self.registry_file, 'r') as f:
                registry = json.load(f)

            task_id = self.current_context.task_id
            if task_id in registry.get('tasks', {}):
                task = registry['tasks'][task_id]
                task['status'] = status
                task['progress'] = self.current_context.progress
                task['last_update'] = datetime.now().isoformat()

                if status == "started":
                    task['started_at'] = self.current_context.started_at.isoformat()
                elif status in ["completed", "failed"]:
                    task['completed_at'] = datetime.now().isoformat()

                # 노트 추가
                task['notes'] = '\n'.join(self.current_context.notes[-10:])

                with open(self.registry_file, 'w') as f:
                    json.dump(registry, f, indent=2, ensure_ascii=False)

        except Exception as e:
            print(f"⚠️ Registry 업데이트 실패: {e}")

    def save_to_database(self):
        """데이터베이스에 저장"""
        if not self.current_context:
            return

        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()

        # Bridge 문서 읽기
        bridge_doc = ""
        if self.bridge_file.exists():
            with open(self.bridge_file, 'r') as f:
                bridge_doc = f.read()

        cursor.execute('''
            INSERT OR REPLACE INTO task_contexts
            (task_id, task_name, phase, started_at, completed_at,
             progress, current_step, context_json, bridge_document)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            self.current_context.task_id,
            self.current_context.task_name,
            self.current_context.phase.value,
            self.current_context.started_at,
            self.current_context.completed_at,
            self.current_context.progress,
            self.current_context.current_step,
            json.dumps(self.current_context.to_dict(), ensure_ascii=False),
            bridge_doc
        ))

        conn.commit()
        conn.close()

    def capture_environment(self) -> Dict[str, Any]:
        """현재 환경 캡처"""
        env = {
            'python_version': sys.version,
            'cwd': os.getcwd(),
            'project_root': str(self.project_root),
            'timestamp': datetime.now().isoformat()
        }

        # 백엔드 상태 체크
        try:
            import requests
            response = requests.get('http://localhost:8001/health', timeout=1)
            env['backend_status'] = 'online' if response.status_code == 200 else 'offline'
        except:
            env['backend_status'] = 'offline'

        return env

    def capture_file_state(self):
        """중요 파일들의 현재 상태 캡처"""
        important_files = [
            'backend/simple_main.py',
            'gumgang-v2/package.json',
            'task_tracking/master_registry.json',
            'protocol_guard_v3.py'
        ]

        for file_path in important_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                self.watched_files[file_path] = self.calculate_file_hash(full_path)

    def calculate_file_hash(self, file_path: Path) -> str:
        """파일 해시 계산"""
        with open(file_path, 'rb') as f:
            return hashlib.sha256(f.read()).hexdigest()

    def calculate_diff_stats(self, file_path: Path) -> Tuple[int, int]:
        """변경된 줄 수 계산"""
        # 간단한 구현 (실제로는 git diff 사용 권장)
        return (0, 0)

def main():
    """CLI 인터페이스"""
    bridge = TaskContextBridge()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == '--start':
            if len(sys.argv) >= 4:
                task_id = sys.argv[2]
                task_name = ' '.join(sys.argv[3:])
                bridge.start_task(task_id, task_name)
            else:
                print("Usage: --start <task_id> <task_name>")

        elif command == '--complete':
            bridge.complete_task(success=True)

        elif command == '--fail':
            bridge.complete_task(success=False)

        elif command == '--resume':
            # 최근 미완료 Task 찾기
            print("📋 작업 재개 중...")
            # Bridge 문서 표시
            if bridge.bridge_file.exists():
                with open(bridge.bridge_file, 'r') as f:
                    print(f.read())

        elif command == '--status':
            if bridge.current_context:
                print(f"현재 Task: {bridge.current_context.task_id}")
                print(f"진행률: {bridge.current_context.progress}%")
                print(f"현재 단계: {bridge.current_context.current_step}")
            else:
                print("활성 Task 없음")

        else:
            print(f"Unknown command: {command}")
            print("Commands: --start, --complete, --fail, --resume, --status")

    else:
        print("Task Context Bridge System v1.0")
        print("Usage: python task_context_bridge.py [command] [args]")

if __name__ == "__main__":
    main()
