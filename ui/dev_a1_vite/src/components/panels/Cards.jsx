/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/panels/Cards.jsx
 * @분석일자: 2025-09-10T17:29Z (UTC) / 2025-09-11 02:29 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - CommandCenter의 각 패널 내부에 표시될 정보 카드 UI 컴포넌트 라이브러리입니다.
 *
 * @핵심역할
 *  - 1. (기반 컴포넌트) 모든 카드의 뼈대가 되는 `Card` 컴포넌트를 제공합니다.
 *  - 2. (특화 컴포넌트) `PlannerCard`, `InsightsCard` 등 각 패널에 특화된 카드들을 제공합니다.
 *  - 3. (원시 UI) `Tag`, `ProgressBar` 등 카드 내부에서 사용되는 작은 UI 요소들을 포함합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/CommandCenterDrawer.jsx`
 *
 * @참고사항
 *  - [리팩토링 후보] 여러 카드와 UI 요소를 포함하여 '1파일 다수 책임' 상태입니다.
 *  - 향후 각 컴포넌트를 '1파일 1컴포넌트' 원칙에 따라 개별 파일로 분리하는 리팩토링이 강력하게 권장됩니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";

/**
 * Cards.jsx — Composable cards for Command Center Panels
 *
 * Exports:
 * - Card: Base presentational container with header/actions/body/footer
 * - PlannerCard: Simple list-style planner snapshot
 * - InsightsCard: KPI cards (value + delta)
 * - ExecutorCard: Task/Invocation snapshot with progress
 *
 * Guardrails (ST-1206):
 * - Pure presentational components
 * - Do NOT create new scrollers under #a1
 * - Intended for use inside CommandCenterDrawer (fixed overlay outside #a1)
 */

/* ============ Base Card ============ */

export function Card({
  title,
  subtitle,
  actions, // Array<{ label, onClick, title?, disabled? }>
  children,
  footer, // ReactNode
  status, // 'ok' | 'warn' | 'err' | undefined
  style,
  className = "",
}) {
  const badge =
    status === "ok" ? (
      <span style={badgeStyle("#22c55e", 0.35)}>OK</span>
    ) : status === "warn" ? (
      <span style={badgeStyle("#f59e0b", 0.35)}>WARN</span>
    ) : status === "err" ? (
      <span style={badgeStyle("#ef4444", 0.35)}>ERR</span>
    ) : null;

  return (
    <section
      className={["gg-card", className].filter(Boolean).join(" ")}
      style={{
        border: "1px solid var(--gg-border)",
        borderRadius: 10,
        background: "#0e1527",
        color: "var(--gg-fg)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
        ...style,
      }}
      role="region"
      aria-label={title ? `${title} card` : "Card"}
    >
      {(title || actions?.length || subtitle || badge) && (
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            padding: "10px 12px",
            borderBottom: "1px solid var(--gg-border)",
            alignItems: "center",
          }}
        >
          <div>
            {title && (
              <div
                style={{ display: "inline-flex", gap: 8, alignItems: "center" }}
              >
                <h5
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                  }}
                >
                  {title}
                </h5>
                {badge}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
          {Array.isArray(actions) && actions.length > 0 && (
            <div style={{ display: "inline-flex", gap: 6 }}>
              {actions.map((a, idx) => (
                <button
                  key={idx}
                  className="btn"
                  title={a?.title || a?.label}
                  onClick={a?.onClick}
                  disabled={!!a?.disabled}
                  style={miniBtnStyle}
                >
                  {a?.label}
                </button>
              ))}
            </div>
          )}
        </header>
      )}

      <div style={{ padding: 12 }}>{children}</div>

      {footer && (
        <footer
          style={{
            padding: 10,
            borderTop: "1px solid var(--gg-border)",
            background: "#0b1222",
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            fontSize: 12,
            opacity: 0.9,
          }}
        >
          {footer}
        </footer>
      )}
    </section>
  );
}

/* ============ Planner ============ */

export function PlannerCard({
  title = "Planner",
  subtitle = "카테고리/채널/상태/우선순위/제목 스냅샷",
  items, // Array<{ id, title, channel?, status?, priority? }>
  sample, // fallback any
  onCreate,
  onOpen, // (id) => void
  onEdit, // (id) => void
  limit = 5,
}) {
  const list = Array.isArray(items) ? items : [];
  const hasList = list.length > 0;
  const show = hasList ? list.slice(0, limit) : [];

  return (
    <Card
      title={title}
      subtitle={subtitle}
      actions={[
        ...(onCreate
          ? [{ label: "New", onClick: onCreate, title: "새 항목" }]
          : []),
      ]}
      footer={
        !hasList && sample ? (
          <span style={{ opacity: 0.85 }}>
            샘플: {typeof sample === "string" ? sample : safeJSONString(sample)}
          </span>
        ) : null
      }
      status={hasList ? "ok" : "warn"}
    >
      {!hasList ? (
        <div style={{ opacity: 0.8 }}>
          표시할 항목이 없습니다. New로 시작하세요.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {show.map((it) => (
            <div
              key={String(it.id ?? it.title)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
                border: "1px dashed var(--gg-border)",
                borderRadius: 8,
                padding: 8,
                background: "#0b1222",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{it.title || it.id}</div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                    marginTop: 4,
                    display: "inline-flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {it.channel && <Tag label={`#${it.channel}`} />}
                  {it.status && <Tag label={it.status} tone="blue" />}
                  {it.priority && (
                    <Tag label={`P${it.priority}`} tone="amber" />
                  )}
                </div>
              </div>
              <div style={{ display: "inline-flex", gap: 6 }}>
                {onOpen && (
                  <button
                    className="btn"
                    style={miniBtnStyle}
                    onClick={() => onOpen(it.id)}
                  >
                    Open
                  </button>
                )}
                {onEdit && (
                  <button
                    className="btn"
                    style={miniBtnStyle}
                    onClick={() => onEdit(it.id)}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ============ Insights ============ */

export function InsightsCard({
  title = "Insights",
  subtitle = "기간/채널별 KPI 카드",
  metrics, // Array<{ label, value:number|string, delta?:number, unit?:string }>
  footerNote, // string
}) {
  const list = Array.isArray(metrics) ? metrics : [];
  const has = list.length > 0;

  return (
    <Card
      title={title}
      subtitle={subtitle}
      status={has ? "ok" : "warn"}
      footer={footerNote}
    >
      {!has ? (
        <div style={{ opacity: 0.8 }}>표시할 메트릭이 없습니다.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
          }}
        >
          {list.map((m, idx) => (
            <div
              key={idx}
              style={{
                border: "1px dashed var(--gg-border)",
                borderRadius: 8,
                padding: 10,
                background: "#0b1222",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8 }}>{m.label}</div>
              <div
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 700 }}>
                  {m.value}
                  {m.unit ? (
                    <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>
                      {m.unit}
                    </span>
                  ) : null}
                </span>
                {typeof m.delta === "number" && <Delta value={m.delta} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ============ Executor ============ */

export function ExecutorCard({
  title = "Executor",
  subtitle = "작업 상태/진행률/ETA",
  tasks, // Array<{ id, title, progress?:number(0-1), status?:string, eta?:string }>
  invocation, // { tool, args, result:{ ok, data, error } }
  onRerun, // (id) => void
  onOpenLogs, // () => void
}) {
  const list = Array.isArray(tasks) ? tasks : [];
  const hasTasks = list.length > 0;

  // Invocation badge
  const invBadge = invocation && (
    <div style={{ fontSize: 12, opacity: 0.85 }}>
      최근 호출 — <b>{invocation.tool}</b>
      {typeof invocation?.result?.ok === "boolean" && (
        <span style={{ marginLeft: 8 }}>
          {invocation.result.ok ? (
            <span style={badgeStyle("#22c55e", 0.35)}>OK</span>
          ) : (
            <span style={badgeStyle("#ef4444", 0.35)}>ERR</span>
          )}
        </span>
      )}
    </div>
  );

  return (
    <Card
      title={title}
      subtitle={subtitle}
      status={
        hasTasks
          ? "ok"
          : invocation
            ? invocation?.result?.ok
              ? "ok"
              : "warn"
            : undefined
      }
      actions={[
        ...(onOpenLogs
          ? [{ label: "Logs", onClick: onOpenLogs, title: "로그 열기" }]
          : []),
      ]}
      footer={invBadge}
    >
      {!hasTasks ? (
        <div style={{ opacity: 0.8 }}>표시할 작업이 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.map((t) => {
            const p = clamp01(t.progress ?? 0);
            return (
              <div
                key={String(t.id ?? t.title)}
                style={{
                  border: "1px dashed var(--gg-border)",
                  borderRadius: 8,
                  padding: 10,
                  background: "#0b1222",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{t.title || t.id}</div>
                  <div
                    style={{
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    {t.status && <Tag label={t.status} tone="blue" />}
                    {onRerun && (
                      <button
                        className="btn"
                        style={miniBtnStyle}
                        onClick={() => onRerun(t.id)}
                      >
                        Rerun
                      </button>
                    )}
                  </div>
                </div>
                <ProgressBar value={p} />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    fontSize: 12,
                    opacity: 0.85,
                  }}
                >
                  <span>{Math.round(p * 100)}%</span>
                  <span>{t.eta ? `ETA: ${t.eta}` : null}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ============ Primitives ============ */

function Tag({ label, tone = "gray" }) {
  const color =
    tone === "blue"
      ? "#60a5fa"
      : tone === "amber"
        ? "#f59e0b"
        : tone === "green"
          ? "#22c55e"
          : "#9aa4b2";
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 6px",
        borderRadius: 999,
        border: `1px solid ${hexWithAlpha(color, 0.35)}`,
        color,
        background: hexWithAlpha(color, 0.08),
      }}
    >
      {label}
    </span>
  );
}

function Delta({ value }) {
  const v = Number(value || 0);
  const pos = v >= 0;
  const color = pos ? "#22c55e" : "#ef4444";
  const sign = pos ? "+" : "";
  return (
    <span style={{ fontSize: 12, color, fontWeight: 600 }}>
      {sign}
      {v}%
    </span>
  );
}

function ProgressBar({ value = 0 }) {
  const v = clamp01(value);
  return (
    <div
      aria-label="progress"
      style={{
        height: 8,
        background: "#0e1527",
        border: "1px solid var(--gg-border)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.round(v * 100)}%`,
          height: "100%",
          background: "linear-gradient(90deg, #22c55e, #16a34a)",
          transition: "width 180ms ease",
        }}
      />
    </div>
  );
}

/* ============ Utils ============ */

const miniBtnStyle = {
  padding: "6px 10px",
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid var(--gg-border)",
  background: "var(--gg-panel)",
  color: "var(--gg-fg)",
  cursor: "pointer",
};

function badgeStyle(color, alpha) {
  return {
    fontSize: 11,
    padding: "2px 6px",
    borderRadius: 999,
    border: `1px solid ${hexWithAlpha(color, alpha)}`,
    color,
  };
}

function hexWithAlpha(hex, alpha = 0.35) {
  try {
    const h = String(hex || "").replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return "rgba(255,255,255,0.35)";
  }
}

function clamp01(n) {
  const x = Number(n || 0);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function safeJSONString(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/* Default export (convenience) */
export default {
  Card,
  PlannerCard,
  InsightsCard,
  ExecutorCard,
};
