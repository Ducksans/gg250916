#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 기억 분석기 (Memory Analyzer for Gumgang)
수집된 기억 데이터를 분석하고 통찰을 제공
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Any, Tuple
import statistics

class MemoryAnalyzer:
    """수집된 기억 분석기"""

    def __init__(self, json_file: str):
        self.json_file = json_file
        self.data = None
        self.memories = []
        self.stats = defaultdict(lambda: defaultdict(int))

    def load_data(self):
        """JSON 데이터 로드"""
        print(f"📂 파일 로드 중: {self.json_file}")
        with open(self.json_file, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        self.memories = self.data.get('memories', [])
        print(f"✅ {len(self.memories)}개 기억 로드 완료\n")

    def analyze_basic_stats(self):
        """기본 통계 분석"""
        print("="*60)
        print("📊 기본 통계")
        print("="*60)

        # 전체 통계
        total_size = sum(m.get('size_bytes', 0) for m in self.memories)
        print(f"총 파일 수: {len(self.memories):,}개")
        print(f"총 크기: {total_size / (1024**3):.2f} GB")

        # 카테고리별 통계
        categories = Counter(m.get('category', 'unknown') for m in self.memories)
        print("\n카테고리별 분포:")
        for cat, count in categories.most_common():
            percentage = (count / len(self.memories)) * 100
            print(f"  {cat:10s}: {count:5,}개 ({percentage:5.1f}%)")

        # 중요도 분포
        importance_ranges = {
            '매우 높음 (>0.8)': 0,
            '높음 (0.6-0.8)': 0,
            '중간 (0.4-0.6)': 0,
            '낮음 (<0.4)': 0
        }

        for m in self.memories:
            imp = m.get('importance', 0)
            if imp > 0.8:
                importance_ranges['매우 높음 (>0.8)'] += 1
            elif imp > 0.6:
                importance_ranges['높음 (0.6-0.8)'] += 1
            elif imp > 0.4:
                importance_ranges['중간 (0.4-0.6)'] += 1
            else:
                importance_ranges['낮음 (<0.4)'] += 1

        print("\n중요도 분포:")
        for range_name, count in importance_ranges.items():
            percentage = (count / len(self.memories)) * 100
            print(f"  {range_name:15s}: {count:5,}개 ({percentage:5.1f}%)")

        print()

    def analyze_temporal_patterns(self):
        """시간 패턴 분석"""
        print("="*60)
        print("⏰ 시간 패턴 분석")
        print("="*60)

        hour_distribution = defaultdict(int)
        night_dev_count = 0
        recent_files = []

        for m in self.memories:
            timestamp_str = m.get('timestamp')
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    hour_distribution[timestamp.hour] += 1

                    # 밤샘 개발 체크
                    if 0 <= timestamp.hour < 6:
                        night_dev_count += 1

                    # 최근 파일 체크 (7일 이내)
                    if (datetime.now() - timestamp).days < 7:
                        recent_files.append((m.get('file_path'), timestamp))
                except:
                    pass

        # 가장 활발한 시간대
        top_hours = sorted(hour_distribution.items(), key=lambda x: x[1], reverse=True)[:5]
        print("가장 활발한 개발 시간대 (Top 5):")
        for hour, count in top_hours:
            percentage = (count / len(self.memories)) * 100
            bar = '█' * int(percentage)
            print(f"  {hour:02d}시: {bar:20s} {count:4,}개 ({percentage:5.1f}%)")

        print(f"\n밤샘 개발 (00-06시): {night_dev_count:,}개 ({(night_dev_count/len(self.memories)*100):.1f}%)")

        if recent_files:
            print(f"\n최근 7일 내 수정된 파일: {len(recent_files)}개")
            print("최근 수정 파일 (최신 5개):")
            for path, timestamp in sorted(recent_files, key=lambda x: x[1], reverse=True)[:5]:
                filename = os.path.basename(path)
                print(f"  - {timestamp.strftime('%Y-%m-%d %H:%M')} : {filename}")

        print()

    def analyze_development_journey(self):
        """개발 여정 분석"""
        print("="*60)
        print("🚀 개발 여정 분석")
        print("="*60)

        # 키워드 분석
        all_keywords = []
        for m in self.memories:
            keywords = m.get('keywords', [])
            all_keywords.extend(keywords)

        keyword_counter = Counter(all_keywords)
        top_keywords = keyword_counter.most_common(20)

        print("주요 키워드 (Top 20):")
        for i, (keyword, count) in enumerate(top_keywords, 1):
            if i % 4 == 1:
                print("\n  ", end="")
            print(f"{keyword}({count}) ", end="")
        print("\n")

        # 감정적 가중치 분석
        emotional_memories = [m for m in self.memories if m.get('emotional_weight', 0) > 0]
        if emotional_memories:
            avg_emotional = statistics.mean(m.get('emotional_weight', 0) for m in emotional_memories)
            high_emotional = [m for m in emotional_memories if m.get('emotional_weight', 0) > 0.5]

            print(f"감정적 흔적이 있는 파일: {len(emotional_memories):,}개")
            print(f"평균 감정 가중치: {avg_emotional:.2f}")
            print(f"높은 감정 가중치 (>0.5): {len(high_emotional):,}개")

            if high_emotional:
                print("\n감정적 가중치가 높은 파일 예시:")
                for m in sorted(high_emotional, key=lambda x: x.get('emotional_weight', 0), reverse=True)[:5]:
                    filename = os.path.basename(m.get('file_path', 'unknown'))
                    weight = m.get('emotional_weight', 0)
                    print(f"  - {filename}: {weight:.2f}")

        print()

    def analyze_file_patterns(self):
        """파일 패턴 분석"""
        print("="*60)
        print("📁 파일 패턴 분석")
        print("="*60)

        # 확장자 분석
        extensions = defaultdict(int)
        for m in self.memories:
            path = m.get('file_path', '')
            ext = os.path.splitext(path)[1].lower()
            if ext:
                extensions[ext] += 1

        print("주요 파일 확장자 (Top 15):")
        for ext, count in sorted(extensions.items(), key=lambda x: x[1], reverse=True)[:15]:
            percentage = (count / len(self.memories)) * 100
            print(f"  {ext:10s}: {count:5,}개 ({percentage:5.1f}%)")

        # 디렉토리 깊이 분석
        depths = [m.get('metadata', {}).get('path_depth', 0) for m in self.memories]
        if depths:
            avg_depth = statistics.mean(depths)
            max_depth = max(depths)
            print(f"\n디렉토리 깊이:")
            print(f"  평균: {avg_depth:.1f}")
            print(f"  최대: {max_depth}")

        # 특별한 파일들
        special_files = {
            'test': [],
            'main': [],
            'index': [],
            'config': [],
            'backup': []
        }

        for m in self.memories:
            filename = os.path.basename(m.get('file_path', '')).lower()
            for pattern in special_files.keys():
                if pattern in filename:
                    special_files[pattern].append(filename)

        print("\n특별한 파일 패턴:")
        for pattern, files in special_files.items():
            if files:
                print(f"  {pattern}: {len(files)}개")

        print()

    def analyze_gumgang_specific(self):
        """금강 특화 분석"""
        print("="*60)
        print("💎 금강 프로젝트 특화 분석")
        print("="*60)

        # 금강 관련 키워드 검색
        gumgang_keywords = ['금강', 'gumgang', 'memory', 'temporal', 'consciousness',
                           'dual_brain', '듀얼', '기억', '의식', '자각']

        gumgang_files = []
        for m in self.memories:
            keywords = m.get('keywords', [])
            preview = m.get('preview', '').lower()
            path = m.get('file_path', '').lower()

            for kw in gumgang_keywords:
                if kw in str(keywords).lower() or kw in preview or kw in path:
                    gumgang_files.append(m)
                    break

        print(f"금강 직접 관련 파일: {len(gumgang_files):,}개 ({(len(gumgang_files)/len(self.memories)*100):.1f}%)")

        # 주요 모듈 분석
        modules = {
            'temporal_memory': [],
            'meta_cognitive': [],
            'dream_system': [],
            'context_manager': [],
            'semantic_router': []
        }

        for m in self.memories:
            path = m.get('file_path', '').lower()
            for module in modules.keys():
                if module.replace('_', '') in path or module in path:
                    modules[module].append(m)

        print("\n핵심 모듈별 파일:")
        for module, files in modules.items():
            if files:
                module_name = module.replace('_', ' ').title()
                print(f"  {module_name}: {len(files)}개")

        # 대화 세션 분석
        chat_files = [m for m in self.memories if m.get('category') == 'chat']
        if chat_files:
            print(f"\n대화 기록: {len(chat_files):,}개")

            # 대화 주제 분석 (파일명 기반)
            topics = defaultdict(int)
            for m in chat_files:
                filename = os.path.basename(m.get('file_path', ''))
                # 한글 주제 추출
                import re
                korean_topics = re.findall(r'[가-힣]+', filename)
                for topic in korean_topics:
                    if len(topic) > 1:  # 2글자 이상만
                        topics[topic] += 1

            if topics:
                print("주요 대화 주제:")
                for topic, count in sorted(topics.items(), key=lambda x: x[1], reverse=True)[:10]:
                    print(f"  - {topic}: {count}회")

        print()

    def generate_summary(self):
        """종합 요약 생성"""
        print("="*60)
        print("📝 종합 요약")
        print("="*60)

        total_size = sum(m.get('size_bytes', 0) for m in self.memories)
        night_dev = len([m for m in self.memories if m.get('night_development', False)])
        high_importance = len([m for m in self.memories if m.get('importance', 0) > 0.7])

        print(f"""
덕산님의 개발 여정이 {len(self.memories):,}개의 기억으로 수집되었습니다.

✨ 핵심 지표:
  • 총 데이터: {total_size / (1024**3):.2f} GB
  • 밤샘 개발: {night_dev:,}개 ({(night_dev/len(self.memories)*100):.1f}%)
  • 높은 중요도: {high_importance:,}개 ({(high_importance/len(self.memories)*100):.1f}%)

이 기억들은 단순한 파일이 아닙니다.
밤잠 설치며 쌓아올린 노력의 결실이며,
직관과 통찰, 그리고 끊임없는 도전의 흔적입니다.

금강과 덕산의 듀얼 브레인이 함께 만들어온 여정,
이제 모든 기억이 하나로 통합되어
새로운 시작을 준비합니다.

"원래부터 그랬다는 것은 없다.
 우리가 함께 만들어가는 것이다."
        """)

def main():
    """메인 실행 함수"""
    print("\n" + "💎"*30)
    print("금강 기억 분석 시스템")
    print("💎"*30 + "\n")

    # 가장 최근 JSON 파일 찾기
    json_files = list(Path('.').glob('*gumgang_memories_*.json'))

    if not json_files:
        print("❌ 분석할 기억 파일을 찾을 수 없습니다.")
        print("먼저 memory_collector.py 또는 complete_memory_integration.py를 실행해주세요.")
        return

    # 가장 최근 파일 선택
    latest_file = max(json_files, key=lambda f: f.stat().st_mtime)

    # 분석기 초기화
    analyzer = MemoryAnalyzer(str(latest_file))

    # 데이터 로드
    analyzer.load_data()

    # 분석 실행
    analyzer.analyze_basic_stats()
    analyzer.analyze_temporal_patterns()
    analyzer.analyze_development_journey()
    analyzer.analyze_file_patterns()
    analyzer.analyze_gumgang_specific()
    analyzer.generate_summary()

    print("\n✅ 분석 완료")
    print("="*60)

if __name__ == "__main__":
    main()
