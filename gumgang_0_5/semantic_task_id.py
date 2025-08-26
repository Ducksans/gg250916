#!/usr/bin/env python3
"""
Semantic Task ID System v1.0
규칙 기반 작업 분류 및 위험도 평가 시스템
LLM 없이 100% 로컬 실행
"""

import json
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import hashlib

@dataclass
class TaskMetadata:
    """작업 메타데이터"""
    id: str
    date: str
    category: str
    subcategory: str
    risk: str
    description: str
    created_at: str
    keywords: List[str]
    estimated_impact: str
    auto_generated: bool

class SemanticTaskID:
    """시맨틱 작업 ID 생성 및 관리"""

    # 카테고리 정의
    CATEGORIES = {
        'UI': 'User Interface / Frontend',
        'BE': 'Backend / Server',
        'AI': 'AI / Machine Learning',
        'GIT': 'Git / Version Control',
        'TERM': 'Terminal / CLI',
        'SEC': 'Security / Safety',
        'BUILD': 'Build / Deploy',
        'TEST': 'Testing / QA',
        'DB': 'Database',
        'API': 'API / Integration',
        'DOC': 'Documentation',
        'CONFIG': 'Configuration',
        'PERF': 'Performance',
        'FIX': 'Bug Fix',
        'EMG': 'Emergency'
    }

    # 위험도 레벨
    RISK_LEVELS = {
        'S': {'name': 'Safe', 'color': 'green', 'emoji': '✅'},
        'C': {'name': 'Caution', 'color': 'yellow', 'emoji': '⚠️'},
        'D': {'name': 'Dangerous', 'color': 'red', 'emoji': '🚨'}
    }

    def __init__(self, db_path: str = None):
        """
        초기화

        Args:
            db_path: SQLite DB 경로
        """
        self.db_path = db_path or Path.home() / '.semantic_task_history.db'
        self._init_database()
        self._load_patterns()

    def _init_database(self):
        """데이터베이스 초기화"""
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                date TEXT,
                category TEXT,
                subcategory TEXT,
                risk TEXT,
                description TEXT,
                created_at TEXT,
                keywords TEXT,
                estimated_impact TEXT,
                auto_generated INTEGER,
                metadata TEXT
            )
        ''')
        self.conn.execute('''
            CREATE TABLE IF NOT EXISTS patterns (
                pattern TEXT,
                category TEXT,
                subcategory TEXT,
                weight REAL
            )
        ''')
        self.conn.commit()

    def _load_patterns(self):
        """패턴 규칙 로드"""
        self.patterns = {
            'UI': {
                'keywords': ['component', 'ui', 'view', 'page', 'widget', 'button',
                           'form', 'modal', 'dialog', 'layout', 'style', 'css',
                           'tsx', 'jsx', 'react', 'vue', 'angular'],
                'file_patterns': [r'\.tsx?$', r'\.jsx?$', r'\.vue$', r'\.css$', r'\.scss$'],
                'subcategories': {
                    'component': ['component', 'widget', 'element'],
                    'style': ['css', 'style', 'theme', 'design'],
                    'layout': ['layout', 'grid', 'flex', 'position'],
                    'interaction': ['click', 'hover', 'drag', 'drop', 'scroll']
                }
            },
            'BE': {
                'keywords': ['backend', 'server', 'api', 'endpoint', 'route', 'database',
                           'auth', 'middleware', 'controller', 'model', 'service'],
                'file_patterns': [r'\.py$', r'\.rs$', r'\.go$', r'\.java$', r'server\.'],
                'subcategories': {
                    'api': ['api', 'endpoint', 'route', 'rest', 'graphql'],
                    'auth': ['auth', 'login', 'jwt', 'session', 'oauth'],
                    'db': ['database', 'query', 'migration', 'schema'],
                    'service': ['service', 'business', 'logic', 'process']
                }
            },
            'AI': {
                'keywords': ['ai', 'ml', 'model', 'train', 'predict', 'neural', 'llm',
                           'gpt', 'embedding', 'vector', 'assistant', 'prompt'],
                'file_patterns': [r'\.ipynb$', r'model\.', r'train\.', r'predict\.'],
                'subcategories': {
                    'model': ['model', 'network', 'architecture'],
                    'training': ['train', 'fit', 'optimize', 'loss'],
                    'inference': ['predict', 'infer', 'generate', 'complete'],
                    'assistant': ['assistant', 'chat', 'conversation', 'prompt']
                }
            },
            'GIT': {
                'keywords': ['git', 'commit', 'branch', 'merge', 'rebase', 'push', 'pull',
                           'checkout', 'stash', 'tag', 'release'],
                'file_patterns': [r'\.git', r'\.gitignore'],
                'subcategories': {
                    'commit': ['commit', 'add', 'stage'],
                    'branch': ['branch', 'checkout', 'merge'],
                    'remote': ['push', 'pull', 'fetch', 'remote'],
                    'history': ['log', 'diff', 'blame', 'revert']
                }
            },
            'SEC': {
                'keywords': ['security', 'auth', 'encrypt', 'decrypt', 'password', 'token',
                           'permission', 'role', 'access', 'firewall', 'ssl'],
                'file_patterns': [r'auth\.', r'security\.', r'\.pem$', r'\.key$'],
                'subcategories': {
                    'auth': ['auth', 'login', 'logout', 'session'],
                    'crypto': ['encrypt', 'decrypt', 'hash', 'sign'],
                    'access': ['permission', 'role', 'acl', 'rbac'],
                    'network': ['firewall', 'ssl', 'tls', 'https']
                }
            }
        }

        # 위험도 평가 규칙
        self.risk_rules = {
            'D': {  # Dangerous
                'keywords': ['delete', 'drop', 'remove', 'destroy', 'format', 'wipe',
                           'rm -rf', 'sudo', 'admin', 'root', 'password', 'secret',
                           'production', 'live', 'master', 'main'],
                'patterns': [r'DELETE\s+FROM', r'DROP\s+TABLE', r'rm\s+-rf'],
                'file_patterns': [r'\.env$', r'\.key$', r'\.pem$'],
                'categories': ['SEC', 'DB', 'BUILD']
            },
            'C': {  # Caution
                'keywords': ['update', 'modify', 'change', 'alter', 'migrate', 'config',
                           'setting', 'api', 'integration', 'external'],
                'patterns': [r'UPDATE\s+SET', r'ALTER\s+TABLE'],
                'file_patterns': [r'config\.', r'settings\.'],
                'categories': ['API', 'CONFIG', 'BE']
            },
            'S': {  # Safe
                'keywords': ['test', 'doc', 'comment', 'readme', 'style', 'ui', 'view',
                           'component', 'mock', 'example', 'sample'],
                'patterns': [r'test_', r'spec\.', r'\.test\.'],
                'file_patterns': [r'\.md$', r'\.txt$', r'\.css$', r'test\.'],
                'categories': ['UI', 'DOC', 'TEST']
            }
        }

    def generate(self,
                description: str,
                category: str = None,
                subcategory: str = None,
                risk: str = None,
                auto_detect: bool = True) -> str:
        """
        시맨틱 작업 ID 생성

        Args:
            description: 작업 설명
            category: 카테고리 (옵션)
            subcategory: 서브카테고리 (옵션)
            risk: 위험도 (옵션)
            auto_detect: 자동 감지 활성화

        Returns:
            생성된 작업 ID
        """
        # 날짜
        date = datetime.now().strftime('%Y%m%d')

        # 자동 감지
        if auto_detect:
            if not category:
                category = self._detect_category(description)
            if not subcategory:
                subcategory = self._detect_subcategory(description, category)
            if not risk:
                risk = self._assess_risk(description, category)

        # 기본값
        category = category or 'GENERAL'
        subcategory = subcategory or 'task'
        risk = risk or 'S'

        # 설명 정규화
        normalized_desc = self._normalize_description(description)

        # ID 생성
        task_id = f"GG-{date}-{category}.{subcategory}.{normalized_desc}-{risk}"

        # 메타데이터 저장
        metadata = TaskMetadata(
            id=task_id,
            date=date,
            category=category,
            subcategory=subcategory,
            risk=risk,
            description=description,
            created_at=datetime.now().isoformat(),
            keywords=self._extract_keywords(description),
            estimated_impact=self._estimate_impact(risk, category),
            auto_generated=auto_detect
        )

        self._save_task(metadata)

        return task_id

    def _detect_category(self, text: str) -> str:
        """카테고리 자동 감지"""
        text_lower = text.lower()
        scores = {}

        # 키워드 매칭
        for cat, data in self.patterns.items():
            score = 0
            for keyword in data['keywords']:
                if keyword in text_lower:
                    score += 2

            # 파일 패턴 매칭
            for pattern in data['file_patterns']:
                if re.search(pattern, text, re.IGNORECASE):
                    score += 3

            scores[cat] = score

        # 최고 점수 카테고리 반환
        if scores:
            best_cat = max(scores, key=scores.get)
            if scores[best_cat] > 0:
                return best_cat

        return 'GENERAL'

    def _detect_subcategory(self, text: str, category: str) -> str:
        """서브카테고리 자동 감지"""
        if category not in self.patterns:
            return 'task'

        text_lower = text.lower()
        cat_data = self.patterns[category]

        if 'subcategories' in cat_data:
            for subcat, keywords in cat_data['subcategories'].items():
                for keyword in keywords:
                    if keyword in text_lower:
                        return subcat

        return 'general'

    def _assess_risk(self, text: str, category: str) -> str:
        """위험도 평가"""
        text_lower = text.lower()

        # 위험도별 점수 계산
        scores = {'D': 0, 'C': 0, 'S': 0}

        for risk_level, rules in self.risk_rules.items():
            # 키워드 체크
            for keyword in rules['keywords']:
                if keyword.lower() in text_lower:
                    scores[risk_level] += 2

            # 패턴 체크
            for pattern in rules['patterns']:
                if re.search(pattern, text, re.IGNORECASE):
                    scores[risk_level] += 3

            # 카테고리 체크
            if category in rules['categories']:
                scores[risk_level] += 1

        # 최고 점수 위험도 반환
        max_score = max(scores.values())
        if max_score > 0:
            for risk, score in scores.items():
                if score == max_score:
                    return risk

        # 기본값: Safe
        return 'S'

    def _normalize_description(self, description: str) -> str:
        """설명 정규화"""
        # 소문자 변환
        normalized = description.lower()

        # 특수문자 제거
        normalized = re.sub(r'[^a-z0-9\s-]', '', normalized)

        # 공백을 하이픈으로
        normalized = re.sub(r'\s+', '-', normalized)

        # 중복 하이픈 제거
        normalized = re.sub(r'-+', '-', normalized)

        # 앞뒤 하이픈 제거
        normalized = normalized.strip('-')

        # 최대 길이 제한
        if len(normalized) > 30:
            normalized = normalized[:30]

        return normalized or 'task'

    def _extract_keywords(self, text: str) -> List[str]:
        """키워드 추출"""
        # 간단한 키워드 추출 (명사 위주)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())

        # 불용어 제거
        stopwords = {'the', 'and', 'for', 'with', 'from', 'this', 'that', 'will', 'can'}
        keywords = [w for w in words if w not in stopwords]

        # 중복 제거 및 정렬
        return sorted(list(set(keywords)))[:10]

    def _estimate_impact(self, risk: str, category: str) -> str:
        """영향도 추정"""
        impact_matrix = {
            ('D', 'SEC'): 'CRITICAL',
            ('D', 'DB'): 'CRITICAL',
            ('D', 'BUILD'): 'HIGH',
            ('C', 'API'): 'MEDIUM',
            ('C', 'BE'): 'MEDIUM',
            ('S', 'UI'): 'LOW',
            ('S', 'DOC'): 'MINIMAL'
        }

        return impact_matrix.get((risk, category), 'MEDIUM')

    def _save_task(self, metadata: TaskMetadata):
        """작업 메타데이터 저장"""
        self.conn.execute('''
            INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            metadata.id,
            metadata.date,
            metadata.category,
            metadata.subcategory,
            metadata.risk,
            metadata.description,
            metadata.created_at,
            json.dumps(metadata.keywords),
            metadata.estimated_impact,
            int(metadata.auto_generated),
            json.dumps(asdict(metadata))
        ))
        self.conn.commit()

    def parse(self, task_id: str) -> Optional[TaskMetadata]:
        """작업 ID 파싱"""
        pattern = r'GG-(\d{8})-([A-Z]+)\.([a-z]+)\.([a-z-]+)-([SCD])'
        match = re.match(pattern, task_id)

        if match:
            date, category, subcategory, description, risk = match.groups()

            # DB에서 메타데이터 조회
            cursor = self.conn.execute(
                'SELECT metadata FROM tasks WHERE id = ?', (task_id,)
            )
            row = cursor.fetchone()

            if row:
                return TaskMetadata(**json.loads(row[0]))
            else:
                # DB에 없으면 기본 메타데이터 생성
                return TaskMetadata(
                    id=task_id,
                    date=date,
                    category=category,
                    subcategory=subcategory,
                    risk=risk,
                    description=description.replace('-', ' '),
                    created_at=datetime.now().isoformat(),
                    keywords=[],
                    estimated_impact=self._estimate_impact(risk, category),
                    auto_generated=False
                )
        return None

    def search(self,
              query: str = None,
              category: str = None,
              risk: str = None,
              date_from: str = None,
              date_to: str = None,
              limit: int = 50) -> List[TaskMetadata]:
        """작업 검색"""
        sql = 'SELECT metadata FROM tasks WHERE 1=1'
        params = []

        if query:
            sql += ' AND (description LIKE ? OR keywords LIKE ?)'
            params.extend([f'%{query}%', f'%{query}%'])

        if category:
            sql += ' AND category = ?'
            params.append(category)

        if risk:
            sql += ' AND risk = ?'
            params.append(risk)

        if date_from:
            sql += ' AND date >= ?'
            params.append(date_from)

        if date_to:
            sql += ' AND date <= ?'
            params.append(date_to)

        sql += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)

        cursor = self.conn.execute(sql, params)

        results = []
        for row in cursor:
            results.append(TaskMetadata(**json.loads(row[0])))

        return results

    def get_statistics(self) -> Dict:
        """통계 정보"""
        stats = {
            'total_tasks': 0,
            'by_category': {},
            'by_risk': {},
            'by_date': {},
            'recent_tasks': []
        }

        # 전체 작업 수
        cursor = self.conn.execute('SELECT COUNT(*) FROM tasks')
        stats['total_tasks'] = cursor.fetchone()[0]

        # 카테고리별
        cursor = self.conn.execute(
            'SELECT category, COUNT(*) FROM tasks GROUP BY category'
        )
        stats['by_category'] = dict(cursor.fetchall())

        # 위험도별
        cursor = self.conn.execute(
            'SELECT risk, COUNT(*) FROM tasks GROUP BY risk'
        )
        stats['by_risk'] = dict(cursor.fetchall())

        # 날짜별
        cursor = self.conn.execute(
            'SELECT date, COUNT(*) FROM tasks GROUP BY date ORDER BY date DESC LIMIT 30'
        )
        stats['by_date'] = dict(cursor.fetchall())

        # 최근 작업
        stats['recent_tasks'] = self.search(limit=10)

        return stats

    def suggest_next_task(self, current_task_id: str) -> Optional[str]:
        """다음 작업 제안"""
        current = self.parse(current_task_id)
        if not current:
            return None

        # 관련 작업 매핑
        next_task_map = {
            ('UI', 'component'): ('TEST', 'unit', '컴포넌트 테스트'),
            ('BE', 'api'): ('DOC', 'api', 'API 문서화'),
            ('AI', 'model'): ('TEST', 'performance', '모델 성능 테스트'),
            ('GIT', 'commit'): ('GIT', 'push', '원격 저장소 푸시'),
            ('SEC', 'auth'): ('TEST', 'security', '보안 테스트'),
            ('BUILD', 'compile'): ('BUILD', 'deploy', '배포 준비')
        }

        key = (current.category, current.subcategory)
        if key in next_task_map:
            next_cat, next_sub, next_desc = next_task_map[key]
            return self.generate(
                description=next_desc,
                category=next_cat,
                subcategory=next_sub,
                risk='S',
                auto_detect=False
            )

        return None


def main():
    """CLI 인터페이스"""
    import argparse

    parser = argparse.ArgumentParser(description='Semantic Task ID System')
    parser.add_argument('--generate', type=str, help='작업 ID 생성')
    parser.add_argument('--category', type=str, help='카테고리 지정')
    parser.add_argument('--risk', type=str, help='위험도 지정 (S/C/D)')
    parser.add_argument('--parse', type=str, help='작업 ID 파싱')
    parser.add_argument('--search', type=str, help='작업 검색')
    parser.add_argument('--stats', action='store_true', help='통계 보기')
    parser.add_argument('--test', action='store_true', help='테스트 실행')
    parser.add_argument('--suggest', type=str, help='다음 작업 제안')

    args = parser.parse_args()

    # Semantic Task ID 인스턴스
    stid = SemanticTaskID()

    if args.generate:
        task_id = stid.generate(
            description=args.generate,
            category=args.category,
            risk=args.risk
        )
        print(f"✅ 생성된 작업 ID: {task_id}")

        # 메타데이터 출력
        metadata = stid.parse(task_id)
        if metadata:
            print(f"  📁 카테고리: {metadata.category}.{metadata.subcategory}")
            print(f"  ⚡ 위험도: {stid.RISK_LEVELS[metadata.risk]['emoji']} {metadata.risk}")
            print(f"  📊 영향도: {metadata.estimated_impact}")
            print(f"  🔑 키워드: {', '.join(metadata.keywords)}")

    elif args.parse:
        metadata = stid.parse(args.parse)
        if metadata:
            print(json.dumps(asdict(metadata), indent=2, ensure_ascii=False))
        else:
            print(f"❌ 올바르지 않은 작업 ID: {args.parse}")

    elif args.search:
        results = stid.search(query=args.search)
        print(f"\n🔍 검색 결과 ({len(results)}개):")
        for task in results:
            risk_emoji = stid.RISK_LEVELS[task.risk]['emoji']
            print(f"  {risk_emoji} {task.id}")
            print(f"     {task.description}")

    elif args.stats:
        stats = stid.get_statistics()
        print("\n📊 작업 통계:")
        print(f"  총 작업 수: {stats['total_tasks']}")
        print("\n  카테고리별:")
        for cat, count in stats['by_category'].items():
            print(f"    {cat}: {count}개")
        print("\n  위험도별:")
        for risk, count in stats['by_risk'].items():
            emoji = stid.RISK_LEVELS.get(risk, {}).get('emoji', '❓')
            print(f"    {emoji} {risk}: {count}개")

    elif args.test:
        print("🧪 Semantic Task ID 테스트\n")

        test_cases = [
            "AI 코딩 어시스턴트 UI 구현",
            "백엔드 API 엔드포인트 수정",
            "데이터베이스 테이블 삭제",
            "Git 브랜치 병합",
            "보안 인증 시스템 구현",
            "프론트엔드 컴포넌트 스타일 수정",
            "테스트 케이스 작성",
            "프로덕션 서버 배포"
        ]

        for desc in test_cases:
            task_id = stid.generate(desc)
            metadata = stid.parse(task_id)
            risk_emoji = stid.RISK_LEVELS[metadata.risk]['emoji']
            print(f"{risk_emoji} {task_id}")
            print(f"   → {desc}\n")

    elif args.suggest:
        next_task = stid.suggest_next_task(args.suggest)
        if next_task:
            print(f"💡 다음 추천 작업: {next_task}")
        else:
            print("ℹ️ 추천할 작업이 없습니다")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
