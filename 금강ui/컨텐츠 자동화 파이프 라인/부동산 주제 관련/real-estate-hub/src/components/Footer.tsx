import React from 'react';
import { motion } from 'framer-motion';

/*
 Title: Footer component
 Purpose: Site footer with branding, canonical links, policy links, and copyright.
 Created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Last-Modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Maintainer: Team GG
*/

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          {/* Brand */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-brand-500 text-white rounded-lg flex items-center justify-center font-bold text-lg">
              GG
            </div>
            <span className="text-2xl font-bold">금강 Real Estate</span>
          </div>

          {/* Description */}
          <p className="text-gray-300 max-w-2xl mx-auto leading-relaxed">
            기획 근거: 저장소 내 부동산 전략 대화 &amp; 설계 문서 전수 분석 요약.
          </p>

          {/* Links */}
          <div className="space-y-4">
            <p className="text-gray-300">
              문서 · SSOT 링크:{' '}
              <a 
                href="../status/reports/REAL_ESTATE_HUB_MILESTONES.md" 
                className="text-brand-400 hover:text-brand-300 transition-colors underline"
              >
                REAL_ESTATE_HUB_MILESTONES
              </a>
            </p>

            <p className="text-sm text-gray-400 max-w-4xl mx-auto leading-relaxed">
              샘플 고지: Canonical은 허브 원본 URL을 기준으로 하며, 배포 링크에는 표준화된
              UTM 파라미터(utm_source/utm_medium/utm_campaign/utm_content)가 적용됩니다. 
              외부 인용 시 출처/라이선스를 표시합니다.
            </p>
          </div>

          {/* Policy Links */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 border-t border-gray-700">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              이용약관
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              개인정보처리방침
            </a>
            <a href="../docs/COMPLIANCE_CHECKLIST.md" className="text-gray-400 hover:text-white transition-colors">
              컴플라이언스 체크리스트
            </a>
            <a href="../docs/STANDARDS_MARKET_BASELINE.md" className="text-gray-400 hover:text-white transition-colors">
              Market-Defining Standards
            </a>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              © 2024 금강 Real Estate Hub. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
