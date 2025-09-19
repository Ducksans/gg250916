/**
 * title: CoreThemes (핵심 테마 섹션)
 * purpose: 신뢰/권리/의사결정/추천/프로서비스/자동화의 6개 핵심 테마를 소개합니다.
 * created: 2025-09-18T16:37:00Z (2025-09-19T01:37:00+09:00 KST)
 * last_modified: 2025-09-18T16:37:00Z (2025-09-19T01:37:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, FileText, Calculator, TrendingUp, Users, Cog } from 'lucide-react';

const CoreThemes: React.FC = () => {
  const themes = [
    {
      icon: Shield,
      title: '신뢰/검증 인프라',
      description: '실매물 인증, 허위 신고·보상, KYC, 응답 속도 SLA로 허위·사기 리스크를 최소화합니다.',
      badges: ['실매물 인증', '허위 신고', 'SLA 보드'],
      color: 'blue'
    },
    {
      icon: FileText,
      title: '권리·계약 지원',
      description: '문서팩, 계약 체크리스트, 전자계약 가이드, 보증 연계 등으로 안심 거래를 돕습니다.',
      badges: ['전세보증', '확정일자', '전자계약'],
      color: 'green'
    },
    {
      icon: Calculator,
      title: '의사결정 도구',
      description: '실거래·시세·세금 계산, 회수 시뮬레이터, KPI 기반 보상으로 투자·임대 판단을 지원합니다.',
      badges: ['세금 계산', 'DSR 분석', '회수 시뮬레이터'],
      color: 'purple'
    },
    {
      icon: TrendingUp,
      title: '추천·성장 엔진',
      description: 'AVM, 개인화 추천, 승리 카드 공유, 추천 가시성 부스트로 전환과 확산을 촉진합니다.',
      badges: ['AVM', '추천 피드', '승리 카드'],
      color: 'orange'
    },
    {
      icon: Users,
      title: '중개사 프로 서비스',
      description: 'CRM, 리드 파이프라인, 팀 좌석 관리, 추천/어필 SDK 등 B2B 반복 가치를 강화합니다.',
      badges: ['CRM', '팀 좌석', 'Earn-to-Own'],
      color: 'red'
    },
    {
      icon: Cog,
      title: '자동화 파이프라인',
      description: '브리프→초안→게시→관찰→개선 루프를 SSOT/Dataview/UTM 규약으로 운영합니다.',
      badges: ['SSOT', 'Dataview', 'UTM 규약'],
      color: 'gray'
    }
  ];

  return (
    <section id="summary" className="py-20 md:py-32 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
            핵심 테마
          </div>
          
          <h2 className="section-title text-center">
            핵심 테마
          </h2>
          
          <p className="section-subtitle text-center max-w-3xl mx-auto">
            신뢰 · 권리 리스크 · 의사결정 · 추천 · 중개사 도구의 5가지 핵심 영역으로
            부동산 거래의 모든 단계를 지원합니다.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {themes.map((theme, index) => {
            const IconComponent = theme.icon;
            
            return (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group card hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-${theme.color}-500 to-${theme.color}-600 text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-brand-700 transition-colors">
                  {theme.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed mb-6">
                  {theme.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {theme.badges.map((badge, badgeIndex) => (
                    <span
                      key={badgeIndex}
                      className={`badge bg-${theme.color}-100 text-${theme.color}-800`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              통합 솔루션으로 완성되는 부동산 생태계
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              각 테마가 유기적으로 연결되어 신뢰할 수 있고 효율적인 
              부동산 거래 환경을 만들어갑니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#ia" className="btn btn-primary px-8 py-3">
                정보구조 살펴보기
              </a>
              <a href="#phases" className="btn btn-secondary px-8 py-3">
                개발 로드맵 확인
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CoreThemes;
