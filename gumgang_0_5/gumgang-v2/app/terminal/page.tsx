"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Card, Typography, Space, Alert, Spin } from "@arco-design/web-react";
import { IconDesktop, IconSafe } from "@arco-design/web-react/icon";

const { Title, Text } = Typography;

// Dynamic import to avoid SSR issues with xterm
const SecureTerminalManager = dynamic(
  () => import("@/components/terminal/SecureTerminalManager"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <Space direction="vertical" align="center">
          <Spin size={32} />
          <Text className="text-gray-400">터미널 로딩 중...</Text>
        </Space>
      </div>
    ),
  },
);

export default function TerminalPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Space>
              <IconDesktop className="text-2xl text-green-400" />
              <div>
                <Title heading={5} className="!mb-0 text-gray-100">
                  Secure Terminal Manager
                </Title>
                <Text className="text-gray-400 text-sm">
                  안전한 명령어 실행 환경
                </Text>
              </div>
            </Space>
            <Space>
              <IconSafe className="text-xl text-green-400" />
              <Text className="text-gray-300">Protocol Guard v3.0 보호 중</Text>
            </Space>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="px-4 py-3">
        <Alert
          type="info"
          showIcon
          content={
            <Space direction="vertical" size={4}>
              <Text className="font-semibold">보안 터미널 안내</Text>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 모든 명령어는 실행 전 승인이 필요합니다</li>
                <li>• 위험한 명령어는 자동으로 차단됩니다</li>
                <li>• 명령어 실행 기록이 모두 저장됩니다</li>
                <li>
                  • rm -rf /, dd, mkfs 등의 시스템 파괴 명령어는 완전 차단됩니다
                </li>
              </ul>
            </Space>
          }
        />
      </div>

      {/* Terminal Container - Fixed height */}
      <div className="px-4 pb-4">
        <Card
          className="bg-gray-900 border-gray-700"
          bodyStyle={{
            padding: 0,
            height: "calc(100vh - 280px)",
            minHeight: "400px",
          }}
        >
          <SecureTerminalManager />
        </Card>
      </div>

      {/* Footer Status */}
      <div className="bg-gray-900 border-t border-gray-700 py-2">
        <div className="px-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <Space size={16}>
              <span>
                위험 명령어 차단: <span className="text-green-400">활성</span>
              </span>
              <span>
                승인 모드: <span className="text-yellow-400">필수</span>
              </span>
              <span>
                로깅: <span className="text-green-400">활성</span>
              </span>
            </Space>
            <Space size={16}>
              <span>
                터미널 서버:{" "}
                <span className="text-green-400">localhost:8002</span>
              </span>
              <span>
                Protocol Guard: <span className="text-green-400">v3.0</span>
              </span>
            </Space>
          </div>
        </div>
      </div>
    </div>
  );
}
