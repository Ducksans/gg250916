/**
 * title: PricingSection (가격 섹션)
 * purpose: 가격 플랜 카드와 전환 메시지(CTA)를 제공합니다.
 * created: 2025-09-18T16:36:00Z (2025-09-19T01:36:00+09:00 KST)
 * last_modified: 2025-09-18T16:36:00Z (2025-09-19T01:36:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Building } from 'lucide-react';

const PricingSection: React.FC = () => {
  const plans = [
    {
      name: 'Free Head',
      badge: '무료 시작',
      price: '0원',
      period: '월 10건까지',
      description: '부동산 중개업 디지털 전환의 첫걸음을 무료로 시작하세요',
      icon: Star,
      features: [
        '정식 매물 페이지 & Canonical 저장',
        '웹 카드·롱폼·쇼츠 대본 자동 생성',
        '블로그/SNS 임베드 & 카카오 상담톡 배포',
        '기본 리드 박스 + 5분 응답 알림',
        '표준 템플릿 라이브러리 이용',
        '커뮤니티 지원'
      ],
      cta: '무료로 시작하기',
      popular: false,
      gradient: 'from-gray-500 to-gray-600'
    },
    {
      name: 'Pro',
      badge: '가장 인기',
      price: '99,000원',
      period: '월',
      description: '성장하는 중개사를 위한 완전한 자동화 솔루션',
      icon: Zap,
      features: [
        '무제한 매물 & 팀 좌석 권한 관리',
        '050/DNI 콜트래킹 & 자동 라우팅',
        '쇼츠·썸네일 변주 무제한 + API 업로드',
        '응답 속도·리드 KPI 대시보드',
        '고급 템플릿 & 커스터마이징',
        '우선 기술 지원 & 컨설팅',
        'A/B 테스트 & 성과 분석',
        '브랜딩 커스터마이징'
      ],
      cta: 'Pro로 업그레이드',
      popular: true,
      gradient: 'from-brand-500 to-brand-600'
    },
    {
      name: 'Office',
      badge: '기업용',
      price: '299,000원',
      period: '월',
      description: '대형 중개업소와 가맹 본부를 위한 엔터프라이즈 솔루션',
      icon: Building,
      features: [
        '지점별 리드 라우팅 규칙 & SLA',
        '전용 API & 브랜드 프로모션 슬롯',
        'Programmatic 지역/단지 위젯 커스터마이즈',
        '전사 KPI 리포트 & 품질 모니터링',
        '화이트라벨 솔루션',
        '전담 계정 매니저',
        '맞춤형 개발 & 통합 지원',
        'SLA 보장 & 24/7 지원'
      ],
      cta: '상담 문의하기',
      popular: false,
      gradient: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <section id="monetization" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
            가격 구조
          </div>
          
          <h2 className="section-title text-center">
            가격 &amp; 전환 구조
          </h2>
          
          <p className="section-subtitle text-center max-w-3xl mx-auto">
            무료 헤드에서 구독까지 자연스러운 여정으로 
            성공을 경험한 후 확장하는 합리적인 가격 체계입니다.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className={`relative bg-white rounded-2xl border-2 p-8 ${
                  plan.popular 
                    ? 'border-brand-500 shadow-2xl scale-105' 
                    : 'border-gray-200 shadow-lg hover:shadow-xl'
                } transition-all duration-300 hover:-translate-y-1`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${plan.gradient} text-white mb-4`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  
                  {!plan.popular && (
                    <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium mb-4">
                      {plan.badge}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">/ {plan.period}</span>
                  </div>
                  
                  <p className="text-gray-600 leading-relaxed">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center mt-0.5 mr-3`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-700 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-brand-50 to-primary-50 rounded-2xl p-8 md:p-12 border border-brand-100 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              성공하는 리드가 곧 업그레이드 트리거
            </h3>
            
            <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
              무료 구간에서 실거래 리드를 확보하면 자동으로 추천되는 Pro 체험과 
              초대 리워드가 재사용 루프를 만듭니다. 성공을 경험한 후 자연스럽게 
              확장하는 것이 우리의 철학입니다.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600 mb-2">무료 체험</div>
                <div className="text-gray-600">리스크 없는 시작</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600 mb-2">성과 확인</div>
                <div className="text-gray-600">실제 리드 발생</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-2">자연 전환</div>
                <div className="text-gray-600">가치 기반 업그레이드</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
