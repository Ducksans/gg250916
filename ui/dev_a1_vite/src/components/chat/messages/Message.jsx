/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/messages/Message.jsx
 * @분석일자: 2025-09-10T17:00Z (UTC) / 2025-09-11 02:00 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 채팅 타임라인에 표시되는 개별 메시지 하나의 UI와 상호작용을 정의합니다.
 *
 * @핵심역할
 *  - 1. (메시지 렌더링) 역할(user/assistant)에 따라 '덕산'/'금강' 레이블과 본문을 렌더링합니다.
 *  - 2. (메타데이터 시각화) 메시지에 포함된 도구 호출/결과 등 메타데이터를 별도 박스로 표시합니다.
 *  - 3. (액션 버튼) 복사, 삭제, 핀 고정 등의 액션 버튼 UI를 제공하고 이벤트를 상위로 전달합니다.
 *
 * @주요관계
 *  - (임포트) ← `./MessagesView.jsx`
 *  - (콜백 호출) → `@/components/chat/ChatTimeline.jsx`
 *
 * @참고사항
 *  - [리팩토링 후보] 파일 길이가 길고, `IconBtn`, `MetaBox` 등 범용성 있는 하위 컴포넌트를 포함하고 있습니다.
 *  - 향후 하위 컴포넌트들을 별도의 파일로 분리하여 재사용성을 높이는 리팩토링을 고려할 수 있습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useMemo, useState, useEffect } from "react";

/**
 * Message
 * - Renders a single chat message with role-based labeling and simple meta info.
 *
 * Props:
 * - message: {
 *     id: string,
 *     role: 'user' | 'assistant' | 'system',
 *     content: string,
 *     ts?: number,
 *     meta?: {
 *       agentId?: string,
 *       toolCall?: { tool: string, args?: Record<string, any> },
 *       toolResult?: { ok: boolean, data?: any, error?: string },
 *     }
 *   }
 * - showRoleLabel?: boolean (default: true)
 * - showMeta?: boolean (default: true)
 *
 * Styling hooks (keeps existing CSS from A1 Dev):
 * - Container: className={`msg ${role}`}
 *   - .msg.user
 *   - .msg.assistant
 */
export default function Message({
  message,
  showRoleLabel = true,
  showMeta = true,
  onCopy,
  onDelete,
  onPin,
  onRerun,
}) {
  // Hooks must be called unconditionally (even if message is null)
  const [actionsVisible, setActionsVisible] = useState(false);
  if (!message) return null;

  const role = normalizeRole(message.role);
  const label = roleLabel(role);
  const icon = roleIcon(role);
  const content = toText(message.content);
  const evParsed = parseEvidenceBlock(content);

  const hasToolCall = !!message?.meta?.toolCall;
  const hasToolResult = !!message?.meta?.toolResult;

  const pinned = !!message?.meta?.pinned;

  const handleCopy = () => {
    const text = toText(message?.content);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore
    }
    onCopy?.(message);
  };

  const handleDelete = () => {
    // Confirm before destructive action
    const ok = window.confirm("이 메시지를 삭제할까요?");
    if (!ok) return;
    onDelete?.(message);
  };

  const handlePin = () => {
    onPin?.(message, !pinned);
  };

  const handleRerun = () => {
    onRerun?.(message);
  };

  return (
    <div
      className={`msg ${role} ${pinned ? "pinned" : ""}`}
      role="article"
      aria-label={`${label} message`}
      data-msg-id={message.id}
      data-pinned={pinned ? "true" : undefined}
      tabIndex={0}
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => setActionsVisible(false)}
      onFocus={() => setActionsVisible(true)}
      onBlur={() => setActionsVisible(false)}
      style={{ position: "relative" }}
    >
      {/* Actions (docked top-right) — responsive visibility */}
      <div
        aria-label="Message actions"
        style={{
          position: "absolute",
          top: 8,
          right: 0,
          display: actionsVisible ? "inline-flex" : "none",
          gap: 8,
          zIndex: 1,
          alignItems: "center",
        }}
      >
        {/* Desktop: always icons; Tablet: hover/focus; Mobile: kebab menu */}
        <div
          className="msg-actions-inline"
          style={{ display: "inline-flex", gap: 8 }}
        >
          <IconBtn
            onClick={handleCopy}
            title="복사"
            ariaLabel="복사"
            icon="⧉"
          />
          <IconBtn
            onClick={handleRerun}
            title="재실행"
            ariaLabel="재실행"
            icon="↻"
          />
          <IconBtn
            onClick={handlePin}
            title={pinned ? "핀 해제" : "핀 고정"}
            ariaLabel={pinned ? "핀 해제" : "핀 고정"}
            icon="📌"
            pressed={pinned}
          />
          <IconBtn
            onClick={handleDelete}
            title="삭제"
            ariaLabel="삭제"
            icon="🗑"
            danger
          />
        </div>
        {/* Mobile kebab menu (⋮) — simple fallback trigger for small screens */}
        <div className="msg-actions-kebab" style={{ display: "none" }}>
          <IconBtn
            onClick={(e) => {
              e.preventDefault();
              const choice = window.prompt(
                "작업 선택: 1)복사 2)재실행 3)핀 4)삭제",
              );
              if (choice === "1") handleCopy();
              else if (choice === "2") handleRerun();
              else if (choice === "3") handlePin();
              else if (choice === "4") handleDelete();
            }}
            title="메뉴"
            ariaLabel="메뉴"
            icon="⋮"
          />
        </div>
      </div>

      {/* Block-style header row: left(label) | right(actions placeholder for layout) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span
            aria-hidden
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              display: "inline-grid",
              placeItems: "center",
              fontSize: 12,
              background:
                role === "user"
                  ? "rgba(59,130,246,0.25)"
                  : role === "assistant"
                    ? "rgba(34,197,94,0.25)"
                    : "rgba(120,120,120,0.25)",
              border: "1px solid var(--gg-border)",
            }}
            title={label}
          >
            {icon}
          </span>
          <strong>{label}</strong>
        </div>
        {/* right column intentionally empty; absolute actions are docked near this edge */}
        <div aria-hidden style={{ width: 1, height: 1 }} />
      </div>

      {/* Content or Evidence (collapsible) */}
      <div style={{ marginTop: 6 }}>
        {evParsed ? (
          <EvidenceCollapsible ev={evParsed} />
        ) : (
          content
        )}
      </div>

      {showMeta && (hasToolCall || hasToolResult) && (
        <div
          style={{
            marginTop: 8,
            display: "grid",
            gap: 6,
            fontSize: 12,
            opacity: 0.95,
          }}
          aria-label="Message meta"
        >
          {hasToolCall && (
            <MetaBox
              title="Tool Call"
              body={
                <div>
                  <div style={{ marginBottom: 4 }}>
                    <b>{message.meta.toolCall.tool}</b>
                  </div>
                  {message.meta.toolCall.args && (
                    <Pre>{message.meta.toolCall.args}</Pre>
                  )}
                </div>
              }
            />
          )}
          {hasToolResult && (
            <MetaBox
              title={`Tool Result — ${message.meta.toolResult.ok ? "OK" : "ERR"}`}
              status={message.meta.toolResult.ok ? "ok" : "err"}
              body={
                <div>
                  {message.meta.toolResult.ok ? (
                    <Pre>{message.meta.toolResult.data}</Pre>
                  ) : (
                    <div style={{ color: "#f59e0b" }}>
                      {message.meta.toolResult.error || "Error"}
                    </div>
                  )}
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

/* Helpers */

function normalizeRole(r) {
  const s = String(r || "").toLowerCase();
  if (s === "user" || s === "assistant" || s === "system") return s;
  return "assistant";
}

function toText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function Pre({ children }) {
  const text =
    typeof children === "string" ? children : safeJSONString(children);
  return (
    <pre
      style={{
        margin: 0,
        background: "#0e1527",
        padding: 8,
        borderRadius: 6,
        border: "1px solid var(--gg-border)",
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </pre>
  );
}

function MetaBox({ title, status, body }) {
  const badge =
    status === "ok" ? (
      <span style={badgeStyle("#22c55e", 0.35)}>OK</span>
    ) : status === "err" ? (
      <span style={badgeStyle("#ef4444", 0.35)}>ERR</span>
    ) : null;

  return (
    <div
      style={{
        border: "1px dashed var(--gg-border)",
        borderRadius: 8,
        padding: 8,
        background: "#0b1222",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 600 }}>{title}</span>
        {badge}
      </div>
      <div>{body}</div>
    </div>
  );
}

/* Evidence parsing/rendering */
function parseEvidenceBlock(text) {
  try {
    const lines = String(text || "").split(/\n+/);
    if (lines.length === 0) return null;
    // Expect pattern: first line starts with "증거 N건:"
    const m = /^증거\s+(\d+)건:/.exec(lines[0]);
    if (!m) return null;
    const count = parseInt(m[1] || "0", 10) || 0;
    // Find line starting with "근거 인용:"
    const refLineIdx = lines.findIndex((l) => /^근거\s*인용\s*:/.test(l));
    const refs = refLineIdx >= 0 ? lines[refLineIdx].replace(/^근거\s*인용\s*:/, "").trim().split(/\s*,\s*/).filter(Boolean) : [];
    // Bullets are lines between header and refs line
    const bulletLines = lines.slice(1, refLineIdx >= 0 ? refLineIdx : lines.length);
    const bullets = bulletLines.join("\n");
    return { count, refs, bullets };
  } catch {
    return null;
  }
}

const _evCache = (typeof window !== "undefined" ? (window.__GG_EV_EXISTS__ ||= {}) : {});

function EvidenceCollapsible({ ev }) {
  const { count, refs, bullets } = ev || {};
  const [visibleRefs, setVisibleRefs] = useState(refs || []);
  const [compact, setCompact] = useState(() => {
    try {
      const v = localStorage.getItem("GG_EVIDENCE_COMPACT");
      if (v == null) return true; // 기본값: 간략 표기 ON
      return String(v).toLowerCase() === "true";
    } catch { return true; }
  });

  useEffect(() => {
    let alive = true;
    async function checkRefs() {
      const rs = Array.isArray(refs) ? refs : [];
      const out = [];
      for (const r of rs) {
        if (isLegacyThreadRef(r)) { out.push(r); continue; }
        const key = String(r)
          .replace(/^\/+/, "")
          .replace(/^gumgang_meeting\//, "")
          .replace(/#L\d+(?:-\d+)?$/, ""); // strip line anchor for exists check
        if (_evCache[key] !== undefined) { if (_evCache[key]) out.push(r); continue; }
        try {
          const u = new URL("/api/files/exists", window.location.origin);
          u.searchParams.set("path", key);
          const resp = await fetch(u.toString());
          let ok = false;
          if (resp.ok) {
            try {
              const j = await resp.json();
              ok = !!j?.exists; // 서버는 {ok:true, exists:boolean}
            } catch { ok = false; }
          }
          _evCache[key] = !!ok;
          if (ok) out.push(r);
        } catch { /* ignore */ }
      }
      if (alive) setVisibleRefs(out);
    }
    checkRefs();
    return () => { alive = false; };
  }, [JSON.stringify(refs)]);

  const shown = Array.isArray(visibleRefs) ? visibleRefs.length : (Array.isArray(refs) ? refs.length : 0);
  const declared = Number.isFinite(count) ? count : shown;
  const refsToShow = compact ? (Array.isArray(visibleRefs) ? visibleRefs.slice(0,1) : []) : (visibleRefs || []);
  const bulletLines = (bullets || "").split(/\n+/).filter(Boolean);
  const coreBullet = bulletLines.find((l)=>/^\d+\. /.test(l)) || bulletLines[0] || "";
  const bulletsToShow = compact ? coreBullet : (bullets || "");

  const onToggleCompact = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCompact((v) => {
      const next = !v;
      try { localStorage.setItem("GG_EVIDENCE_COMPACT", String(next)); } catch {}
      return next;
    });
  };
  return (
    <div className="evidence-collapsible" style={{ fontSize: 13 }}>
      <details>
        <summary style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>
            {compact ? `핵심 근거 1건` : `답변 근거 ${shown}건`}
            {(!compact && declared !== shown) ? ` (원본 ${declared})` : ""}
            {" — 링크 보기"}
          </span>
          <button
            type="button"
            className="btn"
            onClick={onToggleCompact}
            title={compact ? "원본 병기로 보기" : "간략 표기로 보기"}
            style={{ fontSize: 11, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--gg-border)", background: "#0f172a", color: "#cbd5e1", marginLeft: 6 }}
          >
            {compact ? "원본" : "간략"}
          </button>
        </summary>
        <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
          {Array.isArray(refsToShow) && refsToShow.length > 0 && (
            <div style={{ lineHeight: 1.8, display: "grid", gap: 6 }}>
              {refsToShow.map((r, i) => {
                const href = buildUiPreviewHref(r);
                const isLegacy = isLegacyThreadRef(r);
                return (
                  <div key={i} style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                    <a href={href} target="_blank" rel="noopener" style={{ color: "#93c5fd", textDecoration: "none" }}>
                      링크{i + 1}
                    </a>
                    {!isLegacy && (
                      <button
                        type="button"
                        className="btn"
                        onClick={(e) => { e.preventDefault(); openInOS(r); }}
                        title="OS로 열기"
                        style={{ fontSize: 12, padding: "2px 6px", borderRadius: 6, border: "1px solid var(--gg-border)", background: "#0f172a", color: "#cbd5e1" }}
                      >
                        OS로 열기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {bulletsToShow && (
            <pre
              style={{
                margin: 0,
                background: "#0e1527",
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--gg-border)",
                whiteSpace: "pre-wrap",
              }}
            >
              {bulletsToShow}
            </pre>
          )}
        </div>
      </details>
    </div>
  );
}

function buildUiPreviewHref(ref) {
  try {
    const raw = String(ref || "")
      .replace(/^\/+/, "")
      .replace(/^gumgang_meeting\//, "");
    // Legacy conversations/threads/* → DB v2 viewer
    const m = raw.match(/^(?:conversations\/threads|gumgang_meeting\/conversations\/threads)\/([^#]+?)\.jsonl(?:#L(\d+)(?:-(\d+))?)?$/);
    if (m) {
      const tid = m[1];
      const anchor = m[2] ? `#L${m[2]}${m[3] ? '-' + m[3] : ''}` : "";
      return `http://127.0.0.1:8000/api/v2/threads/view?id=${encodeURIComponent(tid)}${anchor}`;
    }
    // Default: FastAPI file viewer
    return `http://127.0.0.1:8000/api/files/view?path=${encodeURIComponent(raw)}`;
  } catch {
    return "#";
  }
}

function openInOS(ref) {
  try {
    const path = String(ref || "").replace(/^\/+/, "");
    fetch(`/api/files/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: `${path}`, readOnly: true }),
    }).catch(() => {});
  } catch {}
}

function isLegacyThreadRef(ref) {
  try {
    const raw = String(ref || "").replace(/^\/+/, "").replace(/^gumgang_meeting\//, "");
    return /^(?:conversations\/threads|gumgang_meeting\/conversations\/threads)\/[^#]+?\.jsonl/.test(raw);
  } catch {
    return false;
  }
}

function IconBtn({
  onClick,
  title,
  ariaLabel,
  icon,
  pressed = false,
  danger = false,
}) {
  // 20px icon inside 33px hit area
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      aria-pressed={pressed ? "true" : undefined}
      style={{
        width: 33,
        height: 33,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 8,
        border: `1px solid rgba(148,163,184,0.25)` /* lighter border */,
        background: "rgba(15,23,42,0.55)" /* lighter bg than --gg-panel */,
        color: danger ? "#ef4444" : "var(--gg-fg)",
        fontSize: 20 /* icon size */,
        lineHeight: 1,
        cursor: "pointer",
        transition:
          "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
        boxShadow: pressed
          ? "0 0 0 2px rgba(34,197,94,0.12) inset, 0 2px 10px rgba(0,0,0,0.24)"
          : "0 2px 10px rgba(0,0,0,0.16)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.28)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1.00)";
        e.currentTarget.style.boxShadow = pressed
          ? "0 0 0 2px rgba(34,197,94,0.12) inset, 0 2px 10px rgba(0,0,0,0.24)"
          : "0 2px 10px rgba(0,0,0,0.16)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.transform = "scale(1.06)";
        e.currentTarget.style.boxShadow =
          "0 0 0 2px rgba(148,163,184,0.25), 0 4px 14px rgba(0,0,0,0.28)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.transform = "scale(1.00)";
        e.currentTarget.style.boxShadow = pressed
          ? "0 0 0 2px rgba(34,197,94,0.12) inset, 0 2px 10px rgba(0,0,0,0.24)"
          : "0 2px 10px rgba(0,0,0,0.16)";
      }}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}

function badgeStyle(color, alpha) {
  return {
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 999,
    border: `1px solid ${hexWithAlpha(color, alpha)}`,
    color,
  };
}

/* rudimentary hex-with-alpha (expects #RRGGBB) */
function hexWithAlpha(hex, alpha = 0.35) {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return "rgba(255,255,255,0.35)";
  }
}

function safeJSONString(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/* Role helpers: label mapping and icons */
function roleLabel(r) {
  if (r === "user") return "덕산";
  if (r === "assistant") return "금강";
  return "System";
}
function roleIcon(r) {
  if (r === "user") return "🙂";
  if (r === "assistant") return "🤖";
  return "⋯";
}
