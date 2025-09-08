import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * RightDrawer — resizable right-side drawer with auto-collapse
 *
 * Goals
 * - LibreChat-like utility drawer that can be opened/closed and resized by dragging.
 * - Auto-collapses when dragged below a threshold.
 * - Desktop: fixed/right overlay by default; Mobile: full-height overlay.
 * - Independent scroll inside the drawer (relaxed guardrail plan).
 *
 * Notes
 * - This component is self-contained and not mounted by default.
 * - When we update the runtime sensor, mark this drawer as allowed via
 *   a selector or data attribute: [data-gg="right-drawer"].
 */

type RightDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  defaultWidth?: number; // px (desktop)
  minWidth?: number; // px
  maxWidth?: number; // px
  collapseWidth?: number; // px — drag below to auto-close

  persistKey?: string; // localStorage key base for open/width

  title?: string;
  children?: React.ReactNode;

  // Optional: simple menu section headers like LibreChat
  sections?: Array<{
    id: string;
    title: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  }>;
};

const DEFAULTS = {
  defaultWidth: 320,
  minWidth: 260,
  maxWidth: 420,
  collapseWidth: 220,
  persistKey: "gg_rightDrawer",
} as const;

// Collapsed (narrow) visual width in px — mini icon column
const COLLAPSED_W = 64;

function useLocalStorageNumber(key: string, initial: number) {
  const [val, setVal] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(key);
      const n = raw == null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, String(val));
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

function useLocalStorageBool(key: string, initial: boolean) {
  const [val, setVal] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return initial;
      return raw === "1" || raw === "true";
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, val ? "1" : "0");
    } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

function useIsMobile() {
  const [is, setIs] = useState<boolean>(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const on = () => setIs(mql.matches);
    mql.addEventListener?.("change", on);
    return () => mql.removeEventListener?.("change", on);
  }, []);
  return is;
}

export default function RightDrawer(props: RightDrawerProps) {
  const {
    open,
    onOpenChange,
    defaultWidth = DEFAULTS.defaultWidth,
    minWidth = DEFAULTS.minWidth,
    maxWidth = DEFAULTS.maxWidth,
    collapseWidth = DEFAULTS.collapseWidth,
    persistKey = DEFAULTS.persistKey,
    title = "패널",
    children,
    sections,
  } = props;

  const isMobile = useIsMobile();

  const widthKey = `${persistKey}:width`;
  const openKey = `${persistKey}:open`;

  const [storedOpen, setStoredOpen] = useLocalStorageBool(openKey, open);
  const [width, setWidth] = useLocalStorageNumber(
    widthKey,
    clamp(defaultWidth, minWidth, maxWidth),
  );

  // keep storage in sync with external open state
  useEffect(() => {
    setStoredOpen(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startXRef = useRef<number | null>(null);
  const startWRef = useRef<number>(width);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const setOpen = useCallback(
    (v: boolean) => {
      setStoredOpen(v);
      onOpenChange(v);
    },
    [onOpenChange, setStoredOpen],
  );

  const onPointerDown = useCallback(
    (ev: React.MouseEvent | React.TouchEvent) => {
      draggingRef.current = true;
      startXRef.current =
        "touches" in ev
          ? ev.touches[0].clientX
          : (ev as React.MouseEvent).clientX;
      startWRef.current = width;
      // prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [width],
  );

  const onPointerMove = useCallback(
    (clientX: number) => {
      if (!draggingRef.current || startXRef.current == null) return;
      const dx = startXRef.current - clientX; // dragging left increases dx
      const newW = clamp(startWRef.current + dx, 120, maxWidth);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setWidth(newW);
      });
    },
    [maxWidth, setWidth],
  );

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    startXRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // Snap to collapsed stage when too narrow (keep open)
    if (width <= collapseWidth) {
      setWidth(COLLAPSED_W);
    } else {
      // snap into [min,max]
      setWidth(clamp(width, minWidth, maxWidth));
    }
  }, [collapseWidth, minWidth, maxWidth, setOpen, setWidth, width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => onPointerMove(e.clientX);
    const onTouchMove = (e: TouchEvent) =>
      onPointerMove(e.touches[0]?.clientX ?? 0);
    const onUp = () => onPointerUp();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [onPointerMove, onPointerUp]);

  // Keyboard resizing when handle is focused
  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.shiftKey ? 24 : 8;
        const sign = e.key === "ArrowLeft" ? -1 : 1;
        const next = clamp(width + sign * delta, 120, maxWidth);
        setWidth(next);
        if (next <= collapseWidth) setOpen(false);
      }
      if (e.key.toLowerCase() === "o" && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd+O toggles drawer
        e.preventDefault();
        setOpen(!open);
      }
    },
    [collapseWidth, maxWidth, open, setOpen, setWidth, width],
  );

  // Closed state + mini-tab hint (LibreChat-like)
  const isCollapsed = !isMobile && open && width <= collapseWidth;
  const opener = (
    <button
      aria-label="패널 열기"
      title="패널 열기"
      onClick={() => setOpen(true)}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] w-[12px] h-[220px] rounded-l-md bg-[var(--gg-bg)]/70 hover:bg-[var(--gg-panel)]/80 ring-1 ring-[var(--gg-border)]/60"
    >
      <span className="sr-only">패널 열기</span>
    </button>
  );

  const drawerStyle = useMemo<React.CSSProperties>(() => {
    const w = clamp(width, minWidth, maxWidth);
    const collapsed = !isMobile && w <= collapseWidth;
    // viewport anchored; we respect status strip height if used
    return {
      position: "fixed",
      top: 0,
      right: 0,
      height: "100dvh",
      width: isMobile
        ? "min(92vw, 420px)"
        : collapsed
          ? `${COLLAPSED_W}px`
          : `${w}px`,
      background: "var(--gg-panel)",
      color: "var(--gg-text)",
      borderLeft: "1px solid var(--gg-border)",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.02), 0 10px 30px rgba(0,0,0,0.35)",
      zIndex: 50,
      display: "flex",
      flexDirection: "column",
      overscrollBehavior: "contain",
    };
  }, [collapseWidth, isMobile, maxWidth, minWidth, width]);

  const resizerStyle = useMemo<React.CSSProperties>(
    () => ({
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
      cursor: "col-resize",
      // a subtle grabber UI
      background:
        "linear-gradient(to right, transparent, rgba(255,255,255,0.04) 50%, transparent 100%)",
    }),
    [],
  );

  // Simple default sections when none provided
  const defaultSections = sections ?? [
    { id: "agent", title: "에이전트 제작기" },
    { id: "prompt", title: "프롬프트" },
    { id: "memory", title: "메모리" },
    { id: "attach", title: "파일 첨부" },
    { id: "bookmark", title: "북마크" },
  ];

  return (
    <>
      {!open && opener}
      {open && (
        <aside
          role="complementary"
          aria-label={title}
          id="a1-right"
          data-gg="right-drawer"
          className="select-none"
          style={drawerStyle}
          onKeyDown={handleKey}
        >
          {/* Drag handle (left edge) */}
          <div
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            title="드래그하여 폭 조절 (더 줄이면 접힘)"
            className="outline-none"
            style={resizerStyle}
            onMouseDown={onPointerDown as any}
            onTouchStart={onPointerDown as any}
            onDoubleClick={() => setOpen(false)}
          />

          {isCollapsed ? (
            <div className="flex flex-col items-center justify-center gap-2 py-3 text-[var(--gg-text)]/85 select-none">
              {defaultSections.map((s) => (
                <button
                  key={s.id}
                  title={s.title}
                  className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center"
                  onClick={() => setWidth(defaultWidth)}
                >
                  <span aria-hidden="true">
                    {s.id === "agent"
                      ? "🤖"
                      : s.id === "prompt"
                        ? "📝"
                        : s.id === "memory"
                          ? "🧠"
                          : s.id === "attach"
                            ? "📎"
                            : "🔖"}
                  </span>
                  <span className="sr-only">{s.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--gg-panel-alt)] border-b border-[var(--gg-border)]">
                <div className="text-sm font-medium opacity-90">{title}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-1 text-xs text-[var(--gg-text-muted)] hover:text-[var(--gg-text)] hover:brightness-110"
                    title="패널 숨기기"
                  >
                    숨기기 ▸
                  </button>
                </div>
              </div>

              {/* Sections */}
              <div className="divide-y divide-[var(--gg-border)]/60 overflow-auto">
                {defaultSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={s.onClick}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 text-[14px]"
                    style={{ color: "var(--gg-text)" }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Slot for custom content */}
              {children && (
                <div className="border-t border-[var(--gg-border)]/70 overflow-auto min-h-0">
                  {children}
                </div>
              )}
            </>
          )}
        </aside>
      )}
    </>
  );
}

/* Utils */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
