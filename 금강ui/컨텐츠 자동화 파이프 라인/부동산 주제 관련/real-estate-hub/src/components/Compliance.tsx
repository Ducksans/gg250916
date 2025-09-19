/**
 * title: Compliance (컴플라이언스 섹션)
 * purpose: 법/정책/개인정보 등 신뢰·준수 영역을 요약합니다.
 * created: 2025-09-18T16:40:00Z (2025-09-19T01:40:00+09:00 KST)
 * last_modified: 2025-09-18T16:40:00Z (2025-09-19T01:40:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileCheck, Lock } from 'lucide-react';

const Compliance: React.FC = () => {
  const complianceAreas = [
    {
      icon: Shield,
      title: '법·정책 가드',
      description: 'robots.txt/약관 준수, 증거 스냅샷(append-only), 출처·라이선스 자동 표기.',
      color: 'blue'
    },
    {
      icon: FileCheck,
      title: '표시·광고(국토부 고시)',
      description: '업로드 단계 필수 항목·단위 검증으로 위반 차단. 소재지/면적/등록번호 등.',
      color: 'green'
    },
    {
      icon: Lock,
      title: '개인정보/민감정보',
      description: '마스킹·최소 수집 원칙. 안심번호(050)·DNI로 연락처 노출 최소화.',
      color: 'purple'
    }
  ];

  return (
    <section id="compliance" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-center">
            신뢰 &amp; 컴플라이언스
          </h2>
          <p className="section-subtitle text-center max-w-3xl mx-auto">
            robots/약관 준수 · 출처/라이선스 표기 · 개인정보 보호
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {complianceAreas.map((area, index) => {
            const IconComponent = area.icon;
            
            return (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="card"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-${area.color}-500 to-${area.color}-600 text-white mb-6`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">{area.title}</h3>
                <p className="text-gray-600 leading-relaxed">{area.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Compliance;
