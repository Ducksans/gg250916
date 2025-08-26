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

  if (window.__GG_OVERLAY_LABS_JS__) return;
  window.__GG_OVERLAY_LABS_JS__ = true;

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
})();
