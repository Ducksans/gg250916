#!/usr/bin/env python3
"""
Dynamic Rules Updater for 금강 2.0
자동으로 .rules 파일의 변수 값들을 갱신합니다
"""

import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import shutil

class RulesUpdater:
    """Rules 파일의 동적 값들을 업데이트하는 클래스"""

    def __init__(self, base_dir: str = "/home/duksan/바탕화면/gumgang_0_5"):
        self.base_dir = Path(base_dir)
        self.rules_file = self.base_dir / ".rules"
        self.session_state_file = self.base_dir / ".session_state.json"
        self.task_context_file = self.base_dir / "TASK_CONTEXT_BRIDGE.md"
        self.next_session_file = self.base_dir / "NEXT_SESSION_IMMEDIATE.md"

        # 호환 파일들
        self.compatible_files = [
            ".cursorrules",
            "AGENT.md",
            ".github/copilot-instructions.md"
        ]

    def get_protocol_guard_status(self) -> Dict[str, Any]:
        """Protocol Guard v3.0의 현재 상태를 가져옵니다"""
        try:
            result = subprocess.run(
                ["python", str(self.base_dir / "protocol_guard_v3.py"), "--status"],
                capture_output=True,
                text=True,
                timeout=5
            )

            # 출력에서 신뢰도 점수 추출
            trust_score = 100.0
            if "신뢰도:" in result.stdout:
                match = re.search(r'신뢰도:\s*([\d.]+)%', result.stdout)
                if match:
                    trust_score = float(match.group(1))

            return {
                "trust_score": trust_score,
                "status": "active" if result.returncode == 0 else "inactive"
            }
        except Exception as e:
            print(f"Protocol Guard 상태 확인 실패: {e}")
            return {"trust_score": 100.0, "status": "unknown"}

    def get_session_state(self) -> Dict[str, Any]:
        """현재 세션 상태를 읽습니다"""
        try:
            if self.session_state_file.exists():
                with open(self.session_state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"세션 상태 읽기 실패: {e}")

        return {
            "current_task": "Unknown",
            "progress": 0,
            "last_checkpoint": None
        }

    def get_completed_tasks(self) -> List[str]:
        """완료된 작업 목록을 가져옵니다"""
        completed = []

        # NEXT_SESSION_IMMEDIATE.md에서 완료 작업 파싱
        if self.next_session_file.exists():
            with open(self.next_session_file, 'r', encoding='utf-8') as f:
                content = f.read()

                # ✅ 표시된 작업 찾기
                matches = re.findall(r'✅\s*([^:]+):\s*([^(\n]+)(?:\((\d+)%\))?', content)
                for match in matches:
                    task_name = match[0].strip()
                    desc = match[1].strip()
                    progress = match[2] if match[2] else "100"
                    completed.append(f"[x] {task_name}: {desc} ({progress}%)")

        # 기본 완료 작업들 (상수)
        default_completed = [
            "[x] GG-20250108-005: 백엔드 아키텍처 (100%)",
            "[x] GG-20250108-006: Tauri 셋업 (100%)",
            "[x] GG-20250108-007: Monaco 에디터 통합 (100%)",
            "[x] 터미널 통합 (SecureTerminalManager)",
            "[x] 위험 명령어 차단 시스템",
            "[x] Protocol Guard v3.0 구현",
            "[x] Task Context Bridge 구현"
        ]

        # 중복 제거하여 병합
        for item in default_completed:
            if item not in completed:
                completed.append(item)

        return completed

    def get_pending_tasks(self) -> List[str]:
        """진행 중인 작업 목록을 가져옵니다"""
        pending = []

        # TASK_CONTEXT_BRIDGE.md에서 현재 작업 파싱
        if self.task_context_file.exists():
            with open(self.task_context_file, 'r', encoding='utf-8') as f:
                content = f.read()

                # Task와 Progress 정보 추출
                task_match = re.search(r'\*\*Task\*\*:\s*([^\n]+)', content)
                progress_match = re.search(r'\*\*Progress\*\*:\s*(\d+)%', content)

                if task_match:
                    task = task_match.group(1)
                    progress = progress_match.group(1) if progress_match else "0"
                    pending.append(f"[ ] {task} ({progress}%)")

        # 기본 진행 중 작업들
        default_pending = [
            "[ ] AI 코딩 어시스턴트",
            "[ ] Git 통합",
            "[ ] 파일 동기화",
            "[ ] 프로젝트 관리 시스템"
        ]

        for item in default_pending:
            if item not in pending:
                pending.append(item)

        return pending

    def get_current_timestamp(self) -> str:
        """현재 시간을 포맷팅합니다"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def update_rules_content(self, content: str) -> str:
        """Rules 파일 내용을 업데이트합니다"""

        # 1. Protocol Guard 상태 업데이트
        pg_status = self.get_protocol_guard_status()
        content = re.sub(
            r'(신뢰도 점수 관리\n- )(\d+)(%에서 시작)',
            f'\\g<1>{int(pg_status["trust_score"])}\\g<3>',
            content
        )

        # 2. 세션 상태 업데이트
        session = self.get_session_state()
        if session.get("current_task"):
            # 현재 작업 업데이트
            content = re.sub(
                r'(\*\*현재 단계\*\*:)[^\n]+',
                f'\\1 {session["current_task"]}',
                content
            )

        # 3. 완료된 작업 섹션 업데이트
        completed = self.get_completed_tasks()
        completed_section = "## ✅ 완료된 작업\n" + "\n".join(f"- {task}" for task in completed)

        content = re.sub(
            r'## ✅ 완료된 작업.*?(?=## 🚧|##|$)',
            completed_section + "\n\n",
            content,
            flags=re.DOTALL
        )

        # 4. 진행 중인 작업 섹션 업데이트
        pending = self.get_pending_tasks()
        pending_section = "## 🚧 진행 중인 작업\n" + "\n".join(f"- {task}" for task in pending)

        content = re.sub(
            r'## 🚧 진행 중인 작업.*?(?=## 💾|##|$)',
            pending_section + "\n\n",
            content,
            flags=re.DOTALL
        )

        # 5. 마지막 업데이트 시간 추가
        timestamp_line = f"\n# 📅 마지막 업데이트: {self.get_current_timestamp()}\n"

        # 기존 타임스탬프가 있으면 교체, 없으면 파일 끝에 추가
        if "# 📅 마지막 업데이트:" in content:
            content = re.sub(
                r'# 📅 마지막 업데이트:.*?\n',
                timestamp_line,
                content
            )
        else:
            # 마지막 구분선 앞에 추가
            if "---" in content:
                parts = content.rsplit("---", 1)
                content = parts[0] + timestamp_line + "\n---" + parts[1]
            else:
                content += timestamp_line

        return content

    def update_rules(self) -> bool:
        """Rules 파일을 업데이트합니다"""
        try:
            # 1. 현재 rules 파일 읽기
            if not self.rules_file.exists():
                print(f"❌ {self.rules_file} 파일이 없습니다")
                return False

            with open(self.rules_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # 2. 백업 생성
            backup_file = self.base_dir / f".rules.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            shutil.copy2(self.rules_file, backup_file)
            print(f"📦 백업 생성: {backup_file}")

            # 3. 내용 업데이트
            updated_content = self.update_rules_content(content)

            # 4. 업데이트된 내용 저장
            with open(self.rules_file, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"✅ {self.rules_file} 업데이트 완료")

            # 5. 호환 파일들도 업데이트
            for compatible_file in self.compatible_files:
                target_path = self.base_dir / compatible_file

                # .github 디렉토리 확인
                if "/" in compatible_file:
                    target_dir = target_path.parent
                    if not target_dir.exists():
                        target_dir.mkdir(parents=True, exist_ok=True)

                shutil.copy2(self.rules_file, target_path)
                print(f"📄 {compatible_file} 동기화 완료")

            return True

        except Exception as e:
            print(f"❌ Rules 업데이트 실패: {e}")
            return False

    def create_update_hook(self):
        """세션/작업 종료시 자동 실행되는 hook 생성"""
        hook_script = """#!/bin/bash
# Rules 자동 업데이트 Hook

echo "🔄 Rules 파일 자동 업데이트 시작..."
python3 /home/duksan/바탕화면/gumgang_0_5/update_rules.py

if [ $? -eq 0 ]; then
    echo "✅ Rules 업데이트 성공"
else
    echo "❌ Rules 업데이트 실패"
fi
"""

        hook_file = self.base_dir / "update_rules_hook.sh"
        with open(hook_file, 'w') as f:
            f.write(hook_script)

        # 실행 권한 부여
        os.chmod(hook_file, 0o755)
        print(f"🪝 Hook 스크립트 생성: {hook_file}")

    def show_diff(self):
        """변경사항을 보여줍니다"""
        try:
            # 최근 백업 파일 찾기
            backup_files = list(self.base_dir.glob(".rules.backup.*"))
            if backup_files:
                latest_backup = max(backup_files, key=lambda x: x.stat().st_mtime)

                result = subprocess.run(
                    ["diff", "-u", str(latest_backup), str(self.rules_file)],
                    capture_output=True,
                    text=True
                )

                if result.stdout:
                    print("\n📊 변경사항:")
                    print(result.stdout)
                else:
                    print("\n✅ 변경사항 없음")
        except Exception as e:
            print(f"Diff 표시 실패: {e}")


def main():
    """메인 실행 함수"""
    import argparse

    parser = argparse.ArgumentParser(description="Rules 파일 동적 업데이트")
    parser.add_argument("--hook", action="store_true", help="Hook 스크립트 생성")
    parser.add_argument("--diff", action="store_true", help="변경사항 표시")
    parser.add_argument("--dry-run", action="store_true", help="실제 변경 없이 테스트")

    args = parser.parse_args()

    updater = RulesUpdater()

    if args.hook:
        updater.create_update_hook()
        print("✅ Hook 설정 완료. 이제 세션 종료시 자동 업데이트됩니다.")
    elif args.diff:
        updater.show_diff()
    else:
        print("🚀 Rules 동적 업데이트 시작")
        print(f"📅 시간: {updater.get_current_timestamp()}")
        print("-" * 50)

        if args.dry_run:
            print("🧪 DRY RUN 모드 - 실제 변경 없음")
        else:
            if updater.update_rules():
                print("-" * 50)
                print("✨ Rules 업데이트 완료!")
                updater.show_diff()
            else:
                print("❌ 업데이트 실패")


if __name__ == "__main__":
    main()
