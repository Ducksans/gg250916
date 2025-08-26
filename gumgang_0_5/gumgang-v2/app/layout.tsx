"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
// Arco Design의 핵심 컴포넌트와 CSS를 가져옵니다.
import { ConfigProvider } from "@arco-design/web-react";
import "@arco-design/web-react/dist/css/arco.css";
// 우리의 커스텀 전역 스타일을 Arco CSS 다음에 가져옵니다.
import "./globals.css";

// 프로젝트의 다른 컴포넌트들을 가져옵니다.
import MemoryStatus from "@/components/layout/MemoryStatus";
import ConnectionStatus from "@/components/layout/ConnectionStatus";
import StatusHUD from "@/components/layout/StatusHUD";
import { WebSocketProvider } from "@/contexts/WebSocketContext";

const inter = Inter({ subsets: ["latin"] });

// "use client"가 선언된 파일에서는 metadata 객체를 export할 수 없습니다.
// title은 html 태그 내에서 직접 설정합니다.
// export const metadata: Metadata = {
//   title: "금강 2.0 - AI 자기진화 시스템",
//   description: "고급 메모리 시스템과 자기진화 기능을 갖춘 AI 어시스턴트",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <title>금강 2.0 - AI 자기진화 시스템</title>
      </head>
      <body className={`${inter.className} h-full`} suppressHydrationWarning>
        {/* Arco Design의 전역 설정을 위해 ConfigProvider로 전체를 감쌉니다. */}
        <ConfigProvider theme={{ type: "dark" }}>
          <WebSocketProvider autoConnect={true}>
            <div className="flex h-full overflow-hidden bg-[var(--bg-deep-water)] text-[var(--text-primary)]">
              {/* --- 금강의 정체성인 사이드바는 그대로 유지합니다 --- */}
              <aside className="w-64 bg-gray-800 border-r border-[var(--border-default)] flex flex-col flex-shrink-0">
                <div className="p-6 border-b border-[var(--border-default)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🧠</span>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold">금강 2.0</h1>
                      <p className="text-xs text-gray-400">
                        자기진화 AI 시스템
                      </p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                  <Link
                    href="/chat"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors group"
                  >
                    <span className="text-xl">💬</span>
                    <div>
                      <div className="font-medium">대화 / IDE</div>
                      <div className="text-xs text-gray-400 group-hover:text-gray-300">
                        코딩 및 상호작용
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors group"
                  >
                    <span className="text-xl">📊</span>
                    <div>
                      <div className="font-medium">대시보드</div>
                      <div className="text-xs text-gray-400 group-hover:text-gray-300">
                        시스템 현황
                      </div>
                    </div>
                  </Link>
                </nav>

                <Suspense
                  fallback={
                    <div className="p-4 text-xs text-gray-400">
                      메모리 상태 로딩중...
                    </div>
                  }
                >
                  <MemoryStatus />
                </Suspense>
              </aside>

              {/* --- 페이지 컨텐츠가 펼쳐질 메인 영역 --- */}
              <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-14 bg-gray-800 border-b border-[var(--border-default)] flex-shrink-0 flex items-center justify-between px-6">
                  <div className="flex items-center gap-4 text-sm">
                    {/* 이 공간은 페이지별로 동적인 내용을 채울 수 있습니다. */}
                  </div>
                  <div className="flex items-center gap-4">
                    <ConnectionStatus showDetails={true} />
                    <StatusHUD />
                  </div>
                </header>

                {/* children을 담을 이 컨테이너가 남은 공간을 모두 차지합니다 (flex-1). */}
                <div className="flex-1 overflow-hidden">{children}</div>
              </main>
            </div>
          </WebSocketProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
