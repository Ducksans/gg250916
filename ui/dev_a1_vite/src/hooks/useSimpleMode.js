/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/hooks/useSimpleMode.js
 * @분석일자: 2025-09-11T11:58Z (UTC) / 2025-09-11 11:58 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - .rules의 UI 가드레일에서 요구하는 '단순 모드(Simple Mode)'를 활성화/비활성화하는 커스텀 훅입니다.
 *
 * @핵심역할
 *  - 1. (CSS 클래스 토글) `<body>` 태그에 `simple` 클래스를 추가/제거하여 '단순 모드'를 제어합니다.
 *  - 2. (조건부 활성화) URL 파라미터나 `localStorage` 값에 따라 모드를 조건부로 활성화할 수 있습니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (DOM 조작) → `<body>` 태그
 *  - (CSS 클래스 제공) → `a1.css`
 *
 * @참고사항
 *  - '단순 모드 활성화'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import { useEffect } from "react";

/** 외부에서 조건을 미리 확인하고 싶을 때 사용할 수 있는 헬퍼 */
export function isSimpleRequested({
  urlParam = "mode",
  urlValue = "simple",
  lsKey = "GG_SIMPLE",
} = {}) {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    if (sp.get(urlParam) === urlValue) return true;
  } catch {
    // ignore
  }
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(lsKey) === "1";
    }
  } catch {
    // ignore
  }
  return false;
}

export default function useSimpleMode({
  enabled = true,
  urlParam = "mode",
  urlValue = "simple",
  lsKey = "GG_SIMPLE",
} = {}) {
  useEffect(() => {
    // SSR/비브라우저 환경 방지
    if (typeof document === "undefined") return;

    const shouldEnable =
      enabled === true
        ? true
        : enabled === "auto"
          ? isSimpleRequested({ urlParam, urlValue, lsKey })
          : false;

    if (!shouldEnable) return;

    try {
      document.body.classList.add("simple");
    } catch {
      // ignore
    }

    return () => {
      try {
        document.body.classList.remove("simple");
      } catch {
        // ignore
      }
    };
    // enabled, urlParam, urlValue, lsKey가 바뀌면 재평가
  }, [enabled, urlParam, urlValue, lsKey]);
}
