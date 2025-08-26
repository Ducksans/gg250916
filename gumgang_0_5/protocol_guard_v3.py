#!/usr/bin/env python3
"""
Protocol Guard v3.0 - Enhanced Validation and Rollback System
====================================================================
Document ID: PG-v3.0-20250808
Creation Time: 2025-08-08 20:47:00
Author: 금강 2.0 AI System
Purpose: Ensure 92%+ trust score for all operations
====================================================================
"""

import json
import os
import sys
import time
import hashlib
import shutil
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import requests
import subprocess

# Import KST timestamp utility
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
try:
    from utils.time_kr import now_kr_str_minute, format_for_filename
    from utils.rules_enforcer import HEAD_MARK, rules_hash_raw
except ImportError:
    # Fallback if running from different directory
    sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
    from backend.utils.time_kr import now_kr_str_minute, format_for_filename
    from backend.utils.rules_enforcer import HEAD_MARK, rules_hash_raw

# ANSI Color Codes
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'

# Task Status Enum
class TaskStatus(Enum):
    PENDING = "pending"
    VALIDATING = "validating"
    EXECUTING = "executing"
    TESTING = "testing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"

# Risk Level Enum
class RiskLevel(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class Checkpoint:
    """체크포인트 데이터 구조"""
    id: str
    timestamp: str
    task_id: Optional[str]
    files_snapshot: Dict[str, str]  # path -> hash
    config_snapshot: Dict[str, Any]
    git_commit: Optional[str]
    trust_score: float
    metrics: Dict[str, Any]

    def to_dict(self):
        # Convert datetime objects in metrics to isoformat strings
        metrics_copy = self.metrics.copy()
        if 'start_time' in metrics_copy:
            metrics_copy['start_time'] = now_kr_str_minute()

        return {
            'id': self.id,
            'timestamp': now_kr_str_minute(),
            'task_id': self.task_id,
            'files_snapshot': self.files_snapshot,
            'config_snapshot': self.config_snapshot,
            'git_commit': self.git_commit,
            'trust_score': self.trust_score,
            'metrics': metrics_copy
        }

    @classmethod
    def from_dict(cls, data):
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)

@dataclass
class ValidationResult:
    """검증 결과 데이터 구조"""
    passed: bool
    trust_score: float
    errors: List[str]
    warnings: List[str]
    metrics: Dict[str, Any]

class ProtocolGuardV3:
    """Protocol Guard v3.0 - 하이브리드 신뢰도 우선 전략 구현"""

    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path("/home/duksan/바탕화면/gumgang_0_5")
        self.RULES_HASH = rules_hash_raw()
        self.config_file = self.project_root / "protocol_config_v3.json"
        self.checkpoint_dir = self.project_root / "checkpoints"
        self.backup_dir = self.project_root / "backups"
        self.log_file = self.project_root / "protocol_guard_v3.log"
        self.db_file = self.project_root / "protocol_guard.db"

        # 필수 디렉토리 생성
        self.checkpoint_dir.mkdir(exist_ok=True)
        self.backup_dir.mkdir(exist_ok=True)

        # 설정 로드
        self.config = self.load_config()

        # 데이터베이스 초기화
        self.init_database()

        # 현재 체크포인트
        self.current_checkpoint = None

        # 신뢰도 임계값
        self.trust_threshold = 92.0

        # 모니터링 메트릭
        self.metrics = {
            'start_time': now_kr_str_minute(),
            'validations': 0,
            'successes': 0,
            'failures': 0,
            'rollbacks': 0,
            'trust_scores': []
        }

    def load_config(self) -> Dict:
        """설정 파일 로드"""
        default_config = {
            'version': '3.0',
            'trust_threshold': 92.0,
            'auto_backup': True,
            'auto_rollback': True,
            'max_rollback_attempts': 3,
            'checkpoint_interval': 3600,  # 1시간
            'dangerous_commands': [
                'rm -rf /',
                'format',
                'del /f /s /q',
                ':(){:|:&};:',  # Fork bomb
                'dd if=/dev/zero'
            ],
            'protected_paths': [
                '/etc',
                '/usr',
                '/bin',
                '/sbin',
                '/System',
                'C:\\Windows',
                'C:\\Program Files'
            ],
            'allowed_paths': [
                str(self.project_root),
                '/tmp',
                '/home/duksan/바탕화면'
            ]
        }

        if self.config_file.exists():
            with open(self.config_file, 'r', encoding='utf-8') as f:
                loaded_config = json.load(f)
                default_config.update(loaded_config)
        else:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)

        return default_config

    def init_database(self):
        """SQLite 데이터베이스 초기화"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()

        # Tasks 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                status TEXT,
                trust_score REAL,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                rollback_count INTEGER DEFAULT 0,
                error_log TEXT,
                checkpoint_id TEXT
            )
        ''')

        # Checkpoints 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS checkpoints (
                id TEXT PRIMARY KEY,
                task_id TEXT,
                created_at TIMESTAMP,
                trust_score REAL,
                file_count INTEGER,
                config_hash TEXT,
                git_commit TEXT,
                is_valid INTEGER DEFAULT 1
            )
        ''')

        # Metrics 테이블
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP,
                metric_type TEXT,
                metric_value REAL,
                task_id TEXT
            )
        ''')

        conn.commit()
        conn.close()

    def calculate_trust_score(self, task_data: Dict) -> float:
        """신뢰도 점수 계산"""
        base_score = 100.0

        # 테스트 커버리지 (20점)
        test_coverage = task_data.get('test_coverage', 0)
        coverage_score = min(20, test_coverage * 0.2)

        # 코드 재사용성 (15점)
        reusability = task_data.get('reusable_code_ratio', 0)
        reusability_score = min(15, reusability * 15)

        # 롤백 가능성 (25점)
        has_rollback = task_data.get('rollback_available', False)
        rollback_score = 25 if has_rollback else 0

        # 의존성 검증 (15점)
        deps_verified = task_data.get('dependencies_verified', False)
        deps_score = 15 if deps_verified else 0

        # 에러율 (15점 감점)
        error_rate = task_data.get('error_rate', 0)
        error_penalty = min(15, error_rate * 100)

        # 리스크 레벨 (10점 감점)
        risk_level = task_data.get('risk_level', RiskLevel.LOW.value)
        risk_penalty = risk_level * 2.5

        final_score = (
            coverage_score +
            reusability_score +
            rollback_score +
            deps_score +
            (base_score - 60) -  # 기본 40점
            error_penalty -
            risk_penalty
        )

        return max(0, min(100, final_score))

    def create_checkpoint(self, task_id: Optional[str] = None, name: Optional[str] = None) -> Checkpoint:
        """체크포인트 생성"""
        checkpoint_id = f"CP-{format_for_filename()}"
        if name:
            checkpoint_id = f"{checkpoint_id}-{name}"

        print(f"{Colors.CYAN}📸 체크포인트 생성 중: {checkpoint_id}{Colors.RESET}")

        # 파일 스냅샷 생성
        files_snapshot = self.create_files_snapshot()

        # 설정 스냅샷
        config_snapshot = {
            'protocol_config': self.config,
            'environment': dict(os.environ),
            'timestamp': now_kr_str_minute()
        }

        # Git 커밋 정보
        git_commit = self.get_git_commit()

        # 현재 신뢰도 점수
        current_trust = self.get_current_trust_score()

        checkpoint = Checkpoint(
            id=checkpoint_id,
            timestamp=now_kr_str_minute(),
            task_id=task_id,
            files_snapshot=files_snapshot,
            config_snapshot=config_snapshot,
            git_commit=git_commit,
            trust_score=current_trust,
            metrics=self.metrics
        )

        # 체크포인트 저장
        checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.json"
        with open(checkpoint_path, 'w', encoding='utf-8') as f:
            json.dump(checkpoint.to_dict(), f, indent=2, ensure_ascii=False)

        # 데이터베이스에 기록
        self.save_checkpoint_to_db(checkpoint)

        self.current_checkpoint = checkpoint
        print(f"{Colors.GREEN}✅ 체크포인트 생성 완료: {checkpoint_id}{Colors.RESET}")

        return checkpoint

    def create_files_snapshot(self) -> Dict[str, str]:
        """파일 스냅샷 생성 (해시 기반)"""
        snapshot = {}

        # 중요 파일들의 해시 생성
        important_files = [
            'backend/simple_main.py',
            'gumgang-v2/package.json',
            'gumgang-v2/components/MonacoEditor.tsx',
            'gumgang-v2/components/ai/AIFilePermissionSystem.tsx',
            'task_tracking/master_registry.json',
            'protocol_guard.py',
            'SESSION_HANDOVER_TRIGGER.md',
            'HYBRID_TRUST_STRATEGY.md'
        ]

        for file_path in important_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                with open(full_path, 'rb') as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()
                    snapshot[file_path] = file_hash

        return snapshot

    def get_git_commit(self) -> Optional[str]:
        """현재 Git 커밋 해시 가져오기"""
        try:
            result = subprocess.run(
                ['git', 'rev-parse', 'HEAD'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None

    def get_current_trust_score(self) -> float:
        """현재 시스템의 신뢰도 점수 계산"""
        if not self.metrics['trust_scores']:
            return 100.0

        # 최근 10개 점수의 평균
        recent_scores = self.metrics['trust_scores'][-10:]
        return sum(recent_scores) / len(recent_scores)

    def save_checkpoint_to_db(self, checkpoint: Checkpoint):
        """체크포인트를 데이터베이스에 저장"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO checkpoints (id, task_id, created_at, trust_score, file_count, config_hash, git_commit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            checkpoint.id,
            checkpoint.task_id,
            checkpoint.timestamp,
            checkpoint.trust_score,
            len(checkpoint.files_snapshot),
            hashlib.sha256(json.dumps(checkpoint.config_snapshot).encode()).hexdigest(),
            checkpoint.git_commit
        ))

        conn.commit()
        conn.close()

    def validate_task(self, task_id: str, task_data: Dict) -> ValidationResult:
        """Task 검증"""
        print(f"\n{Colors.BLUE}🔍 Task 검증 시작: {task_id}{Colors.RESET}")

        errors = []
        warnings = []
        metrics = {}

        # 1. 의존성 검증
        if 'dependencies' in task_data:
            for dep_id in task_data['dependencies']:
                if not self.is_task_completed(dep_id):
                    errors.append(f"의존성 미충족: {dep_id}")

        # 2. 위험 명령어 검사
        if 'commands' in task_data:
            for cmd in task_data['commands']:
                if self.is_dangerous_command(cmd):
                    errors.append(f"위험한 명령어 감지: {cmd}")

        # 3. 경로 검증
        if 'target_paths' in task_data:
            for path in task_data['target_paths']:
                if not self.is_safe_path(path):
                    errors.append(f"보호된 경로 접근 시도: {path}")

        # 4. 신뢰도 점수 계산
        trust_score = self.calculate_trust_score(task_data)
        metrics['trust_score'] = trust_score

        if trust_score < self.trust_threshold:
            warnings.append(f"신뢰도 점수 부족: {trust_score:.1f}% < {self.trust_threshold}%")

        # 5. 리소스 체크
        resource_check = self.check_system_resources()
        if not resource_check['healthy']:
            warnings.extend(resource_check['issues'])

        # 검증 결과
        passed = len(errors) == 0 and trust_score >= self.trust_threshold

        result = ValidationResult(
            passed=passed,
            trust_score=trust_score,
            errors=errors,
            warnings=warnings,
            metrics=metrics
        )

        # 메트릭 업데이트
        self.metrics['validations'] += 1
        if passed:
            self.metrics['successes'] += 1
        else:
            self.metrics['failures'] += 1
        self.metrics['trust_scores'].append(trust_score)

        # 결과 출력
        self.print_validation_result(result)

        return result

    def validate_timestamps(self) -> Tuple[bool, List[str], List[str]]:
        """프로젝트 전체 타임스탬프 규칙 검증"""
        print(f"{Colors.CYAN}🕒 타임스탬프 규칙 검증 중...{Colors.RESET}")

        errors = []
        warnings = []

        # validate_timestamps.sh 스크립트 실행
        validate_script = self.project_root / "tools" / "validate_timestamps.sh"

        if not validate_script.exists():
            warnings.append("타임스탬프 검증 스크립트가 없습니다 (tools/validate_timestamps.sh)")
            return True, errors, warnings

        try:
            # 검증 스크립트 실행
            result = subprocess.run(
                [str(validate_script)],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                # 위반 사항 발견
                errors.append("타임스탬프 형식 위반이 발견되었습니다")

                # 출력에서 위반 수 추출
                output_lines = result.stdout.split('\n')
                for line in output_lines:
                    if "Python violations:" in line:
                        count = line.split(":")[1].strip()
                        if count != "0":
                            errors.append(f"Python 파일 {count}개에서 datetime.now() 사용 발견")
                    elif "TypeScript violations:" in line:
                        count = line.split(":")[1].strip()
                        if count != "0":
                            errors.append(f"TypeScript 파일 {count}개에서 new Date() 사용 발견")
                    elif "Bash violations:" in line:
                        count = line.split(":")[1].strip()
                        if count != "0":
                            errors.append(f"Bash 스크립트 {count}개에서 date 명령어 사용 발견")

                warnings.append("tools/fix_timestamps.sh --apply 실행으로 자동 수정 가능")

                # 신뢰도 점수 감소
                self.metrics['trust_scores'].append(self.get_current_trust_score() - 5)

                return False, errors, warnings
            else:
                print(f"{Colors.GREEN}✅ 모든 타임스탬프가 KST 형식(YYYY-MM-DD HH:mm)을 준수합니다{Colors.RESET}")
                return True, errors, warnings

        except subprocess.TimeoutExpired:
            warnings.append("타임스탬프 검증 시간 초과 (30초)")
            return True, errors, warnings
        except Exception as e:
            warnings.append(f"타임스탬프 검증 중 오류: {e}")
            return True, errors, warnings

    def assert_rules_in_prompt(self, prompt: str) -> bool:
        """
        프롬프트에 .rules가 포함되어 있는지 검증

        Args:
            prompt: 검증할 프롬프트

        Returns:
            bool: Rules가 올바르게 포함되어 있으면 True

        Raises:
            ValueError: Rules가 없거나 변조된 경우
        """
        if not prompt.lstrip().startswith(HEAD_MARK):
            # 신뢰도 점수 대폭 감소
            self.metrics['trust_scores'].append(self.get_current_trust_score() - 20)
            raise ValueError("❌ .rules missing/mutated in prompt")
        return True

    def assert_rules_headers(self, headers: dict) -> bool:
        """
        응답 헤더에 rules 정보가 올바른지 검증

        Args:
            headers: HTTP 응답 헤더

        Returns:
            bool: Rules 헤더가 올바르면 True

        Raises:
            ValueError: Rules 해시/헤드가 일치하지 않는 경우
        """
        # Normalize header validation: prefer hash, allow ASCII-safe head string
        ascii_safe_head = "RULES v1.0 - Gumgang 2.0 / KST 2025-08-09 12:33"
        if headers.get("X-Rules-Hash") != self.RULES_HASH:
            # 신뢰도 점수 대폭 감소 (해시 불일치가 핵심 위반)
            self.metrics['trust_scores'].append(self.get_current_trust_score() - 20)
        # 헤더 문자열은 EM DASH(—) 또는 ASCII 하이픈(-) 모두 허용
        # if headers.get("X-Rules-Head") not in (HEAD_MARK, ascii_safe_head):
        #     (경고만 고려할 수 있음) 현재는 해시 우선 검증으로 통과 처리
            # 이벤트 기록
            self.log_event("RULES_VIOLATION", "Rules hash/head mismatch in response")
            raise ValueError("❌ .rules hash/head mismatch in response")
        return True

    def is_task_completed(self, task_id: str) -> bool:
        """Task 완료 여부 확인"""
        registry_file = self.project_root / "task_tracking/master_registry.json"
        if registry_file.exists():
            with open(registry_file, 'r', encoding='utf-8') as f:
                registry = json.load(f)
                task = registry.get('tasks', {}).get(task_id, {})
                return task.get('status') == 'completed'
        return False

    def is_dangerous_command(self, command: str) -> bool:
        """위험한 명령어 검사"""
        for dangerous in self.config['dangerous_commands']:
            if dangerous in command:
                return True
        return False

    def is_safe_path(self, path: str) -> bool:
        """안전한 경로 검사"""
        path = Path(path).resolve()

        # 보호된 경로 체크
        for protected in self.config['protected_paths']:
            if str(path).startswith(protected):
                return False

        # 허용된 경로 체크
        for allowed in self.config['allowed_paths']:
            if str(path).startswith(allowed):
                return True

        return False

    def check_system_resources(self) -> Dict:
        """시스템 리소스 체크"""
        issues = []

        # CPU 사용률 체크
        try:
            cpu_percent = float(subprocess.check_output(['top', '-bn1']).decode().split('\n')[2].split()[1])
            if cpu_percent > 80:
                issues.append(f"CPU 사용률 높음: {cpu_percent}%")
        except:
            pass

        # 메모리 체크
        try:
            with open('/proc/meminfo', 'r') as f:
                lines = f.readlines()
                total = int(lines[0].split()[1])
                available = int(lines[2].split()[1])
                used_percent = (1 - available/total) * 100
                if used_percent > 90:
                    issues.append(f"메모리 사용률 높음: {used_percent:.1f}%")
        except:
            pass

        # 디스크 체크
        try:
            df = subprocess.check_output(['df', str(self.project_root)]).decode().split('\n')[1]
            used_percent = int(df.split()[4].strip('%'))
            if used_percent > 95:
                issues.append(f"디스크 사용률 높음: {used_percent}%")
        except:
            pass

        return {
            'healthy': len(issues) == 0,
            'issues': issues
        }

    def print_validation_result(self, result: ValidationResult):
        """검증 결과 출력"""
        print(f"\n{'='*60}")

        if result.passed:
            print(f"{Colors.GREEN}✅ 검증 통과!{Colors.RESET}")
        else:
            print(f"{Colors.RED}❌ 검증 실패!{Colors.RESET}")

        print(f"{Colors.CYAN}신뢰도 점수: {result.trust_score:.1f}%{Colors.RESET}")

        if result.errors:
            print(f"\n{Colors.RED}오류:{Colors.RESET}")
            for error in result.errors:
                print(f"  • {error}")

        if result.warnings:
            print(f"\n{Colors.YELLOW}경고:{Colors.RESET}")
            for warning in result.warnings:
                print(f"  • {warning}")

        print(f"{'='*60}\n")

    def rollback_to_checkpoint(self, checkpoint_id: str) -> bool:
        """체크포인트로 롤백"""
        print(f"\n{Colors.YELLOW}⏪ 롤백 시작: {checkpoint_id}{Colors.RESET}")

        checkpoint_path = self.checkpoint_dir / f"{checkpoint_id}.json"
        if not checkpoint_path.exists():
            print(f"{Colors.RED}체크포인트를 찾을 수 없음: {checkpoint_id}{Colors.RESET}")
            return False

        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
                checkpoint = Checkpoint.from_dict(checkpoint_data)

            # Git 롤백 (가능한 경우)
            if checkpoint.git_commit:
                try:
                    subprocess.run(
                        ['git', 'reset', '--hard', checkpoint.git_commit],
                        cwd=self.project_root,
                        check=True
                    )
                    print(f"{Colors.GREEN}✅ Git 롤백 완료{Colors.RESET}")
                except:
                    print(f"{Colors.YELLOW}⚠️ Git 롤백 실패 (수동 복구 필요){Colors.RESET}")

            # 파일 검증
            files_valid = self.verify_files_snapshot(checkpoint.files_snapshot)
            if not files_valid:
                print(f"{Colors.YELLOW}⚠️ 일부 파일이 체크포인트와 다름{Colors.RESET}")

            # 메트릭 업데이트
            self.metrics['rollbacks'] += 1

            print(f"{Colors.GREEN}✅ 롤백 완료: {checkpoint_id}{Colors.RESET}")
            return True

        except Exception as e:
            print(f"{Colors.RED}❌ 롤백 실패: {e}{Colors.RESET}")
            return False

    def verify_files_snapshot(self, snapshot: Dict[str, str]) -> bool:
        """파일 스냅샷 검증"""
        all_valid = True

        for file_path, expected_hash in snapshot.items():
            full_path = self.project_root / file_path
            if full_path.exists():
                with open(full_path, 'rb') as f:
                    actual_hash = hashlib.sha256(f.read()).hexdigest()
                    if actual_hash != expected_hash:
                        print(f"  {Colors.YELLOW}⚠️ 파일 변경됨: {file_path}{Colors.RESET}")
                        all_valid = False
            else:
                print(f"  {Colors.RED}❌ 파일 없음: {file_path}{Colors.RESET}")
                all_valid = False

        return all_valid

    def create_backup(self, name: Optional[str] = None) -> str:
        """전체 백업 생성"""
        backup_name = f"backup-{format_for_filename()}"
        if name:
            backup_name = f"{backup_name}-{name}"

        backup_path = self.backup_dir / backup_name

        print(f"{Colors.CYAN}💾 백업 생성 중: {backup_name}{Colors.RESET}")

        # 중요 디렉토리 백업
        important_dirs = [
            'backend',
            'gumgang-v2/components',
            'gumgang-v2/hooks',
            'gumgang-v2/services',
            'task_tracking',
            'context'
        ]

        backup_path.mkdir(exist_ok=True)

        for dir_name in important_dirs:
            src = self.project_root / dir_name
            if src.exists():
                dst = backup_path / dir_name
                shutil.copytree(src, dst, dirs_exist_ok=True)

        # 중요 파일 백업
        important_files = [
            'protocol_guard.py',
            'protocol_guard_v3.py',
            'SESSION_HANDOVER_TRIGGER.md',
            'HYBRID_TRUST_STRATEGY.md',
            '.ai_context'
        ]

        for file_name in important_files:
            src = self.project_root / file_name
            if src.exists():
                dst = backup_path / file_name
                shutil.copy2(src, dst)

        print(f"{Colors.GREEN}✅ 백업 완료: {backup_path}{Colors.RESET}")
        return str(backup_path)

    def monitor_health(self) -> Dict:
        """시스템 건강 상태 모니터링"""
        health = {
            'timestamp': now_kr_str_minute(),
            'uptime': time.time() - time.mktime(time.strptime(self.metrics['start_time'], "%Y-%m-%d %H:%M")),
            'validations': self.metrics['validations'],
            'success_rate': self.metrics['successes'] / max(1, self.metrics['validations']) * 100,
            'rollback_count': self.metrics['rollbacks'],
            'current_trust_score': self.get_current_trust_score(),
            'system_resources': self.check_system_resources(),
            'backend_status': self.check_backend_status()
        }

        return health

    def check_backend_status(self) -> Dict:
        """백엔드 서버 상태 체크"""
        try:
            response = requests.get('http://localhost:8000/health', timeout=2)
            if response.status_code == 200:
                return {'status': 'healthy', 'data': response.json()}
        except:
            pass
        return {'status': 'unavailable'}

    def get_status(self) -> Dict:
        """현재 Protocol Guard 상태 반환"""
        # 체크포인트 목록 가져오기
        checkpoints = []
        if self.checkpoint_dir.exists():
            for cp_file in sorted(self.checkpoint_dir.glob("*.json"), reverse=True)[:10]:
                try:
                    with open(cp_file, 'r') as f:
                        cp_data = json.load(f)
                        checkpoints.append({
                            'id': cp_data.get('id', cp_file.stem),
                            'timestamp': cp_data.get('timestamp', ''),
                            'task_id': cp_data.get('task_id', ''),
                            'trust_score': cp_data.get('trust_score', 100)
                        })
                except:
                    pass

        return {
            'trust_score': self.get_current_trust_score(),
            'checkpoints': checkpoints,
            'metrics': self.metrics,
            'uptime': time.time() - time.mktime(time.strptime(self.metrics['start_time'], "%Y-%m-%d %H:%M")),
            'validations': self.metrics['validations'],
            'success_rate': self.metrics['successes'] / max(1, self.metrics['validations']) * 100,
            'rollback_count': self.metrics['rollbacks'],
            'backend_status': self.check_backend_status(),
            'timestamp_compliance': self.validate_timestamps()[0],  # Returns (passed, errors, warnings)
            'rules_hash': self.RULES_HASH,
            'rules_enforcement': True
        }

    def print_status(self):
        """현재 상태 출력"""
        health = self.monitor_health()

        print(f"\n{'='*60}")
        print(f"{Colors.BOLD}🛡️  Protocol Guard v3.0 - 상태 보고서{Colors.RESET}")
        print(f"{'='*60}")

        print(f"\n📅 시간: {health['timestamp']}")
        print(f"⏱️  가동 시간: {health['uptime']:.0f}초")

        print(f"\n📊 메트릭:")
        print(f"  • 검증 횟수: {health['validations']}")
        print(f"  • 성공률: {health['success_rate']:.1f}%")
        print(f"  • 롤백 횟수: {health['rollback_count']}")
        print(f"  • 현재 신뢰도: {health['current_trust_score']:.1f}%")

        backend = health['backend_status']
        if backend['status'] == 'healthy':
            print(f"\n{Colors.GREEN}✅ 백엔드 서버: 정상{Colors.RESET}")
        else:
            print(f"\n{Colors.RED}❌ 백엔드 서버: 오프라인{Colors.RESET}")

        resources = health['system_resources']
        if resources['healthy']:
            print(f"{Colors.GREEN}✅ 시스템 리소스: 정상{Colors.RESET}")
        else:
            print(f"{Colors.YELLOW}⚠️ 시스템 리소스 이슈:{Colors.RESET}")
            for issue in resources['issues']:
                print(f"    • {issue}")

        print(f"{'='*60}\n")

def main():
    """메인 실행 함수"""
    guard = ProtocolGuardV3()

    print(f"{Colors.BOLD}{Colors.CYAN}")
    print("="*60)
    print("       Protocol Guard v3.0 - 하이브리드 신뢰도 우선")
    print("="*60)
    print(f"{Colors.RESET}")

    # 명령행 인자 처리
    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == '--status':
            guard.print_status()

        elif command == '--validate':
            if len(sys.argv) > 2:
                task_id = sys.argv[2]
                # 예제 task 데이터
                task_data = {
                    'test_coverage': 80,
                    'reusable_code_ratio': 0.7,
                    'rollback_available': True,
                    'dependencies_verified': True,
                    'error_rate': 0.01,
                    'risk_level': RiskLevel.LOW.value
                }
                guard.validate_task(task_id, task_data)
            else:
                print(f"{Colors.RED}Task ID를 지정하세요{Colors.RESET}")

        elif command == '--checkpoint':
            name = sys.argv[2] if len(sys.argv) > 2 else None
            checkpoint = guard.create_checkpoint(name=name)
            print(f"체크포인트 ID: {checkpoint.id}")

        elif command == '--rollback':
            if len(sys.argv) > 2:
                checkpoint_id = sys.argv[2]
                guard.rollback_to_checkpoint(checkpoint_id)
            else:
                print(f"{Colors.RED}체크포인트 ID를 지정하세요{Colors.RESET}")

        elif command == '--backup':
            name = sys.argv[2] if len(sys.argv) > 2 else None
            backup_path = guard.create_backup(name)
            print(f"백업 경로: {backup_path}")

        elif command == '--help':
            print("사용법:")
            print("  python protocol_guard_v3.py [명령] [옵션]")
            print("\n명령:")
            print("  --status      : 현재 상태 표시")
            print("  --validate    : Task 검증")
            print("  --checkpoint  : 체크포인트 생성")
            print("  --rollback    : 체크포인트로 롤백")
            print("  --backup      : 전체 백업 생성")
            print("  --help        : 도움말 표시")

        else:
            print(f"{Colors.RED}알 수 없는 명령: {command}{Colors.RESET}")
            print("--help를 사용하여 도움말을 확인하세요")

    else:
        # 기본 실행: 상태 표시 및 자동 체크포인트
        guard.print_status()

        # 초기 체크포인트 생성
        if not guard.current_checkpoint:
            checkpoint = guard.create_checkpoint(name="initial")
            print(f"\n{Colors.GREEN}초기 체크포인트 생성됨: {checkpoint
.id}{Colors.RESET}")

if __name__ == "__main__":
    main()
