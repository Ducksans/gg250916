/**
 * title: ValueProposition (가치 제안 섹션)
 * purpose: 핵심 가치 제안 카드 그리드와 CTA를 제공합니다.
 * created: 2025-09-18T16:33:00Z (2025-09-19T01:33:00+09:00 KST)
 * last_modified: 2025-09-18T16:33:00Z (2025-09-19T01:33:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Share2, Target, TrendingUp } from 'lucide-react';

const ValueProposition: React.FC = () => {
  const valueCards = [
    {
      icon: Zap,
      title: '콘텐츠 생성 엔진',
      description: '매물 기본 정보와 멀티미디어를 업로드하면 표준화된 매물 캔버스, 웹 카드, 롱폼 포스트, 쇼츠 대본과 썸네일까지 자동으로 만들어집니다.',
      tags: ['RealEstateListing JSON-LD', 'OG 카드'],
      gradient: 'from-blue-500 to-purple-600',
      bgGradient: 'from-blue-50 to-purple-50'
    },
    {
      icon: Share2,
      title: '전 채널 배포 대행',
      description: '허브에 저장된 Canonical 페이지를 중심으로 중개사 블로그·SNS에 oEmbed/OG 카드, API 기반 자동 게시, 상담톡 연동 자료를 제공합니다.',
      tags: ['oEmbed', 'SNS 쇼츠'],
      gradient: 'from-green-500 to-teal-600',
      bgGradient: 'from-green-50 to-teal-50'
    },
    {
      icon: Target,
      title: '리드 속도 & 추적',
      description: '카카오 상담톡, 050 안심번호(DNI), 웹 폼 리드를 통합 저장하고 5분 응답 SLA 알림으로 전환 효율을 극대화합니다.',
      tags: ['5분 규칙', 'UTM/GA4'],
      gradient: 'from-orange-500 to-red-600',
      bgGradient: 'from-orange-50 to-red-50'
    },
    {
      icon: TrendingUp,
      title: '무료 헤드 → 유료 전환',
      description: '월 10건 무료 제공으로 진입 장벽을 낮추고, 리드로 금전적 성공을 확인한 중개사는 Pro/Office 요금제로 확장합니다.',
      tags: ['Free 10', 'Pro/Office'],
      gradient: 'from-purple-500 to-pink-600',
      bgGradient: 'from-purple-50 to-pink-50'
    }
  ];


  return (
    <section id="value-proposition" className="py-20 md:py-32 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-brand-100 text-brand-800 rounded-full text-sm font-medium mb-6">
            핵심 가치 제안
          </div>
          
          <h2 className="section-title text-center">
            콘텐츠 허브 핵심 가치 제안
          </h2>
          
          <p className="section-subtitle text-center max-w-3xl mx-auto">
            입력 1회 → 자동 생성 → 배포 → 리드 → 수익화의 완전한 자동화 파이프라인으로
            부동산 중개업의 디지털 전환을 이끕니다.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
          {valueCards.map((card, index) => {
            const IconComponent = card.icon;
            
            return (
              <motion.article
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.bgGradient} p-8 border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-xl hover:-translate-y-2`}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }} />
                </div>

                <div className="relative">
                  {/* Icon */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${card.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <IconComponent className="w-8 h-8" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-brand-700 transition-colors">
                    {card.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed mb-6 text-lg">
                    {card.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/80 text-gray-700 border border-gray-200 group-hover:bg-white group-hover:shadow-sm transition-all"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Hover Effect Arrow */}
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
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
          <div className="bg-gradient-to-r from-brand-50 to-primary-50 rounded-2xl p-8 md:p-12 border border-brand-100">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              지금 바로 시작해보세요
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              월 10건 무료로 콘텐츠 자동화의 힘을 경험하고, 
              실제 리드가 발생하면 자연스럽게 Pro 플랜으로 업그레이드하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#automation" className="btn btn-primary px-8 py-3 text-lg">
                자동화 플로우 보기
              </a>
              <a href="#monetization" className="btn btn-secondary px-8 py-3 text-lg">
                가격 구조 확인
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ValueProposition;
