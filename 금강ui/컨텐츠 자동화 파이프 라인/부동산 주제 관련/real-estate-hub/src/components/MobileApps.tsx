import React from 'react';
import { motion } from 'framer-motion';

/*
 Title: MobileApps component
 Purpose: Table of mobile micro features with deeplinks, web routes, push topics, and events.
 Created: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Last-Modified: 2025-09-18T17:31:36Z (2025-09-19 02:31 KST)
 Maintainer: Team GG
*/

const MobileApps: React.FC = () => {
  const appFeatures = [
    {
      feature: '취득세 계산기',
      deeplink: 'gumgang://calc/acq-tax',
      webRoute: '/tools/acq-tax',
      pushTopic: 'calc_acq',
      events: 'view · simulate · share'
    },
    {
      feature: '전월세 전환 계산',
      deeplink: 'gumgang://calc/rent-convert',
      webRoute: '/tools/rent-convert',
      pushTopic: 'calc_rent',
      events: 'view · convert · save'
    },
    {
      feature: '예약 & 투어 관리',
      deeplink: 'gumgang://booking/schedule',
      webRoute: '/bookings',
      pushTopic: 'tour_booking',
      events: 'slot_select · confirm · reminder'
    },
    {
      feature: '허위 신고 & 보상',
      deeplink: 'gumgang://safety/report',
      webRoute: '/trust/report',
      pushTopic: 'safety_alert',
      events: 'report_start · submit · follow_up'
    },
    {
      feature: '중개사 KPI 보드',
      deeplink: 'gumgang://pro/kpi',
      webRoute: '/pro/kpi',
      pushTopic: 'kpi_digest',
      events: 'dashboard_view · export · share'
    },
    {
      feature: '권리 리스크 알림',
      deeplink: 'gumgang://alert/title-risk',
      webRoute: '/safety/title-risk',
      pushTopic: 'risk_watch',
      events: 'alert_view · subscribe · escalate'
    }
  ];

  return (
    <section id="apps" className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-center">
            모바일 앱 마이크로 기능 <span className="text-brand-600">핵심 계산기 · 체크리스트 · 알림</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto"
        >
          <table className="w-full bg-white rounded-xl shadow-lg border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">기능</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Deeplink</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Web Route</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Push Topic</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">주요 이벤트</th>
              </tr>
            </thead>
            <tbody>
              {appFeatures.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900">{item.feature}</td>
                  <td className="px-6 py-4 text-sm text-brand-600 font-mono">{item.deeplink}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.webRoute}</td>
                  <td className="px-6 py-4 text-sm text-purple-600 font-mono">{item.pushTopic}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.events}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default MobileApps;
