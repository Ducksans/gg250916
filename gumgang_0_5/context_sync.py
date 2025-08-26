#!/usr/bin/env python3
"""
금강 2.0 컨텍스트 동기화 시스템
- 세션 간 완벽한 인계
- AI 프롬프트 자동 생성
- 할루시네이션 방지를 위한 검증된 사실만 전달

Author: Gumgang AI Team
Version: 2.0
Created: 2025-01-08
Task ID: GG-20250108-004
"""

import json
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
import hashlib
import sys

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent))

try:
    from session_manager import SessionManager, SessionContext
    from task_tracker import TaskTracker, TaskStatus
except ImportError:
    print("⚠️ session_manager.py와 task_tracker.py가 필요합니다.")
    print("먼저 이 파일들을 생성해주세요.")
    sys.exit(1)

class ContextSync:
    """컨텍스트 동기화 관리자"""

    def __init__(self):
        self.root = Path("/home/duksan/바탕화면/gumgang_0_5")
        self.context_dir = self.root / "context"
        self.context_dir.mkdir(exist_ok=True)

        # 세션 매니저와 Task 트래커
        self.session_manager = SessionManager()
        self.task_tracker = TaskTracker()

        # AI 세션 프롬프트 파일
        self.ai_prompt_file = self.context_dir / "AI_SESSION_PROMPT.md"
        self.quick_ref = self.context_dir / "QUICK_REFERENCE.yaml"
        self.handover_file = self.context_dir / f"HANDOVER_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

    def generate_ai_prompt(self) -> str:
        """AI 세션 시작 시 사용할 프롬프트 생성"""

        # 현재 컨텍스트 로드
        context = self.session_manager.load_context()
        if not context:
            return "⚠️ 컨텍스트 파일이 없습니다. session_manager.py를 먼저 실행하세요."

        # 현재 Task 정보
        current_task = self.task_tracker.get_current_task()
        task_summary = self.task_tracker.get_progress_summary()

        # 빠른 참조 생성
        quick_ref = {
            "CRITICAL_RULES": [
                "절대 /frontend 경로 사용 금지 (구버전)",
                "반드시 /gumgang-v2 사용 (신버전)",
                "모든 파일 경로는 verify_file_exists()로 확인",
                "추측 기반 작업 완전 금지"
            ],
            "CURRENT_SESSION": {
                "id": context.session_id,
                "started": context.timestamp,
                "previous": context.previous_session
            },
            "ACTIVE_TASK": {
                "id": current_task.task_id if current_task else None,
                "name": current_task.name if current_task else None,
                "progress": f"{current_task.progress}%" if current_task else "N/A"
            },
            "PENDING_TASKS": [
                {"id": t.task_id, "name": t.name}
                for t in self.task_tracker.get_tasks_by_status(TaskStatus.PENDING)[:5]
            ],
            "PROJECT_PATHS": {
                "frontend": "/gumgang-v2",
                "backend": "/backend",
                "context": "/context",
                "task_tracking": "/task_tracking"
            },
            "WARNINGS": context.warnings[-5:] if context.warnings else []
        }

        with open(self.quick_ref, 'w', encoding='utf-8') as f:
            yaml.dump(quick_ref, f, allow_unicode=True, default_flow_style=False)

        # AI 프롬프트 생성
        prompt = f"""# 금강 2.0 세션 컨텍스트
생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Task ID: GG-20250108-004

## 🚨 절대 규칙 (반드시 준수)
1. **구버전 금지**: `/frontend` 경로 절대 사용 금지
2. **신버전만 사용**: `/gumgang-v2` 프론트엔드 경로만 사용
3. **추측 금지**: 모든 파일 경로는 `verify_file_exists()` 확인 필수
4. **Task ID 필수**: 모든 작업에 GG-YYYYMMDD-XXX 형식 ID 부여

## 📊 현재 세션 정보
- **세션 ID**: {context.session_id}
- **시작 시간**: {context.timestamp}
- **이전 세션**: {context.previous_session or '없음'}
- **토큰 사용**: 예상 {context.session_metrics.get('token_usage', {}).get('current', 0)}/120000

## 🎯 현재 진행 중인 Task
"""

        if current_task:
            prompt += f"""
- **Task ID**: {current_task.task_id}
- **Task 이름**: {current_task.name}
- **상태**: {current_task.status.value}
- **진행률**: {current_task.progress}%
- **시작 시간**: {current_task.started_at}
- **체크포인트**: {len(current_task.checkpoints)}개 완료
"""
        else:
            prompt += "- 진행 중인 Task 없음\n"

        prompt += f"""
## 📋 Task 현황
- **전체 Task**: {task_summary.get('total_tasks', 0)}개
- **완료**: {task_summary.get('completed_count', 0)}개
- **진행 중**: {task_summary.get('in_progress_count', 0)}개
- **대기**: {len(self.task_tracker.get_tasks_by_status(TaskStatus.PENDING))}개
- **차단됨**: {task_summary.get('blocked_count', 0)}개

## ⚠️ 주의사항 및 경고
"""

        if context.warnings:
            for warning in context.warnings[-5:]:
                prompt += f"- {warning}\n"
        else:
            prompt += "- 현재 경고 없음\n"

        prompt += """
## ✅ 검증된 프로젝트 구조
```yaml
활성 디렉토리:
  프론트엔드: /gumgang-v2 (Next.js 15 + Monaco + Tauri)
  백엔드: /backend/app/api (FastAPI)
  컨텍스트: /context (세션 영속화)
  Task 추적: /task_tracking (진행상황 관리)

비활성 디렉토리:
  구버전: /legacy_backup/frontend_v0.8_20250108 (사용 금지)
```

## 🔍 파일 상태
"""

        # 중요 파일 상태 표시
        critical_files = [
            "session_manager.py",
            "task_tracker.py",
            "gumgang-v2/app/dashboard/page.tsx",
            "backend/app/api/routes/dashboard.py"
        ]

        for file_path in critical_files:
            exists, info = self.session_manager.verify_file_exists(file_path)
            status = "✅" if exists else "❌"
            prompt += f"- {status} {file_path}"
            if exists and info:
                prompt += f" ({info['size']} bytes)\n"
            else:
                prompt += " (파일 없음)\n"

        prompt += f"""
## 🚀 즉시 실행 가능한 명령어
```bash
# 세션 상태 확인
python3 /home/duksan/바탕화면/gumgang_0_5/session_manager.py

# Task 추적 확인
python3 /home/duksan/바탕화면/gumgang_0_5/task_tracker.py

# 컨텍스트 동기화
python3 /home/duksan/바탕화면/gumgang_0_5/context_sync.py

# 프론트엔드 실행
cd /home/duksan/바탕화면/gumgang_0_5/gumgang-v2 && npm run dev
```

## 📌 다음 작업 권장사항
"""

        # 대기 중인 Task 목록
        pending_tasks = self.task_tracker.get_tasks_by_status(TaskStatus.PENDING)
        if pending_tasks:
            for i, task in enumerate(pending_tasks[:5], 1):
                prompt += f"{i}. [{task.priority.value}] {task.task_id}: {task.name}\n"
        else:
            prompt += "- 대기 중인 Task 없음\n"

        # 프롬프트 파일 저장
        with open(self.ai_prompt_file, 'w', encoding='utf-8') as f:
            f.write(prompt)

        return prompt

    def create_handover_document(self) -> Dict[str, Any]:
        """세션 인계 문서 생성"""

        handover = {
            "timestamp": datetime.now().isoformat(),
            "session_summary": {},
            "tasks": {
                "completed": [],
                "in_progress": [],
                "pending": [],
                "blocked": []
            },
            "file_changes": [],
            "decisions_made": [],
            "next_session_tasks": [],
            "context_files": [],
            "critical_notes": []
        }

        # 현재 세션 정보
        context = self.session_manager.load_context()
        if context:
            handover["session_summary"] = {
                "session_id": context.session_id,
                "started": context.timestamp,
                "duration": "진행중",
                "token_usage": context.session_metrics.get("token_usage", {}),
                "files_created": context.session_metrics.get("files_created", 0),
                "files_modified": context.session_metrics.get("files_modified", 0)
            }

        # Task 정보 수집
        for status in [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.PENDING, TaskStatus.BLOCKED]:
            tasks = self.task_tracker.get_tasks_by_status(status)
            status_key = status.value.replace("_", "_").lower()
            if status_key in handover["tasks"]:
                handover["tasks"][status_key] = [
                    {
                        "id": t.task_id,
                        "name": t.name,
                        "progress": t.progress,
                        "artifacts": t.artifacts
                    }
                    for t in tasks[:10]  # 각 상태별 최대 10개
                ]

        # 파일 변경사항
        if context:
            for file_path, file_state in context.file_states.items():
                handover["file_changes"].append({
                    "path": file_path,
                    "modified": file_state.modified,
                    "size": file_state.size
                })

        # 중요 결정사항
        handover["decisions_made"] = [
            "구버전 frontend를 legacy_backup으로 이동",
            "gumgang-v2를 메인 프론트엔드로 확정",
            "Task 추적 시스템 구축 완료",
            "세션 매니저 시스템 구축 완료"
        ]

        # 다음 세션 작업
        pending_tasks = self.task_tracker.get_tasks_by_status(TaskStatus.PENDING)
        handover["next_session_tasks"] = [
            f"{t.task_id}: {t.name}" for t in pending_tasks[:5]
        ]

        # 컨텍스트 파일 목록
        for file in self.context_dir.glob("*"):
            if file.is_file():
                handover["context_files"].append({
                    "name": file.name,
                    "path": str(file),
                    "size": file.stat().st_size,
                    "modified": datetime.fromtimestamp(file.stat().st_mtime).isoformat()
                })

        # 중요 노트
        handover["critical_notes"] = [
            "⚠️ /frontend 경로는 구버전입니다. 사용하지 마세요!",
            "✅ /gumgang-v2가 현재 활성 프론트엔드입니다.",
            "📌 모든 작업에 Task ID를 부여하세요.",
            "🔍 파일 경로는 항상 verify_file_exists()로 확인하세요."
        ]

        # 인계 문서 마크다운 생성
        handover_md = self._generate_handover_markdown(handover)

        # 파일로 저장
        with open(self.handover_file, 'w', encoding='utf-8') as f:
            f.write(handover_md)

        # JSON 버전도 저장
        handover_json_file = self.context_dir / f"handover_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(handover_json_file, 'w', encoding='utf-8') as f:
            json.dump(handover, f, indent=2, ensure_ascii=False)

        return handover

    def _generate_handover_markdown(self, handover: Dict[str, Any]) -> str:
        """인계 문서 마크다운 생성"""
        md = f"""# 금강 2.0 세션 인계 문서
생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Task ID: GG-20250108-004

## 📊 세션 요약
- **세션 ID**: {handover['session_summary'].get('session_id', 'N/A')}
- **시작 시간**: {handover['session_summary'].get('started', 'N/A')}
- **파일 생성**: {handover['session_summary'].get('files_created', 0)}개
- **파일 수정**: {handover['session_summary'].get('files_modified', 0)}개

## ✅ 완료된 Task
"""

        for task in handover['tasks']['completed']:
            md += f"- {task['id']}: {task['name']} (100%)\n"
            if task['artifacts']:
                md += f"  - 산출물: {', '.join(task['artifacts'][:3])}\n"

        md += "\n## 🔄 진행 중인 Task\n"
        for task in handover['tasks']['in_progress']:
            md += f"- {task['id']}: {task['name']} ({task['progress']}%)\n"

        md += "\n## 📋 대기 중인 Task\n"
        for task in handover['tasks']['pending']:
            md += f"- {task['id']}: {task['name']}\n"

        if handover['tasks']['blocked']:
            md += "\n## ⚠️ 차단된 Task\n"
            for task in handover['tasks']['blocked']:
                md += f"- {task['id']}: {task['name']}\n"

        md += "\n## 📝 주요 결정사항\n"
        for decision in handover['decisions_made']:
            md += f"- {decision}\n"

        md += "\n## 🚨 중요 노트\n"
        for note in handover['critical_notes']:
            md += f"{note}\n"

        md += "\n## 📂 파일 변경사항\n"
        for file_change in handover['file_changes'][:10]:
            md += f"- {file_change['path']} ({file_change['size']} bytes)\n"

        md += f"""
## 🔄 다음 세션 시작 방법

1. **컨텍스트 로드**:
   ```bash
   python3 /home/duksan/바탕화면/gumgang_0_5/context_sync.py
   ```

2. **AI 프롬프트 확인**:
   ```bash
   cat /home/duksan/바탕화면/gumgang_0_5/context/AI_SESSION_PROMPT.md
   ```

3. **세션 시작**:
   ```bash
   python3 /home/duksan/바탕화면/gumgang_0_5/session_manager.py
   ```

## 📌 체크리스트
- [ ] AI_SESSION_PROMPT.md 읽기
- [ ] QUICK_REFERENCE.yaml 확인
- [ ] 이전 Task 상태 확인
- [ ] 경고사항 숙지
- [ ] 작업 시작

---
*이 문서는 자동으로 생성되었습니다.*
*금강 2.0 - 인간과 AI의 완벽한 협업 시스템*
"""

        return md

    def sync(self) -> Dict[str, Any]:
        """전체 동기화 실행"""
        print("🔄 컨텍스트 동기화 시작...")
        print(f"Task ID: GG-20250108-004")
        print("="*50)

        # AI 프롬프트 생성
        prompt = self.generate_ai_prompt()

        if prompt.startswith("⚠️"):
            print(prompt)
            return {"status": "error", "message": prompt}

        print(f"✅ AI 프롬프트 생성: {self.ai_prompt_file}")
        print(f"✅ 빠른 참조 생성: {self.quick_ref}")

        # 인계 문서 생성
        handover = self.create_handover_document()

        print(f"✅ 인계 문서 생성: {self.handover_file}")

        # Task 요약
        task_summary = self.task_tracker.get_progress_summary()

        print(f"""
📊 동기화 완료!

Task 현황:
- 전체: {task_summary.get('total_tasks', 0)}개
- 완료: {task_summary.get('completed_count', 0)}개
- 진행 중: {task_summary.get('in_progress_count', 0)}개
- 대기: {len(self.task_tracker.get_tasks_by_status(TaskStatus.PENDING))}개

다음 AI 세션 시작 시:
1. {self.ai_prompt_file} 내용을 먼저 읽기
2. {self.quick_ref} 참조하여 작업
3. session_manager.py 실행하여 상태 확인

현재 대기 작업: {len(handover['next_session_tasks'])}개
""")

        return {
            "status": "success",
            "ai_prompt": str(self.ai_prompt_file),
            "quick_ref": str(self.quick_ref),
            "handover": str(self.handover_file),
            "task_summary": task_summary,
            "next_tasks": handover['next_session_tasks']
        }

    def verify_continuity(self) -> bool:
        """세션 연속성 검증"""
        print("\n🔍 세션 연속성 검증 중...")

        issues = []

        # 필수 파일 확인
        required_files = [
            self.context_dir / "current_session.yaml",
            self.context_dir / "task_registry.json",
            self.root / "session_manager.py",
            self.root / "task_tracker.py"
        ]

        for file_path in required_files:
            if not file_path.exists():
                issues.append(f"필수 파일 없음: {file_path}")

        # 세션 컨텍스트 확인
        context = self.session_manager.load_context()
        if not context:
            issues.append("세션 컨텍스트를 로드할 수 없음")

        # Task 레지스트리 확인
        if not (self.context_dir / "task_registry.json").exists():
            issues.append("Task 레지스트리가 없음")

        if issues:
            print("⚠️ 연속성 문제 발견:")
            for issue in issues:
                print(f"  - {issue}")
            return False

        print("✅ 세션 연속성 검증 완료 - 문제 없음")
        return True


def main():
    """메인 실행 함수"""
    print("🚀 금강 2.0 컨텍스트 동기화 시스템")
    print("="*50)

    syncer = ContextSync()

    # 연속성 검증
    if not syncer.verify_continuity():
        print("\n⚠️ 먼저 session_manager.py를 실행하여 세션을 생성하세요.")
        return

    # 동기화 실행
    result = syncer.sync()

    if result["status"] == "success":
        print("\n✨ 동기화 성공!")
        print(f"다음 세션에서 사용할 파일:")
        print(f"  1. {result['ai_prompt']}")
        print(f"  2. {result['quick_ref']}")
        print(f"  3. {result['handover']}")

        # 대기 중인 작업 표시
        if result["next_tasks"]:
            print(f"\n📋 다음 세션 작업 ({len(result['next_tasks'])}개):")
            for task in result["next_tasks"][:5]:
                print(f"  - {task}")
    else:
        print(f"\n❌ 동기화 실패: {result.get('message', 'Unknown error')}")


if __name__ == "__main__":
    main()
