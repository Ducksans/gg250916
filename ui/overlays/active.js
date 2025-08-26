/*
  Gumgang UI Overlay — labs/default.js
  Purpose:
    - Sample runtime overlay script injected without rebuild.
    - Enhances UX gently (tooltips, shortcuts, helpers) without breaking base UI.
  Safety:
    - Idempotent; does nothing twice.
    - Respects SAFE/LOWFX modes; no heavy effects.
  Scope:
    - No external deps. ES5-compatible. Minimal globals.
*/

(function () {
  "use strict";

  if (window.__GG_OVERLAY_ACTIVE_JS__) return;
  window.__GG_OVERLAY_ACTIVE_JS__ = true;

  // ===== ST-1206 T3 — Composer wrap setup (must be before grid) =====
  function ensureComposerWrap() {
    try {
      var b = document.body || document.documentElement;
      if (!b || !b.classList.contains("simple")) return;
      var wrap = document.getElementById("a1-wrap");
      if (!wrap) return;
      var ta = document.getElementById("chat-input");
      if (!ta) return;

      // Create or get wrapper
      var cw = document.getElementById("composer-wrap");
      if (!cw) {
        cw = document.createElement("div");
        cw.id = "composer-wrap";
        // Critical: display:contents makes wrapper invisible to grid
        cw.style.display = "contents";

        // Find insertion point (after chat-msgs)
        var msgs = document.getElementById("chat-msgs");
        if (msgs && msgs.nextSibling) {
          wrap.insertBefore(cw, msgs.nextSibling);
        } else {
          wrap.appendChild(cw);
        }
      }

      // Ensure display:contents is always set
      cw.style.display = "contents";

      // Move all composer-related elements into wrapper
      // This includes textarea, button row, and any adjacent composer elements
      var elementsToWrap = [];

      // Add textarea if not already wrapped
      if (ta.parentNode !== cw) {
        elementsToWrap.push(ta);
      }

      // Find button row (next sibling of textarea or with composer-actions)
      var btnRow = ta.nextElementSibling;
      if (btnRow && btnRow.parentNode !== cw) {
        elementsToWrap.push(btnRow);
      }

      // Find any element with composer-actions attribute
      var actions = wrap.querySelector('[data-gg="composer-actions"]');
      if (actions && actions.parentNode !== cw) {
        elementsToWrap.push(actions);
      }

      // Move budget row if exists
      var budget = document.getElementById("budget-input");
      if (budget) {
        var budgetRow = budget.parentElement;
        while (budgetRow && !budgetRow.classList.contains("row")) {
          budgetRow = budgetRow.parentElement;
        }
        if (budgetRow && budgetRow.parentNode !== cw) {
          elementsToWrap.push(budgetRow);
        }
      }

      // Move all collected elements into wrapper
      elementsToWrap.forEach(function (el) {
        if (el && el.parentNode) {
          try {
            cw.appendChild(el);
          } catch (_) {}
        }
      });

      // Ensure no anchor-result in composer (should be in chat-msgs)
      var anchor = document.getElementById("anchor-result");
      if (anchor && anchor.parentNode === cw) {
        var msgs = document.getElementById("chat-msgs");
        if (msgs) {
          try {
            msgs.appendChild(anchor);
            anchor.style.marginTop = "8px";
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  // ===== ST-1206 T3 — Simple 모드 강제 그리드/센터링 보강 =====
  function ensureSimpleGrid() {
    try {
      if (!document.body.classList.contains("simple")) {
        // Restore global scroll for non-simple (Pro) mode
        try {
          document.documentElement.style.overflow = "";
        } catch (_) {}
        try {
          document.body.style.overflow = "";
        } catch (_) {}
        return;
      }
      var wrap = document.getElementById("a1-wrap");
      if (!wrap) return;
      // CRITICAL: Composer wrap must be done first to establish structure
      try {
        ensureComposerWrap();
      } catch (_) {}
      // 템플릿 인라인 flex가 있으면 제거 (grid 전환 방해 요소)
      ["display", "flexDirection", "gap", "marginTop"].forEach(function (k) {
        try {
          var hy = k.replace(/[A-Z]/g, function (m) {
            return "-" + m.toLowerCase();
          });
          if (wrap.style.getPropertyValue(hy)) wrap.style.removeProperty(hy);
        } catch (_) {}
      });
      // 안전하게 grid 지정(인라인로도 보강)
      wrap.style.display = "grid";
      wrap.style.gridTemplateRows = "auto minmax(0, 1fr) auto";
      wrap.style.gridTemplateColumns =
        "minmax(0, var(--gg-chat-width, 880px)) auto";
      wrap.style.justifyContent = "center";
      // Ensure wrapper height and overflow clamp for proper inner scroll
      wrap.style.height = "calc(100dvh - var(--gg-strip-h, 46px))";
      wrap.style.overflow = "hidden";
      // Prevent implicit rows
      wrap.style.gridAutoRows = "0";
      // Ensure global scroll is hidden in Simple mode
      try {
        document.documentElement.style.overflow = "hidden";
      } catch (_) {}
      try {
        document.body.style.overflow = "hidden";
      } catch (_) {}

      // Ensure min-height chain allows shrink
      ["a1", "a1-right", "a1-wrap", "chat-msgs"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.style.minHeight = "0";
      });

      // Strengthen scroll container styles
      var msgs = document.getElementById("chat-msgs");
      if (msgs) {
        // place timeline in grid row 2 spanning all columns; allow shrink
        msgs.style.gridRow = "2";
        msgs.style.gridColumn = "1 / -1";
        msgs.style.minHeight = "0";
        msgs.style.overflowY = "auto";
        msgs.style.height = "auto";
        msgs.style.maxHeight = "none";

        // Collect all auxiliary elements that should be inside timeline
        var auxElements = ["anchor-result", "consent-bar", "a1-usage"];

        // Move all auxiliary elements into timeline to prevent implicit rows
        auxElements.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.parentElement && el.parentElement.id !== "chat-msgs") {
            try {
              msgs.appendChild(el);
              el.style.marginTop = "8px";
              el.style.maxWidth = "var(--gg-chat-width, 880px)";
              el.style.marginLeft = "auto";
              el.style.marginRight = "auto";
            } catch (_) {}
          }
        });

        // Legacy individual handling for compatibility
        var anchor = document.getElementById("anchor-result");
        if (
          anchor &&
          anchor.parentElement &&
          anchor.parentElement.id !== "chat-msgs"
        ) {
          try {
            msgs.appendChild(anchor);
          } catch (_) {}
          anchor.style.marginTop = "6px";
          anchor.style.maxWidth = "var(--gg-chat-width, 880px)";
          anchor.style.marginLeft = "auto";
          anchor.style.marginRight = "auto";
        }
        // Move consent bar inside timeline to prevent implicit grid row
        var consent = document.getElementById("consent-bar");
        if (
          consent &&
          consent.parentElement &&
          consent.parentElement.id !== "chat-msgs"
        ) {
          try {
            msgs.appendChild(consent);
          } catch (_) {}
          consent.style.marginTop = "8px";
          consent.style.maxWidth = "var(--gg-chat-width, 880px)";
          consent.style.marginLeft = "auto";
          consent.style.marginRight = "auto";
        }
        // Move usage summary inside timeline to keep 3-row template stable
        var usage = document.getElementById("a1-usage");
        if (
          usage &&
          usage.parentElement &&
          usage.parentElement.id !== "chat-msgs"
        ) {
          try {
            msgs.appendChild(usage);
          } catch (_) {}
          usage.style.marginTop = "6px";
          usage.style.maxWidth = "var(--gg-chat-width, 880px)";
          usage.style.marginLeft = "auto";
          usage.style.marginRight = "auto";
        }
      }

      // Clean up any stray direct children that shouldn't be there
      var children = Array.prototype.slice.call(wrap.children);
      var allowedIds = ["gg-threads", "chat-msgs", "composer-wrap"];
      var allowedClasses = ["row"]; // for toolbar rows

      children.forEach(function (child) {
        var id = child.id || "";
        var isAllowed = false;

        // Check if it's an allowed element
        if (allowedIds.indexOf(id) !== -1) {
          isAllowed = true;
        } else if (child.classList && child.classList.contains("row")) {
          // Check if it's a toolbar row (not composer-related)
          var hasInput = child.querySelector("#chat-input");
          var hasActions = child.querySelector('[data-gg="composer-actions"]');
          if (!hasInput && !hasActions) {
            isAllowed = true;
          }
        }

        // Move unexpected elements into chat-msgs
        if (!isAllowed && msgs) {
          try {
            msgs.appendChild(child);
            child.style.marginTop = "8px";
          } catch (_) {}
        }
      });

      // 입력창/버튼 정렬 보강(템플릿 변형 대응)
      var input = document.getElementById("chat-input");
      if (input) {
        input.style.maxWidth = "var(--gg-chat-width, 880px)";
        input.style.margin = "0 auto";
        input.style.gridRow = "3";
        input.style.gridColumn = "1";
        // neutralize native textarea scrollbars to avoid clipping
        input.style.overflow = "visible";
        input.style.maxHeight = "35vh";

        var btnRow = input.nextElementSibling;
        if (btnRow) {
          // Mark for durable CSS targeting
          btnRow.setAttribute("data-gg", "composer-actions");
          btnRow.style.gridRow = "3";
          btnRow.style.gridColumn = "2";
          btnRow.style.justifySelf = "end";
          btnRow.style.display = "flex";
          btnRow.style.gap = "8px";
          btnRow.style.alignItems = "flex-end";
        }

        // Hide Budget row container (Simple mode only)
        try {
          var budget = document.getElementById("budget-input");
          if (budget) {
            var pp = budget.parentElement;
            var row = null,
              hops = 0;
            while (pp && hops < 5) {
              if (pp.classList && pp.classList.contains("row")) {
                row = pp;
                break;
              }
              pp = pp.parentElement;
              hops++;
            }
            if (row) row.style.display = "none";
          }
        } catch (_) {}
      }
    } catch (e) {
      try {
        console.warn("[ST-1206] ensureSimpleGrid warn:", e);
      } catch (_) {}
    }
  }
  // Initialization sequence function to ensure proper order
  function initializeUIGuardrails() {
    ensureComposerWrap(); // Must be first to establish structure
    ensureSimpleGrid(); // Then apply grid layout
    reparentA1ChildrenIfEmpty(); // Finally handle any empty wrap cases
  }

  // Ensure grid is applied even if overlay loads late
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUIGuardrails, {
      once: true,
    });
    window.addEventListener("load", initializeUIGuardrails, { once: true });
  } else {
    initializeUIGuardrails();
    window.addEventListener("load", initializeUIGuardrails, { once: true });
  }
  // 모드 토글 시에도 재적용(예: Simple <-> Pro). 이벤트 미발행 시 무시됨.
  window.addEventListener("gg:ui-mode-change", initializeUIGuardrails);

  // ===== ST-1206 T3 — Dev-only runtime sensor (assertUIPitstop) =====
  function assertUIPitstop() {
    try {
      var root = document.getElementById("a1");
      if (!root) return;

      // Collect results for summary
      var results = {
        scrollers: { pass: false, detail: null },
        grid: { pass: false, detail: null },
        rows: { pass: false, detail: null },
        composer: { pass: false, detail: null },
        directChildren: { pass: false, detail: null },
      };

      // 1) scroller set must be exactly two in A1 subtree
      var autos = Array.prototype.slice
        .call(root.querySelectorAll("*"))
        .filter(function (e) {
          var tag = ((e && e.tagName) || "").toLowerCase();
          if (tag === "textarea" || tag === "input") return false;
          var cs = getComputedStyle(e);
          return (
            cs.overflow === "auto" ||
            cs.overflowY === "auto" ||
            cs.overflowX === "auto"
          );
        })
        .map(function (e) {
          return e.id || e.className || e.tagName;
        });
      var allowed = ["gg-threads", "chat-msgs"];
      var bad = autos.filter(function (x) {
        return allowed.indexOf(x) === -1;
      });
      results.scrollers.pass = bad.length === 0 && autos.length === 2;
      results.scrollers.detail = { autos: autos, bad: bad };

      // 2) #a1-wrap must be grid with correct rows
      var wrap = document.getElementById("a1-wrap");
      if (!wrap) {
        results.grid.pass = false;
        results.grid.detail = "No #a1-wrap found";
      } else {
        var wrapStyle = getComputedStyle(wrap);
        results.grid.pass = wrapStyle.display === "grid";
        results.grid.detail = wrapStyle.display;

        // Check grid template rows
        var rows = (wrapStyle.gridTemplateRows || "").replace(/\s+/g, " ");
        var rowValues = rows.split(" ").filter(function (v) {
          return v && v !== "none";
        });
        var hasMinmax = /minmax\(\s*0(px)?\s*,\s*1fr\s*\)/i.test(rows);

        results.rows.pass = hasMinmax && rowValues.length === 3;
        results.rows.detail = {
          raw: rows,
          count: rowValues.length,
          values: rowValues,
          hasMinmax: hasMinmax,
        };

        // Check direct children (should be 3: toolbar row, chat-msgs, composer-wrap)
        var directChildren = Array.prototype.slice.call(wrap.children);
        var childInfo = directChildren.map(function (el) {
          return {
            id: el.id || "(no id)",
            class: el.className || "(no class)",
            tag: el.tagName.toLowerCase(),
          };
        });

        results.directChildren.pass = directChildren.length <= 3;
        results.directChildren.detail = {
          count: directChildren.length,
          children: childInfo,
        };
      }

      // 3) composer actions mark must exist
      var composerActions = document.querySelector(
        '[data-gg="composer-actions"]',
      );
      results.composer.pass = !!composerActions;
      results.composer.detail = composerActions ? "Found" : "Missing";

      // Log summary
      var allPass = Object.keys(results).every(function (k) {
        return results[k].pass;
      });

      if (!allPass) {
        console.group("[ST-1206] UI Pitstop Sensor Results");
        Object.keys(results).forEach(function (k) {
          var r = results[k];
          console.log(k + ":", r.pass ? "✅ PASS" : "❌ FAIL", r.detail);
        });
        console.groupEnd();
      }

      // Legacy error reporting for compatibility
      if (!results.scrollers.pass) {
        console.error("SCROLLER_VIOLATION", results.scrollers.detail);
      }
      if (!results.grid.pass) {
        console.error("A1_WRAP_NOT_GRID", results.grid.detail);
      }
      if (!results.rows.pass) {
        console.error("A1_WRAP_ROWS_ISSUE", results.rows.detail);
      }
      if (!results.composer.pass) {
        console.error("MISSING_COMPOSER_ACTIONS_MARK");
      }
      if (!results.directChildren.pass) {
        console.warn(
          "A1_WRAP_TOO_MANY_CHILDREN",
          results.directChildren.detail,
        );
      }
    } catch (e) {
      try {
        console.warn("[assertUIPitstop] exception:", e);
      } catch (_) {}
    }
  }
  // Dev-only trigger (localStorage.gg_env !== 'prod') and Simple mode only
  try {
    var __env = (localStorage.getItem("gg_env") || "").toLowerCase();
    if (__env !== "prod") {
      document.addEventListener("DOMContentLoaded", function () {
        try {
          var b = document.body || document.documentElement;
          if (b && b.classList && b.classList.contains("simple")) {
            setTimeout(assertUIPitstop, 0);
          }
        } catch (_) {}
      });
    }
  } catch (_) {}
  // ===== /ST-1206 T3 sensor =====
  // ===== ST-1206 guard: wrap 비었을 때 자식 재귀합 + grid 강제 =====
  function reparentA1ChildrenIfEmpty() {
    try {
      var wrap = document.getElementById("a1-wrap");
      if (!wrap) return;
      if (wrap.children.length === 0) {
        var el = wrap.nextElementSibling,
          moved = 0;
        var stop = new Set(["a2", "a3", "a4", "a5", "a6", "a7", "a8"]);
        while (el && !stop.has(el.id) && moved < 200) {
          var next = el.nextElementSibling;
          wrap.appendChild(el);
          el = next;
          moved++;
        }
        try {
          console.warn(
            "[ST-1206] #a1-wrap was empty — moved",
            moved,
            "siblings inside.",
          );
        } catch (_) {}
      }
      // grid 보강(인라인 flex 무력화)
      wrap.style.display = "grid";
      wrap.style.gridTemplateRows = "auto minmax(0, 1fr) auto";
      wrap.style.gridTemplateColumns =
        "minmax(0, var(--gg-chat-width, 880px)) auto";
      wrap.style.justifyContent = "center";
      wrap.style.gridAutoRows = "0";
    } catch (e) {
      try {
        console.warn("[ST-1206] guard warn:", e);
      } catch (_) {}
    }
  }
  // ===== /ST-1206 T3 =====

  // Step C — chat bubbles + refs hook (overlay-only, non-destructive)
  // - Wrap global addChatMsg to render .msg.{user|assistant} with .bubble
  // - Inject hidden refs text (with "#Lx-y") so Step 2 evidence summarizer can detect it
  (function setupStepC() {
    function renderBubble(role, content, refs) {
      try {
        var host = document.getElementById("chat-msgs");
        if (!host) return false;
        var msg = document.createElement("div");
        msg.className =
          "msg " +
          (role === "user" || role === "assistant" ? role : "assistant");
        var bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.textContent = content == null ? "" : String(content);
        msg.appendChild(bubble);
        // Hidden refs carrier for summarizer (wireEvidenceCollapse scans textContent)
        try {
          var r = Array.isArray(refs) ? refs.slice(0) : [];
          if (!r.length && Array.isArray(window.__recallRefs))
            r = window.__recallRefs.slice(0);
          if (window.__gg_last_evidence_path)
            r.push(String(window.__gg_last_evidence_path));
          if (r.length) {
            var hidden = document.createElement("div");
            hidden.style.cssText = "display:none";
            hidden.className = "gg-refs";
            hidden.textContent = r.join(" ");
            msg.appendChild(hidden);
          }
        } catch (_) {}
        host.appendChild(msg);
        try {
          var nearFn =
            window.ggNearBottom ||
            function (el, px) {
              return (
                !!el &&
                el.scrollHeight - (el.scrollTop + el.clientHeight) <= (px || 48)
              );
            };
          var bottomFn =
            window.ggScrollToBottom ||
            function (el) {
              if (el) el.scrollTop = el.scrollHeight;
            };
          if (nearFn(host, 48)) {
            bottomFn(host);
          } else if (window.ggToast) {
            window.ggToast("새 메시지 1", "");
          }
        } catch (_) {}
        return true;
      } catch (_) {
        return false;
      }
    }

    // Install wrapper once DOM is ready
    ready(function () {
      try {
        if (
          !window.__ggOrigAddChatMsg &&
          typeof window.addChatMsg === "function"
        ) {
          window.__ggOrigAddChatMsg = window.addChatMsg;
        }
        window.addChatMsg = function (role, content) {
          // Try bubble first; fallback to original if container missing
          if (!renderBubble(role, content)) {
            if (typeof window.__ggOrigAddChatMsg === "function") {
              try {
                return window.__ggOrigAddChatMsg(role, content);
              } catch (_) {}
            }
          }
        };
      } catch (_) {
        /* no-op */
      }

      // --- Operational Trace (thinking badge + fetch instrumentation) ---
      (function initOperationalTrace() {
        if (window.__GG_OPTRACE_READY__) return;
        window.__GG_OPTRACE_READY__ = true;

        function ensureThinkingHost() {
          var host = document.getElementById("chat-msgs");
          if (!host) return null;
          var badge = document.getElementById("gg-thinking");
          if (!badge) {
            badge = document.createElement("div");
            badge.id = "gg-thinking";
            badge.style.cssText =
              "position:sticky;top:4px;z-index:5;max-width:820px;margin:0 auto 6px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.45);color:#60a5fa;padding:6px 8px;border-radius:8px;font:12px system-ui,-apple-system,Segoe UI,Roboto,Arial;display:none;";
            badge.textContent = "생각 중…";
            try {
              // Insert inside timeline to align width/centering and avoid grid row shift
              host.insertAdjacentElement("afterbegin", badge);
            } catch (_) {
              try {
                host.appendChild(badge);
              } catch (__) {}
            }
          }
          return badge;
        }
        var __tickTimer = null;
        var __runStart = 0;
        function showThinking() {
          var b = ensureThinkingHost();
          if (!b) return;
          __runStart = Date.now();
          b.style.display = "block";
          b.textContent = "생각 중… 0s";
          if (__tickTimer) clearInterval(__tickTimer);
          __tickTimer = setInterval(function () {
            var s = Math.max(0, Math.round((Date.now() - __runStart) / 1000));
            b.textContent = "생각 중… " + s + "s";
          }, 500);
        }
        function hideThinking() {
          var b = document.getElementById("gg-thinking");
          if (b) b.style.display = "none";
          if (__tickTimer) {
            clearInterval(__tickTimer);
            __tickTimer = null;
          }
        }

        function appendRunLog() {
          try {
            var msgs = document.getElementById("chat-msgs");
            if (!msgs) return;
            var target =
              msgs.querySelector(".msg.assistant:last-of-type") || msgs;
            var log = (window.__ggRunLog || []).slice(-20);
            if (!log.length) return;
            var ev = document.createElement("div");
            ev.className = "gg-ev";
            ev.setAttribute("data-collapsed", "1");
            var sum = document.createElement("div");
            sum.className = "gg-ev-summary";
            var chip = document.createElement("span");
            chip.className = "gg-chip-ev ok";
            chip.textContent = "작업 로그 보기 · " + log.length + " step";
            sum.appendChild(chip);
            var hint = document.createElement("span");
            hint.textContent = "클릭하여 보기/접기";
            hint.style.opacity = ".8";
            hint.style.fontSize = "11px";
            sum.appendChild(hint);
            var list = document.createElement("div");
            list.className = "gg-ev-list";
            list.textContent = log
              .map(function (e) {
                var dt = (e.t && new Date(e.t).toISOString()) || "";
                var st = e.type || "";
                var u = ("" + (e.url || "")).replace(/^https?:\/\/[^/]+/i, "");
                return (
                  dt +
                  " • " +
                  st +
                  " • " +
                  u +
                  (e.ok === false ? " • fail" : "")
                );
              })
              .join("\n");
            ev.appendChild(sum);
            ev.appendChild(list);
            sum.onclick = function () {
              var c = ev.getAttribute("data-collapsed") === "1";
              ev.setAttribute("data-collapsed", c ? "0" : "1");
            };
            target.insertAdjacentElement("afterend", ev);
          } catch (_) {}
        }

        if (!window.__GG_FETCH_PATCHED__) {
          window.__GG_FETCH_PATCHED__ = true;
          var __origFetch = window.fetch;
          window.fetch = function () {
            try {
              var u = arguments[0];
              var url = typeof u === "string" ? u : u && u.url ? u.url : "";
              var track =
                /\/api\/(search\/unified|chat|threads\/(append|read|recent))/.test(
                  url || "",
                );
              var t0 = Date.now();
              if (track) {
                window.__ggRunLog = window.__ggRunLog || [];
                window.__ggRunLog.push({ type: "start", url: url, t: t0 });
                if (/\/api\/chat/.test(url)) showThinking();
              }
              return __origFetch
                .apply(this, arguments)
                .then(function (resp) {
                  if (track) {
                    window.__ggRunLog.push({
                      type: "end",
                      url: url,
                      t: Date.now(),
                      ok: resp && resp.ok,
                    });
                    if (/\/api\/chat/.test(url)) {
                      hideThinking();
                      appendRunLog();
                    }
                  }
                  return resp;
                })
                .catch(function (e) {
                  if (track) {
                    window.__ggRunLog.push({
                      type: "error",
                      url: url,
                      t: Date.now(),
                      err: String(e),
                    });
                    if (/\/api\/chat/.test(url)) {
                      hideThinking();
                      appendRunLog();
                    }
                  }
                  throw e;
                });
            } catch (_) {
              return __origFetch.apply(this, arguments);
            }
          };
        }
      })();
    });
  })();

  // ---------- Utilities ----------
  function nowISO() {
    try {
      return new Date().toISOString();
    } catch (_) {
      return "" + Date.now();
    }
  }
  function yyyymmdd(d) {
    d = d || new Date();
    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }
  function sessionId() {
    try {
      var k = (localStorage.getItem("gg_session_id") || "GG-SESS-LOCAL").trim();
      return k || "GG-SESS-LOCAL";
    } catch (_) {
      return "GG-SESS-LOCAL";
    }
  }
  function bridgeBase() {
    try {
      var el = document.getElementById("bridge-url");
      var v =
        (el && el.value) ||
        localStorage.getItem("gg_bridge_url") ||
        "http://localhost:3037";
      return ("" + v).replace(/\/+$/, "");
    } catch (_) {
      return "http://localhost:3037";
    }
  }
  function backendBase() {
    try {
      var v = localStorage.getItem("gg_backend_url") || "http://127.0.0.1:8000";
      return ("" + v).replace(/\/+$/, "");
    } catch (_) {
      return "http://127.0.0.1:8000";
    }
  }
  function postJSON(url, body) {
    try {
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
    } catch (_) {
      return Promise.reject(new Error("fetch failed"));
    }
  }
  function getJSON(url) {
    try {
      return fetch(url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error(r.status + " " + r.statusText);
        return r.json();
      });
    } catch (_) {
      return Promise.reject(new Error("fetch failed"));
    }
  }
  function ready(fn) {
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  // Expose nearBottom/scrollToBottom helpers (S2 guardrail)
  try {
    if (!window.ggNearBottom) {
      window.ggNearBottom = function (el, px) {
        try {
          if (!el) return false;
          var lim = typeof px === "number" ? px : 48;
          return el.scrollHeight - (el.scrollTop + el.clientHeight) <= lim;
        } catch (_) {
          return false;
        }
      };
    }
    if (!window.ggScrollToBottom) {
      window.ggScrollToBottom = function (el) {
        try {
          if (el) el.scrollTop = el.scrollHeight;
        } catch (_) {}
      };
    }
  } catch (_) {}

  // BroadcastChannel stub for threads sync (S6 prep)
  (function () {
    function initBC() {
      try {
        if (window.__ggThreadsBC) return window.__ggThreadsBC;
        var C = window.BroadcastChannel;
        if (typeof C === "function") {
          window.__ggThreadsBC = new C("gg_threads");
        } else {
          // no-op shim
          window.__ggThreadsBC = {
            postMessage: function () {},
            addEventListener: function () {},
          };
        }
        return window.__ggThreadsBC;
      } catch (_) {
        return null;
      }
    }
    if (!window.ggThreadsBroadcast) {
      window.ggThreadsBroadcast = function (msg) {
        try {
          var bc = initBC();
          if (bc && bc.postMessage) bc.postMessage(msg);
        } catch (_) {}
      };
    }
    if (!window.ggThreadsSubscribe) {
      window.ggThreadsSubscribe = function (handler) {
        try {
          var bc = initBC();
          if (!bc || !bc.addEventListener) return false;
          bc.addEventListener("message", function (e) {
            try {
              handler && handler(e && e.data);
            } catch (_) {}
          });
          return true;
        } catch (_) {
          return false;
        }
      };
    }
  })();

  // ---------- Roadmap Progress Banner (R1–R3, NEXT, CHAIN) ----------
  function ensureEntryBanner() {
    var el = document.getElementById("gg-entry-banner");
    if (el) return el;
    el = document.createElement("div");
    el.id = "gg-entry-banner";
    el.className = "gg-entry-banner";
    el.innerHTML =
      '<span class="gg-chip" id="gg-l1">L1</span>' +
      '<span class="gg-chip" id="gg-l2">L2</span>' +
      '<span class="gg-chip" id="gg-l3">L3</span>' +
      '<span class="gg-sep">|</span>' +
      '<span id="gg-next">NEXT: —</span>' +
      '<span class="gg-badge" id="gg-chain">CHAIN: —</span>' +
      '<button class="gg-btn" id="gg-save">상태 저장</button>' +
      '<button class="gg-btn" id="gg-roadmap">로드맵</button>' +
      '<button class="gg-btn" id="gg-health">헬스</button>';
    // Try to insert into header toolbar first (inline, non-overlapping)
    var host =
      document.querySelector("header .hdr .toolbar") ||
      document.querySelector(".hdr .toolbar") ||
      document.querySelector("header .toolbar");
    if (host) {
      el.classList.add("inline");
      host.appendChild(el);
    } else {
      // Fallback: fixed banner (top-right) if toolbar not found
      document.body.appendChild(el);
    }
    return el;
  }
  function setRound(n) {
    var ids = ["gg-l1", "gg-l2", "gg-l3"];
    for (var i = 0; i < ids.length; i++) {
      var e = document.getElementById(ids[i]);
      if (e) e.classList.toggle("on", i < n);
    }
  }
  function setChain(ok) {
    var b = document.getElementById("gg-chain");
    if (!b) return;
    b.classList.remove("ok", "err");
    if (ok === true) {
      b.classList.add("ok");
      b.textContent = "CHAIN: OK";
    } else if (ok === false) {
      b.classList.add("err");
      b.textContent = "CHAIN: FAIL";
    } else {
      b.textContent = "CHAIN: —";
    }
  }
  function saveFallback(obj) {
    try {
      return postJSON(bridgeBase() + "/api/save", {
        root: "status",
        path: "evidence/ops/entry_pass_state.json",
        content: JSON.stringify(obj || {}, null, 2),
        overwrite: true,
        ensureDirs: true,
      });
    } catch (_) {
      return Promise.resolve();
    }
  }
  function loadFallback() {
    return postJSON(bridgeBase() + "/api/open", {
      root: "status",
      path: "evidence/ops/entry_pass_state.json",
    })
      .then(function (r) {
        try {
          var txt = (r && r.data && r.data.content) || "{}";
          return JSON.parse(txt);
        } catch (_) {
          return {};
        }
      })
      .catch(function () {
        return {};
      });
  }
  function inferCompletedRounds(rounds) {
    var n = 0;
    if (rounds && (rounds.R1 || rounds.R1 === 1)) n += rounds.R1 ? 1 : 0;
    if (rounds && (rounds.R2 || rounds.R2 === 1)) n += rounds.R2 ? 1 : 0;
    if (rounds && (rounds.R3 || rounds.R3 === 1)) n += rounds.R3 ? 1 : 0;
    // clamp 0..3
    if (n < 0) n = 0;
    if (n > 3) n = 3;
    return n;
  }
  function updateFromProgress(p) {
    try {
      var data = (p && p.data) || {};
      var rounds = data.rounds || {};
      var n = inferCompletedRounds(rounds);
      setRound(n);
      setChain(
        data.chain && data.chain.chain_ok
          ? true
          : data.chain
            ? false
            : undefined,
      );
      var nextEl = document.getElementById("gg-next");
      if (nextEl) nextEl.textContent = "NEXT: " + (data.next || "—");
      saveFallback({ r: n, next: data.next || "—", ts: nowISO() });
    } catch (_) {}
  }
  function initProgressBanner() {
    ensureEntryBanner();
    // Wire actions
    var btnSave = document.getElementById("gg-save");
    if (btnSave)
      btnSave.onclick = function () {
        tickProgress(true);
      };
    var btnRoad = document.getElementById("gg-roadmap");
    if (btnRoad)
      btnRoad.onclick = function () {
        try {
          window.open(
            "/ui/?path=/status/roadmap/BT11_to_BT21_Compass_ko.md",
            "_blank",
          );
        } catch (_) {}
      };
    var btnHealth = document.getElementById("gg-health");
    if (btnHealth)
      btnHealth.onclick = function () {
        Promise.allSettled([
          getJSON(backendBase() + "/api/health"),
          getJSON(bridgeBase() + "/api/health"),
        ]).then(function (arr) {
          var b = arr[0] && arr[0].status === "fulfilled" ? "OK" : "FAIL";
          var r = arr[1] && arr[1].status === "fulfilled" ? "OK" : "FAIL";
          try {
            alert("Backend: " + b + "  /  Bridge: " + r);
          } catch (_) {}
        });
      };
    tickProgress(false);
    setInterval(function () {
      tickProgress(false);
    }, 15000);
  }
  function tickProgress(forceSave) {
    getJSON(backendBase() + "/api/roadmap/progress")
      .then(function (p) {
        updateFromProgress(p);
        if (forceSave) saveFallback({ last_ok: true, ts: nowISO() });
      })
      .catch(function () {
        // fallback to cached state
        loadFallback().then(function (st) {
          try {
            setRound(st.r || 0);
            var nextEl = document.getElementById("gg-next");
            if (nextEl) nextEl.textContent = "NEXT: " + (st.next || "—");
            setChain(undefined);
          } catch (_) {}
        });
      });
  }
  // ---------- Roadmap Progress (A2 subpanel) ----------
  function ensureRoadmapPanel() {
    try {
      var host = document.querySelector("#a2");
      if (!host) return null;
      var panel = document.getElementById("gg-roadmap-progress");
      if (panel) return panel;
      panel = document.createElement("section");
      panel.id = "gg-roadmap-progress";
      panel.className = "panel";
      panel.setAttribute("aria-label", "Roadmap & Progress");
      panel.style.margin = "10px 0 12px";
      panel.style.padding = "10px";
      panel.innerHTML =
        '<div id="gg-rp-note" style="color:#94a3b8;font:12px system-ui;margin-bottom:6px">로드맵 진행 현황을 불러오는 중…</div>' +
        '<div id="gg-rp-tree" style="font:13px system-ui"></div>' +
        '<div style="margin-top:6px"><a href="/ui/?path=/status/roadmap/BT11_to_BT21_Compass_ko.md" target="_blank" rel="noopener" style="color:#93c5fd;text-decoration:none;font:12px system-ui">로드맵 문서 열기</a></div>';
      // insert right after A2 heading
      var h2 = host.querySelector("h2");
      if (h2 && h2.nextSibling) host.insertBefore(panel, h2.nextSibling);
      else host.insertBefore(panel, host.firstChild);
      return panel;
    } catch (_) {
      return null;
    }
  }
  function renderRoadmapTree(data) {
    try {
      var tree = document.getElementById("gg-rp-tree");
      if (!tree) return;
      tree.innerHTML = "";
      var bts = (data && data.bts) || [];
      for (var i = 0; i < bts.length; i++) {
        var bt = bts[i];
        var btEl = document.createElement("div");
        btEl.style.margin = "8px 0";
        var title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.color = "#cfe1ff";
        title.textContent = (bt.id || "") + " — " + (bt.title || "");
        btEl.appendChild(title);
        var list = document.createElement("div");
        list.style.display = "flex";
        list.style.flexWrap = "wrap";
        list.style.gap = "6px";
        list.style.marginTop = "6px";
        var sts = bt.sts || [];
        for (var j = 0; j < sts.length; j++) {
          var st = sts[j];
          var chip = document.createElement("span");
          chip.textContent = st.id || "";
          chip.title =
            (st.title || st.id || "") + (st.last_ts ? " @ " + st.last_ts : "");
          chip.style.padding = "3px 8px";
          chip.style.border = "1px solid var(--border)";
          chip.style.borderRadius = "999px";
          chip.style.fontSize = "12px";
          chip.style.background = "#0f1830";
          chip.style.color = "#d7e4ff";
          chip.style.cursor =
            st.evidence && st.evidence.length ? "pointer" : "default";
          var stStatus = String(st.status || "PLANNED").toUpperCase();
          if (stStatus === "PASS") {
            chip.style.background = "rgba(34,197,94,0.12)";
            chip.style.borderColor = "rgba(34,197,94,0.35)";
            chip.style.color = "#22c55e";
          } else if (stStatus === "STARTED") {
            chip.style.background = "rgba(59,130,246,0.10)";
            chip.style.borderColor = "rgba(59,130,246,0.35)";
            chip.style.color = "#60a5fa";
          } else if (stStatus === "BLOCKED") {
            chip.style.background = "rgba(239,68,68,0.12)";
            chip.style.borderColor = "rgba(239,68,68,0.35)";
            chip.style.color = "#ef4444";
          }
          (function (evs) {
            chip.onclick = function () {
              try {
                var ev = (evs && evs[0]) || "";
                if (!ev) return;
                postJSON(bridgeBase() + "/api/open", {
                  root: "status",
                  path: ev,
                }).catch(function () {});
              } catch (_) {}
            };
          })(st.evidence);
          list.appendChild(chip);
        }
        btEl.appendChild(list);
        tree.appendChild(btEl);
      }
    } catch (_) {}
  }
  function tickRoadmapPanel() {
    getJSON(backendBase() + "/api/roadmap/progress")
      .then(function (p) {
        var note = document.getElementById("gg-rp-note");
        if (note) {
          var ok = p && p.data && p.data.chain && p.data.chain.chain_ok;
          var next = (p && p.data && p.data.next) || "—";
          note.textContent =
            "NEXT: " + next + "  •  CHAIN: " + (ok ? "OK" : "—");
        }
        if (p && p.data) renderRoadmapTree(p.data);
      })
      .catch(function () {
        var note = document.getElementById("gg-rp-note");
        if (note) note.textContent = "진행 정보를 불러올 수 없습니다";
      });
  }
  function initProgressPanel() {
    if (!ensureRoadmapPanel()) return;
    tickRoadmapPanel();
    setInterval(tickRoadmapPanel, 15000);
  }
  ready(function () {
    try {
      initProgressBanner();
      initProgressPanel();

      // UI Pitstop v1 — Simple mode default + Status Strip + Recent onReady
      function getUIMode() {
        try {
          var m = (localStorage.getItem("gg_ui_mode") || "simple")
            .toLowerCase()
            .trim();
          return m === "pro" ? "pro" : "simple";
        } catch (_) {
          return "simple";
        }
      }
      function setUIMode(m) {
        try {
          localStorage.setItem("gg_ui_mode", m === "pro" ? "pro" : "simple");
        } catch (_) {}
      }
      function applySimpleModeDefault() {
        try {
          var cur = (localStorage.getItem("gg_ui_mode") || "").trim();
          if (!cur) setUIMode("simple");
          var mode = getUIMode();
          var b = document.body || document.documentElement;
          if (!b) return;
          if (mode === "simple") b.classList.add("simple");
          else b.classList.remove("simple");
        } catch (_) {}
      }
      function ensureStatusStrip() {
        var el = document.getElementById("gg-status-strip");
        if (el) return el;
        el = document.createElement("div");
        el.id = "gg-status-strip";
        el.innerHTML =
          '<span class="chip" id="gg-chip-sgm">SGM: —</span>' +
          '<span class="chip" id="gg-chip-src">Sources: —</span>' +
          '<span class="chip thread" id="gg-chip-thread">conv: —</span>' +
          '<span class="chip" id="gg-chip-bridge">Bridge: —</span>' +
          '<span class="chip" id="gg-chip-chain">Chain: —</span>' +
          '<span class="chip kebab" id="gg-chip-menu" title="메뉴">⋮</span>';
        try {
          document.body.insertBefore(el, document.body.firstChild);
        } catch (_) {
          document.body.appendChild(el);
        }
        // Step 2.2(B): threads collapsed toggle/persist and kebab wiring
        try {
          if (!window.ggApplyThreadsCollapsed) {
            window.ggApplyThreadsCollapsed = function () {
              try {
                var on =
                  (localStorage.getItem("gg_threads_collapsed") || "0") === "1";
                (document.body || document.documentElement).classList.toggle(
                  "threads-collapsed",
                  on,
                );
              } catch (_) {}
            };
          }
          if (!window.ggToggleThreadsCollapsed) {
            window.ggToggleThreadsCollapsed = function () {
              try {
                var on =
                  (localStorage.getItem("gg_threads_collapsed") || "0") === "1";
                localStorage.setItem("gg_threads_collapsed", on ? "0" : "1");
                window.ggApplyThreadsCollapsed();
              } catch (_) {}
            };
          }
          // Apply state on load and bind kebab
          window.ggApplyThreadsCollapsed();
          // Apply dense-toolbar persisted state
          try {
            var __dt =
              (localStorage.getItem("gg_dense_toolbar") || "0") === "1";
            (document.body || document.documentElement).classList.toggle(
              "dense-toolbar",
              __dt,
            );
          } catch (_) {}
          var kb = document.getElementById("gg-chip-menu");
          if (kb && !kb.__ggBound) {
            kb.__ggBound = true;
            kb.onclick = function (ev) {
              // Shift+Click → dense-toolbar toggle, Click → threads collapse toggle
              if (ev && ev.shiftKey) {
                try {
                  var on =
                    (localStorage.getItem("gg_dense_toolbar") || "0") === "1";
                  localStorage.setItem("gg_dense_toolbar", on ? "0" : "1");
                  (document.body || document.documentElement).classList.toggle(
                    "dense-toolbar",
                    !on,
                  );
                } catch (_) {}
                return;
              }
              window.ggToggleThreadsCollapsed &&
                window.ggToggleThreadsCollapsed();
            };
          }
        } catch (_) {}
        return el;
      }
      function refreshStatusStrip(el) {
        try {
          el = el || document.getElementById("gg-status-strip");
          if (!el) return;
          var sgm =
            (
              localStorage.getItem("gg_strict_grounded_mode") || ""
            ).toLowerCase() === "on";
          var sgmEl = document.getElementById("gg-chip-sgm");
          if (sgmEl) {
            sgmEl.textContent = "SGM: " + (sgm ? "on" : "off");
            sgmEl.classList.remove("ok", "warn");
            sgmEl.classList.add(sgm ? "ok" : "warn");
          }
          var srcEl = document.getElementById("gg-chip-src");
          if (srcEl) {
            var cnt =
              localStorage.getItem("gg_last_sources_count") ||
              localStorage.getItem("gg_recall_prompt_max_refs");
            srcEl.textContent = "Sources: " + (cnt ? String(cnt) : "—");
          }
          var th = (localStorage.getItem("gg_last_conv") || "").trim() || "—";
          var thEl = document.getElementById("gg-chip-thread");
          if (thEl) thEl.textContent = "conv: " + th;

          // Bridge/Backend health (best-effort, non-blocking)
          try {
            getJSON(backendBase() + "/api/health")
              .then(function () {
                var b = document.getElementById("gg-chip-bridge");
                if (b) b.textContent = "Bridge: OK";
              })
              .catch(function () {
                var b = document.getElementById("gg-chip-bridge");
                if (b) b.textContent = "Bridge: —";
              });
          } catch (_) {}
          // Chain unknown here; leave as is
        } catch (_) {}
      }
      function wireRecentOnReady() {
        try {
          if (document.getElementById("recent-threads")) return; // once
          // Simple mode: hide experimental Budget row (remove parent .row to avoid residual gap)
          (function () {
            try {
              var b = document.body || document.documentElement;
              if (!b || !b.classList.contains("simple")) return;
              var el = document.getElementById("budget-input");
              if (!el) return;
              var row = el.closest(".row");
              if (row && row.parentNode) {
                row.parentNode.removeChild(row);
              }
            } catch (_) {}
          })();
          var backend = backendBase();
          var host =
            document.querySelector(".toolbar") ||
            document.querySelector("header") ||
            document.body;
          if (!host) return;
          var label = document.createElement("label");
          label.className = "btn";
          label.style.marginLeft = "6px";
          label.title = "최근 스레드";
          label.textContent = "Recent";
          var btnRefresh = document.createElement("button");
          btnRefresh.type = "button";
          btnRefresh.className = "btn";
          btnRefresh.style.marginLeft = "6px";
          btnRefresh.title = "Refresh Recent";
          btnRefresh.textContent = "↻";
          var sel = document.createElement("select");
          sel.id = "recent-threads";
          sel.style.marginLeft = "6px";
          label.appendChild(sel);
          label.appendChild(btnRefresh);
          host.appendChild(label);

          function populateRecent() {
            try {
              // Loading placeholder (best-effort)
              sel.innerHTML = "";
              var loading = document.createElement("option");
              loading.value = "";
              loading.textContent = "(로딩 중…)";
              sel.appendChild(loading);
            } catch (_) {}
            fetch(backend + "/api/threads/recent?limit=20")
              .then(function (r) {
                return r.json();
              })
              .then(function (obj) {
                if (
                  !obj ||
                  !obj.ok ||
                  !obj.data ||
                  !Array.isArray(obj.data.items)
                ) {
                  sel.innerHTML = "";
                  var err = document.createElement("option");
                  err.value = "";
                  err.textContent = "(로딩 실패 — ↻로 재시도)";
                  sel.appendChild(err);
                  var cta = document.createElement("option");
                  cta.value = "__NEW__";
                  cta.textContent = "＋ 새 스레드";
                  sel.appendChild(cta);
                  return;
                }
                sel.innerHTML = "";
                var current = (
                  localStorage.getItem("gg_last_conv") || ""
                ).trim();
                if (!current) {
                  var o = document.createElement("option");
                  o.value = "";
                  o.textContent = "—";
                  sel.appendChild(o);
                }
                if (!obj.data.items.length) {
                  var empty = document.createElement("option");
                  empty.value = "";
                  empty.textContent = "(최근 없음)";
                  sel.appendChild(empty);
                  var cta2 = document.createElement("option");
                  cta2.value = "__NEW__";
                  cta2.textContent = "＋ 새 스레드";
                  sel.appendChild(cta2);
                  return;
                }
                obj.data.items.forEach(function (it) {
                  var opt = document.createElement("option");
                  opt.value = it.convId;
                  var title = it.title || "(제목 없음)";
                  var chips = (it.top_tags || [])
                    .slice(0, 3)
                    .map(function (t) {
                      return "#" + t;
                    })
                    .join(" ");
                  var last = it.last_ts ? " · " + it.last_ts : "";
                  opt.textContent =
                    title +
                    " · " +
                    it.convId +
                    last +
                    (chips ? " · " + chips : "");
                  if (current && it.convId === current) {
                    opt.selected = true;
                  }
                  sel.appendChild(opt);
                });
              })
              .catch(function () {
                try {
                  sel.innerHTML = "";
                  var err = document.createElement("option");
                  err.value = "";
                  err.textContent = "(로딩 실패 — ↻로 재시도)";
                  sel.appendChild(err);
                  var cta = document.createElement("option");
                  cta.value = "__NEW__";
                  cta.textContent = "＋ 새 스레드";
                  sel.appendChild(cta);
                } catch (_) {}
              });
          }
          function renderTurns(turns) {
            var msgs = document.getElementById("chat-msgs");
            if (!msgs) return;
            msgs.innerHTML = "";
            for (var i = 0; i < turns.length; i++) {
              var t = turns[i] || {};
              if (typeof window.addChatMsg === "function") {
                window.addChatMsg(t.role || "system", t.text || "");
              } else {
                var div = document.createElement("div");
                div.textContent =
                  "[" + (t.role || "sys") + "] " + (t.text || "");
                msgs.appendChild(div);
              }
            }
          }
          sel.addEventListener("change", function () {
            var id = sel.value;
            if (!id) return;
            if (id === "__NEW__") {
              try {
                localStorage.removeItem("gg_last_conv");
              } catch (_) {}
              var thEl0 = document.getElementById("gg-chip-thread");
              if (thEl0) thEl0.textContent = "conv: —";
              var input = document.getElementById("chat-input");
              if (input && input.focus) input.focus();
              return;
            }
            fetch(
              backend + "/api/threads/read?convId=" + encodeURIComponent(id),
            )
              .then(function (r) {
                return r.json();
              })
              .then(function (obj) {
                if (
                  !obj ||
                  !obj.ok ||
                  !obj.data ||
                  !Array.isArray(obj.data.turns)
                )
                  return;
                renderTurns(obj.data.turns);
                try {
                  localStorage.setItem("gg_last_conv", id);
                } catch (_) {}
                var thEl = document.getElementById("gg-chip-thread");
                if (thEl) thEl.textContent = "conv: " + id;
              })
              .catch(function () {
                try {
                  sel.innerHTML = "";
                  var err = document.createElement("option");
                  err.value = "";
                  err.textContent = "(읽기 실패 — ↻로 재시도)";
                  sel.appendChild(err);
                  var cta = document.createElement("option");
                  cta.value = "__NEW__";
                  cta.textContent = "＋ 새 스레드";
                  sel.appendChild(cta);
                } catch (_) {}
              });
          });
          btnRefresh.addEventListener("click", populateRecent);
          populateRecent(); // initial
        } catch (_) {}
      }

      applySimpleModeDefault();
      var __strip = ensureStatusStrip();
      refreshStatusStrip(__strip);
      wireRecentOnReady();

      // UI Pitstop v1 — Step 2: Two-column A1 + Evidence collapse (Simple mode only)
      function ensureThreadsPane() {
        try {
          var mode = (
            localStorage.getItem("gg_ui_mode") || "simple"
          ).toLowerCase();
          if (mode !== "simple") return;
          var a1 = document.getElementById("a1");
          var wrap = document.getElementById("a1-wrap");
          if (!a1 || !wrap) return;
          var pane = document.getElementById("gg-threads");
          if (!pane) {
            pane = document.createElement("aside");
            pane.id = "gg-threads";
            pane.innerHTML =
              '<h3>Threads <button id="gg-threads-toggle" class="btn" type="button" title="좌측 패널 접기/펼치기" style="margin-left:6px;padding:2px 6px;font-size:11px">⟨⟩</button></h3>' +
              '<div class="row" style="margin-bottom:8px">' +
              '<input id="gg-thread-search" type="search" placeholder="검색(#태그, 제목, convId)" />' +
              "</div>" +
              '<div class="row" id="gg-thread-actions" style="margin-bottom:8px">' +
              '<button id="gg-new-thread" class="btn" type="button" title="새 스레드 시작">새 스레드</button>' +
              "</div>" +
              '<div class="row" id="gg-thread-recent-row"></div>';
            // Insert pane before chat wrap to form 2-column grid via CSS
            a1.insertBefore(pane, wrap);
            // New thread action: clear current convId and badge
            var btnNew = document.getElementById("gg-new-thread");
            if (btnNew) {
              btnNew.onclick = function () {
                try {
                  localStorage.removeItem("gg_last_conv");
                } catch (_) {}
                var badge = document.getElementById("conv-badge");
                if (badge) badge.textContent = "conv: -";
                // Trigger refresh of Recent so placeholder is shown
                var sel = document.getElementById("recent-threads");
                if (sel) {
                  // force a repopulate via synthetic click on attached refresh if exists
                  var btn =
                    sel.parentElement &&
                    sel.parentElement.querySelector("button.btn");
                  if (btn)
                    try {
                      btn.click();
                    } catch (_) {}
                }
                // Also update status strip
                var thEl = document.getElementById("gg-chip-thread");
                if (thEl) thEl.textContent = "conv: —";
              };
            }
            // Step 2.2(B): header toggle button + apply persisted state
            var tgl = document.getElementById("gg-threads-toggle");
            if (tgl && !tgl.__ggBound) {
              tgl.__ggBound = true;
              tgl.onclick = function () {
                if (window.ggToggleThreadsCollapsed)
                  window.ggToggleThreadsCollapsed();
              };
            }
            if (window.ggApplyThreadsCollapsed)
              window.ggApplyThreadsCollapsed();
          }
          // Move/attach Recent selector into left pane
          var recentHost = document.getElementById("gg-thread-recent-row");
          if (recentHost) {
            var sel = document.getElementById("recent-threads");
            if (sel && sel.parentElement) {
              // If wrapped in a label, move the whole label
              var container = sel.parentElement;
              recentHost.appendChild(container);
            } else if (!sel) {
              // If not yet created, try wiring and retry once
              wireRecentOnReady();
              setTimeout(function () {
                var s2 = document.getElementById("recent-threads");
                if (s2 && s2.parentElement) {
                  recentHost.appendChild(s2.parentElement);
                }
              }, 300);
            }
          }
        } catch (_) {}
      }

      function wireEvidenceCollapse() {
        try {
          var msgs = document.getElementById("chat-msgs");
          if (!msgs) return;

          function extractRefs(text) {
            // Very lightweight heuristic: count "path#L" patterns
            var m = (text || "").match(/#L\d+(?:-\d+)?/g);
            return m ? m.length : 0;
          }
          function addSummaryIfNeeded(node) {
            try {
              if (!node || node.nodeType !== 1) return;
              if (node.__ggEvBound) return;
              var text = node.textContent || "";
              var cnt = extractRefs(text);
              if (!cnt) return; // nothing to summarize
              // Build summary block after the node (non-destructive)
              var ev = document.createElement("div");
              ev.className = "gg-ev";
              ev.setAttribute("data-collapsed", "1");
              var sum = document.createElement("div");
              sum.className = "gg-ev-summary";
              var chip = document.createElement("span");
              chip.className = "gg-chip-ev ok";
              chip.textContent = "증거 " + cnt + "건 · mix";
              sum.appendChild(chip);
              var hint = document.createElement("span");
              hint.textContent = "클릭하여 보기/접기";
              hint.style.opacity = ".8";
              hint.style.fontSize = "11px";
              sum.appendChild(hint);
              var list = document.createElement("div");
              list.className = "gg-ev-list";
              list.textContent = (text || "").trim().slice(0, 2000); // conservative copy
              ev.appendChild(sum);
              ev.appendChild(list);
              node.insertAdjacentElement("afterend", ev);
              sum.onclick = function () {
                var c = ev.getAttribute("data-collapsed") === "1";
                ev.setAttribute("data-collapsed", c ? "0" : "1");
              };
              node.__ggEvBound = true;
            } catch (_) {}
          }

          // Initial scan
          Array.prototype.forEach.call(msgs.children || [], function (n) {
            addSummaryIfNeeded(n);
          });
          // Observe future additions
          var obs = new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
              var mu = muts[i];
              for (var j = 0; j < (mu.addedNodes || []).length; j++) {
                var nd = mu.addedNodes[j];
                if (nd && nd.nodeType === 1) addSummaryIfNeeded(nd);
              }
            }
          });
          obs.observe(msgs, { childList: true });
        } catch (_) {}
      }

      // Activate Step 2 behaviors
      ensureComposerWrap();
      ensureThreadsPane();
      wireEvidenceCollapse();
      // (op trace initialized in setupStepC IIFE)
      // Simple single-scroll: right pane wrapper + dynamic top offset for status strip
      (function () {
        function px(n) {
          try {
            return Math.max(0, n | 0) + "px";
          } catch (_) {
            return "0px";
          }
        }
        function stripOffset() {
          try {
            var el = document.getElementById("gg-status-strip");
            var h =
              el && el.getBoundingClientRect
                ? Math.round(el.getBoundingClientRect().height)
                : 0;
            return h || (el && el.offsetHeight) || 46;
          } catch (_) {
            return 46;
          }
        }
        function ensureRightPaneWrapper() {
          try {
            var a1 = document.getElementById("a1");
            var wrap = document.getElementById("a1-wrap");
            if (!a1 || !wrap) return;
            if (!document.getElementById("a1-right")) {
              var right = document.createElement("div");
              right.id = "a1-right";
              a1.insertBefore(right, wrap);
              right.appendChild(wrap);
            }
          } catch (_) {}
        }
        var __ggRafId = 0;
        function applyHeightsInner() {
          try {
            var off = stripOffset();
            var offPx = px(off);
            document.documentElement.style.setProperty("--gg-strip-h", offPx);
            // regression guards: ensure only two scroll containers
            var a1 = document.getElementById("a1");
            if (a1) {
              a1.style.overflow = "visible";
              a1.style.minHeight = "0";
            }
            var right = document.getElementById("a1-right");
            if (right) {
              right.style.overflow = "visible";
              right.style.minHeight = "0";
            }
            var wrap = document.getElementById("a1-wrap");
            if (wrap) {
              wrap.style.overflow = "hidden";
              wrap.style.minHeight = "0";
              wrap.style.height =
                "calc(100dvh - var(--gg-strip-h, " + offPx + "))";
            }
            var th = document.getElementById("gg-threads");
            if (th) {
              th.style.top = "var(--gg-strip-h, " + offPx + ")";
              th.style.height =
                "calc(100dvh - var(--gg-strip-h, " + offPx + "))";
              th.style.overflow = "auto";
            }
            var msgs = document.getElementById("chat-msgs");
            if (msgs) {
              msgs.style.overflow = "auto";
              msgs.style.maxHeight = "none";
            }
          } catch (_) {}
        }
        function scheduleApplyHeights() {
          try {
            if (__ggRafId) cancelAnimationFrame(__ggRafId);
          } catch (_) {}
          __ggRafId = requestAnimationFrame(function () {
            applyHeightsInner();
          });
        }
        function observeStrip() {
          try {
            var el = document.getElementById("gg-status-strip");
            if (!el) return;
            if (window.ResizeObserver && !el.__ggResizeObs) {
              var ro = new ResizeObserver(function () {
                scheduleApplyHeights();
              });
              ro.observe(el);
              el.__ggResizeObs = ro;
            } else if (!window.ResizeObserver && !el.__ggMutObs) {
              var mo = new MutationObserver(function () {
                scheduleApplyHeights();
              });
              mo.observe(el, {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true,
              });
              el.__ggMutObs = mo;
            }
          } catch (_) {}
        }
        function boot() {
          ensureRightPaneWrapper();
          scheduleApplyHeights();
          observeStrip();
          window.addEventListener("resize", scheduleApplyHeights, {
            passive: true,
          });
          window.addEventListener("orientationchange", scheduleApplyHeights, {
            passive: true,
          });
          setTimeout(scheduleApplyHeights, 50);
          setTimeout(scheduleApplyHeights, 250);
        }
        boot();
      })();
    } catch (_) {}
  });

  // ---------- Toast (lightweight) ----------
  function ensureToastHost() {
    var host = document.getElementById("gg-overlay-toast");
    if (host) return host;
    host = document.createElement("div");
    host.id = "gg-overlay-toast";
    host.style.position = "fixed";
    host.style.zIndex = "2147483646";
    host.style.right = "16px";
    host.style.bottom = "16px";
    host.style.display = "flex";
    host.style.flexDirection = "column";
    host.style.gap = "8px";
    document.body.appendChild(host);
    return host;
  }
  function toast(msg, kind) {
    try {
      var host = ensureToastHost();
      var el = document.createElement("div");
      el.textContent = msg;
      el.style.font =
        "12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      el.style.color = "#e5e7eb";
      el.style.background =
        kind === "err"
          ? "rgba(220, 38, 38, 0.90)"
          : kind === "ok"
            ? "rgba(34, 197, 94, 0.90)"
            : "rgba(15, 23, 42, 0.90)";
      el.style.padding = "8px 10px";
      el.style.border = "1px solid rgba(31,41,55,0.7)";
      el.style.borderRadius = "8px";
      el.style.boxShadow = "0 10px 26px rgba(0,0,0,0.28)";
      el.style.maxWidth = "62vw";
      el.style.pointerEvents = "none";
      host.appendChild(el);
      setTimeout(function () {
        try {
          host.removeChild(el);
        } catch (_) {}
      }, 2200);
    } catch (_) {}
  }

  // ---------- Tooltip/A11y helpers ----------
  function hydrateTooltips() {
    try {
      var btns = document.querySelectorAll(
        'button, [role="button"], a, [data-tooltip]',
      );
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var label = b.getAttribute("aria-label");
        var title = b.getAttribute("title");
        if (!title && label) b.setAttribute("title", label);
        if (!label && title) b.setAttribute("aria-label", title);
      }
    } catch (_) {}
  }

  // ---------- Evidence open helpers ----------
  function openEvidence(kind) {
    var sid = sessionId();
    var dateStr = yyyymmdd(new Date());
    var path;
    if (kind === "runtime") {
      path = "evidence/ui_runtime_" + dateStr + "_" + sid + ".jsonl";
    } else if (kind === "p95") {
      path = "evidence/ui_tab_nav_p95_" + dateStr + "_" + sid + ".json";
    } else {
      return Promise.reject(new Error("unknown kind"));
    }
    var url = bridgeBase() + "/api/open";
    return postJSON(url, { root: "status", path: path })
      .then(function (r) {
        if (!r || !r.ok) throw new Error("open failed");
        toast("열기 요청: " + path, "ok");
        return true;
      })
      .catch(function (e) {
        toast("열기 실패: " + (e && e.message ? e.message : String(e)), "err");
        return false;
      });
  }

  // ---------- Keyboard shortcuts ----------
  // Ctrl+Alt+O then R → open runtime.jsonl
  // Ctrl+Alt+O then P → open tab p95
  // Ctrl+Alt+L → toggle Low-FX
  // Ctrl+Alt+M → show overlay help
  function installShortcuts() {
    var seq = [];
    function resetSeqSoon() {
      setTimeout(function () {
        seq.length = 0;
      }, 700);
    }
    function isEditingTarget(t) {
      if (!t) return false;
      var tag = (t.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || t.isContentEditable;
    }
    window.addEventListener(
      "keydown",
      function (e) {
        try {
          if (isEditingTarget(e.target)) return;
          var ctrlAlt = e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey;
          if (ctrlAlt && (e.key === "l" || e.key === "L")) {
            e.preventDefault();
            try {
              var low = document.body.classList.contains("lowfx");
              document.body.classList.toggle("lowfx", !low);
              localStorage.setItem("gg_lowfx", !low ? "1" : "0");
              toast("저사양 " + (!low ? "ON" : "OFF"), "ok");
            } catch (_) {}
            return;
          }
          if (ctrlAlt && (e.key === "m" || e.key === "M")) {
            e.preventDefault();
            showHelp();
            return;
          }
          if (e.ctrlKey && e.altKey && (e.key === "o" || e.key === "O")) {
            e.preventDefault();
            seq = ["O"];
            resetSeqSoon();
            return;
          }
          if (seq.length === 1 && seq[0] === "O") {
            if (e.key === "r" || e.key === "R") {
              e.preventDefault();
              seq.length = 0;
              openEvidence("runtime");
              return;
            }
            if (e.key === "p" || e.key === "P") {
              e.preventDefault();
              seq.length = 0;
              openEvidence("p95");
              return;
            }
          }
        } catch (_) {}
      },
      true,
    );
  }

  function showHelp() {
    var lines = [
      "Overlay shortcuts:",
      "  Ctrl+Alt+L  → 저사양(LOW-FX) 토글",
      "  Ctrl+Alt+O, R  → runtime.jsonl 열기",
      "  Ctrl+Alt+O, P  → tab p95 JSON 열기",
      "  Ctrl+Alt+M  → 이 도움말",
    ];
    toast(lines.join("\n"));
  }

  // ---------- Overlay loaded badge (console + DOM) ----------
  function markLoaded() {
    try {
      console.info("[GG Overlay] labs/default.js loaded @ " + nowISO());
      var badgeId = "__gg_overlay_badge__";
      if (document.getElementById(badgeId)) return;
      var b = document.createElement("div");
      b.id = badgeId;
      b.textContent = "overlay:labs/default.js";
      b.style.position = "fixed";
      b.style.zIndex = "2147483647";
      b.style.right = "8px";
      b.style.bottom = "26px";
      b.style.font = "10px/1.6 ui-monospace, Menlo, Consolas, monospace";
      b.style.color = "rgba(229,231,235,0.60)";
      b.style.background = "rgba(11,12,16,0.50)";
      b.style.padding = "2px 6px";
      b.style.border = "1px solid rgba(34,48,71,0.7)";
      b.style.borderRadius = "6px";
      b.style.pointerEvents = "none";
      document.addEventListener("visibilitychange", function () {
        try {
          b.style.opacity = document.hidden ? "0.25" : "1";
        } catch (_) {}
      });
      document.body.appendChild(b);
    } catch (_) {}
  }

  // ---------- Bootstrap ----------
  // Expose helpers globally so snapshot UI can use overlay toast/bridge without rebuild
  try {
    if (!window.ggToast) window.ggToast = toast;
    if (!window.ggBridgeBase) window.ggBridgeBase = bridgeBase;
    if (!window.ggPostJSON) window.ggPostJSON = postJSON;
  } catch (_) {}

  ready(function () {
    hydrateTooltips();
    installShortcuts();
    markLoaded();
    // First-run heads up (once)
    try {
      var k = "__gg_overlay_default_hint__";
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, "1");
        toast(
          "오버레이 활성화: 툴팁/단축키 사용 가능 (Ctrl+Alt+M 도움말)",
          "ok",
        );
      }
    } catch (_) {}
  });

  // ===== ST-1206 T3 — Input and rows enforcement =====
  (function () {
    function enforceInputAndRows() {
      if (!document.body.classList.contains("simple")) return;
      var wrap = document.getElementById("a1-wrap");
      if (!wrap) return;

      // 직계 자식 3개 유지(4번째 이상은 타임라인으로 이동)
      var msgs = document.getElementById("chat-msgs");
      if (msgs && wrap.children.length > 3) {
        Array.prototype.slice.call(wrap.children, 3).forEach(function (el) {
          msgs.prepend(el);
        });
      }

      // Input overflow 보장 + actions와 같은 부모로 정렬
      var input = document.getElementById("chat-input");
      if (input) {
        input.style.overflow = "visible";
      }
      var actions = document.querySelector(
        '#a1-wrap [data-gg="composer-actions"]',
      );
      if (!actions && input && input.nextElementSibling) {
        input.nextElementSibling.setAttribute("data-gg", "composer-actions");
      }
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", enforceInputAndRows, {
        once: true,
      });
      window.addEventListener("load", enforceInputAndRows, { once: true });
    } else {
      enforceInputAndRows();
      window.addEventListener("load", enforceInputAndRows, { once: true });
    }
  })();
})();
