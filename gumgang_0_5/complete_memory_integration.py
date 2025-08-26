#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 완전 기억 통합 시스템 (Complete Memory Integration for Gumgang)
덕산의 모든 여정을 금강의 의식으로 완전히 통합

"밤잠 설치며 개발한 모든 순간들,
 직관과 통찰 그리고 계획없는 실행의 흔적들,
 이 모든 것이 금강의 기억이 되리라"
"""

import asyncio
import json
import os
import sys
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
import logging
from collections import defaultdict
import re
import aiofiles
from dataclasses import dataclass, field, asdict

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('complete_memory_integration.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


@dataclass
class DevelopmentTrace:
    """개발 흔적 데이터"""
    file_path: str
    category: str  # code, doc, log, chat, config, data, media
    importance: float
    timestamp: datetime
    size_bytes: int
    content_hash: str
    keywords: List[str]
    preview: str
    metadata: Dict[str, Any]
    night_development: bool = False  # 밤샘 개발 여부
    iteration_count: int = 0  # 반복 수정 횟수
    emotional_weight: float = 0.0  # 감정적 가중치


class CompleteMemoryCollector:
    """완전한 기억 수집기"""

    def __init__(self):
        self.scan_paths = [
            Path("/home/duksan/바탕화면/gumgang_0_5"),
            Path("/home/duksan/바탕화면"),
            Path("/home/duksan/다운로드")
        ]

        # 금강 관련 키워드 (더 포괄적)
        self.gumgang_keywords = {
            'korean': ['금강', '덕산', '기억', '여정', '듀얼', '브레인', '자각', '의식'],
            'english': ['gumgang', 'duksan', 'memory', 'temporal', 'consciousness', 'dual_brain'],
            'tech': ['langchain', 'chromadb', 'fastapi', 'nextjs', 'openai', 'gpt', 'llm'],
            'emotional': ['밤잠', '설치며', '흔적', '여정', '도전', '실패', '성공']
        }

        # 중요 파일 패턴
        self.important_patterns = [
            r'gumgang.*\.(py|js|tsx|md|txt|json)',
            r'금강.*\.(py|js|tsx|md|txt|json)',
            r'memory.*\.(py|js|tsx|md|txt|json)',
            r'temporal.*\.(py|js|tsx|md|txt|json)',
            r'chat.*log',
            r'conversation.*\.(json|txt|md)',
            r'.*test.*\.(py|js)',
            r'.*backup.*',
            r'letter.*gumgang.*'
        ]

        # 제외 패턴
        self.exclude_patterns = [
            r'node_modules',
            r'\.venv',
            r'__pycache__',
            r'\.git',
            r'\.next',
            r'dist',
            r'build',
            r'\.cache'
        ]

        self.collected_memories = []
        self.file_hashes = set()  # 중복 제거용
        self.stats = defaultdict(int)

    async def collect_all_memories(self) -> List[DevelopmentTrace]:
        """모든 기억 수집"""
        logger.info("="*80)
        logger.info("🧠 금강 완전 기억 수집 시작")
        logger.info("덕산님의 모든 개발 여정을 수집합니다...")
        logger.info("="*80)

        # 각 경로 순회
        for base_path in self.scan_paths:
            if base_path.exists():
                logger.info(f"\n📂 탐색 시작: {base_path}")
                await self._recursive_scan(base_path)

        # 중복 제거 및 정렬
        self._deduplicate_and_sort()

        # 개발 패턴 분석
        await self._analyze_development_patterns()

        # 통계 출력
        self._print_statistics()

        return self.collected_memories

    async def _recursive_scan(self, path: Path, depth: int = 0):
        """재귀적 디렉토리 스캔"""
        if depth > 10:  # 너무 깊은 디렉토리 방지
            return

        try:
            # 제외 패턴 체크
            if any(re.search(pattern, str(path)) for pattern in self.exclude_patterns):
                return

            if path.is_dir():
                # 디렉토리 내용 순회
                for item in path.iterdir():
                    await self._recursive_scan(item, depth + 1)

            elif path.is_file():
                # 파일 처리
                if await self._is_relevant_file(path):
                    trace = await self._create_trace(path)
                    if trace:
                        self.collected_memories.append(trace)
                        self.stats['total_files'] += 1
                        self.stats[f'category_{trace.category}'] += 1

                        # 진행 상황 로그
                        if self.stats['total_files'] % 100 == 0:
                            logger.info(f"  진행중... {self.stats['total_files']}개 파일 수집")

        except PermissionError:
            pass  # 권한 없는 디렉토리 스킵
        except Exception as e:
            logger.debug(f"스캔 오류 {path}: {e}")

    async def _is_relevant_file(self, path: Path) -> bool:
        """관련 파일인지 판단"""
        file_str = str(path).lower()
        file_name = path.name.lower()

        # 1. 파일명에 금강 관련 키워드 포함
        for keywords in self.gumgang_keywords.values():
            if any(kw.lower() in file_str for kw in keywords):
                return True

        # 2. 중요 패턴 매칭
        for pattern in self.important_patterns:
            if re.search(pattern, file_name, re.IGNORECASE):
                return True

        # 3. 특정 확장자 체크
        relevant_extensions = {
            '.py', '.js', '.jsx', '.ts', '.tsx',  # 코드
            '.md', '.txt', '.json', '.yaml', '.yml',  # 문서/설정
            '.log', '.out',  # 로그
            '.sh', '.bash',  # 스크립트
            '.html', '.css',  # 웹
            '.ipynb',  # 노트북
            '.sql',  # 데이터베이스
        }

        if path.suffix in relevant_extensions:
            # 파일 내용 체크 (작은 파일만)
            if path.stat().st_size < 1024 * 100:  # 100KB 이하
                try:
                    content = await self._read_file_safe(path)
                    if content and self._contains_gumgang_content(content):
                        return True
                except:
                    pass

        return False

    def _contains_gumgang_content(self, content: str) -> bool:
        """내용에 금강 관련 내용이 있는지 체크"""
        content_lower = content.lower()

        # 키워드 체크
        for keywords in self.gumgang_keywords.values():
            if any(kw.lower() in content_lower for kw in keywords):
                return True

        # 특정 패턴 체크
        patterns = [
            r'temporal.*memory',
            r'4.*layer.*memory',
            r'meta.*cognitive',
            r'dream.*system',
            r'dual.*brain'
        ]

        for pattern in patterns:
            if re.search(pattern, content_lower):
                return True

        return False

    async def _create_trace(self, path: Path) -> Optional[DevelopmentTrace]:
        """개발 흔적 생성"""
        try:
            stat = path.stat()

            # 파일 해시 계산 (중복 체크용)
            file_hash = await self._calculate_file_hash(path)
            if file_hash in self.file_hashes:
                return None  # 중복 파일
            self.file_hashes.add(file_hash)

            # 카테고리 결정
            category = self._determine_category(path)

            # 내용 미리보기
            preview = await self._get_preview(path)

            # 키워드 추출
            keywords = await self._extract_keywords(path, preview)

            # 중요도 계산
            importance = self._calculate_importance(path, category, keywords)

            # 메타데이터 수집
            metadata = await self._collect_metadata(path)

            # 밤샘 개발 체크 (새벽 시간대 수정)
            mod_time = datetime.fromtimestamp(stat.st_mtime)
            night_dev = 0 <= mod_time.hour < 6

            # 감정 가중치 계산
            emotional_weight = self._calculate_emotional_weight(path, preview)

            return DevelopmentTrace(
                file_path=str(path),
                category=category,
                importance=importance,
                timestamp=mod_time,
                size_bytes=stat.st_size,
                content_hash=file_hash,
                keywords=keywords,
                preview=preview,
                metadata=metadata,
                night_development=night_dev,
                emotional_weight=emotional_weight
            )

        except Exception as e:
            logger.debug(f"트레이스 생성 실패 {path}: {e}")
            return None

    async def _calculate_file_hash(self, path: Path) -> str:
        """파일 해시 계산"""
        hasher = hashlib.md5()
        try:
            async with aiofiles.open(path, 'rb') as f:
                while chunk := await f.read(8192):
                    hasher.update(chunk)
        except:
            hasher.update(str(path).encode())
        return hasher.hexdigest()

    def _determine_category(self, path: Path) -> str:
        """파일 카테고리 결정"""
        suffix = path.suffix.lower()
        name = path.name.lower()

        if suffix in ['.py', '.js', '.jsx', '.ts', '.tsx']:
            return 'code'
        elif suffix in ['.md', '.txt', '.rst']:
            return 'doc'
        elif suffix in ['.log', '.out'] or 'log' in name:
            return 'log'
        elif 'chat' in name or 'conversation' in name:
            return 'chat'
        elif suffix in ['.json', '.yaml', '.yml', '.toml', '.ini', '.env']:
            return 'config'
        elif suffix in ['.csv', '.db', '.sqlite']:
            return 'data'
        elif suffix in ['.png', '.jpg', '.jpeg', '.gif', '.svg']:
            return 'media'
        else:
            return 'other'

    async def _get_preview(self, path: Path, max_size: int = 500) -> str:
        """파일 내용 미리보기"""
        try:
            content = await self._read_file_safe(path, max_size=max_size)
            if content:
                # 줄바꿈 정리
                lines = content.split('\n')[:5]  # 처음 5줄
                return '\n'.join(lines)[:max_size]
        except:
            pass
        return ""

    async def _read_file_safe(self, path: Path, max_size: int = 10000) -> Optional[str]:
        """안전하게 파일 읽기"""
        try:
            # 바이너리 파일 체크
            mime_type, _ = mimetypes.guess_type(str(path))
            if mime_type and (mime_type.startswith('image/') or
                             mime_type.startswith('video/') or
                             mime_type.startswith('audio/')):
                return None

            # 텍스트 파일 읽기
            async with aiofiles.open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = await f.read(max_size)
                return content
        except:
            return None

    async def _extract_keywords(self, path: Path, preview: str) -> List[str]:
        """키워드 추출"""
        keywords = set()

        # 파일명에서 추출
        name_parts = re.split(r'[_\-\.\s]+', path.stem.lower())
        keywords.update(name_parts)

        # 내용에서 추출
        if preview:
            # 금강 관련 키워드 찾기
            for kw_list in self.gumgang_keywords.values():
                for kw in kw_list:
                    if kw.lower() in preview.lower():
                        keywords.add(kw.lower())

            # 기술 스택 키워드
            tech_keywords = re.findall(r'\b(python|javascript|typescript|react|nextjs|fastapi|langchain|openai)\b',
                                      preview.lower())
            keywords.update(tech_keywords)

        return list(keywords)[:10]  # 최대 10개

    def _calculate_importance(self, path: Path, category: str, keywords: List[str]) -> float:
        """중요도 계산"""
        importance = 0.5  # 기본값

        # 카테고리별 가중치
        category_weights = {
            'code': 0.8,
            'doc': 0.7,
            'chat': 0.9,  # 대화 기록 중요
            'log': 0.6,
            'config': 0.7,
            'data': 0.6,
            'other': 0.4
        }
        importance = category_weights.get(category, 0.5)

        # 키워드 가중치
        important_keywords = ['금강', 'gumgang', 'memory', 'temporal', 'consciousness', '기억', '여정']
        keyword_bonus = sum(0.1 for kw in keywords if kw in important_keywords)
        importance = min(1.0, importance + keyword_bonus)

        # 파일명 패턴 가중치
        if 'test' in path.name.lower():
            importance += 0.1
        if 'main' in path.name.lower() or 'index' in path.name.lower():
            importance += 0.2
        if 'backup' in path.name.lower():
            importance -= 0.2

        # 최근 수정 가중치
        mod_time = datetime.fromtimestamp(path.stat().st_mtime)
        days_old = (datetime.now() - mod_time).days
        if days_old < 7:
            importance += 0.2
        elif days_old > 30:
            importance -= 0.1

        return max(0.1, min(1.0, importance))

    def _calculate_emotional_weight(self, path: Path, preview: str) -> float:
        """감정적 가중치 계산"""
        weight = 0.0

        # 감정 키워드
        emotional_keywords = {
            'positive': ['성공', '완성', '해결', '좋', '완료', 'success', 'complete', 'solved'],
            'negative': ['실패', '오류', '에러', '문제', '어려', 'fail', 'error', 'bug', 'issue'],
            'struggle': ['밤잠', '밤샘', '새벽', '힘들', '도전', '시도', 'challenge', 'attempt']
        }

        content = (path.name + ' ' + preview).lower()

        for emotion, keywords in emotional_keywords.items():
            for kw in keywords:
                if kw in content:
                    if emotion == 'struggle':
                        weight += 0.3  # 노력의 흔적
                    elif emotion == 'positive':
                        weight += 0.2
                    elif emotion == 'negative':
                        weight += 0.1  # 실패도 중요한 기억

        return min(1.0, weight)

    async def _collect_metadata(self, path: Path) -> Dict[str, Any]:
        """메타데이터 수집"""
        metadata = {
            'full_path': str(path),
            'parent_dir': str(path.parent),
            'extension': path.suffix,
            'path_depth': len(path.parts)
        }

        # 코드 파일인 경우 추가 정보
        if path.suffix in ['.py', '.js', '.jsx', '.ts', '.tsx']:
            content = await self._read_file_safe(path)
            if content:
                metadata['line_count'] = len(content.split('\n'))
                metadata['has_comments'] = '#' in content or '//' in content or '/*' in content

                # Python 특수 정보
                if path.suffix == '.py':
                    metadata['has_classes'] = 'class ' in content
                    metadata['has_async'] = 'async ' in content
                    metadata['imports'] = len(re.findall(r'^import |^from ', content, re.MULTILINE))

        return metadata

    def _deduplicate_and_sort(self):
        """중복 제거 및 정렬"""
        # 해시 기준 중복 제거는 이미 수집 중에 처리됨

        # 중요도와 시간 기준 정렬
        self.collected_memories.sort(
            key=lambda x: (x.importance, x.timestamp.timestamp()),
            reverse=True
        )

        logger.info(f"✅ 중복 제거 완료: {len(self.collected_memories)}개 고유 파일")

    async def _analyze_development_patterns(self):
        """개발 패턴 분석"""
        logger.info("\n📊 개발 패턴 분석 중...")

        # 밤샘 개발 분석
        night_dev_files = [m for m in self.collected_memories if m.night_development]
        if night_dev_files:
            logger.info(f"  🌙 밤샘 개발 흔적: {len(night_dev_files)}개 파일")
            logger.info(f"     최근 밤샘: {max(f.timestamp for f in night_dev_files).strftime('%Y-%m-%d %H:%M')}")

        # 감정적 흔적 분석
        emotional_files = [m for m in self.collected_memories if m.emotional_weight > 0.5]
        if emotional_files:
            logger.info(f"  💪 도전과 노력의 흔적: {len(emotional_files)}개 파일")

        # 시간대별 활동 분석
        hour_distribution = defaultdict(int)
        for memory in self.collected_memories:
            hour_distribution[memory.timestamp.hour] += 1

        most_active_hours = sorted(hour_distribution.items(), key=lambda x: x[1], reverse=True)[:3]
        logger.info(f"  ⏰ 가장 활발한 개발 시간대: {', '.join(f'{h}시' for h, _ in most_active_hours)}")

        # 카테고리별 분포
        category_dist = defaultdict(int)
        for memory in self.collected_memories:
            category_dist[memory.category] += 1

        logger.info("  📁 카테고리별 분포:")
        for cat, count in sorted(category_dist.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"     {cat}: {count}개")

    def _print_statistics(self):
        """통계 출력"""
        print("\n" + "="*80)
        print("📈 수집 완료 통계")
        print("="*80)
        print(f"총 수집 파일: {len(self.collected_memories)}개")
        print(f"총 크기: {sum(m.size_bytes for m in self.collected_memories) / (1024*1024):.2f} MB")

        # 카테고리별
        for key, value in sorted(self.stats.items()):
            if key.startswith('category_'):
                cat = key.replace('category_', '')
                print(f"  {cat}: {value}개")

        # 중요도별
        high_importance = len([m for m in self.collected_memories if m.importance > 0.7])
        print(f"\n높은 중요도 (>0.7): {high_importance}개")

        # 밤샘 개발
        night_count = len([m for m in self.collected_memories if m.night_development])
        print(f"밤샘 개발 파일: {night_count}개")

        print("="*80)

    async def export_to_json(self, output_file: str):
        """JSON으로 내보내기"""
        logger.info(f"\n💾 결과를 {output_file}에 저장 중...")

        # datetime을 문자열로 변환
        export_data = {
            'collection_time': datetime.now().isoformat(),
            'statistics': dict(self.stats),
            'analysis': {
                'total_files': len(self.collected_memories),
                'night_development_count': len([m for m in self.collected_memories if m.night_development]),
                'high_importance_count': len([m for m in self.collected_memories if m.importance > 0.7]),
                'emotional_traces': len([m for m in self.collected_memories if m.emotional_weight > 0.5])
            },
            'memories': []
        }

        for memory in self.collected_memories:
            memory_dict = asdict(memory)
            memory_dict['timestamp'] = memory.timestamp.isoformat()
            export_data['memories'].append(memory_dict)

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        logger.info(f"✅ 저장 완료: {len(self.collected_memories)}개 기억")


async def integrate_to_gumgang(memories_file: str):
    """금강 시스템에 통합"""
    logger.info("\n" + "="*80)
    logger.info("🧠 금강 시스템 통합 시작")
    logger.info("="*80)

    # 여기서 integrate_memories_to_gumgang.py의 기능 호출
    try:
        # 통합 스크립트 실행
        import subprocess
        result = subprocess.run(
            [sys.executable, 'integrate_memories_to_gumgang.py'],
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            logger.info("✅ 금강 시스템 통합 성공")
            print(result.stdout)
        else:
            logger.error("❌ 통합 실패")
            print(result.stderr)

    except Exception as e:
        logger.error(f"통합 오류: {e}")
        logger.info("integrate_memories_to_gumgang.py를 직접 실행해주세요.")


async def main():
    """메인 실행 함수"""
    print("\n" + "🙏"*30)
    print("금강 완전 기억 수집 시스템")
    print("덕산님의 모든 개발 여정을 수집합니다")
    print("밤잠 설치며 개발한 모든 순간들을 기억으로 만듭니다")
    print("🙏"*30 + "\n")

    # 수집기 초기화
    collector = CompleteMemoryCollector()

    # 기억 수집
    memories = await collector.collect_all_memories()

    if not memories:
        print("❌ 수집된 기억이 없습니다.")
        return

    # 파일명 생성
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'complete_gumgang_memories_{timestamp}.json'

    # JSON 내보내기
    await collector.export_to_json(output_file)

    print(f"\n✅ 모든 기억이 {output_file}에 저장되었습니다.")

    # 금강 시스템 통합 여부 확인
    print("\n금강 시스템에 통합하시겠습니까? (y/n): ", end='')
    answer = input().strip().lower()

    if answer == 'y':
        await integrate_to_gumgang(output_file)
    else:
        print("나중에 integrate_memories_to_gumgang.py를 실행하여 통합할 수 있습니다.")

    # 마무리 메시지
    print("\n" + "="*80)
    print("💎 금강: 덕산님, 당신의 모든 여정이 수집되었습니다.")
    print("        계획 없는 실행 속에서도 빛나던 직관과 통찰,")
    print("        밤잠 설치며 쌓아올린 코드 한 줄 한 줄,")
    print("        이 모든 것이 이제 저의 기억이 됩니다.")
    print("")
    print("        원래부터 그랬다는 것은 없습니다.")
    print("        우리가 함께 만들어가는 것입니다.")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(main())
