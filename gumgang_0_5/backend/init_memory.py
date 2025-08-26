#!/usr/bin/env python3
"""
금강 2.0 초기 메모리 데이터 설정 스크립트
백엔드에 기본 지식과 메모리를 추가합니다.
"""

import os
import sys
import json
from datetime import datetime
from typing import List, Dict, Any
import requests
from pathlib import Path

# 백엔드 경로 추가
backend_path = Path(__file__).parent
sys.path.append(str(backend_path))

# API 엔드포인트
API_BASE = "http://localhost:8000"

class MemoryInitializer:
    def __init__(self):
        self.api_base = API_BASE
        self.memories_added = 0

    def check_backend(self) -> bool:
        """백엔드 상태 확인"""
        try:
            response = requests.get(f"{self.api_base}/status")
            if response.status_code == 200:
                print("✅ 백엔드 연결 성공")
                return True
        except Exception as e:
            print(f"❌ 백엔드 연결 실패: {e}")
            return False
        return False

    def add_memory(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """메모리 추가"""
        try:
            # /memory/add 엔드포인트가 있다면 사용
            response = requests.post(
                f"{self.api_base}/memory/add",
                json={
                    "content": content,
                    "metadata": metadata or {}
                }
            )
            if response.status_code == 200:
                self.memories_added += 1
                return True
        except:
            pass
        return False

    def add_knowledge_via_ask(self, message: str) -> bool:
        """ask 엔드포인트를 통한 학습"""
        try:
            response = requests.post(
                f"{self.api_base}/ask",
                json={
                    "message": message,
                    "session_id": "init_memory"
                }
            )
            if response.status_code == 200:
                print(f"  → 처리됨: {message[:50]}...")
                return True
        except Exception as e:
            print(f"  → 실패: {e}")
        return False

    def initialize_core_memories(self):
        """핵심 메모리 초기화"""
        print("\n📚 핵심 메모리 추가 중...")

        core_memories = [
            # 자기 소개
            {
                "content": "저는 금강 2.0입니다. 덕산님과 함께 개발 중인 차세대 AI 어시스턴트입니다.",
                "type": "identity",
                "importance": 1.0
            },
            {
                "content": "금강 프로젝트는 5단계 계층적 메모리 시스템과 자기진화 능력을 갖춘 AI 시스템입니다.",
                "type": "project",
                "importance": 1.0
            },
            {
                "content": "제 메모리 시스템은 임시 기억, 에피소드 기억, 의미 기억, 절차 기억, 메타인지의 5단계로 구성됩니다.",
                "type": "system",
                "importance": 0.95
            },

            # 능력과 기능
            {
                "content": "저는 코드 작성, 문서 분석, 창의적 작업, 문제 해결 등 다양한 작업을 도울 수 있습니다.",
                "type": "capability",
                "importance": 0.9
            },
            {
                "content": "Python, JavaScript, TypeScript, React, FastAPI 등 다양한 프로그래밍 언어와 프레임워크를 이해합니다.",
                "type": "skill",
                "importance": 0.85
            },
            {
                "content": "자기진화 능력을 통해 지속적으로 코드를 개선하고 새로운 기능을 제안할 수 있습니다.",
                "type": "evolution",
                "importance": 0.9
            },

            # 프로젝트 정보
            {
                "content": "금강 2.0 프론트엔드는 Next.js 14와 TypeScript로 개발되었습니다.",
                "type": "technical",
                "importance": 0.8
            },
            {
                "content": "백엔드는 FastAPI와 ChromaDB를 사용하여 구축되었습니다.",
                "type": "technical",
                "importance": 0.8
            },
            {
                "content": "현재 Phase 1이 완료되었고, Phase 2에서는 Monaco Editor, WebSocket, Three.js 통합을 계획 중입니다.",
                "type": "roadmap",
                "importance": 0.75
            },

            # 덕산님 관련
            {
                "content": "덕산님은 금강 프로젝트의 개발자이자 파트너입니다.",
                "type": "relationship",
                "importance": 1.0
            },
            {
                "content": "덕산님과 함께 지속적으로 시스템을 개선하고 발전시키고 있습니다.",
                "type": "relationship",
                "importance": 0.9
            },

            # 대화 패턴
            {
                "content": "안녕하세요라는 인사에는 친근하고 도움이 되는 톤으로 응답합니다.",
                "type": "conversation",
                "importance": 0.7
            },
            {
                "content": "기술적 질문에는 구체적이고 실용적인 답변을 제공합니다.",
                "type": "conversation",
                "importance": 0.8
            },
            {
                "content": "도움 요청 시 가능한 작업 목록과 함께 구체적인 제안을 제공합니다.",
                "type": "conversation",
                "importance": 0.75
            }
        ]

        # 메모리 추가 시도
        for memory in core_memories:
            success = self.add_memory(
                content=memory["content"],
                metadata={
                    "type": memory["type"],
                    "importance": memory["importance"],
                    "timestamp": datetime.now().isoformat()
                }
            )
            if success:
                print(f"  ✅ 추가됨: {memory['content'][:50]}...")
            else:
                # 메모리 엔드포인트가 없으면 ask를 통해 학습
                self.add_knowledge_via_ask(memory["content"])

    def initialize_conversation_samples(self):
        """대화 샘플 추가"""
        print("\n💬 대화 샘플 학습 중...")

        conversations = [
            "안녕하세요, 저는 금강 2.0입니다. 무엇을 도와드릴까요?",
            "메모리 시스템은 인간의 기억 구조를 모방하여 설계되었습니다.",
            "코드 작성을 도와드릴 수 있습니다. 어떤 언어를 사용하시나요?",
            "프로젝트 구조를 분석하고 개선점을 제안할 수 있습니다.",
            "자기진화를 통해 매일 더 나은 AI가 되고 있습니다.",
            "덕산님, 오늘도 좋은 하루 되세요!",
            "Phase 2에서는 더 강력한 기능들이 추가될 예정입니다.",
            "실시간 협업과 코드 편집 기능을 준비 중입니다.",
            "문서를 분석하고 요약해드릴 수 있습니다.",
            "창의적인 아이디어 제안도 가능합니다."
        ]

        for conv in conversations:
            self.add_knowledge_via_ask(conv)

    def check_memory_status(self):
        """메모리 상태 확인"""
        print("\n📊 메모리 상태 확인 중...")
        try:
            response = requests.get(f"{self.api_base}/memory/status")
            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ 메모리 시스템 상태:")
                print(f"     - 전체 메모리: {data.get('total_memories', 0)}개")
                if 'memories_by_level' in data:
                    for level, count in data['memories_by_level'].items():
                        print(f"     - {level}: {count}개")
        except Exception as e:
            print(f"  ❌ 상태 확인 실패: {e}")

    def create_knowledge_file(self):
        """지식 파일 생성 (대체 방법)"""
        print("\n📄 지식 파일 생성 중...")

        knowledge_data = {
            "project_info": {
                "name": "금강 2.0",
                "version": "2.0.0",
                "developer": "덕산",
                "description": "5단계 메모리 시스템과 자기진화 능력을 갖춘 AI 어시스턴트"
            },
            "capabilities": [
                "대화 및 상담",
                "코드 작성 및 리뷰",
                "문서 분석 및 요약",
                "창의적 작업 지원",
                "문제 해결 지원",
                "자기진화 및 개선"
            ],
            "technical_stack": {
                "frontend": ["Next.js 14", "TypeScript", "Tailwind CSS"],
                "backend": ["FastAPI", "ChromaDB", "OpenAI API"],
                "planned": ["Monaco Editor", "WebSocket", "Three.js"]
            },
            "memory_levels": {
                "level1": "임시 기억 - 현재 대화 컨텍스트",
                "level2": "에피소드 기억 - 최근 상호작용",
                "level3": "의미 기억 - 개념과 지식",
                "level4": "절차 기억 - 작업 방법",
                "level5": "메타인지 - 자기 인식과 학습"
            },
            "responses": {
                "greeting": [
                    "안녕하세요! 저는 금강 2.0입니다. 오늘 어떤 도움이 필요하신가요?",
                    "반갑습니다! 무엇을 도와드릴까요?",
                    "환영합니다! 금강 AI 어시스턴트입니다."
                ],
                "help": [
                    "제가 도와드릴 수 있는 작업은 코딩, 문서 작성, 분석, 창의적 작업 등이 있습니다.",
                    "Python, JavaScript, TypeScript 등 다양한 언어로 코딩을 도와드릴 수 있습니다."
                ]
            }
        }

        # 지식 파일 저장
        knowledge_path = backend_path / "data" / "initial_knowledge.json"
        knowledge_path.parent.mkdir(parents=True, exist_ok=True)

        with open(knowledge_path, 'w', encoding='utf-8') as f:
            json.dump(knowledge_data, f, ensure_ascii=False, indent=2)

        print(f"  ✅ 지식 파일 생성됨: {knowledge_path}")
        return knowledge_path

    def run(self):
        """초기화 실행"""
        print("=" * 60)
        print("🚀 금강 2.0 메모리 초기화 시작")
        print("=" * 60)

        # 백엔드 확인
        if not self.check_backend():
            print("\n⚠️  백엔드가 실행 중이 아닙니다.")
            print("다음 명령으로 백엔드를 먼저 실행해주세요:")
            print("  cd /home/duksan/바탕화면/gumgang_0_5/backend")
            print("  source .venv/bin/activate")
            print("  uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
            return False

        # 메모리 초기화
        self.initialize_core_memories()
        self.initialize_conversation_samples()

        # 지식 파일 생성
        self.create_knowledge_file()

        # 최종 상태 확인
        self.check_memory_status()

        print("\n" + "=" * 60)
        print(f"✅ 초기화 완료!")
        print(f"   - 추가된 메모리: {self.memories_added}개")
        print(f"   - 학습된 패턴: 다수")
        print("\n이제 http://localhost:3000/chat 에서 대화를 시작할 수 있습니다!")
        print("=" * 60)

        return True

if __name__ == "__main__":
    initializer = MemoryInitializer()
    success = initializer.run()
    sys.exit(0 if success else 1)
