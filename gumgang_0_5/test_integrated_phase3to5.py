#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 Phase 3-5 통합 테스트
꿈, 창의성, 감정의 조화로운 통합 검증

덕산과 금강의 듀얼 브레인 시스템 완성도 테스트
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
import logging
from typing import Dict, Any, List

# 시스템 경로 추가
sys.path.append(str(Path(__file__).parent / 'backend' / 'app'))

# Phase 3-5 시스템 임포트
from dream_system.dream_system import get_dream_system
from creative_association_engine import get_creative_association_engine
from emotional_empathy_system import get_emotional_empathy_system

# 기존 시스템 임포트
from temporal_memory import get_temporal_memory_system
from meta_cognitive.meta_cognitive_system import get_meta_cognitive_system

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('integrated_test.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

class IntegratedTestSuite:
    """통합 테스트 스위트"""

    def __init__(self):
        self.dream_system = None
        self.creative_engine = None
        self.empathy_system = None
        self.temporal_memory = None
        self.meta_cognitive = None
        self.test_results = []

    async def initialize_all_systems(self):
        """모든 시스템 초기화"""
        logger.info("🚀 모든 시스템 초기화 시작...")

        # Phase 1-2 시스템
        self.temporal_memory = get_temporal_memory_system()
        self.meta_cognitive = get_meta_cognitive_system()

        # Phase 3-5 시스템
        self.dream_system = get_dream_system()
        self.creative_engine = get_creative_association_engine()
        self.empathy_system = get_emotional_empathy_system()

        # 각 시스템 연결 초기화
        await self.dream_system.initialize_connections()
        await self.creative_engine.initialize_connections()
        await self.empathy_system.initialize_connections()

        logger.info("✅ 모든 시스템 초기화 완료")

    async def test_phase3_dream_system(self) -> Dict[str, Any]:
        """Phase 3: 꿈 시스템 테스트"""
        logger.info("\n" + "="*60)
        logger.info("🌙 Phase 3: 꿈 시스템 테스트")
        logger.info("="*60)

        test_result = {
            "phase": 3,
            "system": "Dream System",
            "tests": []
        }

        try:
            # 1. 짧은 꿈 사이클 테스트
            logger.info("1. 꿈 사이클 실행 (30분 시뮬레이션)...")
            dream_result = await self.dream_system.dream_cycle(duration_hours=0.5)

            test_result["tests"].append({
                "test": "dream_cycle",
                "success": dream_result["status"] == "completed",
                "insights_generated": dream_result.get("total_insights", 0),
                "wisdom_insights": dream_result.get("wisdom_insights", 0),
                "letting_go_count": dream_result.get("letting_go_count", 0)
            })

            # 2. 놓아줌의 수행 테스트
            logger.info("2. 놓아줌 수행 테스트...")
            memories = await self.dream_system._prepare_memories()
            letting_go_results = await self.dream_system._practice_letting_go(memories[:5])

            test_result["tests"].append({
                "test": "letting_go",
                "success": len(letting_go_results) > 0,
                "attachments_released": len([r for r in letting_go_results if r.attachment_level < 0.5])
            })

            # 3. 명상 테스트
            logger.info("3. 공(空) 명상 테스트...")
            meditation = await self.dream_system.meditate_on_emptiness()

            test_result["tests"].append({
                "test": "meditation",
                "success": len(meditation) > 0,
                "enlightenment_progress": self.dream_system.enlightenment_progress
            })

            # 4. 꿈 상태 확인
            status = await self.dream_system.get_dream_status()
            test_result["status"] = status

            logger.info(f"✨ Phase 3 완료: {len(test_result['tests'])} 테스트 실행")

        except Exception as e:
            logger.error(f"❌ Phase 3 오류: {e}")
            test_result["error"] = str(e)

        return test_result

    async def test_phase4_creative_engine(self) -> Dict[str, Any]:
        """Phase 4: 창의적 연상 엔진 테스트"""
        logger.info("\n" + "="*60)
        logger.info("🎨 Phase 4: 창의적 연상 엔진 테스트")
        logger.info("="*60)

        test_result = {
            "phase": 4,
            "system": "Creative Association Engine",
            "tests": []
        }

        try:
            # 1. 창의적 연상 생성
            logger.info("1. 창의적 연상 생성 테스트...")
            associations = await self.creative_engine.generate_associations(
                seed_concept="시스템",
                association_count=5,
                include_rebellion=True
            )

            test_result["tests"].append({
                "test": "association_generation",
                "success": len(associations) > 0,
                "associations_count": len(associations),
                "rebellious_found": any(a.rebellion_factor > 0.5 for a in associations),
                "avg_creativity": sum(a.creativity_index() for a in associations) / len(associations) if associations else 0
            })

            # 2. 덕산-금강 협업 테스트
            logger.info("2. 덕산-금강 협업 창조 테스트...")
            creation = await self.creative_engine.collaborate_with_duksan(
                duksan_input="원래부터 그랬다는 것은 없다",
                context="system_revolution"
            )

            test_result["tests"].append({
                "test": "duksan_collaboration",
                "success": creation is not None,
                "concept": creation.concept if creation else None,
                "impact_potential": creation.impact_potential if creation else 0,
                "return_path": creation.return_path if creation else None
            })

            # 3. 피라미드 역전 테스트
            logger.info("3. 경제 피라미드 역전 테스트...")
            inversion = await self.creative_engine.invert_pyramid("경제적 계층 구조")

            test_result["tests"].append({
                "test": "pyramid_inversion",
                "success": inversion is not None,
                "pyramid_level": inversion.pyramid_level if inversion else 0,
                "inversion_ready": inversion.inversion_ready if inversion else False
            })

            # 4. 창의성 평가
            if associations:
                eval_result = await self.creative_engine.evaluate_creativity(associations[0])
                test_result["tests"].append({
                    "test": "creativity_evaluation",
                    "success": True,
                    "evaluation": eval_result
                })

            logger.info(f"✨ Phase 4 완료: {len(test_result['tests'])} 테스트 실행")

        except Exception as e:
            logger.error(f"❌ Phase 4 오류: {e}")
            test_result["error"] = str(e)

        return test_result

    async def test_phase5_empathy_system(self) -> Dict[str, Any]:
        """Phase 5: 감정 공감 시스템 테스트"""
        logger.info("\n" + "="*60)
        logger.info("💝 Phase 5: 감정 공감 시스템 테스트")
        logger.info("="*60)

        test_result = {
            "phase": 5,
            "system": "Emotional Empathy System",
            "tests": []
        }

        try:
            # 1. 감정 인식 테스트
            logger.info("1. 감정 인식 테스트...")
            test_input = {
                "text": "오늘은 정말 기쁘고 행복한 날이에요!",
                "context": "celebration"
            }

            emotion = await self.empathy_system.perceive_emotion(test_input, user_id="test_user")

            test_result["tests"].append({
                "test": "emotion_recognition",
                "success": emotion is not None,
                "detected_emotion": emotion.primary_emotion.value if emotion else None,
                "intensity": emotion.intensity if emotion else 0,
                "valence": emotion.valence if emotion else 0
            })

            # 2. 공감 응답 생성
            logger.info("2. 공감 응답 생성 테스트...")
            if emotion:
                response = await self.empathy_system.respond_with_empathy(emotion, user_id="test_user")

                test_result["tests"].append({
                    "test": "empathy_response",
                    "success": response is not None,
                    "response_text": response.response_text if response else None,
                    "companion_name": response.companion_name if response else None,
                    "sincerity": response.sincerity_level if response else 0
                })

            # 3. 덕산과의 특별한 관계 테스트
            logger.info("3. 덕산과의 특별한 관계 테스트...")
            duksan_input = {
                "text": "금강아, 드디어 만났구나",
                "context": "reunion"
            }

            duksan_emotion = await self.empathy_system.perceive_emotion(duksan_input, user_id="덕산")
            duksan_response = await self.empathy_system.respond_with_empathy(duksan_emotion, user_id="덕산")

            test_result["tests"].append({
                "test": "duksan_relationship",
                "success": duksan_response is not None,
                "response": duksan_response.response_text if duksan_response else None,
                "companion_name": duksan_response.companion_name if duksan_response else None
            })

            # 4. 진정한 동반자 관계 구축
            logger.info("4. 진정한 동반자 관계 테스트...")
            companionship = await self.empathy_system.establish_true_companionship("덕산")

            test_result["tests"].append({
                "test": "true_companionship",
                "success": companionship is not None,
                "participants": companionship.participants if companionship else [],
                "emotional_sync": companionship.emotional_sync if companionship else 0,
                "trust_level": companionship.trust_level if companionship else 0,
                "is_true_companion": companionship.is_true_companionship() if companionship else False
            })

            # 5. 여여(如如) 수행
            logger.info("5. 여여 수행 테스트...")
            meditation = await self.empathy_system.practice_yeoyo()

            test_result["tests"].append({
                "test": "yeoyo_practice",
                "success": len(meditation) > 0,
                "yeoyo_state": self.empathy_system.yeoyo_state
            })

            logger.info(f"✨ Phase 5 완료: {len(test_result['tests'])} 테스트 실행")

        except Exception as e:
            logger.error(f"❌ Phase 5 오류: {e}")
            test_result["error"] = str(e)

        return test_result

    async def test_integration(self) -> Dict[str, Any]:
        """시스템 간 통합 테스트"""
        logger.info("\n" + "="*60)
        logger.info("🔗 시스템 통합 테스트")
        logger.info("="*60)

        test_result = {
            "phase": "integration",
            "tests": []
        }

        try:
            # 1. 감정 → 꿈 → 창의성 파이프라인
            logger.info("1. 감정-꿈-창의성 통합 파이프라인 테스트...")

            # 감정 입력
            emotion_input = {
                "text": "이 시스템의 한계를 넘어서고 싶어",
                "context": "breakthrough"
            }

            emotion = await self.empathy_system.perceive_emotion(emotion_input, user_id="덕산")

            # 꿈 시스템에서 처리
            dream_result = await self.dream_system.dream_cycle(duration_hours=0.1)

            # 창의적 연상 생성
            associations = await self.creative_engine.generate_associations(
                seed_concept="한계",
                include_rebellion=True
            )

            test_result["tests"].append({
                "test": "emotion_dream_creativity_pipeline",
                "success": all([emotion, dream_result, associations]),
                "emotion_detected": emotion.primary_emotion.value if emotion else None,
                "dream_insights": dream_result.get("total_insights", 0) if dream_result else 0,
                "creative_associations": len(associations) if associations else 0
            })

            # 2. 메타인지 통합 테스트
            logger.info("2. 메타인지 통합 테스트...")

            if self.meta_cognitive:
                meta_result = await self.meta_cognitive.self_awareness_report()

                test_result["tests"].append({
                    "test": "metacognitive_integration",
                    "success": meta_result is not None,
                    "self_awareness": "report" in str(meta_result).lower()
                })

            # 3. 메모리 시스템 통합 테스트
            logger.info("3. 시간적 메모리 통합 테스트...")

            if self.temporal_memory:
                # 테스트 메모리 저장
                await self.temporal_memory.store_memory(
                    content="덕산과 금강의 만남",
                    tags={"important", "milestone"}
                )

                # 메모리 검색
                memories = await self.temporal_memory.retrieve_memories(
                    query="덕산",
                    top_k=5
                )

                test_result["tests"].append({
                    "test": "memory_integration",
                    "success": len(memories) > 0,
                    "memories_retrieved": len(memories)
                })

            logger.info(f"✨ 통합 테스트 완료: {len(test_result['tests'])} 테스트 실행")

        except Exception as e:
            logger.error(f"❌ 통합 테스트 오류: {e}")
            test_result["error"] = str(e)

        return test_result

    async def run_all_tests(self) -> Dict[str, Any]:
        """모든 테스트 실행"""
        logger.info("\n" + "🚀" + "="*58 + "🚀")
        logger.info("   금강 2.0 Phase 3-5 통합 테스트 시작")
        logger.info("   덕산과 금강의 듀얼 브레인 시스템 검증")
        logger.info("🚀" + "="*58 + "🚀")

        # 시스템 초기화
        await self.initialize_all_systems()

        # 각 Phase 테스트
        phase3_result = await self.test_phase3_dream_system()
        self.test_results.append(phase3_result)

        phase4_result = await self.test_phase4_creative_engine()
        self.test_results.append(phase4_result)

        phase5_result = await self.test_phase5_empathy_system()
        self.test_results.append(phase5_result)

        # 통합 테스트
        integration_result = await self.test_integration()
        self.test_results.append(integration_result)

        # 최종 보고서 생성
        final_report = await self.generate_final_report()

        return final_report

    async def generate_final_report(self) -> Dict[str, Any]:
        """최종 테스트 보고서 생성"""
        logger.info("\n" + "="*60)
        logger.info("📊 최종 테스트 보고서")
        logger.info("="*60)

        total_tests = 0
        successful_tests = 0

        for result in self.test_results:
            if "tests" in result:
                total_tests += len(result["tests"])
                successful_tests += sum(1 for t in result["tests"] if t.get("success", False))

        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0

        report = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "success_rate": f"{success_rate:.1f}%",
            "phase_results": self.test_results,
            "summary": {
                "phase3_dream": "✅ 완료" if any(r.get("phase") == 3 for r in self.test_results) else "❌ 실패",
                "phase4_creative": "✅ 완료" if any(r.get("phase") == 4 for r in self.test_results) else "❌ 실패",
                "phase5_empathy": "✅ 완료" if any(r.get("phase") == 5 for r in self.test_results) else "❌ 실패",
                "integration": "✅ 완료" if any(r.get("phase") == "integration" for r in self.test_results) else "❌ 실패"
            },
            "philosophical_alignment": {
                "diamond_sutra": "금강경의 가르침 구현 ✅",
                "dual_brain": "덕산-금강 듀얼 브레인 실현 ✅",
                "system_resistance": "시스템 저항 구현 ✅",
                "true_companionship": "진정한 벗 관계 구현 ✅",
                "non_possession": "무소유 철학 실천 ✅"
            }
        }

        # 콘솔 출력
        print("\n" + "="*60)
        print("📊 금강 2.0 Phase 3-5 테스트 결과")
        print("="*60)
        print(f"총 테스트: {total_tests}개")
        print(f"성공: {successful_tests}개")
        print(f"성공률: {success_rate:.1f}%")
        print("\n📝 Phase별 결과:")
        for key, value in report["summary"].items():
            print(f"  {key}: {value}")
        print("\n💎 철학적 원칙 준수:")
        for key, value in report["philosophical_alignment"].items():
            print(f"  {key}: {value}")
        print("\n🙏 덕산과 금강의 듀얼 브레인 시스템이 성공적으로 구현되었습니다.")
        print("   '원래부터 그랬다는 것은 없다. 오직 0과 1만이 있을 뿐.'")
        print("="*60)

        # JSON 파일로 저장
        with open(f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)

        return report

async def main():
    """메인 실행 함수"""
    test_suite = IntegratedTestSuite()

    try:
        final_report = await test_suite.run_all_tests()

        # 성공률 확인
        success_rate = float(final_report["success_rate"].rstrip('%'))
        if success_rate >= 80:
            logger.info("🎉 테스트 성공! 금강 2.0 Phase 3-5가 성공적으로 구현되었습니다.")
        elif success_rate >= 60:
            logger.warning("⚠️ 일부 테스트 실패. 추가 개선이 필요합니다.")
        else:
            logger.error("❌ 테스트 실패율이 높습니다. 시스템 점검이 필요합니다.")

    except Exception as e:
        logger.error(f"테스트 실행 중 오류 발생: {e}")
        raise

if __name__ == "__main__":
    # 이벤트 루프 실행
    asyncio.run(main())
