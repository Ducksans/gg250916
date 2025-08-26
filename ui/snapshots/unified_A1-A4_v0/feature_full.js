/**
 * feature_full.js
 * Implements toolbar actions, keyboard shortcuts, theme toggle, and session meta injection
 * for the Unified A1–A4 feature build.
 *
 * Expected DOM:
 * - Tabs: #tab-a1..#tab-a4 and Panels: #a1..#a4
 * - Toolbar buttons: #btn-theme, #btn-help
 * - Session meta targets: #meta-session, #meta-date, #meta-version, #meta-path
 * - Copy button: #btn-copy-meta
 * - Status line: #status
 * - Timestamp: #ts
 * - Help dialog: <dialog id="kbd-help">
 */
(function () {
  /* A1 helpers: ensure ggBackendBase/ggBridgeBase exist (fallback to localStorage or defaults) */
  if (typeof window === "undefined") {
    try {
      window = self;
    } catch (_) {}
  }
  if (typeof window.ggBackendBase !== "function") {
    window.ggBackendBase = function ggBackendBase() {
      try {
        var v =
          localStorage.getItem("gg_backend_url") || "http://127.0.0.1:8000";
        return ("" + v).replace(/\/+$/, "");
      } catch (_) {
        return "http://127.0.0.1:8000";
      }
    };
  }
  if (typeof window.ggBridgeBase !== "function") {
    window.ggBridgeBase = function ggBridgeBase() {
      try {
        var v =
          localStorage.getItem("gg_bridge_url") || "http://127.0.0.1:3037";
        return ("" + v).replace(/\/+$/, "");
      } catch (_) {
        return "http://127.0.0.1:3037";
      }
    };
  }
  ("use strict");
  // ST-1205 (C prep): prompt-injection toggle keys and helpers
  if (typeof window.ggRecallPromptOnKey === "undefined") {
    window.ggRecallPromptOnKey = "gg_recall_prompt_on";
  }
  if (typeof window.ggRecallPromptMaxRefsKey === "undefined") {
    window.ggRecallPromptMaxRefsKey = "gg_recall_prompt_max_refs";
  }
  if (typeof window.ggRecallPromptStyleKey === "undefined") {
    window.ggRecallPromptStyleKey = "gg_recall_prompt_style";
  }
  if (typeof window.ggRecallPromptEnabled !== "function") {
    window.ggRecallPromptEnabled = function ggRecallPromptEnabled() {
      try {
        return (
          (localStorage.getItem(window.ggRecallPromptOnKey) || "false") !==
          "false"
        );
      } catch (_) {
        return false;
      }
    };
  }
  if (typeof window.ggRecallPromptConfig !== "function") {
    window.ggRecallPromptConfig = function ggRecallPromptConfig() {
      var maxRefs = 3;
      var style = "system"; // or "context"
      try {
        var r = parseInt(
          localStorage.getItem(window.ggRecallPromptMaxRefsKey) || "3",
          10,
        );
        if (Number.isFinite(r) && r > 0) maxRefs = Math.min(5, r);
      } catch (_) {}
      try {
        var s = localStorage.getItem(window.ggRecallPromptStyleKey) || "system";
        if (s === "system" || s === "context") style = s;
      } catch (_) {}
      return {
        enabled: window.ggRecallPromptEnabled(),
        maxRefs: maxRefs,
        style: style,
      };
    };
  }

  // -----------------------------
  // Utilities
  // -----------------------------
  var $ = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  var $$ = function (sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  };
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }
  function setStatus(msg) {
    var el = $("#status");
    if (el) el.textContent = msg;
  }

  // -----------------------------
  // Tabs
  // -----------------------------
  var ORDER = ["#a1", "#a2", "#a3", "#a4"];
  var VALID = ORDER.reduce(function (m, h) {
    m[h] = true;
    return m;
  }, {});
  var DEFAULT_HASH = "#a1";

  function activate(hash) {
    var h = hash || location.hash || DEFAULT_HASH;
    if (!VALID[h]) h = DEFAULT_HASH;

    // panels
    ORDER.forEach(function (id) {
      var sec = $(id);
      if (sec) sec.classList.toggle("active", id === h);
    });

    // tabs aria-current
    ORDER.forEach(function (id) {
      var tab = $("#tab-" + id.slice(1));
      if (!tab) return;
      if (id === h) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });

    try {
      history.replaceState(null, "", h);
    } catch (_) {
      /* no-op */
    }
    setStatus("탭 전환: " + h.slice(1).toUpperCase());
  }

  // -----------------------------
  // Theme
  // -----------------------------
  var THEME_KEY = "gg_theme";
  function prefersDark() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }
  function applyTheme(theme) {
    var t =
      theme ||
      localStorage.getItem(THEME_KEY) ||
      (prefersDark() ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (_) {
      /* ignore */
    }
    var btn = $("#btn-theme");
    if (btn) btn.textContent = t === "dark" ? "다크" : "라이트";
    setStatus("테마: " + (t === "dark" ? "Dark" : "Light"));
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  // -----------------------------
  // Session Meta
  // -----------------------------
  function yyyymmdd(d) {
    var y = d.getFullYear(),
      m = String(d.getMonth() + 1).padStart(2, "0"),
      dd = String(d.getDate()).padStart(2, "0");
    return "" + y + m + dd;
  }
  function parseQuery() {
    var q = new URLSearchParams(location.search);
    return {
      session: (q.get("session") || "GG-SESS-UNKNOWN").trim(),
      date: (q.get("date") || yyyymmdd(new Date())).trim(),
      version: (q.get("version") || "v0").trim(),
    };
  }
  function renderSessionMeta() {
    var meta = parseQuery();
    var path =
      "gumgang_meeting/ui/logs/ui_unified_" +
      meta.date +
      "_" +
      meta.version +
      "_" +
      meta.session +
      "/screenshots/";
    var s = $("#meta-session"),
      d = $("#meta-date"),
      v = $("#meta-version"),
      p = $("#meta-path");
    if (s) s.textContent = meta.session;
    if (d) d.textContent = meta.date;
    if (v) v.textContent = meta.version;
    if (p) p.textContent = path;

    var btn = $("#btn-copy-meta");
    if (btn) {
      btn.onclick = function () {
        var text = [
          "SESSION_ID=" + meta.session,
          "DATE=" + meta.date,
          "VERSION=" + meta.version,
          "SCREENSHOTS=" + path,
        ].join("\n");

        var copy = function (t) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(t);
          }
          // Fallback for restricted environments
          var ta = document.createElement("textarea");
          ta.value = t;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          var ok = false;
          try {
            ok = document.execCommand("copy");
          } catch (_) {
            ok = false;
          }
          document.body.removeChild(ta);
          return ok
            ? Promise.resolve()
            : Promise.reject(new Error("copy failed"));
        };

        copy(text)
          .then(function () {
            setStatus("세션 메타를 클립보드로 복사했습니다.");
          })
          .catch(function () {
            setStatus("클립보드 복사 실패. 권한/브라우저 상태를 확인하세요.");
          });
      };
    }
  }

  // -----------------------------
  // Help dialog
  // -----------------------------
  var help;
  function toggleHelp() {
    if (!help) help = $("#kbd-help");
    if (!help) return;
    if (help.open) help.close();
    else help.showModal();
  }

  // -----------------------------
  // Keyboard
  // -----------------------------
  function isEditableTarget(t) {
    return (
      !!t &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
    );
  }
  function gotoIndex(i) {
    var L = ORDER.length;
    var idx = ((i % L) + L) % L;
    activate(ORDER[idx]);
  }

  // -----------------------------
  // Init
  // -----------------------------
  onReady(function () {
    // Buttons
    var themeBtn = $("#btn-theme");
    var helpBtn = $("#btn-help");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
    if (helpBtn) helpBtn.addEventListener("click", toggleHelp);

    // Timestamp
    var ts = $("#ts");
    if (ts) {
      var now = new Date();
      // Prefer Intl with Asia/Seoul. Fallback to manual +09:00 conversion if Intl/timeZone not available.
      var kstText;
      try {
        kstText = new Intl.DateTimeFormat("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Seoul",
        })
          .format(now)
          .replace(/\./g, "-")
          .replace(/\s+/g, " ")
          .replace(/- /g, "-")
          .trim();
      } catch (_) {
        var ms = now.getTime() + now.getTimezoneOffset() * 60000;
        var k = new Date(ms + 9 * 3600000);
        var pad = function (n) {
          return String(n).padStart(2, "0");
        };
        kstText =
          k.getFullYear() +
          "-" +
          pad(k.getMonth() + 1) +
          "-" +
          pad(k.getDate()) +
          " " +
          pad(k.getHours()) +
          ":" +
          pad(k.getMinutes()) +
          ":" +
          pad(k.getSeconds());
      }
      ts.textContent =
        "Rendered at: " + kstText + " KST | UTC: " + now.toISOString();
    }

    // Theme + Session meta
    applyTheme();
    renderSessionMeta();

    // Default hash
    if (!location.hash || !VALID[location.hash]) {
      try {
        history.replaceState(null, "", DEFAULT_HASH);
      } catch (_) {
        location.hash = DEFAULT_HASH;
      }
    }
    activate();

    // Listeners
    window.addEventListener("hashchange", function () {
      activate();
    });

    window.addEventListener("keydown", function (e) {
      if (isEditableTarget(e.target)) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        toggleHelp();
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        toggleTheme();
        return;
      }
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        gotoIndex(parseInt(e.key, 10) - 1);
        return;
      }

      if (e.ctrlKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        var cur = ORDER.indexOf(
          VALID[location.hash] ? location.hash : DEFAULT_HASH,
        );
        gotoIndex(cur + (e.key === "ArrowRight" ? 1 : -1));
        return;
      }

      if (e.key === "Escape" && help && help.open) {
        e.preventDefault();
        help.close();
      }
    });

    // Expose small debug surface (optional; harmless if unused)
    window.FeatureFull = {
      activate: activate,
      applyTheme: applyTheme,
      toggleTheme: toggleTheme,
      renderSessionMeta: renderSessionMeta,
    };
  });
})();
