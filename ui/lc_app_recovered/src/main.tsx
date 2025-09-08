import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import RightDrawer from "./a1/RightDrawer";

// Option C — Inline SVG role icons + subtle role-based bubble backgrounds
type Role = "user" | "assistant";

function Icon({ role }: { role: Role }) {
  if (role === "user") {
    return (
      // User (person) icon — inline SVG
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
          fill="currentColor"
          opacity="0.92"
        />
        <path
          d="M4 20a8 8 0 0 1 16 0v1H4v-1z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    );
  }
  return (
    // Assistant (robot) icon — inline SVG
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect
        x="5"
        y="7"
        width="14"
        height="7"
        rx="2"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="9" cy="10" r="1" fill="#fff" />
      <circle cx="15" cy="10" r="1" fill="#fff" />
      <rect
        x="10"
        y="15"
        width="4"
        height="1.6"
        rx="0.8"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

// Seeded random helpers and dummy message generator (realistic simulation)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function getSeedFromURL(): number | null {
  try {
    const sp = new URLSearchParams(location.search);
    const s = sp.get("seed");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function makeRandomText(rand: () => number, from: Role): string {
  const oneLiners = [
    "좋아요!",
    "네, 그렇게 하겠습니다.",
    "감사합니다.",
    "확인했습니다.",
    "어떻게 진행할까요?",
    "지금 바로 적용해 볼게요.",
  ];
  const short = [
    "방금 변경 사항을 반영했습니다.\n중앙선 정렬도 체크했습니다.",
    "말씀하신 포인트 반영해서 스타일을 조정했습니다.\n배경 톤은 아주 미묘하게만 다르게 했습니다.",
    "다음 빌드에 포함하겠습니다.\n이후에 대비/가독성 다시 한 번 점검하죠.",
  ];
  const long = [
    "요청하신 내용 기준으로 3가지 옵션을 정리했습니다:\n- Option A: 빠른 적용, 위험 낮음\n- Option B: 구조 개선 포함, 테스트 필요\n- Option C: 시각 품질 우선, 소요 약간 증가\n어느 방향으로 갈지 알려주세요.",
    "다음 스프린트에서는 키보드 포커스와 스크롤 센티넬을 보강하려 합니다.\n모바일 입력 높이 변화에도 컴포저가 화면 내에 유지되도록 처리할 계획입니다.",
    "ST‑1206 가드를 유지한 상태에서 드로어 토글을 상단으로 통일하겠습니다.\n추가 스크롤 컨테이너는 만들지 않고, 레이아웃은 grid 상태를 유지합니다.",
  ];
  const r = rand();
  if (r < 0.34) return oneLiners[Math.floor(rand() * oneLiners.length)];
  if (r < 0.66) return short[Math.floor(rand() * short.length)];
  return long[Math.floor(rand() * long.length)];
}

function generateDummyMessages(seed: number, count?: number) {
  const rand = mulberry32(seed || 42);
  const total = count ?? 40 + Math.floor(rand() * 11) - 5; // 35~50개
  const out: { id: string; from: Role; text: string }[] = [];
  for (let i = 0; i < total; i++) {
    const from: Role = rand() < 0.55 ? "assistant" : "user"; // 약간 assistant 비중↑
    const text = makeRandomText(rand, from);
    out.push({ id: `m${i + 1}`, from, text });
  }
  return out;
}

function assertST1206() {
  try {
    const wrap = document.getElementById("a1-wrap");
    const wrapDisplay = wrap ? getComputedStyle(wrap).display : "";
    if (wrapDisplay !== "grid") {
      console.error("[ST-1206][WRAP_NOT_GRID] #a1-wrap display is not grid", {
        wrapDisplay,
      });
    }

    const root = document.querySelector("#a1") as HTMLElement | null;
    const composer = document.getElementById("composer");
    const drawer = document.querySelector(
      '[data-gg="right-drawer"]',
    ) as HTMLElement | null;
    const nodes = Array.from(
      document.querySelectorAll("#a1 *"),
    ) as HTMLElement[];

    // Collect overflow:auto elements, but ignore composer subtree and textareas to avoid false positives.
    const scrollerEls = nodes.filter((el) => {
      const cs = getComputedStyle(el);
      const isAuto = cs.overflow === "auto" || cs.overflowY === "auto";
      if (!isAuto) return false;
      if (composer && composer.contains(el)) return false;
      if (drawer && (drawer === el || drawer.contains(el))) return false;
      if (el.tagName === "TEXTAREA") return false;
      return true;
    });

    const names = Array.from(
      new Set(
        scrollerEls.map(
          (el) => el.id || el.className || el.tagName.toLowerCase(),
        ),
      ),
    );

    const required = ["chat-msgs"]; // must exist
    const optional = ["gg-threads"]; // allowed if present
    const offenders = names.filter(
      (n) => ![...required, ...optional].includes(n),
    );
    const missing = required.filter((n) => !names.includes(n));

    if (offenders.length || missing.length) {
      const allowedSet = new Set([...required, ...optional]);
      const details = scrollerEls
        .filter((el) => !allowedSet.has(el.id))
        .map((el) => {
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id,
            class: el.className,
            overflow: cs.overflow,
            overflowY: cs.overflowY,
            path: (() => {
              const parts: string[] = [];
              let cur: HTMLElement | null = el;
              while (cur && cur !== root && parts.length < 6) {
                parts.unshift(
                  `${cur.tagName.toLowerCase()}${cur.id ? "#" + cur.id : ""}${
                    cur.className
                      ? "." + String(cur.className).trim().replace(/\s+/g, ".")
                      : ""
                  }`,
                );
                cur = cur.parentElement;
              }
              return parts.join(" > ");
            })(),
          };
        });
      console.error("[ST-1206][SCROLLER_VIOLATION]", {
        names,
        offenders,
        missing,
        details,
      });
    }

    if (!document.querySelector('[data-gg="composer-actions"]')) {
      console.error("[ST-1206][MISSING_COMPOSER_ACTIONS_MARK]");
    }
  } catch (e) {
    console.error("[ST-1206][SENSOR_ERROR]", e);
  }
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    document.body.classList.add("simple");
    if (localStorage.getItem("gg_env") !== "prod") {
      assertST1206();
    }
  }, []);

  // Global shortcut: Ctrl/Cmd + '.' or ']' toggles the right drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "." || e.key === "]")) {
        e.preventDefault();
        setDrawerOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync right drawer width into CSS var so the visual center stays centered
  useEffect(() => {
    const updatePad = () => {
      const el = document.querySelector(
        '[data-gg="right-drawer"]',
      ) as HTMLElement | null;
      const w = drawerOpen && el ? el.getBoundingClientRect().width : 0;
      document.documentElement.style.setProperty(
        "--gg-right-pad",
        `${Math.round(w)}px`,
      );
    };
    updatePad();
    const el = document.querySelector(
      '[data-gg="right-drawer"]',
    ) as HTMLElement | null;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePad)
        : null;
    if (el && ro) ro.observe(el);
    window.addEventListener("resize", updatePad);
    return () => {
      window.removeEventListener("resize", updatePad);
      ro?.disconnect();
      document.documentElement.style.setProperty("--gg-right-pad", "0px");
    };
  }, [drawerOpen]);

  const threads = Array.from({ length: 24 }, (_, i) => ({
    id: `t${i + 1}`,
    title: `Thread ${i + 1}`,
  }));
  const seed = getSeedFromURL() ?? 42;
  const messages = generateDummyMessages(seed);

  return (
    <div id="a1" className="h-full">
      <div id="a1-wrap" className="a1-grid-rows">
        <RightDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="패널"
        />
        {/* Row 1: Toolbar/Top strip (kept minimal) */}
        <div
          id="a1-toolbar"
          className="px-3 py-2 border-b border-[var(--gg-border)] bg-[var(--gg-panel-alt)]"
        >
          <div className="gg-chat-center flex items-center justify-between">
            <h1 className="text-sm font-medium">Gumgang — LC App (Simple)</h1>
            <div className="flex items-center gap-2">
              <div className="text-xs opacity-60">ST‑1206R</div>
              <button
                type="button"
                onClick={() => setDrawerOpen((v) => !v)}
                className="rounded-md bg-[var(--gg-panel)] text-[var(--gg-text)]/80 px-2 py-1 text-xs ring-1 ring-[var(--gg-border)] hover:brightness-110"
                title="우측 패널 토글 (Ctrl/Cmd + .)"
              >
                Panel ▸
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Middle track — two panes; left threads, right timeline */}
        <div id="a1-middle" className="grid grid-cols-1 min-h-0">
          <aside
            id="gg-threads"
            className="p-3 hidden md:block"
            aria-label="Threads"
          >
            <div className="sticky top-0 bg-transparent pb-2">
              <h2 className="text-sm font-semibold">Threads</h2>
            </div>
            <ul className="space-y-1">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="w-full text-left rounded px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section id="chat-msgs" aria-label="Chat timeline" className="p-0">
            <div className="gg-chat-center px-4 py-6">
              <ol className="list-none m-0 p-0">
                {messages.map((m) => (
                  <li key={m.id} className={`msg ${m.from}`}>
                    <div className="bubble">
                      <span className="sr-only">{m.from}</span>
                      <div className="grid grid-cols-[auto,1fr] gap-2 items-start">
                        <span
                          aria-hidden="true"
                          className="gg-role-icon inline-grid w-5 h-5 place-items-center"
                          style={{
                            color: m.from === "user" ? "#e11d48" : "#7c3aed",
                          }}
                        >
                          <Icon role={m.from as Role} />
                        </span>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          <span className="speaker" aria-hidden="true">
                            {m.from === "user" ? "덕산" : "금강"} ·
                          </span>{" "}
                          {m.text}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        {/* Row 3: Composer (input + actions) */}
        <div
          id="composer"
          className="py-2 safe-bottom-pad grid grid-cols-1 md:[grid-template-columns:minmax(0,var(--gg-threads-w))_minmax(0,1fr)]"
        >
          <div
            className="hidden md:block"
            aria-hidden="true"
            style={{
              background: "var(--gg-bg)",
              borderRight: "1px solid var(--gg-border)",
              width: "var(--gg-threads-w)",
              height: "100%",
            }}
          />
          <div className="gg-chat-center px-4 md:col-start-2">
            <div className="composer-shell grid grid-cols-[1fr_auto] items-end gap-2 bg-[var(--gg-composer)] ring-1 ring-[var(--gg-border)]/50 rounded-2xl p-2 shadow-sm">
              <div className="min-w-0">
                <label htmlFor="chat-input" className="sr-only">
                  Message
                </label>
                <textarea
                  id="chat-input"
                  rows={3}
                  placeholder="메시지를 입력하세요…"
                  aria-label="메시지 입력창"
                  aria-multiline="true"
                  className="block w-full resize-none rounded-xl bg-transparent p-3 outline-none focus:ring-2 focus:ring-[var(--gg-accent)]/70"
                />
              </div>
              <div
                data-gg="composer-actions"
                className="flex items-center gap-2 pr-1"
              >
                <button
                  type="button"
                  title="보내기 (Ctrl+Enter)"
                  aria-label="메시지 보내기"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--gg-accent)] text-[var(--gg-accent-contrast)] shadow-sm hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--gg-accent)]/70"
                  onClick={() => {
                    // no-op for scaffold
                  }}
                >
                  ✈
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
