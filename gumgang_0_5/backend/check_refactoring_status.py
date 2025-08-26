#!/usr/bin/env python3
"""
금강 2.0 백엔드 리팩토링 상태 확인 스크립트

이 스크립트를 실행하면 현재 리팩토링 상태를 빠르게 확인할 수 있습니다.
다음 세션 시작 시 이 스크립트를 먼저 실행하세요.

사용법: python check_refactoring_status.py
"""

import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime
import subprocess
import json

# 색상 코드
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def check_file_exists(filepath, description):
    """파일 존재 여부 확인"""
    if Path(filepath).exists():
        print_success(f"{description}: {filepath}")
        return True
    else:
        print_error(f"{description} 없음: {filepath}")
        return False

def check_directory_structure():
    """디렉토리 구조 확인"""
    print_header("1. 디렉토리 구조 확인")

    required_dirs = {
        "app/core": "핵심 시스템 디렉토리",
        "app/core/memory": "메모리 시스템",
        "app/core/cognition": "인지 시스템",
        "app/engines": "엔진 디렉토리",
        "tests/unit": "단위 테스트",
        "tests/integration": "통합 테스트",
        "tests/experiments": "실험 코드"
    }

    all_exist = True
    for dir_path, description in required_dirs.items():
        full_path = Path(dir_path)
        if full_path.exists():
            print_success(f"{description}: {dir_path}")
        else:
            print_error(f"{description} 없음: {dir_path}")
            all_exist = False

    return all_exist

def check_core_files():
    """핵심 파일 확인"""
    print_header("2. 핵심 파일 확인")

    core_files = {
        "app/core/system_manager.py": "시스템 매니저",
        "app/core/memory/temporal.py": "시간적 메모리",
        "app/core/cognition/meta.py": "메타인지 시스템",
        "app/engines/creative.py": "창의 엔진",
        "app/engines/dream.py": "꿈 시스템",
        "app/engines/empathy.py": "공감 시스템",
        "test_simple_init.py": "간단 테스트",
        "REFACTORING_HANDOVER.md": "인계 문서"
    }

    all_exist = True
    for file_path, description in core_files.items():
        if not check_file_exists(file_path, description):
            all_exist = False

    return all_exist

def check_backup_files():
    """백업 파일 확인"""
    print_header("3. 백업 파일 확인")

    # backend 백업 확인
    backend_backups = list(Path(".").glob("backend_backup_*"))
    if backend_backups:
        print_success(f"Backend 백업 {len(backend_backups)}개 발견:")
        for backup in backend_backups[-3:]:  # 최근 3개만 표시
            print(f"  • {backup.name}")
    else:
        print_warning("Backend 백업 파일 없음")

    # 엔진 백업 확인
    engine_backups = list(Path("app/engines").glob("*.backup_*")) if Path("app/engines").exists() else []
    if engine_backups:
        print_success(f"Engine 백업 {len(engine_backups)}개 발견")
    else:
        print_warning("Engine 백업 파일 없음")

    return len(backend_backups) > 0

def check_dependencies():
    """의존성 확인"""
    print_header("4. Python 의존성 확인")

    try:
        import numpy
        print_success("numpy 설치됨")
    except ImportError:
        print_warning("numpy 미설치 - 일부 기능 제한")

    try:
        import scipy
        print_success("scipy 설치됨")
    except ImportError:
        print_error("scipy 미설치 - 설치 필요: pip install scipy")

    try:
        import sklearn
        print_success("scikit-learn 설치됨")
    except ImportError:
        print_warning("scikit-learn 미설치 - 일부 기능 제한")

async def test_system_initialization():
    """시스템 초기화 테스트"""
    print_header("5. 시스템 초기화 테스트")

    try:
        # 백엔드 경로를 sys.path에 추가
        sys.path.insert(0, str(Path(__file__).parent))

        from app.core.system_manager import SystemConfig, get_system_manager

        config = SystemConfig(
            enable_temporal_memory=True,
            enable_meta_cognitive=True,
            enable_creative=False,  # scipy 없으면 비활성화
            enable_dream=False,
            enable_empathy=False
        )

        manager = get_system_manager(config)
        success = await manager.initialize()

        if success:
            print_success("시스템 초기화 성공!")

            # 활성화된 시스템 확인
            if manager.temporal_memory:
                print_success("  • 시간적 메모리: 활성")
            if manager.meta_cognitive:
                print_success("  • 메타인지: 활성")

            # 종료
            await manager.shutdown()
            return True
        else:
            print_error("시스템 초기화 실패")
            return False

    except Exception as e:
        print_error(f"시스템 테스트 실패: {e}")
        return False

def check_lsp_warnings():
    """LSP 경고 확인 (pyright가 설치된 경우)"""
    print_header("6. 코드 품질 확인")

    try:
        result = subprocess.run(
            ["pyright", "app/", "--stats"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if "error" in result.stdout.lower() or "warning" in result.stdout.lower():
            # 간단한 통계 파싱
            lines = result.stdout.split('\n')
            for line in lines:
                if 'error' in line.lower():
                    print_warning(f"LSP 오류 발견: {line.strip()}")
                elif 'warning' in line.lower():
                    print_info(f"LSP 경고 발견: {line.strip()}")
        else:
            print_success("LSP 경고/오류 없음")

    except FileNotFoundError:
        print_info("pyright 미설치 - LSP 검사 건너뜀")
    except subprocess.TimeoutExpired:
        print_warning("pyright 실행 시간 초과")
    except Exception as e:
        print_info(f"LSP 검사 실패: {e}")

def show_next_steps():
    """다음 단계 안내"""
    print_header("7. 다음 작업 안내")

    tasks = [
        ("scipy 설치", "pip install scipy numpy scikit-learn"),
        ("전체 시스템 테스트", "python test_simple_init.py"),
        ("통합 테스트 실행", "python tests/integration/test_system_init.py"),
        ("인계 문서 확인", "cat REFACTORING_HANDOVER.md"),
        ("README 작성", "backend/README.md 생성"),
        ("API 문서화", "Swagger/OpenAPI 스펙 작성"),
        ("마이그레이션 가이드", "MIGRATION.md 작성")
    ]

    print(f"\n{Colors.BOLD}📝 TODO 리스트:{Colors.ENDC}")
    for i, (task, command) in enumerate(tasks, 1):
        print(f"  {i}. {task}")
        if command:
            print(f"     {Colors.OKCYAN}→ {command}{Colors.ENDC}")

def show_summary():
    """요약 정보 표시"""
    print_header("📊 리팩토링 상태 요약")

    summary = """
    ✅ 완료된 작업:
    • 중앙 시스템 매니저 구현
    • 의존성 주입 패턴 적용
    • 프로젝트 구조 재편성
    • 순환참조 해결
    • 기본 테스트 작성

    ⚠️  진행 중인 작업:
    • LSP 경고 정리
    • 문서화 작업
    • 테스트 커버리지 확대

    📁 주요 파일 위치:
    • 시스템 매니저: app/core/system_manager.py
    • 통합 테스트: tests/integration/test_system_init.py
    • 간단 테스트: test_simple_init.py
    • 인계 문서: REFACTORING_HANDOVER.md
    """

    print(summary)

async def main():
    """메인 함수"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("🔍 금강 2.0 백엔드 리팩토링 상태 확인")
    print(f"📅 확인 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Colors.ENDC}")

    # 각 체크 수행
    dir_ok = check_directory_structure()
    files_ok = check_core_files()
    backup_ok = check_backup_files()
    check_dependencies()

    # 시스템 초기화 테스트
    system_ok = await test_system_initialization()

    # LSP 경고 확인
    check_lsp_warnings()

    # 다음 단계 안내
    show_next_steps()

    # 요약
    show_summary()

    # 최종 상태
    print_header("🎯 전체 상태")
    if dir_ok and files_ok and system_ok:
        print_success("리팩토링 기본 구조 정상! 추가 작업 진행 가능")
    elif dir_ok and files_ok:
        print_warning("구조는 정상이나 일부 기능 확인 필요")
    else:
        print_error("일부 파일/디렉토리 누락 - 확인 필요")

    print(f"\n{Colors.BOLD}💡 팁: 자세한 내용은 REFACTORING_HANDOVER.md 참조{Colors.ENDC}\n")

if __name__ == "__main__":
    # Python 버전 확인
    if sys.version_info < (3, 7):
        print_error(f"Python 3.7 이상 필요 (현재: {sys.version})")
        sys.exit(1)

    # 이벤트 루프 실행
    asyncio.run(main())
