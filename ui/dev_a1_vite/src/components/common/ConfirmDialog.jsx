/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/common/ConfirmDialog.jsx
 * @분석일자: 2025-09-10T17:08Z (UTC) / 2025-09-11 02:08 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 파괴적이거나 중요한 액션을 수행하기 전에 사용자에게 재확인을 받는, 재사용 가능한 확인 모달 대화상자 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (모달 UI) 화면 전체를 덮는 배경과 그 위의 대화상자 UI를 렌더링합니다.
 *  - 2. (접근성) 키보드 포커스가 모달 밖으로 나가지 않도록 '포커스 트랩'을 구현하고 ESC 키를 지원합니다.
 *  - 3. (상태 위임) 모달의 표시 여부와 버튼 클릭 시의 동작은 모두 상위 컴포넌트에 위임합니다.
 *
 * @주요관계
 *  - (임포트) → 이 컴포넌트가 필요한 모든 다른 컴포넌트
 *
 * @참고사항
 *  - '1파일 1책임' 원칙을 준수하고 있으므로 리팩토링은 현재 시급하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import { useCallback, useEffect, useRef } from "react";

/**
 * ConfirmDialog — Generic confirmation modal for destructive/critical actions.
 *
 * Guardrails (ST-1206):
 * - Renders as a fixed overlay (no new overflow:auto containers under #a1).
 * - Does not introduce additional scrollers inside #a1; backdrop and dialog
 *   are position:fixed and overflow is hidden within the dialog content area.
 *
 * Accessibility:
 * - role="dialog", aria-modal="true", labelledBy/DescribedBy wiring
 * - Focus trap inside the dialog; ESC closes when enabled
 * - Backdrop click-to-close (configurable)
 *
 * Props
 * - open: boolean (required)
 * - title?: string | ReactNode
 * - description?: string | ReactNode
 * - confirmLabel?: string (default: "삭제")
 * - cancelLabel?: string (default: "취소")
 * - danger?: boolean (default: true) — styles confirm as destructive
 * - onConfirm?: () => void
 * - onCancel?: () => void
 * - closeOnBackdrop?: boolean (default: true)
 * - closeOnEsc?: boolean (default: true)
 * - initialFocus?: "confirm" | "cancel" (default: "cancel")
 * - id?: string — base id for aria attributes
 */
export default function ConfirmDialog({
  open,
  title = "확인",
  description = "",
  confirmLabel = "삭제",
  cancelLabel = "취소",
  danger = true,
  onConfirm,
  onCancel,
  closeOnBackdrop = true,
  closeOnEsc = true,
  initialFocus = "cancel",
  id = "confirm-dialog",
}) {
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Focus management — trap Tab within dialog
  const focusables = useCallback(() => {
    const root = dialogRef.current;
    if (!root) return [];
    // Basic focusable selector
    const sel =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(sel)).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
    );
  }, []);

  const onKeyDown = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === "Escape" && closeOnEsc) {
        e.stopPropagation();
        e.preventDefault();
        onCancel?.();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey) {
          // Shift+Tab on first => loop to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab on last => loop to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [open, closeOnEsc, onCancel, focusables]
  );

  // Auto-focus when opened
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      try {
        if (initialFocus === "confirm" && confirmBtnRef.current) {
          confirmBtnRef.current.focus();
        } else if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        } else {
          const items = focusables();
          items[0]?.focus();
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open, initialFocus, focusables]);

  if (!open) return null;

  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  return (
    <div
      role="presentation"
      onKeyDown={onKeyDown}
      aria-hidden={!open}
      style={overlayStyle}
    >
      {/* Backdrop */}
      <div
        role="button"
        aria-label="Dismiss"
        onClick={() => {
          if (closeOnBackdrop) onCancel?.();
        }}
        style={backdropStyle}
      />

      {/* Dialog */}
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header style={headerStyle}>
          <h3 id={titleId} style={h3Style}>
            {title}
          </h3>
        </header>

        {/* Body */}
        <div id={descId} style={bodyStyle}>
          {typeof description === "string" ? (
            <p style={pStyle}>{description}</p>
          ) : (
            description
          )}
        </div>

        {/* Footer actions */}
        <footer style={footerStyle}>
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="btn"
            title={cancelLabel}
            aria-label={cancelLabel}
            style={btnStyle}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="btn"
            title={confirmLabel}
            aria-label={confirmLabel}
            style={{
              ...btnStyle,
              ...(danger ? dangerBtnStyle : primaryBtnStyle),
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

/* Inline styles (use project tokens) */
const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "grid",
  placeItems: "center",
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
};

const dialogStyle = {
  position: "relative",
  zIndex: 1001,
  width: "min(480px, 92vw)",
  maxWidth: "92vw",
  border: "1px solid var(--gg-border)",
  borderRadius: 12,
  background: "var(--gg-panel)",
  color: "var(--gg-fg)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  maxHeight: "80vh",
  overflow: "hidden", // dialog itself can scroll internally if content exceeds (does not affect #a1 scrollers)
};

const headerStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid var(--gg-border)",
  background: "rgba(14, 21, 39, 0.65)",
  backdropFilter: "blur(4px)",
};

const h3Style = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: 0.2,
};

const bodyStyle = {
  padding: 16,
  overflow: "auto",
};

const pStyle = {
  margin: 0,
  lineHeight: 1.6,
  fontSize: 14,
  opacity: 0.95,
  whiteSpace: "pre-wrap",
};

const footerStyle = {
  padding: 12,
  borderTop: "1px solid var(--gg-border)",
  display: "grid",
  gridAutoFlow: "column",
  justifyContent: "end",
  gap: 8,
  background: "#0b1222",
};

const btnStyle = {
  padding: "8px 12px",
  fontSize: 13,
  borderRadius: 8,
  border: "1px solid var(--gg-border)",
  background: "var(--gg-panel)",
  color: "var(--gg-fg)",
  cursor: "pointer",
};

const dangerBtnStyle = {
  color: "#ef4444",
  borderColor: "rgba(239, 68, 68, 0.45)",
  background:
    "linear-gradient(180deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))",
};

const primaryBtnStyle = {
  color: "#22c55e",
  borderColor: "rgba(34,197,94,0.45)",
  background:
    "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(34,197,94,0.05))",
};
