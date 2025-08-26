#!/usr/bin/env python3
"""
금강 2.0 Engines 폴더 Import 경로 수정 스크립트

이 스크립트는 engines 폴더의 모든 파일들의 import 경로를
새로운 구조에 맞게 수정합니다.

Author: Gumgang AI Team
Version: 1.0
"""

import os
import re
from pathlib import Path
import shutil
from datetime import datetime

# Engines 폴더의 파일별 import 매핑
ENGINE_IMPORT_MAPPINGS = {
    'creative.py': [
        # 절대 경로를 상대 경로로 변경
        ('from app.core.memory.temporal import', 'from ..core.memory.temporal import'),
        ('from app.core.memory import', 'from ..core.memory import'),
        ('from app.core.cognition.meta import', 'from ..core.cognition.meta import'),
        ('from app.core.cognition import', 'from ..core.cognition import'),
    ],
    'dream.py': [
        # 절대 경로를 상대 경로로 변경
        ('from app.core.memory.temporal import', 'from ..core.memory.temporal import'),
        ('from app.core.memory import', 'from ..core.memory import'),
        ('from app.core.cognition.meta import', 'from ..core.cognition.meta import'),
        ('from app.core.cognition import', 'from ..core.cognition import'),
    ],
    'empathy.py': [
        # 절대 경로를 상대 경로로 변경
        ('from app.core.memory.temporal import', 'from ..core.memory.temporal import'),
        ('from app.core.memory import', 'from ..core.memory import'),
        ('from app.core.cognition.meta import', 'from ..core.cognition.meta import'),
        ('from app.core.cognition import', 'from ..core.cognition import'),
        # 같은 engines 폴더 내의 import
        ('from app.engines.creative import', 'from .creative import'),
        ('from app.engines.dream import', 'from .dream import'),
    ]
}

# 공통 import 매핑 (모든 파일에 적용)
COMMON_MAPPINGS = [
    # sys.path 관련 제거 또는 수정
    ('sys.path.append(str(Path(__file__).parent))', '# sys.path.append removed - using relative imports'),
    ('sys.path.append(str(Path(__file__).parent.parent))', '# sys.path.append removed - using relative imports'),
]


def fix_engine_imports(file_path: Path, mappings: list) -> bool:
    """
    엔진 파일의 import 문 수정

    Args:
        file_path: 수정할 파일 경로
        mappings: 적용할 매핑 리스트

    Returns:
        bool: 수정 여부
    """
    try:
        # 파일 읽기
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # 파일별 특정 매핑 적용
        for old_import, new_import in mappings:
            if old_import in content:
                content = content.replace(old_import, new_import)
                print(f"  ✓ {old_import} -> {new_import}")

        # 공통 매핑 적용
        for old_text, new_text in COMMON_MAPPINGS:
            if old_text in content:
                content = content.replace(old_text, new_text)
                print(f"  ✓ sys.path.append 제거됨")

        # 변경사항이 있으면 저장
        if content != original_content:
            # 백업 생성
            backup_path = file_path.with_suffix(f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}')
            shutil.copy2(file_path, backup_path)
            print(f"  📁 백업 생성: {backup_path.name}")

            # 수정된 내용 저장
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)

            return True

        return False

    except Exception as e:
        print(f"  ✗ 오류 발생: {e}")
        return False


def main():
    """메인 함수"""
    print("🔧 Engines 폴더 Import 경로 수정 시작...")
    print("="*60)

    # 프로젝트 경로 설정
    backend_dir = Path('/home/duksan/바탕화면/gumgang_0_5/backend')
    engines_dir = backend_dir / 'app' / 'engines'

    if not engines_dir.exists():
        print(f"❌ Engines 디렉토리를 찾을 수 없습니다: {engines_dir}")
        return

    # 수정 결과 카운터
    fixed_count = 0
    error_count = 0

    # 각 엔진 파일 처리
    for file_name, mappings in ENGINE_IMPORT_MAPPINGS.items():
        file_path = engines_dir / file_name

        if not file_path.exists():
            print(f"\n⚠️ {file_name} 파일을 찾을 수 없습니다.")
            continue

        print(f"\n📄 처리 중: {file_name}")

        if fix_engine_imports(file_path, mappings):
            print(f"  ✅ {file_name} 수정 완료")
            fixed_count += 1
        else:
            print(f"  ⏭️ {file_name} 변경 사항 없음")

    # 추가로 __init__.py 파일도 확인하고 수정
    init_file = engines_dir / '__init__.py'
    if init_file.exists():
        print(f"\n📄 처리 중: __init__.py")

        init_mappings = [
            ('from .creative import', 'from .creative import'),
            ('from .dream import', 'from .dream import'),
            ('from .empathy import', 'from .empathy import'),
        ]

        if fix_engine_imports(init_file, init_mappings):
            print(f"  ✅ __init__.py 수정 완료")
            fixed_count += 1
        else:
            print(f"  ⏭️ __init__.py 변경 사항 없음")

    # 결과 요약
    print("\n" + "="*60)
    print("📊 작업 결과 요약")
    print("="*60)
    print(f"✅ 수정된 파일: {fixed_count}개")
    print(f"❌ 오류 발생: {error_count}개")

    print("\n✨ Engines 폴더 Import 경로 수정 완료!")
    print("💡 팁: 백업 파일들은 *.backup_* 형식으로 저장되었습니다.")


if __name__ == "__main__":
    main()
