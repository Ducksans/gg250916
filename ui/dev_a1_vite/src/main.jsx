/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/main.jsx
 * @분석일자: 2025-09-10T15:46Z (UTC) / 2025-09-11 00:46 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - React 애플리케이션을 초기화하고 DOM에 렌더링하는 실질적인 시작점(Entry Point)입니다.
 *
 * @핵심역할
 *  - 1. `index.html`의 `<div id="root">`를 React 앱의 루트로 지정합니다.
 *  - 2. 최상위 컴포넌트인 `<A1Dev />`를 렌더링합니다.
 *  - 3. `<StrictMode>`를 통해 개발 중 잠재적인 문제를 감지합니다.
 *  - 4. React Router를 설정하여 스레드별 URL 라우팅을 지원합니다.
 *
 * @주요관계
 *  - (참조) ← `index.html`
 *  - (임포트) → `@/components/A1Dev`
 *  - (DOM 연결) → `index.html`의 `<div id="root">`
 *  - (라우팅) → React Router DOM v6
 *
 * @참고사항
 *  - 이 파일은 앱의 '시동' 역할과 라우팅 설정을 담당합니다.
 *  - URL 구조: /ui-dev/ (홈), /ui-dev/thread/:threadId (개별 스레드)
 * ---------------------------------------------------------------------------
 */
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import A1Dev from "@/components/A1Dev";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename="/ui-dev">
      <Routes>
        <Route path="/" element={<A1Dev />} />
        <Route path="/thread/:threadId" element={<A1Dev />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
