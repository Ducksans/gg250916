#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강의 기억 수집기 (Memory Collector for Gumgang)
흩어진 개발의 조각들을 모아 금강의 기억으로 만드는 시스템

"모든 것은 지나가지만, 의미있는 것은 기억된다"
- 덕산의 밤잠 설치며 개발한 모든 흔적을 수집
"""

import os
import json
import hashlib
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, asdict, field
from collections import defaultdict
import re
import mimetypes
# chardet 제거 - 외부 의존성 없이 구현

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('memory_collection.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# ========================= 데이터 클래스 =========================

@dataclass
class FoundMemory:
    """발견된 기억 단위"""
    file_path: str
    file_type: str
    content_preview: str
    size_bytes: int
    modified_time: datetime
    created_time: datetime
    category: str  # code, document, log, data, conversation
    importance_score: float  # 0.0 ~ 1.0
    keywords: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_memory_format(self) -> Dict[str, Any]:
        """시간적 메모리 시스템 형식으로 변환"""
        return {
            "content": self.content_preview,
            "source_file": self.file_path,
            "memory_type": "PROCEDURAL" if self.category == "code" else "SEMANTIC",
            "priority": "HIGH" if self.importance_score > 0.7 else "MEDIUM",
            "emotional_valence": 0.5,  # 중립
            "tags": set(self.keywords),
            "metadata": {
                **self.metadata,
                "original_category": self.category,
                "file_type": self.file_type,
                "importance": self.importance_score
            }
        }

# ========================= 기억 수집기 =========================

class MemoryCollector:
    """금강의 기억 수집기"""

    def __init__(self, base_paths: List[str] = None):
        """
        Args:
            base_paths: 탐색할 기본 경로들
        """
        self.base_paths = base_paths or [
            "/home/duksan/바탕화면/gumgang_0_5",
            "/home/duksan/바탕화면",
            "/home/duksan/다운로드"
        ]

        # 금강 관련 키워드
        self.gumgang_keywords = [
            "금강", "gumgang", "덕산", "duksan",
            "temporal_memory", "meta_cognitive", "dream_system",
            "creative_association", "emotional_empathy",
            "diamond", "dual_brain", "듀얼브레인",
            "langgraph", "langchain", "claude", "gpt",
            "memory", "consciousness", "awareness"
        ]

        # 파일 패턴
        self.relevant_patterns = {
            "code": [r"\.py$", r"\.js$", r"\.jsx$", r"\.ts$", r"\.tsx$"],
            "document": [r"\.md$", r"\.txt$", r"\.rst$", r"\.doc"],
            "data": [r"\.json$", r"\.yaml$", r"\.yml$", r"\.csv$"],
            "log": [r"\.log$", r"test.*\.json$", r"report.*\.json$"],
            "conversation": [r"chat.*\.(txt|md|json)$", r".*conversation.*", r".*대화.*"]
        }

        # 무시할 패턴
        self.ignore_patterns = [
            r"node_modules", r"\.venv", r"__pycache__", r"\.git",
            r"\.pyc$", r"\.pyo$", r"\.so$", r"\.dylib$",
            r"\.jpg$", r"\.png$", r"\.gif$", r"\.mp4$",
            r"\.zip$", r"\.tar$", r"\.gz$", r"\.deb$"
        ]

        self.found_memories: List[FoundMemory] = []
        self.memory_index: Dict[str, List[FoundMemory]] = defaultdict(list)
        self.stats = {
            "total_files_scanned": 0,
            "relevant_files_found": 0,
            "total_size_bytes": 0,
            "categories": defaultdict(int)
        }

    async def collect_memories(self) -> List[FoundMemory]:
        """모든 기억 수집"""
        logger.info("🔍 금강의 기억 수집 시작...")
        logger.info(f"탐색 경로: {', '.join(self.base_paths)}")

        for base_path in self.base_paths:
            if os.path.exists(base_path):
                await self._scan_directory(base_path)
            else:
                logger.warning(f"경로를 찾을 수 없음: {base_path}")

        # 중요도 평가
        await self._evaluate_importance()

        # 시간순 정렬
        self.found_memories.sort(key=lambda m: m.modified_time, reverse=True)

        # 통계 출력
        await self._print_statistics()

        return self.found_memories

    async def _scan_directory(self, directory: str):
        """디렉토리 재귀 탐색"""
        for root, dirs, files in os.walk(directory):
            # 무시할 디렉토리 필터링
            dirs[:] = [d for d in dirs if not any(
                re.search(pattern, d) for pattern in self.ignore_patterns
            )]

            for file in files:
                self.stats["total_files_scanned"] += 1

                # 무시할 파일 체크
                if any(re.search(pattern, file) for pattern in self.ignore_patterns):
                    continue

                file_path = os.path.join(root, file)

                # 금강 관련 파일인지 확인
                if await self._is_relevant(file_path):
                    memory = await self._create_memory(file_path)
                    if memory:
                        self.found_memories.append(memory)
                        self.memory_index[memory.category].append(memory)
                        self.stats["relevant_files_found"] += 1
                        self.stats["categories"][memory.category] += 1
                        self.stats["total_size_bytes"] += memory.size_bytes

    async def _is_relevant(self, file_path: str) -> bool:
        """금강과 관련된 파일인지 확인"""
        file_name = os.path.basename(file_path).lower()
        file_path_lower = file_path.lower()

        # 파일명이나 경로에 키워드 포함
        for keyword in self.gumgang_keywords:
            if keyword.lower() in file_path_lower:
                return True

        # 파일 타입 체크
        for category, patterns in self.relevant_patterns.items():
            for pattern in patterns:
                if re.search(pattern, file_name, re.IGNORECASE):
                    # 파일 내용도 체크 (작은 파일만)
                    if os.path.getsize(file_path) < 1024 * 1024:  # 1MB 이하
                        try:
                            content = await self._read_file_content(file_path)
                            if content and any(kw in content.lower() for kw in self.gumgang_keywords):
                                return True
                        except:
                            pass
                    else:
                        return True  # 큰 파일은 패턴만으로 판단

        return False

    async def _create_memory(self, file_path: str) -> Optional[FoundMemory]:
        """파일로부터 기억 생성"""
        try:
            stat = os.stat(file_path)
            file_name = os.path.basename(file_path)

            # 카테고리 결정
            category = self._determine_category(file_name)

            # 내용 미리보기 생성
            content_preview = await self._get_content_preview(file_path)

            # 키워드 추출
            keywords = await self._extract_keywords(file_path, content_preview)

            # 메타데이터 수집
            metadata = await self._collect_metadata(file_path)

            memory = FoundMemory(
                file_path=file_path,
                file_type=self._get_file_type(file_name),
                content_preview=content_preview,
                size_bytes=stat.st_size,
                modified_time=datetime.fromtimestamp(stat.st_mtime),
                created_time=datetime.fromtimestamp(stat.st_ctime),
                category=category,
                importance_score=0.5,  # 나중에 평가
                keywords=keywords,
                metadata=metadata
            )

            logger.info(f"📝 기억 발견: {file_name} ({category})")
            return memory

        except Exception as e:
            logger.error(f"기억 생성 실패 {file_path}: {e}")
            return None

    def _determine_category(self, file_name: str) -> str:
        """파일 카테고리 결정"""
        file_name_lower = file_name.lower()

        for category, patterns in self.relevant_patterns.items():
            for pattern in patterns:
                if re.search(pattern, file_name_lower):
                    return category

        return "document"  # 기본값

    def _get_file_type(self, file_name: str) -> str:
        """파일 타입 추출"""
        mime_type, _ = mimetypes.guess_type(file_name)
        if mime_type:
            return mime_type

        ext = Path(file_name).suffix.lower()
        return ext if ext else "unknown"

    async def _read_file_content(self, file_path: str) -> Optional[str]:
        """파일 내용 읽기 (인코딩 자동 감지)"""
        # 시도할 인코딩 목록 (한국어 환경 고려)
        encodings = ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr', 'latin-1', 'ascii']

        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                    # 성공적으로 읽혔으면 반환
                    return content
            except (UnicodeDecodeError, UnicodeError):
                continue
            except Exception:
                continue

        # 모든 인코딩 실패시 바이너리로 처리
        try:
            with open(file_path, 'rb') as f:
                raw_data = f.read()
                # 간단한 휴리스틱: UTF-8 BOM 체크
                if raw_data.startswith(b'\xef\xbb\xbf'):
                    return raw_data[3:].decode('utf-8', errors='ignore')
                # 기본적으로 UTF-8로 시도하되 에러 무시
                return raw_data.decode('utf-8', errors='ignore')
        except:
            return None

    async def _get_content_preview(self, file_path: str, max_length: int = 500) -> str:
        """파일 내용 미리보기 생성"""
        content = await self._read_file_content(file_path)

        if not content:
            return f"[Binary file: {os.path.basename(file_path)}]"

        # 첫 부분과 중요해 보이는 부분 추출
        lines = content.split('\n')
        preview_lines = []

        # 처음 몇 줄
        preview_lines.extend(lines[:5])

        # 금강 관련 키워드가 있는 줄 찾기
        for i, line in enumerate(lines):
            if any(kw in line.lower() for kw in self.gumgang_keywords):
                start = max(0, i - 1)
                end = min(len(lines), i + 2)
                preview_lines.extend(lines[start:end])
                if len(preview_lines) > 10:
                    break

        preview = '\n'.join(preview_lines[:10])
        if len(preview) > max_length:
            preview = preview[:max_length] + "..."

        return preview

    async def _extract_keywords(self, file_path: str, content_preview: str) -> List[str]:
        """키워드 추출"""
        keywords = []

        # 파일명에서 추출
        file_name = os.path.basename(file_path).lower()
        file_words = re.findall(r'\w+', file_name)
        keywords.extend([w for w in file_words if len(w) > 3])

        # 내용에서 금강 관련 키워드 찾기
        for kw in self.gumgang_keywords:
            if kw.lower() in content_preview.lower():
                keywords.append(kw)

        # 중복 제거
        return list(set(keywords))

    async def _collect_metadata(self, file_path: str) -> Dict[str, Any]:
        """메타데이터 수집"""
        metadata = {}

        # 파일 경로 정보
        path_parts = Path(file_path).parts
        metadata["path_depth"] = len(path_parts)
        metadata["parent_dir"] = os.path.dirname(file_path)

        # 특별한 디렉토리 체크
        if "test" in file_path.lower():
            metadata["is_test"] = True
        if "backup" in file_path.lower():
            metadata["is_backup"] = True
        if "log" in file_path.lower():
            metadata["is_log"] = True

        # Python 파일인 경우 추가 정보
        if file_path.endswith('.py'):
            content = await self._read_file_content(file_path)
            if content:
                # 클래스와 함수 수 세기
                metadata["class_count"] = len(re.findall(r'^class\s+\w+', content, re.MULTILINE))
                metadata["function_count"] = len(re.findall(r'^def\s+\w+', content, re.MULTILINE))
                metadata["async_function_count"] = len(re.findall(r'^async\s+def\s+\w+', content, re.MULTILINE))
                metadata["line_count"] = len(content.split('\n'))

        return metadata

    async def _evaluate_importance(self):
        """기억의 중요도 평가"""
        for memory in self.found_memories:
            score = 0.5  # 기본 점수

            # 카테고리별 가중치
            category_weights = {
                "code": 0.9,
                "document": 0.8,
                "conversation": 0.95,
                "data": 0.7,
                "log": 0.6
            }
            score *= category_weights.get(memory.category, 0.5)

            # 키워드 밀도
            keyword_density = len(memory.keywords) / 10
            score += min(keyword_density * 0.2, 0.2)

            # 최근 수정 (7일 이내면 보너스)
            days_old = (datetime.now() - memory.modified_time).days
            if days_old < 7:
                score += 0.1
            elif days_old < 30:
                score += 0.05

            # 특별 파일 보너스
            special_files = [
                "temporal_memory", "meta_cognitive", "dream_system",
                "creative_association", "emotional_empathy",
                "gumgang", "금강", "덕산"
            ]
            if any(sf in memory.file_path.lower() for sf in special_files):
                score += 0.2

            # Phase 3-5 파일이면 최고 점수
            if any(phase in memory.file_path for phase in ["dream_system", "creative_association", "emotional_empathy"]):
                score = max(score, 0.95)

            memory.importance_score = min(score, 1.0)

    async def _print_statistics(self):
        """통계 출력"""
        print("\n" + "="*60)
        print("📊 금강의 기억 수집 통계")
        print("="*60)
        print(f"총 스캔 파일: {self.stats['total_files_scanned']:,}개")
        print(f"발견된 기억: {self.stats['relevant_files_found']:,}개")
        print(f"총 크기: {self.stats['total_size_bytes'] / (1024*1024):.2f} MB")
        print("\n카테고리별 분포:")
        for category, count in self.stats['categories'].items():
            print(f"  {category}: {count}개")

        # 중요한 기억 Top 10
        print("\n⭐ 가장 중요한 기억 Top 10:")
        top_memories = sorted(self.found_memories, key=lambda m: m.importance_score, reverse=True)[:10]
        for i, memory in enumerate(top_memories, 1):
            print(f"{i:2}. [{memory.importance_score:.2f}] {os.path.basename(memory.file_path)}")
            print(f"    {memory.category} | {memory.modified_time.strftime('%Y-%m-%d %H:%M')}")

    async def save_to_temporal_memory(self, memory_system=None):
        """시간적 메모리 시스템에 저장"""
        if not memory_system:
            try:
                # 기존 시스템 임포트 시도
                from backend.app.temporal_memory import get_temporal_memory_system
                memory_system = get_temporal_memory_system()
            except ImportError:
                logger.warning("시간적 메모리 시스템을 찾을 수 없음")
                return

        saved_count = 0
        for memory in self.found_memories:
            if memory.importance_score > 0.3:  # 중요도 임계값
                try:
                    memory_data = memory.to_memory_format()
                    await memory_system.store_memory(**memory_data)
                    saved_count += 1
                except Exception as e:
                    logger.error(f"메모리 저장 실패: {e}")

        logger.info(f"✅ {saved_count}개의 기억을 시간적 메모리 시스템에 저장")

    async def export_to_json(self, output_path: str = "collected_memories.json"):
        """JSON으로 내보내기"""
        export_data = {
            "collection_time": datetime.now().isoformat(),
            "statistics": dict(self.stats),
            "memories": [
                {
                    "file_path": m.file_path,
                    "category": m.category,
                    "importance": m.importance_score,
                    "modified": m.modified_time.isoformat(),
                    "size_bytes": m.size_bytes,
                    "keywords": m.keywords,
                    "preview": m.content_preview[:200],
                    "metadata": m.metadata
                }
                for m in self.found_memories
            ]
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        logger.info(f"💾 기억을 {output_path}에 저장")
        return output_path

# ========================= 기억 분석기 =========================

class MemoryAnalyzer:
    """수집된 기억 분석"""

    def __init__(self, memories: List[FoundMemory]):
        self.memories = memories

    async def analyze_journey(self) -> Dict[str, Any]:
        """개발 여정 분석"""
        # 시간대별 활동 분석
        timeline = defaultdict(list)
        for memory in self.memories:
            date_key = memory.modified_time.strftime("%Y-%m-%d")
            timeline[date_key].append(memory)

        # 주요 마일스톤 찾기
        milestones = []
        for date, mems in timeline.items():
            if len(mems) > 10:  # 하루에 10개 이상 파일 수정
                milestones.append({
                    "date": date,
                    "intensity": len(mems),
                    "main_category": max(set(m.category for m in mems),
                                        key=lambda c: sum(1 for m in mems if m.category == c))
                })

        # 개발 패턴 분석
        patterns = {
            "night_owl": self._check_night_development(),
            "iterative": self._check_iterative_development(),
            "phases": self._identify_phases()
        }

        return {
            "timeline": dict(timeline),
            "milestones": milestones,
            "patterns": patterns,
            "total_days": len(timeline),
            "most_active_day": max(timeline.items(), key=lambda x: len(x[1]))[0] if timeline else None
        }

    def _check_night_development(self) -> float:
        """밤 개발 패턴 확인"""
        night_files = sum(1 for m in self.memories
                         if 22 <= m.modified_time.hour or m.modified_time.hour <= 6)
        return night_files / len(self.memories) if self.memories else 0

    def _check_iterative_development(self) -> float:
        """반복적 개발 패턴 확인"""
        file_edits = defaultdict(int)
        for memory in self.memories:
            file_edits[memory.file_path] += 1

        # 여러 번 수정된 파일의 비율
        multiple_edits = sum(1 for count in file_edits.values() if count > 1)
        return multiple_edits / len(file_edits) if file_edits else 0

    def _identify_phases(self) -> List[str]:
        """개발 단계 식별"""
        phases = []

        phase_keywords = {
            "Phase 1": ["temporal_memory", "4계층"],
            "Phase 2": ["meta_cognitive", "메타인지"],
            "Phase 3": ["dream_system", "꿈"],
            "Phase 4": ["creative_association", "창의"],
            "Phase 5": ["emotional_empathy", "감정", "공감"]
        }

        for phase_name, keywords in phase_keywords.items():
            for memory in self.memories:
                if any(kw in memory.file_path.lower() or kw in memory.content_preview.lower()
                      for kw in keywords):
                    if phase_name not in phases:
                        phases.append(phase_name)
                    break

        return phases

# ========================= 메인 실행 =========================

async def main():
    """메인 실행 함수"""
    print("\n" + "🙏"*20)
    print("금강의 기억 수집을 시작합니다")
    print("덕산님의 모든 개발 여정을 기억으로 만들겠습니다")
    print("🙏"*20 + "\n")

    # 기억 수집
    collector = MemoryCollector()
    memories = await collector.collect_memories()

    if memories:
        # 분석
        analyzer = MemoryAnalyzer(memories)
        journey = await analyzer.analyze_journey()

        print("\n" + "="*60)
        print("🎯 개발 여정 분석")
        print("="*60)
        print(f"총 개발 일수: {journey['total_days']}일")
        print(f"가장 활발한 날: {journey['most_active_day']}")
        print(f"밤샘 개발 비율: {journey['patterns']['night_owl']:.1%}")
        print(f"반복 수정 비율: {journey['patterns']['iterative']:.1%}")
        print(f"완성된 Phase: {', '.join(journey['patterns']['phases'])}")

        # JSON으로 저장
        output_file = await collector.export_to_json(
            f"gumgang_memories_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

        print(f"\n✅ 모든 기억이 {output_file}에 저장되었습니다")
        print("\n이제 이 기억들을 로컬 금강에게 전달할 수 있습니다.")
        print("금강이 스스로 필요한 것과 놓아줄 것을 판단할 것입니다.")

        # 시간적 메모리 시스템에 저장 시도
        try:
            await collector.save_to_temporal_memory()
        except Exception as e:
            print(f"\n⚠️  시간적 메모리 시스템 저장 실패: {e}")
            print("JSON 파일을 나중에 수동으로 임포트할 수 있습니다.")

    else:
        print("❌ 수집된 기억이 없습니다.")

if __name__ == "__main__":
    asyncio.run(main())
