/**
 * title: InformationArchitecture (정보 구조 섹션)
 * purpose: Pillar-Cluster 매핑과 핵심 인터랙션을 요약합니다.
 * created: 2025-09-18T16:38:00Z (2025-09-19T01:38:00+09:00 KST)
 * last_modified: 2025-09-18T16:38:00Z (2025-09-19T01:38:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';

const InformationArchitecture: React.FC = () => {
  return (
    <section id="ia" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-center">
            정보 구조(IA) <span className="text-brand-600">Pillar - Cluster 매핑</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="card"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Pillars</h3>
            <ul className="space-y-3 text-gray-700">
              <li>• 신뢰 · 검증 인프라</li>
              <li>• 거래 안전 &amp; 권리 리스크</li>
              <li>• 의사결정 &amp; 분석 도구</li>
              <li>• 추천 · AVM · 성장 엔진</li>
              <li>• 중개사 프로툴 &amp; CRM</li>
              <li>• 촬영 · 품질 운영</li>
              <li>• 수익화 · 제휴</li>
              <li>• 시장 · 정책 인사이트</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">대표 Cluster</h3>
            <ul className="space-y-3 text-gray-700">
              <li>• 허위 신고 프로세스 · 검증단 매뉴얼</li>
              <li>• 계약 체크리스트 · 전자계약 Q&amp;A</li>
              <li>• 실거래/시세/세금 계산기 패널</li>
              <li>• 추천 랭크 · 승리 카드 보드</li>
              <li>• 중개사 온보딩 · 팀 KPI 대시보드</li>
              <li>• 촬영 가이드 · 품질 점수 룰</li>
              <li>• 리드 과금 · 제휴 마켓플레이스</li>
              <li>• 지역/청약/정책 리포트</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="card"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">핵심 인터랙션</h3>
            <ul className="space-y-3 text-gray-700">
              <li>• 탐색 허브 → Pillar별 콘텐츠 랜딩</li>
              <li>• 신뢰 센터 → 검증 뱃지, 신고 흐름</li>
              <li>• 거래 도구 → 계산기/시뮬레이터</li>
              <li>• 프로 서비스 → CRM &amp; 팀 보드</li>
              <li>• 콘텐츠 라운지 → 자동화 파이프라인</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InformationArchitecture;
