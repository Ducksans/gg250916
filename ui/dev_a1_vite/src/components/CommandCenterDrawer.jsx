/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/CommandCenterDrawer.jsx
 * @분석일자: 2025-09-10T16:24Z (UTC) / 2025-09-11 01:24 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 화면 오른쪽에 나타나는 '커맨드 센터' 오버레이 드로어의 UI와 동작을 정의하는 프레젠테이셔널 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (탭 UI) `planner`, `insights` 등 여러 패널로 전환할 수 있는 탭 UI를 렌더링합니다.
 *  - 2. (콘텐츠 표시) 현재 활성화된 탭에 해당하는 스켈레톤 UI와 데이터를 표시합니다.
 *  - 3. (상태 위임) 표시 여부, 활성 탭 등 모든 상태와 로직을 상위 컴포넌트(`A1Dev.jsx`)에 위임합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (임포트) → `@/components/panels/Cards`
 *
 * @참고사항
 *  - 현재는 각 패널이 '스켈레톤' 상태이며, 향후 각 패널에 해당하는 백엔드 연동이 필요합니다.
 *  - '1파일 1책임' 원칙은 준수하고 있으므로 리팩토링은 현재 시급하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useRef } from "react";
import {
  PlannerCard,
  InsightsCard,
  ExecutorCard,
} from "@/components/panels/Cards";
// PropTypes removed (no external dependency)

/**
 * CommandCenterDrawer
 * - Right-side overlay drawer with tabbed panels (Planner, Insights, Executor, Agents, Prompts, Files, Bookmarks)
 * - Pure presentational component; state (open/close/tab) is controlled by parent
 *
 * Guardrails (ST-1206):
 * - Drawer is fixed overlay; does NOT introduce new scrollers under #a1
 * - No overflow:auto containers added here
 *
 * Enhancements:
 * - Accepts data props (plannerData, insightsData, executorData)
 * - Renders one real data snippet per corresponding panel when provided
 */

const TAB_KEYS = [
  "planner",
  "insights",
  "executor",
  "agents",
  "prompts",
  "files",
  "bookmarks",
  "pyspark",
];

function PanelSkeleton({ id, title, description, children }) {
  return (
    <section id={id} className="cc-skel" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>{title}</h4>
      <p>{description}</p>
      {children}
    </section>
  );
}

/* PropTypes removed */

function toSample(data) {
  // Accepts array | { items: [] } | object | primitive
  if (!data) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  if (typeof data === "object") {
    if (Array.isArray(data.items)) return data.items[0] ?? null;
    return data;
  }
  return data;
}

function RealSnippet({ label, data }) {
  const sample = toSample(data);
  if (sample == null) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
        Live sample — {label}
      </div>
      <pre
        style={{
          margin: 0,
          background: "#0e1527",
          padding: 8,
          borderRadius: 8,
          border: "1px solid var(--gg-border)",
          whiteSpace: "pre-wrap",
        }}
      >
        {typeof sample === "string" ? sample : JSON.stringify(sample, null, 2)}
      </pre>
    </div>
  );
}

function renderPanel(
  tab,
  { plannerData, insightsData, executorData, pysparkData, onPlannerRunPyspark },
) {
  switch (tab) {
    case "planner":
      return (
        <PanelSkeleton
          id="cc-planner"
          title="콘텐츠 플래너(포털)"
          description="카테고리/채널/상태/우선순위/제목/슬러그를 관리합니다. (스켈레톤)"
        >
          <PlannerCard sample={plannerData} />
          <div style={{ marginTop: 10, display: "inline-flex", gap: 8 }}>
            <button
              className="btn"
              title="샘플 PySpark 잡 실행"
              onClick={() => onPlannerRunPyspark?.()}
            >
              Run PySpark (sample)
            </button>
          </div>
        </PanelSkeleton>
      );
    case "insights":
      return (
        <PanelSkeleton
          id="cc-insights"
          title="성과 인사이트"
          description="기간/채널별 KPI 카드와 표 요약을 표시합니다. (스켈레톤)"
        >
          <InsightsCard
            metrics={[
              {
                label: "Backend",
                value: (insightsData && insightsData.backend) || "…",
              },
              {
                label: "Bridge",
                value: (insightsData && insightsData.bridge) || "…",
              },
            ]}
            footerNote="실시간 헬스 상태를 반영합니다."
          />
        </PanelSkeleton>
      );
    case "executor":
      return (
        <PanelSkeleton
          id="cc-executor"
          title="실행기(Executor)"
          description="작업 상태/진행률/ETA를 모니터링하고 액션을 제공합니다. (스켈레톤)"
        >
          <ExecutorCard invocation={executorData} tasks={[]} />
        </PanelSkeleton>
      );
    case "agents":
      return (
        <PanelSkeleton
          id="cc-agents"
          title="에이전트"
          description="에이전트 목록과 태그/모델/툴셋 요약. (스켈레톤)"
        />
      );
    case "prompts":
      return (
        <PanelSkeleton
          id="cc-prompts"
          title="프롬프트"
          description="템플릿/버전/태그 관리. (스켈레톤)"
        />
      );
    case "files":
      return (
        <PanelSkeleton
          id="cc-files"
          title="파일"
          description="브릿지 /api/fs 연동(목록/열기/저장) 자리. (스켈레톤)"
        />
      );
    case "bookmarks":
      return (
        <PanelSkeleton
          id="cc-bookmarks"
          title="북마크"
          description="중요 링크/문서/스레드를 빠르게 접근. (스켈레톤)"
        />
      );
    case "pyspark":
      return (
        <PanelSkeleton
          id="cc-pyspark"
          title="PySpark 실행 결과"
          description="최근 실행 결과 요약과 Evidence 파일 경로를 표시합니다."
        >
          <RealSnippet label="Latest PySpark" data={pysparkData} />
        </PanelSkeleton>
      );
    default:
      return (
        <PanelSkeleton
          id="cc-unknown"
          title="알 수 없는 패널"
          description="지원되지 않는 탭입니다."
        />
      );
  }
}

export default function CommandCenterDrawer({
  show,
  activeTab,
  onTabChange,
  onClose,
  onOpenInMain,
  plannerData,
  insightsData,
  executorData,
  pysparkData,
  onPysparkRefresh,
  onPysparkRerun,
  onPlannerRunPyspark,
}) {
  const firstTabRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  // Focus first tab when opened
  useEffect(() => {
    if (show && firstTabRef.current) {
      try {
        firstTabRef.current.focus();
      } catch {
        // ignore
      }
    }
  }, [show]);

  if (!show) return null;

  return (
    <aside
      className="cc-drawer"
      role="dialog"
      aria-label="Command Center"
      data-testid="cc-drawer"
    >
      <div className="cc-head">
        <div className="cc-tabs" role="tablist" aria-label="Panels">
          {TAB_KEYS.map((k, idx) => (
            <button
              key={k}
              ref={idx === 0 ? firstTabRef : undefined}
              className={`cc-tab ${activeTab === k ? "active" : ""}`}
              onClick={() => onTabChange?.(k)}
              role="tab"
              aria-selected={activeTab === k}
              aria-controls={`cc-${k}`}
              title={k}
              data-testid={`cc-tab-${k}`}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: "inline-flex", gap: 8 }}>
          <button
            className="cc-close"
            onClick={() => onOpenInMain?.(activeTab)}
            data-testid="cc-open-main"
            title="Open this panel in main area"
          >
            Open in main
          </button>
          <button className="cc-close" onClick={onClose} data-testid="cc-close">
            Close
          </button>
        </div>
      </div>
      <div className="cc-body" data-testid="cc-body">
        {activeTab === "pyspark" ? (
          <section id="cc-pyspark" className="cc-skel" aria-labelledby="cc-pyspark-title">
            <h4 id="cc-pyspark-title">PySpark 실행 결과</h4>
            <p>최근 실행 결과 요약과 Evidence 파일 경로를 표시합니다.</p>
            {pysparkData ? (
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0" }}>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>RC:</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        (pysparkData?.data?.rc ?? 1) === 0
                          ? "#35c46a"
                          : "#ff6b6b",
                    }}
                  >
                    {pysparkData?.data?.rc ?? "?"}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>Script:</span>
                  <code style={{ fontSize: 12 }}>{pysparkData?.data?.script || "(unknown)"}</code>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>Evidence:</span>
                  <code style={{ fontSize: 12 }}>{pysparkData?.path || "(none)"}</code>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <button
                    className="btn"
                    onClick={() => onPysparkRefresh?.()}
                    title="최근 결과 새로고침"
                  >
                    Refresh
                  </button>
                  <button
                    className="btn"
                    onClick={() => onPysparkRerun?.(pysparkData?.data?.script)}
                    title="같은 스크립트로 재실행"
                  >
                    Rerun
                  </button>
                  {pysparkData?.path && (
                    <>
                      <button
                        className="btn"
                        title="Evidence 파일 보기(FastAPI Viewer)"
                        onClick={() =>
                          window.open(
                            `/api/files/view?path=/${encodeURIComponent(
                              pysparkData.path,
                            )}`,
                            "_blank",
                          )
                        }
                      >
                        Open Evidence
                      </button>
                      <button
                        className="btn"
                        title="Evidence 경로 복사"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(pysparkData.path);
                          } catch {}
                        }}
                      >
                        Copy Path
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>stdout</div>
                    <pre
                      style={{
                        margin: 0,
                        background: "#0e1527",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid var(--gg-border)",
                        whiteSpace: "pre-wrap",
                        maxHeight: 320,
                        overflow: "auto",
                      }}
                    >
                      {pysparkData?.data?.stdout || "(empty)"}
                    </pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>stderr</div>
                    <pre
                      style={{
                        margin: 0,
                        background: "#0e1527",
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid var(--gg-border)",
                        whiteSpace: "pre-wrap",
                        maxHeight: 320,
                        overflow: "auto",
                      }}
                    >
                      {pysparkData?.data?.stderr || "(empty)"}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <p>최근 실행 결과가 없습니다. Run PySpark 버튼으로 실행하세요.</p>
            )}
          </section>
        ) : (
          renderPanel(activeTab, {
            plannerData,
            insightsData,
            executorData,
            pysparkData,
            onPlannerRunPyspark,
          })
        )}
      </div>
    </aside>
  );
}

/* PropTypes removed */

CommandCenterDrawer.defaultProps = {
  show: false,
  activeTab: "planner",
  onTabChange: () => {},
  onClose: () => {},
  onOpenInMain: () => {},
  plannerData: null,
  insightsData: null,
  executorData: null,
  pysparkData: null,
  onPysparkRefresh: () => {},
  onPysparkRerun: () => {},
  onPlannerRunPyspark: () => {},
};
