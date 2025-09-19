/**
 * title: AutomationFlow (자동화 플로우)
 * purpose: 입력→생성→허브저장→배포→리드의 5단계 자동화 과정을 시각화합니다.
 * created: 2025-09-18T16:34:00Z (2025-09-19T01:34:00+09:00 KST)
 * last_modified: 2025-09-18T16:34:00Z (2025-09-19T01:34:00+09:00 KST)
 * maintainer: Team GG
 */

import { motion } from 'framer-motion';
import { Upload, Cpu, Database, Share, Users } from 'lucide-react';

const AutomationFlow: React.FC = () => {
  const flowSteps = [
    {
      step: '1',
      icon: Upload,
      title: '매물 입력',
      description: '주소·면적·가격과 사진/영상, 사전 정의된 폼 항목을 한 번에 등록해 품질과 규정 준수 조건을 갖춥니다.',
      features: [
        '국토부 고시 2020-595 체크리스트',
        'EXIF/워터마크 자동 검증'
      ],
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      step: '2',
      icon: Cpu,
      title: '생성 엔진',
      description: '매물 캔버스가 웹 카드, 롱폼 포스트, 쇼츠 스크립트로 전환되어 즉시 검토 가능한 원본이 만들어집니다.',
      features: [
        'AI 요약 & CTA 추천',
        '썸네일·컷시트 자동 제작'
      ],
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      step: '3',
      icon: Database,
      title: '허브 저장',
      description: 'Canonical 매물 페이지를 허브에 저장하고 Programmatic 지역/단지 페이지와 내부 링크를 형성합니다.',
      features: [
        'JSON-LD RealEstateListing',
        '동적 Sitemap & SEO 최적화'
      ],
      color: 'green',
      gradient: 'from-green-500 to-green-600'
    },
    {
      step: '4',
      icon: Share,
      title: '배포 & 임베드',
      description: '블로그·SNS·카카오 채널에 원클릭 배포하거나 공식 로그인·API로 중개사 계정에 직접 게시합니다.',
      features: [
        'oEmbed 카드 & OG 미리보기',
        '카카오 채널 상담톡 자동 연결'
      ],
      color: 'orange',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      step: '5',
      icon: Users,
      title: '리드 & 전환',
      description: '상담톡·050 콜·웹 폼 리드를 트래킹하고, 성과가 검증된 중개사는 유료 플랜으로 전환해 성장을 가속합니다.',
      features: [
        '5분 응답 알림 & SLA 대시보드',
        'Free → Pro/Office 업그레이드'
      ],
      color: 'red',
      gradient: 'from-red-500 to-red-600'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8
      }
    }
  };

  return (
    <section id="automation" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
            자동화 플로우
          </div>
          
          <h2 className="section-title text-center">
            콘텐츠 생성 · 배포 플로우
          </h2>
          
          <p className="section-subtitle text-center max-w-3xl mx-auto">
            허브와 중개사 채널을 잇는 5단계 자동화로 
            매물 등록부터 리드 전환까지 완전 자동화된 워크플로우를 제공합니다.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative"
        >
          {/* Flow Steps */}
          <div className="space-y-12 md:space-y-16">
            {flowSteps.map((step, index) => {
              const IconComponent = step.icon;
              const isEven = index % 2 === 0;
              
              return (
                <motion.div
                  key={index}
                  variants={stepVariants}
                  className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-16`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${step.gradient} text-white font-bold text-lg mb-6 shadow-lg`}>
                      {step.step}
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                      {step.title}
                    </h3>
                    
                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                      {step.description}
                    </p>

                    <ul className="space-y-3">
                      {step.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center text-gray-700">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.gradient} mr-3 flex-shrink-0`} />
                          <span className="font-medium">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Visual */}
                  <div className="flex-1 flex justify-center">
                    <div className="relative">
                      {/* Main Circle */}
                      <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-2xl`}>
                        <IconComponent className="w-20 h-20 md:w-24 md:h-24 text-white" />
                      </div>
                      
                      {/* Floating Elements */}
                      <div className={`absolute -top-4 -right-4 w-8 h-8 rounded-full bg-gradient-to-r ${step.gradient} opacity-60 animate-bounce-subtle`} />
                      <div className={`absolute -bottom-6 -left-6 w-6 h-6 rounded-full bg-gradient-to-r ${step.gradient} opacity-40 animate-bounce-subtle animation-delay-200`} />
                      <div className={`absolute top-1/2 -right-8 w-4 h-4 rounded-full bg-gradient-to-r ${step.gradient} opacity-30 animate-bounce-subtle animation-delay-400`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Connection Lines */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent transform -translate-x-1/2" />
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-gray-200"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              자동화 성과 지표
            </h3>
            <p className="text-gray-600">
              완전 자동화된 플로우로 달성 가능한 핵심 성과 지표들
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-gray-600 font-medium">작업 시간 단축</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">10x</div>
              <div className="text-gray-600 font-medium">콘텐츠 생산량 증가</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">5분</div>
              <div className="text-gray-600 font-medium">리드 응답 시간</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-2">3배</div>
              <div className="text-gray-600 font-medium">전환율 향상</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AutomationFlow;
