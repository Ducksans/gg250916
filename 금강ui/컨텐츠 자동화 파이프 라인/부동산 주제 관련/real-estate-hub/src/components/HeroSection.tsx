/**
 * title: HeroSection (히어로 섹션)
 * purpose: 랜딩 상단의 핵심 메시지/CTA/핵심 피처 카드를 제공합니다.
 * created: 2025-09-18T16:31:00Z (2025-09-19T01:31:00+09:00 KST)
 * last_modified: 2025-09-18T16:31:00Z (2025-09-19T01:31:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-primary-50 opacity-50" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      
      <div className="relative container py-12 md:py-16">
        <div className="text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-brand-100 to-primary-100 text-brand-800 rounded-full text-xs md:text-sm font-semibold mb-6 shadow-sm">
              <span className="w-2 h-2 bg-brand-500 rounded-full mr-3 animate-pulse" />
              Real Estate Hub · Automation Loop
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              부동산 컨텐츠 허브 &amp;{' '}
              <span className="bg-gradient-to-r from-brand-600 to-primary-600 bg-clip-text text-transparent">
                모바일 앱
              </span>{' '}
              전체 구조
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              강력한 생성형 콘텐츠 엔진을 기반으로 입력 1회를 멀티채널 매물 광고로
              확장하고, 허브·중개사 채널·소비자 리드가 순환하는{' '}
              <span className="font-semibold text-brand-700">성장 루프</span>를 구축합니다.
            </p>
          </motion.div>

          {/* Key Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid md:grid-cols-3 gap-6 mb-10"
          >
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">콘텐츠 엔진</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                사진·영상·폼 입력만으로 웹카드·롱폼·쇼츠 대본을 자동 제작
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="tag text-xs">RealEstateListing JSON-LD</span>
                <span className="tag text-xs">OG 카드</span>
              </div>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-12 h-12 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">무료 헤드</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                월 10건까지 Canonical 매물 페이지와 배포 자동화를 무상 제공
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="tag text-xs">Free 10</span>
                <span className="tag text-xs">Pro/Office</span>
              </div>
            </div>
            
            <div className="group bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">리드 → 유료 전환</h3>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                실제 소비자 리드 확보 시 Pro/Office 구독으로 자연 전환
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="tag text-xs">5분 규칙</span>
                <span className="tag text-xs">UTM/GA4</span>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
          <a 
            href="#value-proposition" 
              className="group btn btn-primary px-6 py-3 text-base md:text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <span>가치 제안 살펴보기</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
            
            <a 
              href="#phases" 
              className="btn btn-secondary px-6 py-3 text-base md:text-lg font-semibold hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
            >
              마일스톤 타임라인
            </a>
            
            <a 
              href="#apps" 
              className="btn btn-ghost px-6 py-3 text-base md:text-lg font-semibold hover:bg-white/80 transition-all duration-300"
            >
              모바일 앱 기능
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-12 border-t border-gray-200"
          >
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-brand-600 mb-1">1회</div>
              <div className="text-gray-600 text-sm md:text-base font-medium">입력으로 멀티채널 배포</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-success-600 mb-1">10건</div>
              <div className="text-gray-600 text-sm md:text-base font-medium">월 무료 매물 등록</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">5분</div>
              <div className="text-gray-600 text-sm md:text-base font-medium">리드 응답 SLA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-warning-600 mb-1">∞</div>
              <div className="text-gray-600 text-sm md:text-base font-medium">성장 루프 확장</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-brand-200 rounded-full opacity-20 animate-bounce-subtle" />
      <div className="absolute top-40 right-20 w-12 h-12 bg-primary-200 rounded-full opacity-20 animate-bounce-subtle animation-delay-200" />
      <div className="absolute bottom-20 left-20 w-10 h-10 bg-success-200 rounded-full opacity-20 animate-bounce-subtle animation-delay-400" />
    </section>
  );
};

export default HeroSection;
