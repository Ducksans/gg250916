#!/usr/bin/env python3
"""
Git Safety Guard v1.0
로컬 Git 기반 3단계 안전장치 시스템
"""

import git
import os
import sys
import json
import shutil
import hashlib
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import time
import threading
import signal

class GitSafetyGuard:
    """Git 기반 안전장치 관리 시스템"""

    def __init__(self, project_path: str = None):
        """
        Git Safety Guard 초기화

        Args:
            project_path: 프로젝트 경로 (기본값: 현재 디렉토리)
        """
        self.project_path = Path(project_path or os.getcwd()).absolute()
        self.backup_path = Path.home() / "바탕화면" / "gumgang_backup.git"
        self.archive_path = Path("/media") / "usb" / "gumgang_archive.git"
        self.config_file = self.project_path / ".git_safety_config.json"
        self.checkpoint_log = self.project_path / ".checkpoints.log"

        # Git 저장소 초기화 또는 로드
        try:
            self.repo = git.Repo(self.project_path)
        except git.InvalidGitRepositoryError:
            print(f"⚠️ Git 저장소가 없습니다. 초기화 중...")
            self.repo = git.Repo.init(self.project_path)
            self._initial_commit()

        # 설정 로드
        self.config = self._load_config()

        # 백업 저장소 확인/생성
        self._ensure_backup_repo()

        # 자동 저장 데몬
        self.auto_save_thread = None
        self.stop_auto_save = threading.Event()

    def _load_config(self) -> dict:
        """설정 파일 로드"""
        if self.config_file.exists():
            with open(self.config_file, 'r') as f:
                return json.load(f)
        else:
            default_config = {
                "auto_save_interval": 60,  # 초 단위
                "max_checkpoints": 100,
                "dangerous_patterns": [
                    "rm -rf",
                    "DROP TABLE",
                    "DELETE FROM",
                    "format",
                    "mkfs"
                ],
                "safe_patterns": [
                    ".tsx",
                    ".ts",
                    ".jsx",
                    ".js",
                    ".css",
                    ".md"
                ],
                "branch_prefix": "safety",
                "commit_prefix": "CHECKPOINT"
            }
            self._save_config(default_config)
            return default_config

    def _save_config(self, config: dict):
        """설정 파일 저장"""
        with open(self.config_file, 'w') as f:
            json.dump(config, f, indent=2)

    def _initial_commit(self):
        """초기 커밋 생성"""
        try:
            # .gitignore 생성
            gitignore_path = self.project_path / ".gitignore"
            if not gitignore_path.exists():
                with open(gitignore_path, 'w') as f:
                    f.write("node_modules/\n")
                    f.write("*.pyc\n")
                    f.write("__pycache__/\n")
                    f.write(".env\n")
                    f.write("*.log\n")
                    f.write(".git_safety_config.json\n")
                    f.write(".checkpoints.log\n")

            self.repo.index.add([str(gitignore_path)])
            self.repo.index.commit("🎉 Initial commit - Git Safety Guard activated")
            print("✅ 초기 커밋 생성 완료")
        except Exception as e:
            print(f"⚠️ 초기 커밋 생성 중 경고: {e}")

    def _ensure_backup_repo(self):
        """백업 저장소 확인 및 생성"""
        if not self.backup_path.exists():
            print(f"📦 백업 저장소 생성 중: {self.backup_path}")
            git.Repo.init(self.backup_path, bare=True)

        # 원격 저장소로 추가
        try:
            backup_remote = self.repo.remote('backup')
            backup_remote.set_url(str(self.backup_path))
        except ValueError:
            self.repo.create_remote('backup', str(self.backup_path))

        print(f"✅ 백업 저장소 준비 완료: {self.backup_path}")

    def auto_checkpoint(self, message: str = None, risk_level: str = "SAFE") -> str:
        """
        자동 체크포인트 생성

        Args:
            message: 커밋 메시지
            risk_level: 위험도 (SAFE/CAUTION/DANGER)

        Returns:
            결과 메시지
        """
        try:
            # 변경사항 확인
            if not self.repo.is_dirty() and not self.repo.untracked_files:
                return "ℹ️ 변경사항 없음 - 체크포인트 생략"

            # 타임스탬프
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

            # 위험도별 이모지
            risk_emoji = {
                "SAFE": "✅",
                "CAUTION": "⚠️",
                "DANGER": "🚨"
            }

            # 변경사항 분석
            stats = self._analyze_changes()

            # 커밋 메시지 생성
            if not message:
                message = self._generate_commit_message(stats)

            commit_msg = f"{risk_emoji.get(risk_level, '📌')} CP_{timestamp} [{risk_level}] {message}"

            # 모든 변경사항 스테이징
            self.repo.git.add(A=True)

            # 커밋
            commit = self.repo.index.commit(commit_msg)

            # 체크포인트 로그 기록
            self._log_checkpoint(commit.hexsha[:7], commit_msg, stats)

            # 백업 저장소로 푸시 (비동기)
            threading.Thread(target=self._push_to_backup, daemon=True).start()

            return f"✅ 체크포인트 생성: {commit.hexsha[:7]} - {message}"

        except Exception as e:
            return f"❌ 체크포인트 실패: {e}"

    def _analyze_changes(self) -> dict:
        """변경사항 분석"""
        stats = {
            'added': [],
            'modified': [],
            'deleted': [],
            'untracked': self.repo.untracked_files,
            'total': 0
        }

        # Staged 변경사항
        diff = self.repo.index.diff('HEAD')
        for item in diff:
            if item.new_file:
                stats['added'].append(item.a_path)
            elif item.deleted_file:
                stats['deleted'].append(item.a_path)
            else:
                stats['modified'].append(item.a_path)

        # Unstaged 변경사항
        diff = self.repo.index.diff(None)
        for item in diff:
            if item.a_path not in stats['modified']:
                stats['modified'].append(item.a_path)

        stats['total'] = len(stats['added']) + len(stats['modified']) + \
                        len(stats['deleted']) + len(stats['untracked'])

        return stats

    def _generate_commit_message(self, stats: dict) -> str:
        """스마트 커밋 메시지 생성"""
        # 주요 변경 타입 판단
        if len(stats['added']) > len(stats['modified']):
            action = "feat"
            detail = f"추가 {len(stats['added'])}개 파일"
        elif len(stats['deleted']) > 0:
            action = "remove"
            detail = f"삭제 {len(stats['deleted'])}개 파일"
        elif len(stats['modified']) > 0:
            action = "update"
            detail = f"수정 {len(stats['modified'])}개 파일"
        else:
            action = "chore"
            detail = f"기타 변경 {stats['total']}개"

        # 파일 타입 분석
        file_types = set()
        for files in [stats['added'], stats['modified'], stats['untracked']]:
            for f in files:
                ext = Path(f).suffix
                if ext:
                    file_types.add(ext)

        if file_types:
            detail += f" ({', '.join(list(file_types)[:3])})"

        return f"{action}: {detail}"

    def _log_checkpoint(self, commit_id: str, message: str, stats: dict):
        """체크포인트 로그 기록"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'commit_id': commit_id,
            'message': message,
            'stats': {
                'added': len(stats['added']),
                'modified': len(stats['modified']),
                'deleted': len(stats['deleted']),
                'untracked': len(stats['untracked'])
            }
        }

        with open(self.checkpoint_log, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')

    def _push_to_backup(self):
        """백업 저장소로 푸시 (비동기)"""
        try:
            self.repo.remotes.backup.push(force=True)
            print("📤 백업 저장소 동기화 완료")
        except Exception as e:
            print(f"⚠️ 백업 푸시 실패: {e}")

    def create_safety_branch(self, task_id: str) -> str:
        """
        작업별 안전 브랜치 생성

        Args:
            task_id: 작업 ID

        Returns:
            브랜치 이름
        """
        branch_name = f"{self.config['branch_prefix']}/{task_id}"

        try:
            # 현재 상태 저장
            if self.repo.is_dirty():
                self.auto_checkpoint(f"브랜치 생성 전 자동 저장: {task_id}")

            # 브랜치 생성 및 체크아웃
            new_branch = self.repo.create_head(branch_name)
            new_branch.checkout()

            return f"🌿 안전 브랜치 생성 및 전환: {branch_name}"
        except Exception as e:
            return f"❌ 브랜치 생성 실패: {e}"

    def instant_rollback(self, target: str = "HEAD~1") -> str:
        """
        즉시 롤백

        Args:
            target: 롤백 대상 (커밋 ID, HEAD~n, 태그 등)

        Returns:
            결과 메시지
        """
        try:
            # 현재 상태 백업
            current_commit = self.repo.head.commit.hexsha[:7]

            # 롤백 실행
            self.repo.git.reset('--hard', target)

            return f"↩️ 롤백 완료: {current_commit} → {target}"
        except Exception as e:
            return f"❌ 롤백 실패: {e}"

    def get_safety_status(self) -> dict:
        """안전 상태 확인"""
        try:
            current_branch = self.repo.active_branch.name
        except TypeError:
            current_branch = "DETACHED HEAD"

        return {
            'project_path': str(self.project_path),
            'current_branch': current_branch,
            'is_dirty': self.repo.is_dirty(),
            'uncommitted_files': len(self.repo.index.diff(None)),
            'untracked_files': len(self.repo.untracked_files),
            'last_commit': str(self.repo.head.commit.hexsha[:7]),
            'last_commit_message': self.repo.head.commit.message.strip(),
            'last_commit_time': datetime.fromtimestamp(
                self.repo.head.commit.committed_date
            ).isoformat(),
            'backup_exists': self.backup_path.exists(),
            'total_commits': len(list(self.repo.iter_commits())),
            'remotes': [r.name for r in self.repo.remotes]
        }

    def get_recent_checkpoints(self, limit: int = 10) -> List[dict]:
        """최근 체크포인트 목록"""
        checkpoints = []

        for commit in self.repo.iter_commits(max_count=limit):
            if 'CP_' in commit.message or 'CHECKPOINT' in commit.message:
                checkpoints.append({
                    'id': commit.hexsha[:7],
                    'message': commit.message.strip(),
                    'time': datetime.fromtimestamp(commit.committed_date).strftime('%H:%M:%S'),
                    'date': datetime.fromtimestamp(commit.committed_date).strftime('%Y-%m-%d')
                })

        return checkpoints

    def start_auto_save_daemon(self):
        """자동 저장 데몬 시작"""
        if self.auto_save_thread and self.auto_save_thread.is_alive():
            print("⚠️ 자동 저장 데몬이 이미 실행 중입니다")
            return

        self.stop_auto_save.clear()
        self.auto_save_thread = threading.Thread(target=self._auto_save_loop, daemon=True)
        self.auto_save_thread.start()
        print(f"🤖 자동 저장 데몬 시작 (간격: {self.config['auto_save_interval']}초)")

    def stop_auto_save_daemon(self):
        """자동 저장 데몬 중지"""
        self.stop_auto_save.set()
        if self.auto_save_thread:
            self.auto_save_thread.join(timeout=5)
        print("🛑 자동 저장 데몬 중지")

    def _auto_save_loop(self):
        """자동 저장 루프"""
        while not self.stop_auto_save.is_set():
            time.sleep(self.config['auto_save_interval'])
            if not self.stop_auto_save.is_set():
                result = self.auto_checkpoint("자동 저장", "SAFE")
                if "✅" in result:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] {result}")

    def analyze_risk(self, file_path: str = None) -> str:
        """
        파일 또는 변경사항의 위험도 분석

        Args:
            file_path: 분석할 파일 경로

        Returns:
            위험도 (SAFE/CAUTION/DANGER)
        """
        if file_path:
            content = Path(file_path).read_text(errors='ignore')

            # 위험 패턴 검사
            for pattern in self.config['dangerous_patterns']:
                if pattern.lower() in content.lower():
                    return "DANGER"

            # 안전 패턴 검사
            for pattern in self.config['safe_patterns']:
                if file_path.endswith(pattern):
                    return "SAFE"

            return "CAUTION"
        else:
            # 전체 변경사항 분석
            stats = self._analyze_changes()

            # 삭제 파일이 많으면 위험
            if len(stats['deleted']) > 10:
                return "DANGER"
            elif len(stats['deleted']) > 5:
                return "CAUTION"

            # 수정 파일이 많으면 주의
            if stats['total'] > 50:
                return "DANGER"
            elif stats['total'] > 20:
                return "CAUTION"

            return "SAFE"

    def archive_to_usb(self, usb_path: str = None) -> str:
        """
        USB/외장하드로 아카이브

        Args:
            usb_path: USB 경로

        Returns:
            결과 메시지
        """
        if usb_path:
            self.archive_path = Path(usb_path) / "gumgang_archive.git"

        try:
            if not self.archive_path.parent.exists():
                return f"❌ USB/외장 드라이브를 찾을 수 없습니다: {self.archive_path.parent}"

            # 아카이브 저장소 생성
            if not self.archive_path.exists():
                git.Repo.init(self.archive_path, bare=True)

            # 원격 저장소로 추가
            try:
                archive_remote = self.repo.remote('archive')
                archive_remote.set_url(str(self.archive_path))
            except ValueError:
                self.repo.create_remote('archive', str(self.archive_path))

            # 푸시
            self.repo.remotes.archive.push(force=True)

            return f"💾 USB 아카이브 완료: {self.archive_path}"
        except Exception as e:
            return f"❌ 아카이브 실패: {e}"


def main():
    """CLI 인터페이스"""
    parser = argparse.ArgumentParser(description='Git Safety Guard - 로컬 Git 안전장치')
    parser.add_argument('--init', action='store_true', help='Git Safety Guard 초기화')
    parser.add_argument('--checkpoint', type=str, help='체크포인트 생성')
    parser.add_argument('--rollback', type=str, help='롤백 (커밋 ID 또는 HEAD~n)')
    parser.add_argument('--status', action='store_true', help='안전 상태 확인')
    parser.add_argument('--branch', type=str, help='안전 브랜치 생성')
    parser.add_argument('--list', action='store_true', help='최근 체크포인트 목록')
    parser.add_argument('--daemon', action='store_true', help='자동 저장 데몬 시작')
    parser.add_argument('--stop-daemon', action='store_true', help='자동 저장 데몬 중지')
    parser.add_argument('--backup', action='store_true', help='백업 저장소로 즉시 푸시')
    parser.add_argument('--archive', type=str, help='USB로 아카이브')
    parser.add_argument('--risk', type=str, help='파일 위험도 분석')

    args = parser.parse_args()

    # Git Safety Guard 인스턴스
    guard = GitSafetyGuard()

    if args.init:
        print("🚀 Git Safety Guard 초기화 완료")
        status = guard.get_safety_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))

    elif args.checkpoint:
        result = guard.auto_checkpoint(args.checkpoint)
        print(result)

    elif args.rollback:
        result = guard.instant_rollback(args.rollback)
        print(result)

    elif args.status:
        status = guard.get_safety_status()
        print("\n" + "="*60)
        print("🛡️  Git Safety Guard - 상태 보고서")
        print("="*60)
        print(f"📁 프로젝트: {status['project_path']}")
        print(f"🌿 브랜치: {status['current_branch']}")
        print(f"📝 마지막 커밋: {status['last_commit']} - {status['last_commit_message'][:50]}")
        print(f"⏰ 커밋 시간: {status['last_commit_time']}")
        print(f"📊 총 커밋 수: {status['total_commits']}")
        print(f"🔄 변경 파일: {status['uncommitted_files']}개")
        print(f"❓ 추적 안 됨: {status['untracked_files']}개")
        print(f"💾 백업 저장소: {'✅' if status['backup_exists'] else '❌'}")
        print("="*60 + "\n")

    elif args.branch:
        result = guard.create_safety_branch(args.branch)
        print(result)

    elif args.list:
        checkpoints = guard.get_recent_checkpoints()
        print("\n📍 최근 체크포인트:")
        print("-"*60)
        for cp in checkpoints:
            print(f"  {cp['id']} [{cp['time']}] {cp['message'][:60]}")
        print("-"*60 + "\n")

    elif args.daemon:
        guard.start_auto_save_daemon()
        print("Press Ctrl+C to stop...")
        try:
            signal.pause()
        except KeyboardInterrupt:
            guard.stop_auto_save_daemon()

    elif args.stop_daemon:
        guard.stop_auto_save_daemon()

    elif args.backup:
        guard._push_to_backup()

    elif args.archive:
        result = guard.archive_to_usb(args.archive)
        print(result)

    elif args.risk:
        risk = guard.analyze_risk(args.risk)
        emoji = {"SAFE": "✅", "CAUTION": "⚠️", "DANGER": "🚨"}
        print(f"{emoji[risk]} 위험도: {risk}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
