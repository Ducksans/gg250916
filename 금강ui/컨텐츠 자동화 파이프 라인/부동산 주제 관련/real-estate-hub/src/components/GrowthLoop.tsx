/**
 * title: GrowthLoop (성장 루프 섹션)
 * purpose: 허브↔중개사↔소비자↔검색의 순환 구조와 효과를 시각화합니다.
 * created: 2025-09-18T16:35:00Z (2025-09-19T01:35:00+09:00 KST)
 * last_modified: 2025-09-18T16:35:00Z (2025-09-19T01:35:00+09:00 KST)
 * maintainer: Team GG
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Target, Search, TrendingUp } from 'lucide-react';

const GrowthLoop: React.FC = () => {
  const loopNodes = [
    {
      id: 'hub',
      icon: Building2,
      title: '부동산 콘텐츠 허브',
      description: 'Canonical 매물 원본을 저장하고 Programmatic 지역·단지 페이지를 운영해 검색 신뢰도를 높입니다.',
      tags: ['Canonical', 'Programmatic SEO'],
      position: { x: 50, y: 20 },
      color: 'blue'
    },
    {
      id: 'agents',
      icon: Users,
      title: '중개사 채널',
      description: '개인 블로그·SNS·카카오 채널에 임베드 카드와 쇼츠를 배포해 브랜드 존재감을 확장합니다.',
      tags: ['허브 URL ↔ 임베드 카드'],
      position: { x: 80, y: 50 },
      color: 'green'
    },
    {
      id: 'consumers',
      icon: Target,
      title: '소비자 리드',
      description: '상담톡·050 콜트래킹·폼 리드가 5분 응답 규칙으로 연결되어 상담 성공률을 높이고 리뷰/뱃지를 생성합니다.',
      tags: ['응답 데이터 ↔ 신뢰 신호'],
      position: { x: 50, y: 80 },
      color: 'purple'
    },
    {
      id: 'seo',
      title: '검색 & 유입',
      icon: Search,
      description: '지역/단지/유형별 PSEO 페이지와 구조화 데이터가 외부 유입을 촉진하고 허브-중개사 링크 그래프를 강화합니다.',
      tags: ['UGC ↔ 지표 페이지'],
      position: { x: 20, y: 50 },
      color: 'orange'
    },
    {
      id: 'loyalty',
      icon: TrendingUp,
      title: '수익화 & 신뢰',
      description: '리드 실적 기반 Pro/Office 전환과 응답속도/검증률 뱃지로 재사용과 추천을 촉진합니다.',
      tags: ['Free 10 → 구독'],
      position: { x: 50, y: 50 },
      color: 'red'
    }
  ];

  return (
    <section id="growth-loop" className="py-20 md:py-32 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-6">
            성장 루프
          </div>
          
          <h2 className="section-title text-center">
            허브 ↔ 중개사 양방향 성장 루프
          </h2>
          
          <p className="section-subtitle text-center max-w-3xl mx-auto">
            콘텐츠-트래픽-리드 선순환 구조로 지속 가능한 성장 동력을 확보하고
            모든 참여자가 함께 성장하는 생태계를 구축합니다.
          </p>
        </motion.div>

        {/* Loop Visualization */}
        <div className="relative max-w-6xl mx-auto mb-16">
          {/* Desktop Layout */}
          <div className="hidden md:block relative h-96">
            {loopNodes.map((node, index) => {
              const IconComponent = node.icon;
              
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${node.position.x}%`,
                    top: `${node.position.y}%`
                  }}
                >
                  <div className="group relative">
                    {/* Node Circle */}
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-${node.color}-500 to-${node.color}-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 cursor-pointer`}>
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="bg-white rounded-lg shadow-xl p-4 w-64 border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">{node.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{node.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {node.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="tag text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                        refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
              
              {/* Circular flow arrows */}
              <motion.path
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, delay: 1 }}
                d="M 300 80 Q 480 80 480 200 Q 480 320 300 320 Q 120 320 120 200 Q 120 80 300 80"
                stroke="#6b7280"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5,5"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-8">
            {loopNodes.map((node, index) => {
              const IconComponent = node.icon;
              
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="card"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-${node.color}-500 to-${node.color}-600 flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{node.title}</h3>
                      <p className="text-gray-600 mb-3">{node.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {node.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Key Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-8 md:p-12 border border-gray-200"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              성장 루프의 핵심 효과
            </h3>
            <p className="text-gray-600">
              각 단계가 서로를 강화하며 지속적인 성장 동력을 만들어냅니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">복합 성장</h4>
              <p className="text-gray-600">허브 트래픽과 중개사 채널이 상호 증폭하여 기하급수적 성장</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">품질 향상</h4>
              <p className="text-gray-600">리드 데이터가 콘텐츠 품질과 타겟팅 정확도를 지속 개선</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">생태계 확장</h4>
              <p className="text-gray-600">성공한 중개사가 새로운 참여자를 유치하는 자연스러운 확산</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GrowthLoop;
