import React from 'react';
import { motion } from 'framer-motion';

/*
 Title: Milestones component
 Purpose: Timeline/phase roadmap display (Phase 0 → MVP → V1 → V2) for product plans.
 Created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Last-Modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Maintainer: Team GG
*/

const Milestones: React.FC = () => {
  const phases = [
    {
      phase: 'PHASE 0',
      duration: '1-2주',
      title: '기반 정렬 & 데이터 시드',
      items: [
        'Topics 허브에 부동산 섹션 생성, SSOT/Dataview 고정 카드',
        '공공 중개업소 데이터 적재·검증, KPI 기본 지표 연결',
        '브리프 템플릿, canonical/UTM 규약, 체크포인트 루프 실행'
      ]
    },
    {
      phase: 'MVP',
      duration: '0-3개월',
      title: '최초 유저 가치',
      items: [
        '지도 검색, 매물 상세, 문의/콜마스킹, 허위 신고 루틴',
        '브리프→초안→오리진 게시→채널 배포 자동화',
        '실적 보드·KPI 카드, 중개사 온보딩 & 팀 좌석'
      ]
    },
    {
      phase: 'V1',
      duration: '3-6개월',
      title: '신뢰 & 운영 강화',
      items: [
        '방문 예약, 실매물 인증, 사진 품질 파이프라인',
        '추천/AVM, 전자계약 가이드, 승인 게이트 & 격리 운영',
        'AB 테스트 루프, 템플릿 라이브러리, KPI 공개'
      ]
    },
    {
      phase: 'V2',
      duration: '6-12개월',
      title: '데이터 & 제휴 확장',
      items: [
        '권리 리스크 알림, 3D 투어 네트워크, 공동 중개 매칭',
        '안전 결제/에스크로, 모기지·보증 제휴, 리포트 상용화',
        '개인화 추천, 리턴 타게팅 자동화, 월간 성과 리포트'
      ]
    }
  ];

  return (
    <section id="phases" className="py-20 md:py-32 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-center">
            제품 마일스톤 <span className="text-brand-600">Phase 0 → MVP → V1 → V2</span>
          </h2>
        </motion.div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-200 via-brand-400 to-brand-200"></div>

          <div className="space-y-12">
            {phases.map((phase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="relative"
              >
                {/* Timeline Dot */}
                <div className="hidden md:block absolute left-6 w-4 h-4 bg-brand-500 rounded-full border-4 border-white shadow-lg"></div>

                {/* Content */}
                <div className="md:ml-20 card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div className="flex items-center space-x-3 mb-2 md:mb-0">
                      <span className="inline-block px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-sm font-semibold">
                        {phase.phase}
                      </span>
                      <span className="text-gray-500 font-medium">{phase.duration}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{phase.title}</h3>
                  
                  <ul className="space-y-3">
                    {phase.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start">
                        <div className="w-2 h-2 bg-brand-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Milestones;
