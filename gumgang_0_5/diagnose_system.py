#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 시스템 진단 스크립트
메모리 통합 실패 원인을 찾기 위한 진단 도구
"""

import sys
import os
from pathlib import Path
import importlib
import traceback

# 색상 코드
RED = '\033[0;31m'
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{BLUE}{'='*60}{NC}")
    print(f"{BLUE}{text}{NC}")
    print(f"{BLUE}{'='*60}{NC}")

def print_success(text):
    print(f"{GREEN}✅ {text}{NC}")

def print_error(text):
    print(f"{RED}❌ {text}{NC}")

def print_warning(text):
    print(f"{YELLOW}⚠️  {text}{NC}")

def print_info(text):
    print(f"ℹ️  {text}")

def check_python_path():
    """Python 경로 확인"""
    print_header("Python 경로 확인")

    print(f"Python 버전: {sys.version}")
    print(f"Python 실행 파일: {sys.executable}")
    print(f"\nPython 경로:")
    for i, path in enumerate(sys.path[:10], 1):
        print(f"  {i}. {path}")

    # backend 경로 추가
    backend_path = Path(__file__).parent / 'backend'
    if str(backend_path) not in sys.path:
        sys.path.insert(0, str(backend_path))
        print_warning(f"backend 경로 추가됨: {backend_path}")

    backend_app_path = backend_path / 'app'
    if str(backend_app_path) not in sys.path:
        sys.path.insert(0, str(backend_app_path))
        print_warning(f"backend/app 경로 추가됨: {backend_app_path}")

def check_basic_modules():
    """기본 모듈 확인"""
    print_header("기본 Python 모듈 확인")

    required_modules = [
        'asyncio',
        'json',
        'datetime',
        'collections',
        'pathlib',
        'logging'
    ]

    for module_name in required_modules:
        try:
            importlib.import_module(module_name)
            print_success(f"{module_name}")
        except ImportError as e:
            print_error(f"{module_name}: {e}")

def check_external_packages():
    """외부 패키지 확인"""
    print_header("외부 패키지 확인")

    packages = [
        'aiofiles',
        'fastapi',
        'uvicorn',
        'pydantic',
        'langchain',
        'chromadb',
        'openai',
        'numpy',
        'sqlalchemy'
    ]

    for package in packages:
        try:
            module = importlib.import_module(package)
            version = getattr(module, '__version__', 'unknown')
            print_success(f"{package} (v{version})")
        except ImportError:
            print_error(f"{package} - 설치되지 않음")
        except Exception as e:
            print_warning(f"{package} - 오류: {e}")

def check_backend_structure():
    """백엔드 구조 확인"""
    print_header("백엔드 디렉토리 구조 확인")

    backend_path = Path(__file__).parent / 'backend'

    if not backend_path.exists():
        print_error(f"backend 디렉토리 없음: {backend_path}")
        return False

    print_success(f"backend 디렉토리 존재: {backend_path}")

    # 중요 디렉토리 확인
    important_dirs = [
        'app',
        'app/temporal_memory',
        'app/meta_cognitive',
        'app/dream_system',
        'memory',
        'data'
    ]

    for dir_name in important_dirs:
        dir_path = backend_path / dir_name
        if dir_path.exists():
            print_success(f"  {dir_name}/")
        else:
            print_warning(f"  {dir_name}/ - 없음")

    # 중요 파일 확인
    important_files = [
        'app/__init__.py',
        'app/temporal_memory.py',
        'app/context_manager.py',
        'main.py',
        'requirements.txt'
    ]

    for file_name in important_files:
        file_path = backend_path / file_name
        if file_path.exists():
            print_success(f"  {file_name}")
        else:
            print_warning(f"  {file_name} - 없음")

    return True

def check_temporal_memory_import():
    """Temporal Memory 모듈 임포트 테스트"""
    print_header("Temporal Memory 시스템 확인")

    # 여러 방법으로 import 시도
    import_methods = [
        ("from app.temporal_memory import get_temporal_memory_system",
         "app.temporal_memory"),
        ("from temporal_memory import get_temporal_memory_system",
         "temporal_memory"),
        ("from backend.app.temporal_memory import get_temporal_memory_system",
         "backend.app.temporal_memory")
    ]

    success = False
    for import_str, module_path in import_methods:
        try:
            print_info(f"시도: {import_str}")

            # 동적 import
            parts = module_path.split('.')
            module = None

            for i in range(len(parts), 0, -1):
                try:
                    module_name = '.'.join(parts[:i])
                    module = importlib.import_module(module_name)
                    if i < len(parts):
                        for part in parts[i:]:
                            module = getattr(module, part)
                    break
                except:
                    continue

            if module:
                # 함수 확인
                if hasattr(module, 'get_temporal_memory_system'):
                    print_success(f"성공: {module_path}")

                    # 실제 시스템 초기화 테스트
                    try:
                        tm_system = module.get_temporal_memory_system()
                        print_success("Temporal Memory 시스템 초기화 성공")
                        success = True
                        break
                    except Exception as e:
                        print_warning(f"초기화 실패: {e}")
                else:
                    funcs = [f for f in dir(module) if not f.startswith('_')]
                    print_warning(f"get_temporal_memory_system 함수 없음. 사용 가능: {funcs[:5]}")

        except ImportError as e:
            print_error(f"Import 실패: {e}")
        except Exception as e:
            print_error(f"오류: {e}")

    if not success:
        print_error("Temporal Memory 시스템을 로드할 수 없습니다")

        # 대체 방법 제안
        print_info("\n대체 해결 방법:")
        print_info("1. backend/app/temporal_memory.py 파일이 있는지 확인")
        print_info("2. 파일에 get_temporal_memory_system 함수가 있는지 확인")
        print_info("3. __init__.py 파일들이 제대로 있는지 확인")

    return success

def check_chromadb():
    """ChromaDB 확인"""
    print_header("ChromaDB 상태 확인")

    try:
        import chromadb
        print_success(f"ChromaDB 설치됨 (v{chromadb.__version__})")

        # 클라이언트 생성 테스트
        try:
            # PersistentClient 시도
            db_path = Path(__file__).parent / 'backend' / 'data' / 'chroma_db'
            client = chromadb.PersistentClient(path=str(db_path))
            print_success(f"ChromaDB 클라이언트 생성 성공")

            # 컬렉션 목록 확인
            collections = client.list_collections()
            print_info(f"컬렉션 수: {len(collections)}")
            for col in collections[:5]:
                print_info(f"  - {col.name}")

        except Exception as e:
            print_warning(f"ChromaDB 연결 문제: {e}")

    except ImportError:
        print_error("ChromaDB가 설치되지 않음")
        print_info("설치: pip install chromadb")

def check_env_file():
    """환경 변수 파일 확인"""
    print_header("환경 설정 확인")

    env_path = Path(__file__).parent / 'backend' / '.env'

    if env_path.exists():
        print_success(f".env 파일 존재")

        # API 키 확인 (값은 숨김)
        try:
            with open(env_path, 'r') as f:
                content = f.read()
                if 'OPENAI_API_KEY' in content:
                    print_success("OPENAI_API_KEY 설정됨")
                else:
                    print_warning("OPENAI_API_KEY 없음")
        except:
            print_error(".env 파일 읽기 실패")
    else:
        print_warning(".env 파일 없음")
        print_info("생성 방법: echo 'OPENAI_API_KEY=your-key' > backend/.env")

def check_memory_files():
    """메모리 파일 확인"""
    print_header("메모리 파일 상태")

    # JSON 파일 확인
    json_files = list(Path('.').glob('*gumgang_memories_*.json'))
    print_info(f"메모리 JSON 파일: {len(json_files)}개")

    for f in json_files[-3:]:
        size = f.stat().st_size / (1024*1024)
        print_info(f"  - {f.name} ({size:.1f} MB)")

    # 로그 파일 확인
    log_files = ['memory_integration.log', 'complete_memory_integration.log']
    for log_file in log_files:
        log_path = Path(log_file)
        if log_path.exists():
            size = log_path.stat().st_size / 1024
            print_success(f"{log_file} ({size:.1f} KB)")

            # 최근 오류 확인
            try:
                with open(log_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    error_lines = [l for l in lines[-50:] if 'ERROR' in l or '실패' in l]
                    if error_lines:
                        print_warning(f"최근 오류 {len(error_lines)}개 발견:")
                        for line in error_lines[-3:]:
                            print(f"    {line.strip()}")
            except:
                pass

def suggest_fixes():
    """문제 해결 제안"""
    print_header("권장 해결 방법")

    print("""
1. 필수 패키지 설치:
   cd backend
   pip install -r requirements.txt

2. ChromaDB 초기화:
   rm -rf backend/data/chroma_db
   mkdir -p backend/data/chroma_db

3. Temporal Memory 모듈 확인:
   - backend/app/temporal_memory.py 파일 존재 확인
   - get_temporal_memory_system 함수 확인

4. Python 경로 문제 해결:
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend:$(pwd)/backend/app"

5. 간단한 통합 테스트:
   python -c "from backend.app.temporal_memory import get_temporal_memory_system; print('OK')"
""")

def main():
    print("\n" + "💎"*30)
    print("금강 시스템 진단")
    print("💎"*30)

    # 진단 실행
    check_python_path()
    check_basic_modules()
    check_external_packages()

    if check_backend_structure():
        temporal_ok = check_temporal_memory_import()
        check_chromadb()
        check_env_file()
        check_memory_files()

        if not temporal_ok:
            print_error("\n⚠️ Temporal Memory 시스템 문제가 주요 원인입니다!")

    suggest_fixes()

    print("\n" + "="*60)
    print("진단 완료")
    print("="*60)

if __name__ == "__main__":
    main()
