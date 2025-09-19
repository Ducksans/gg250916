/**
 * title: AutomationPipeline (자동화 파이프라인 섹션)
 * purpose: 생성→게시→관찰→개선 루프의 단계를 요약합니다.
 * created: 2025-09-18T16:39:00Z (2025-09-19T01:39:00+09:00 KST)
 * last_modified: 2025-09-18T16:39:00Z (2025-09-19T01:39:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, Eye } from 'lucide-react';

const AutomationPipeline: React.FC = () => {
  const pipelineSteps = [
    {
      icon: Search,
      title: '생성(Research → Draft)',
      description: '통합 검색으로 자료를 모으고 7개 고정 항목(시장·규제·신뢰·도구·수익화·데이터 소스·다음 행동) 브리프를 작성합니다.',
      color: 'blue'
    },
    {
      icon: FileText,
      title: '게시(Origin First)',
      description: '캐노니컬 페이지에 선게시 후 채널별 UTM 규약으로 배포하며, 모든 변경은 체크포인트 JSONL로 기록합니다.',
      color: 'green'
    },
    {
      icon: Eye,
      title: '관찰 & 개선',
      description: 'Dataview 카드로 KPI·최근 변경 Top-N을 자동 노출하고, AB 테스트와 템플릿 승격으로 성과를 재사용합니다.',
      color: 'purple'
    }
  ];

  return (
    <section id="pipeline" className="py-20 md:py-32 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-center">
            자동화 파이프라인 <span className="text-brand-600">생성 → 게시 → 관찰 → 개선</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {pipelineSteps.map((step, index) => {
            const IconComponent = step.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="card"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-${step.color}-500 to-${step.color}-600 text-white mb-6`}>
                  <IconComponent className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AutomationPipeline;
