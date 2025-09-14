/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/hooks/usePrefs.js
 * @분석일자: 2025-09-10T17:53Z (UTC) / 2025-09-11 02:54 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 브라우저의 `localStorage`에 저장되는 모든 사용자 UI 설정을 관리하는 헬퍼 함수와 커스텀 훅 라이브러리입니다.
 *
 * @핵심역할
 *  - 1. (읽기/쓰기) `localStorage`에 안전하게 데이터를 읽고 쓰는 저수준 헬퍼 함수를 제공합니다.
 *  - 2. (개별 설정 관리) 각 설정 항목에 대한 전용 getter/setter 함수를 제공합니다.
 *  - 3. (상태 동기화) `localStorage` 값을 React 상태와 동기화하는 커스텀 훅을 제공합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx` (및 다른 여러 컴포넌트)
 *  - (DOM API 사용) → `localStorage`
 *
 * @참고사항
 *  - [리팩토링 후보] 현재는 'UI 설정 관리'라는 큰 틀의 단일 책임을 가지지만, 향후 설정 종류가 더 많아지면
 *    책임별로(예: `useBackendPrefs.js`, `useLayoutPrefs.js`) 파일을 분리하는 리팩토링을 고려할 수 있습니다.
 * ---------------------------------------------------------------------------
 */
/**
 * UI preference helpers and hooks (A1 Dev)
 * - Extracted from main.jsx
 *
 * Stored keys (localStorage):
 * - GG_CHAT_BACKEND: "fastapi" | "bridge" (default: "fastapi")
 * - GG_TOOL_MODE: "on" | "off" (default: "off")
 * - GG_SELECTED_TOOLS: string[] (JSON; default: [])
 * - GG_CC_OPEN: "true" | "false" (default: "false")
 * - GG_CC_TAB: string (default: "planner")
 * - GG_MAIN_MODE: string (default: "chat")
 * - GG_LEFT_COLLAPSED: "true" | "false" (default: "false")
 */

import { useEffect, useMemo, useState } from "react";

/* Keys */
export const LS_KEYS = {
  CHAT_BACKEND: "GG_CHAT_BACKEND",
  TOOL_MODE: "GG_TOOL_MODE",
  SELECTED_TOOLS: "GG_SELECTED_TOOLS",
  CC_OPEN: "GG_CC_OPEN",
  CC_TAB: "GG_CC_TAB",
  MAIN_MODE: "GG_MAIN_MODE",
  LEFT_COLLAPSED: "GG_LEFT_COLLAPSED",
};

/* Browser guards */
function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/* Safe storage helpers */
function lsGet(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/* JSON helpers */
function lsGetJSON(key, fallback) {
  const raw = lsGet(key, null);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function lsSetJSON(key, value) {
  try {
    return lsSet(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/* Backends: "fastapi" | "bridge" */
export function getChatBackendPref() {
  const v = (lsGet(LS_KEYS.CHAT_BACKEND, "fastapi") || "").toLowerCase();
  return v === "bridge" ? "bridge" : "fastapi";
}

export function setChatBackendPref(v) {
  const norm = (v || "").toLowerCase() === "bridge" ? "bridge" : "fastapi";
  return lsSet(LS_KEYS.CHAT_BACKEND, norm);
}

/** Returns '/api' (FastAPI) or '/bridge/api' (Bridge) */
export function chatApiBase() {
  return getChatBackendPref() === "bridge" ? "/bridge/api" : "/api";
}

/* Tool mode: "on" | "off" */
export function getToolModePref() {
  const v = (lsGet(LS_KEYS.TOOL_MODE, "off") || "").toLowerCase();
  return v === "on" ? "on" : "off";
}

export function setToolModePref(v) {
  const norm = (v || "").toLowerCase() === "on" ? "on" : "off";
  return lsSet(LS_KEYS.TOOL_MODE, norm);
}

/* Selected tool IDs: string[] */
export function getSelectedToolIds() {
  const arr = lsGetJSON(LS_KEYS.SELECTED_TOOLS, []);
  return Array.isArray(arr) ? arr : [];
}

export function setSelectedToolIds(ids) {
  const safe = Array.isArray(ids) ? ids : [];
  return lsSetJSON(LS_KEYS.SELECTED_TOOLS, safe);
}

/* Command Center (drawer) prefs */
export function getCCOpenPref() {
  const v = lsGet(LS_KEYS.CC_OPEN, "false");
  return v === "true";
}

export function setCCOpenPref(open) {
  return lsSet(LS_KEYS.CC_OPEN, open ? "true" : "false");
}

export function getCCTabPref() {
  const v = lsGet(LS_KEYS.CC_TAB, "planner");
  return v || "planner";
}

export function setCCTabPref(tab) {
  const v = tab || "planner";
  return lsSet(LS_KEYS.CC_TAB, v);
}

/* Main mode (center routing): 'chat' | 'planner' | 'insights' | 'executor' | 'agents' | 'prompts' | 'files' | 'bookmarks' */
export const MAIN_MODES = [
  "chat",
  "planner",
  "insights",
  "executor",
  "agents",
  "prompts",
  "files",
  "bookmarks",
];

export function getMainModePref() {
  const v = (lsGet(LS_KEYS.MAIN_MODE, "chat") || "").toLowerCase();
  return MAIN_MODES.includes(v) ? v : "chat";
}

export function setMainModePref(v) {
  const norm = (v || "").toLowerCase();
  const next = MAIN_MODES.includes(norm) ? norm : "chat";
  return lsSet(LS_KEYS.MAIN_MODE, next);
}

/**
 * useMainMode
 * - Returns: { mode, setMode, is }
 */
export function useMainMode() {
  const [mode, setMode] = useState(getMainModePref());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEYS.MAIN_MODE) setMode(getMainModePref());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setMainModePref(mode);
  }, [mode]);

  const is = (m) => mode === m;

  return { mode, setMode, is };
}

export function getLeftCollapsedPref() {
  const v = lsGet(LS_KEYS.LEFT_COLLAPSED, "false");
  return v === "true";
}
export function setLeftCollapsedPref(collapsed) {
  return lsSet(LS_KEYS.LEFT_COLLAPSED, collapsed ? "true" : "false");
}
export function useLeftCollapsed() {
  const [collapsed, setCollapsed] = useState(getLeftCollapsedPref());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEYS.LEFT_COLLAPSED) {
        setCollapsed(getLeftCollapsedPref());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setLeftCollapsedPref(collapsed);
  }, [collapsed]);

  const toggle = () => setCollapsed((v) => !v);

  return { collapsed, setCollapsed, toggle };
}
/* Hooks */

/**
 * useBackendPref
 * - Returns: { value, setValue, apiBase, toggle }
 */
export function useBackendPref() {
  const [value, setValue] = useState(getChatBackendPref());

  useEffect(() => {
    // Sync from other tabs
    const onStorage = (e) => {
      if (e.key === LS_KEYS.CHAT_BACKEND) {
        setValue(getChatBackendPref());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setChatBackendPref(value);
  }, [value]);

  const apiBase = useMemo(
    () => (value === "bridge" ? "/bridge/api" : "/api"),
    [value],
  );

  const toggle = () => {
    setValue((cur) => (cur === "fastapi" ? "bridge" : "fastapi"));
  };

  return { value, setValue, apiBase, toggle };
}

/**
 * useToolMode
 * - Returns: { on, setOn, toggle }
 */
export function useToolMode() {
  const [on, setOn] = useState(getToolModePref() === "on");

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEYS.TOOL_MODE) {
        setOn(getToolModePref() === "on");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setToolModePref(on ? "on" : "off");
  }, [on]);

  const toggle = () => setOn((v) => !v);

  return { on, setOn, toggle };
}

/**
 * useSelectedToolIdsState
 * - Returns: { ids, setIds, add, remove, has }
 */
export function useSelectedToolIdsState() {
  const [ids, setIds] = useState(getSelectedToolIds());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEYS.SELECTED_TOOLS) {
        setIds(getSelectedToolIds());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setSelectedToolIds(ids);
  }, [ids]);

  const add = (id) =>
    setIds((cur) => Array.from(new Set([...(cur || []), id])));
  const remove = (id) => setIds((cur) => (cur || []).filter((x) => x !== id));
  const has = (id) => (ids || []).includes(id);

  return { ids, setIds, add, remove, has };
}

/**
 * useCCPrefs
 * - Returns: { open, setOpen, tab, setTab }
 */
export function useCCPrefs() {
  const [open, setOpen] = useState(getCCOpenPref());
  const [tab, setTab] = useState(getCCTabPref());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === LS_KEYS.CC_OPEN) setOpen(getCCOpenPref());
      if (e.key === LS_KEYS.CC_TAB) setTab(getCCTabPref());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setCCOpenPref(open);
  }, [open]);

  useEffect(() => {
    setCCTabPref(tab);
  }, [tab]);

  return { open, setOpen, tab, setTab };
}

/* Default bundle export (optional convenience) */
export default {
  LS_KEYS,
  getChatBackendPref,
  setChatBackendPref,
  chatApiBase,
  getToolModePref,
  setToolModePref,
  getSelectedToolIds,
  setSelectedToolIds,
  getCCOpenPref,
  setCCOpenPref,
  getCCTabPref,
  setCCTabPref,
  useBackendPref,
  useToolMode,
  useSelectedToolIdsState,
  useCCPrefs,
  MAIN_MODES,
  getMainModePref,
  setMainModePref,
  useMainMode,
  getLeftCollapsedPref,
  setLeftCollapsedPref,
  useLeftCollapsed,
};
