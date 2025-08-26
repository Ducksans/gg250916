#!/usr/bin/env python3
"""
금강 2.0 Import 경로 수정 스크립트

이 스크립트는 백엔드 리팩토링 후 모든 Python 파일의 import 경로를
새로운 구조에 맞게 일괄 수정합니다.

Author: Gumgang AI Team
Version: 1.0
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple
import shutil
from datetime import datetime

# Import 매핑 정의
IMPORT_MAPPINGS = {
    # Old import -> New import
    # Absolute imports
    'from app.core.memory.temporal import': 'from app.core.memory.temporal import',
    'from app.core.memory.temporal import': 'from app.core.memory.temporal import',

    'from app.core.cognition.meta import': 'from app.core.cognition.meta import',
    'from app.core.cognition.meta import': 'from app.core.cognition.meta import',

    'from app.engines.creative import': 'from app.engines.creative import',
    'from app.engines.creative import': 'from app.engines.creative import',

    'from app.engines.dream import': 'from app.engines.dream import',
    'from app.engines.dream import': 'from app.engines.dream import',

    'from app.engines.empathy import': 'from app.engines.empathy import',
    'from app.engines.empathy import': 'from app.engines.empathy import',

    # Relative imports (for files within app/)
    'from ..core.memory.temporal import': 'from ..core.memory.temporal import',
    'from ..core.cognition.meta import': 'from ..core.cognition.meta import',
    'from ..engines.creative import': 'from ..engines.creative import',
    'from ..engines.dream import': 'from ..engines.dream import',
    'from ..engines.empathy import': 'from ..engines.empathy import',
}

# Function name mappings
FUNCTION_MAPPINGS = {
    'get_metacognitive_system': 'get_metacognitive_system',
}

# Files to skip
SKIP_PATTERNS = [
    '**/backup*/**',
    '**/__pycache__/**',
    '**/venv/**',
    '**/.venv/**',
    '**/node_modules/**',
    '**/.git/**',
]

class ImportFixer:
    """Import 경로 수정 클래스"""

    def __init__(self, root_dir: Path):
        """
        초기화

        Args:
            root_dir: 프로젝트 루트 디렉토리
        """
        self.root_dir = root_dir
        self.backend_dir = root_dir / 'backend'
        self.app_dir = self.backend_dir / 'app'
        self.fixed_files = []
        self.error_files = []
        self.skipped_files = []

    def should_skip(self, file_path: Path) -> bool:
        """파일을 건너뛸지 확인"""
        file_str = str(file_path)
        for pattern in SKIP_PATTERNS:
            if any(part in file_str for part in pattern.replace('**/', '').replace('/**', '').split('/')):
                return True
        return False

    def fix_imports_in_file(self, file_path: Path) -> bool:
        """
        파일의 import 문 수정

        Args:
            file_path: 수정할 파일 경로

        Returns:
            bool: 수정 성공 여부
        """
        try:
            # 파일 읽기
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            original_content = content

            # Import 경로 수정
            for old_import, new_import in IMPORT_MAPPINGS.items():
                if old_import in content:
                    content = content.replace(old_import, new_import)
                    print(f"  ✓ {old_import} -> {new_import}")

            # Function 이름 수정
            for old_func, new_func in FUNCTION_MAPPINGS.items():
                # import 문에서의 함수명
                pattern = rf'\b{old_func}\b'
                if re.search(pattern, content):
                    content = re.sub(pattern, new_func, content)
                    print(f"  ✓ {old_func} -> {new_func}")

            # 파일이 수정되었으면 저장
            if content != original_content:
                # 백업 생성
                backup_path = file_path.with_suffix(f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
                shutil.copy2(file_path, backup_path)

                # 수정된 내용 저장
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)

                self.fixed_files.append(file_path)
                return True

            return False

        except Exception as e:
            print(f"  ✗ 오류 발생: {e}")
            self.error_files.append((file_path, str(e)))
            return False

    def fix_all_imports(self):
        """모든 Python 파일의 import 수정"""
        print("🔧 Import 경로 수정 시작...")
        print(f"  작업 디렉토리: {self.backend_dir}")
        print("-" * 60)

        # 모든 Python 파일 찾기
        py_files = list(self.backend_dir.rglob('*.py'))

        for py_file in py_files:
            # Skip 패턴 확인
            if self.should_skip(py_file):
                self.skipped_files.append(py_file)
                continue

            # 상대 경로 출력
            rel_path = py_file.relative_to(self.backend_dir)
            print(f"\n📄 처리 중: {rel_path}")

            if self.fix_imports_in_file(py_file):
                print(f"  ✅ 수정 완료")
            else:
                print(f"  ⏭️  변경 사항 없음")

        # 결과 요약
        self.print_summary()

    def print_summary(self):
        """작업 결과 요약 출력"""
        print("\n" + "=" * 60)
        print("📊 작업 결과 요약")
        print("=" * 60)

        print(f"\n✅ 수정된 파일: {len(self.fixed_files)}개")
        if self.fixed_files:
            for f in self.fixed_files[:10]:  # 최대 10개만 표시
                print(f"  - {f.relative_to(self.backend_dir)}")
            if len(self.fixed_files) > 10:
                print(f"  ... 외 {len(self.fixed_files) - 10}개")

        print(f"\n⏭️  건너뛴 파일: {len(self.skipped_files)}개")

        if self.error_files:
            print(f"\n❌ 오류 발생 파일: {len(self.error_files)}개")
            for f, error in self.error_files:
                print(f"  - {f.relative_to(self.backend_dir)}: {error}")

        print("\n" + "=" * 60)
        print("✨ Import 경로 수정 완료!")

def update_system_manager_imports():
    """시스템 매니저의 import 경로 업데이트"""
    print("\n🔧 시스템 매니저 import 경로 업데이트...")

    manager_file = Path('/home/duksan/바탕화면/gumgang_0_5/backend/app/core/system_manager.py')

    if not manager_file.exists():
        print("  ✗ system_manager.py 파일을 찾을 수 없습니다.")
        return

    try:
        with open(manager_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # 시스템 매니저 전용 import 수정
        replacements = [
            ('from ..core.memory.temporal import', 'from ..memory.temporal import'),
            ('from ..core.cognition.meta import', 'from ..cognition.meta import'),
            ('from ..engines.creative import', 'from ..engines.creative import'),
            ('from ..engines.dream import', 'from ..engines.dream import'),
            ('from ..engines.empathy import', 'from ..engines.empathy import'),
        ]

        for old, new in replacements:
            if old in content:
                content = content.replace(old, new)
                print(f"  ✓ {old} -> {new}")

        with open(manager_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print("  ✅ 시스템 매니저 import 경로 업데이트 완료")

    except Exception as e:
        print(f"  ✗ 오류 발생: {e}")

def main():
    """메인 함수"""
    # 프로젝트 루트 디렉토리 설정
    root_dir = Path('/home/duksan/바탕화면/gumgang_0_5')

    if not root_dir.exists():
        print(f"❌ 디렉토리를 찾을 수 없습니다: {root_dir}")
        return

    # ImportFixer 인스턴스 생성 및 실행
    fixer = ImportFixer(root_dir)
    fixer.fix_all_imports()

    # 시스템 매니저 별도 처리
    update_system_manager_imports()

    print("\n🎉 모든 작업이 완료되었습니다!")
    print("💡 팁: 백업 파일들은 *.backup_* 형식으로 저장되었습니다.")
    print("   문제가 발생하면 백업 파일을 사용하여 복원할 수 있습니다.")

if __name__ == "__main__":
    main()
