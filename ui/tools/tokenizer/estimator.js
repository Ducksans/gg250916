/**
 * estimator.js
 * Gumgang UI — Tokenizer Estimator T0 (offline heuristic stub)
 *
 * Purpose:
 * - Provide a zero-dependency, offline token count estimator based on simple char->token heuristics.
 * - Offer small UI utilities to render a "Tokenizer Board" (model/encoding/max/current/headroom/status).
 *
 * Notes:
 * - This is a T0 heuristic. It does NOT run real tokenizer code. It approximates tokens
 *   by dividing character counts with per-encoding, per-language "chars per token" (CPT) values.
 * - For mixed-language content, it splits Hangul vs non-Hangul and applies weighted sums.
 * - All thresholds and context windows can be supplied by an external model table JSON.
 *
 * Integration:
 * - Load an external model table JSON (optional):
 *     GGTokenizer.loadModelTable("ui/tools/tokenizer/model_table.json").then(table => { ... })
 * - Estimate tokens:
 *     const est = GGTokenizer.estimateTokens("텍스트...", { encodingId: "cl100k_base", langHint: "ko", table });
 * - Render board:
 *     const ctrl = GGTokenizer.renderBoard(containerEl, {
 *       modelId: "openai/gpt-4o-2024-05-13",
 *       table,
 *       textProvider: () => document.querySelector("#yourTextArea").value
 *     });
 *     ctrl.measureNow(); // optional initial measure
 *
 * Exposes:
 * - window.GGTokenizer
 *
 * Version: 0.1.0
 * License: MIT (project default)
 */
(function (root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.GGTokenizer = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // -----------------------------
  // Defaults and Utilities
  // -----------------------------

  var VERSION = "0.1.0";

  // Minimal default encoding table to function offline (used if external table not supplied).
  var DEFAULT_TABLE = {
    schema: "gumgang.tokenizer.model_table/0.1.0",
    updated_utc: null,
    defaults: {
      language: "ko",
      estimation_language: "ko",
      encoding: "cl100k_base",
    },
    ui_thresholds: {
      warn_usage: 0.85,
      error_usage: 0.95,
      units: "tokens",
    },
    encodings: {
      cl100k_base: {
        display: "cl100k_base (OpenAI GPT-3.5/4)",
        family: "bpe",
        approx_chars_per_token: { en: 4.0, ko: 2.4 },
        notes:
          "Heuristic CPTs for GPT-3.5/4-like BPE. Real tokenizers may vary per text.",
      },
      o200k_base: {
        display: "o200k_base (OpenAI GPT-4o family)",
        family: "bpe",
        approx_chars_per_token: { en: 4.0, ko: 2.4 },
        notes:
          "Heuristic CPTs for GPT-4o-like BPE. Context windows vary per model.",
      },
      llama3_sp: {
        display: "LLaMA-3.x SentencePiece",
        family: "sentencepiece",
        approx_chars_per_token: { en: 3.6, ko: 1.8 },
        notes:
          "Heuristic CPTs for SP-based tokenizers (LLaMA-3.x family and derivatives).",
      },
      sentencepiece_kr: {
        display: "Generic Korean SentencePiece",
        family: "sentencepiece",
        approx_chars_per_token: { en: 3.6, ko: 1.6 },
        notes:
          "Catch-all KO SP heuristic (HyperCLOVA, Ko variants). Verify for specific models.",
      },
    },
    models: [
      {
        id: "openai/gpt-3.5-turbo-0125",
        display: "GPT-3.5 Turbo (0125)",
        provider: "openai",
        family: "gpt-3.5",
        encoding: "cl100k_base",
        context_window: 16385,
        language_hint: ["en", "ko"],
        needs_verification: false,
      },
      {
        id: "openai/gpt-4o-2024-05-13",
        display: "GPT-4o (2024-05-13)",
        provider: "openai",
        family: "gpt-4o",
        encoding: "o200k_base",
        context_window: 128000,
        language_hint: ["en", "ko"],
        needs_verification: false,
      },
      {
        id: "openai/gpt-4o-mini-2024-07-18",
        display: "GPT-4o Mini (2024-07-18)",
        provider: "openai",
        family: "gpt-4o-mini",
        encoding: "o200k_base",
        context_window: 128000,
        language_hint: ["en", "ko"],
        needs_verification: false,
      },
      {
        id: "meta/llama-3.1-8b-instruct",
        display: "LLaMA 3.1 8B Instruct",
        provider: "meta",
        family: "llama-3.1",
        encoding: "llama3_sp",
        context_window: 128000,
        language_hint: ["en", "ko"],
        needs_verification: true,
      },
    ],
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function fmtInt(n) {
    if (typeof n !== "number" || !isFinite(n)) return "-";
    try {
      return Math.round(n).toLocaleString("en-US");
    } catch (_) {
      return String(Math.round(n));
    }
  }
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  // -----------------------------
  // Language/script heuristics
  // -----------------------------

  // Basic Hangul ranges: Syllables, Jamo, Compatibility Jamo, Ext-A, Ext-B
  var HANGUL_RANGES = [
    [0xac00, 0xd7a3], // Hangul Syllables
    [0x1100, 0x11ff], // Hangul Jamo
    [0x3130, 0x318f], // Hangul Compatibility Jamo
    [0xa960, 0xa97f], // Hangul Jamo Extended-A
    [0xd7b0, 0xd7ff], // Hangul Jamo Extended-B
  ];
  function isHangulCode(cp) {
    for (var i = 0; i < HANGUL_RANGES.length; i++) {
      var r = HANGUL_RANGES[i];
      if (cp >= r[0] && cp <= r[1]) return true;
    }
    return false;
  }

  function splitCountsByScript(text) {
    var ascii = 0,
      hangul = 0,
      other = 0;
    for (var i = 0; i < text.length; i++) {
      var cp = text.charCodeAt(i);
      if (cp <= 0x007f) {
        ascii++;
      } else if (isHangulCode(cp)) {
        hangul++;
      } else {
        other++;
      }
    }
    return { ascii: ascii, hangul: hangul, other: other, total: text.length };
  }

  function detectLangByRatio(text) {
    var c = splitCountsByScript(text);
    var ratioHangul = c.total > 0 ? c.hangul / c.total : 0;
    // Threshold: if Hangul >= 30%, assume ko; else en
    return ratioHangul >= 0.3 ? "ko" : "en";
  }

  // -----------------------------
  // Table helpers
  // -----------------------------

  function ensureTable(table) {
    return table && typeof table === "object" ? table : DEFAULT_TABLE;
  }

  function getEncodingMeta(encodingId, table) {
    var t = ensureTable(table);
    var enc =
      (t.encodings && t.encodings[encodingId]) ||
      t.encodings[(t.defaults && t.defaults.encoding) || "cl100k_base"] ||
      t.encodings.cl100k_base;
    return enc;
  }

  function resolveModel(modelId, table) {
    var t = ensureTable(table);
    var arr = Array.isArray(t.models) ? t.models : [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && arr[i].id === modelId) return arr[i];
    }
    return null;
  }

  function getThresholds(table, overrides) {
    var t = ensureTable(table);
    var base = Object.assign(
      { warn_usage: 0.85, error_usage: 0.95, units: "tokens" },
      t.ui_thresholds || {},
    );
    return Object.assign(base, overrides || {});
  }

  // -----------------------------
  // Estimation core
  // -----------------------------

  function pickCPT(encodingMeta, lang, fallback) {
    var approx = (encodingMeta && encodingMeta.approx_chars_per_token) || {};
    var cpt =
      (lang && approx[lang]) ||
      approx.ko ||
      approx.en ||
      (fallback && fallback[lang]) ||
      (fallback && (fallback.ko || fallback.en)) ||
      4.0; // very rough default
    return cpt;
  }

  /**
   * estimateTokens(text, opts?)
   * opts: {
   *   encodingId?: string,
   *   langHint?: "ko" | "en",
   *   table?: ModelTableLike
   * }
   * returns: { tokens: number, details: { cpt_en, cpt_ko, counts, encodingId, langUsed } }
   */
  function estimateTokens(text, opts) {
    opts = opts || {};
    var table = ensureTable(opts.table);
    var encodingId =
      opts.encodingId ||
      (table.defaults && table.defaults.encoding) ||
      "cl100k_base";
    var encMeta = getEncodingMeta(encodingId, table);
    var counts = splitCountsByScript(String(text || ""));
    var langUsed = opts.langHint || detectLangByRatio(String(text || ""));

    // CPT references
    var cpt_en = pickCPT(encMeta, "en");
    var cpt_ko = pickCPT(encMeta, "ko");
    // Mixed content "other" bucket: average heuristic between en and ko
    var cpt_other = (cpt_en + cpt_ko) / 2;

    var est =
      counts.ascii / cpt_en + counts.hangul / cpt_ko + counts.other / cpt_other;

    var tokens = Math.ceil(est);
    if (!isFinite(tokens) || tokens < 0) tokens = 0;

    return {
      tokens: tokens,
      details: {
        cpt_en: cpt_en,
        cpt_ko: cpt_ko,
        counts: counts,
        encodingId: encodingId,
        langUsed: langUsed,
      },
    };
  }

  /**
   * computeStats({ current, modelId?, encodingId?, contextWindow?, table?, thresholds? })
   * - Computes headroom, usage fraction, and status level.
   */
  function computeStats(input) {
    var table = ensureTable(input && input.table);
    var thresholds = getThresholds(table, input && input.thresholds);
    var maxTokens = null;
    var encodingId = input && input.encodingId;

    if (input && input.modelId) {
      var meta = resolveModel(input.modelId, table);
      if (meta) {
        maxTokens = meta.context_window || null;
        if (!encodingId) encodingId = meta.encoding;
      }
    }
    if (!maxTokens) {
      maxTokens =
        input && typeof input.contextWindow === "number"
          ? input.contextWindow
          : null;
    }

    var current = Math.max(
      0,
      Math.round(input && input.current ? input.current : 0),
    );
    var usage = maxTokens ? current / maxTokens : 0;
    var level = "ok";
    if (maxTokens) {
      if (usage >= thresholds.error_usage) level = "error";
      else if (usage >= thresholds.warn_usage) level = "warn";
    }

    return {
      current: current,
      max: maxTokens,
      headroom: maxTokens ? Math.max(0, maxTokens - current) : null,
      usage: maxTokens ? clamp(usage, 0, 1) : null,
      level: level,
      encodingId:
        encodingId ||
        (table.defaults && table.defaults.encoding) ||
        "cl100k_base",
      thresholds: thresholds,
    };
  }

  // -----------------------------
  // Async loader (optional)
  // -----------------------------

  /**
   * loadModelTable(url): Promise<ModelTable>
   * - Gracefully falls back to DEFAULT_TABLE if fetch fails or not available.
   */
  function loadModelTable(url) {
    if (typeof fetch !== "function") {
      return Promise.resolve(DEFAULT_TABLE);
    }
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok)
          throw new Error("Failed to fetch model table: " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data !== "object") return DEFAULT_TABLE;
        return data;
      })
      .catch(function () {
        return DEFAULT_TABLE;
      });
  }

  // -----------------------------
  // Board UI
  // -----------------------------

  /**
   * renderBoard(containerEl|selector, opts)
   * opts: {
   *   modelId?: string,
   *   encodingId?: string,
   *   contextWindow?: number,
   *   table?: ModelTable,
   *   thresholds?: { warn_usage?: number, error_usage?: number },
   *   textProvider?: () => string,
   *   measureButtonLabel?: string,
   *   showNotes?: boolean
   * }
   *
   * returns controller: {
   *   updateModel({ modelId?, encodingId?, contextWindow? }),
   *   measureNow(),
   *   destroy()
   * }
   */
  function renderBoard(container, opts) {
    opts = opts || {};
    var containerEl = typeof container === "string" ? $(container) : container;
    if (!containerEl) {
      return {
        updateModel: function () {},
        measureNow: function () {},
        destroy: function () {},
      };
    }

    var table = ensureTable(opts.table);
    var thresholds = getThresholds(table, opts.thresholds);

    // Root
    var root = document.createElement("div");
    root.className = "gg-tokenizer-board";
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Tokenizer Board");

    // Inline minimal styles to avoid external CSS dependency
    var style = document.createElement("style");
    style.type = "text/css";
    style.textContent =
      ".gg-tokenizer-board{border:1px solid var(--border,#334155);border-radius:10px;padding:12px;background:var(--panel,#0f172a);color:var(--fg,#e5e7eb);box-shadow:var(--shadow,0 4px 16px rgba(0,0,0,.2));}" +
      ".ggtk-grid{display:grid;grid-template-columns:max-content 1fr;gap:6px 12px;align-items:baseline;}" +
      ".ggtk-label{opacity:.8;font-size:12px;}" +
      ".ggtk-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;word-break:break-all;}" +
      ".ggtk-row{display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap;}" +
      ".ggtk-btn{appearance:none;border:1px solid var(--border,#334155);background:var(--panel,#0f172a);color:inherit;border-radius:8px;padding:8px 10px;font-size:13px;cursor:pointer;box-shadow:var(--shadow,0 4px 16px rgba(0,0,0,.2));}" +
      ".ggtk-status{font-weight:600;padding:2px 8px;border-radius:6px;display:inline-block;}" +
      ".ggtk-ok{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.35)}" +
      ".ggtk-warn{background:rgba(234,179,8,.12);color:#eab308;border:1px solid rgba(234,179,8,.35)}" +
      ".ggtk-error{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.35)}";
    root.appendChild(style);

    // Grid
    var grid = document.createElement("div");
    grid.className = "ggtk-grid";
    grid.innerHTML =
      '<div class="ggtk-label">Model</div><div class="ggtk-mono" data-k="model">-</div>' +
      '<div class="ggtk-label">Encoding</div><div class="ggtk-mono" data-k="encoding">-</div>' +
      '<div class="ggtk-label">Max</div><div class="ggtk-mono" data-k="max">-</div>' +
      '<div class="ggtk-label">Current</div><div class="ggtk-mono" data-k="current">-</div>' +
      '<div class="ggtk-label">Headroom</div><div class="ggtk-mono" data-k="headroom">-</div>' +
      '<div class="ggtk-label">Status</div><div class="ggtk-mono"><span class="ggtk-status ggtk-ok" data-k="status">OK</span></div>';
    root.appendChild(grid);

    // Actions
    var row = document.createElement("div");
    row.className = "ggtk-row";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ggtk-btn";
    btn.textContent = opts.measureButtonLabel || "측정 (Measure)";
    row.appendChild(btn);
    root.appendChild(row);

    // Notes
    var note = document.createElement("div");
    note.className = "ggtk-mono";
    note.style.marginTop = "6px";
    if (opts.showNotes === false) {
      note.style.display = "none";
    }
    root.appendChild(note);

    containerEl.appendChild(root);

    // Refs
    function ref(k) {
      return root.querySelector('[data-k="' + k + '"]');
    }
    var el = {
      model: ref("model"),
      encoding: ref("encoding"),
      max: ref("max"),
      current: ref("current"),
      headroom: ref("headroom"),
      status: ref("status"),
      note: note,
      measure: btn,
    };

    // State
    var state = {
      modelId: opts.modelId || null,
      encodingId: opts.encodingId || null,
      contextWindow:
        typeof opts.contextWindow === "number" ? opts.contextWindow : null,
      table: table,
      thresholds: thresholds,
      textProvider:
        typeof opts.textProvider === "function"
          ? opts.textProvider
          : function () {
              return "";
            },
    };

    function setStatus(level, label) {
      var cls = "ggtk-status ";
      if (level === "error") cls += "ggtk-error";
      else if (level === "warn") cls += "ggtk-warn";
      else cls += "ggtk-ok";
      el.status.className = cls;
      el.status.textContent = label || level.toUpperCase();
    }

    function updateModelDisplay(meta, encodingId, maxTokens) {
      if (el.model)
        el.model.textContent = meta
          ? meta.id + (meta.needs_verification ? " [unverified]" : "")
          : state.modelId || "-";
      if (el.encoding) el.encoding.textContent = encodingId || "-";
      if (el.max) el.max.textContent = maxTokens ? fmtInt(maxTokens) : "-";
    }

    function updateNumbers(current, headroom) {
      if (el.current) el.current.textContent = fmtInt(current);
      if (el.headroom)
        el.headroom.textContent = headroom != null ? fmtInt(headroom) : "-";
    }

    function computeAndRender(text) {
      // Resolve model meta and encoding
      var meta = state.modelId
        ? resolveModel(state.modelId, state.table)
        : null;
      var encodingId =
        state.encodingId ||
        (meta && meta.encoding) ||
        (state.table.defaults && state.table.defaults.encoding) ||
        "cl100k_base";
      var maxTokens =
        state.contextWindow || (meta && meta.context_window) || null;

      var est = estimateTokens(text, {
        encodingId: encodingId,
        table: state.table,
      });
      var stats = computeStats({
        current: est.tokens,
        modelId: state.modelId || undefined,
        encodingId: encodingId,
        contextWindow: maxTokens || undefined,
        table: state.table,
        thresholds: state.thresholds,
      });

      updateModelDisplay(meta, stats.encodingId, stats.max);
      updateNumbers(stats.current, stats.headroom);

      var label = "OK";
      if (stats.level === "warn") {
        label = "WARN (" + Math.round((stats.usage || 0) * 100) + "%)";
      } else if (stats.level === "error") {
        label = "ERROR (" + Math.round((stats.usage || 0) * 100) + "%)";
      }
      setStatus(stats.level, label);

      if (el.note) {
        var encMeta = getEncodingMeta(stats.encodingId, state.table);
        var approx = encMeta && encMeta.approx_chars_per_token;
        var _msg =
          "Heuristic estimation — CPT(en): " +
          (approx && approx.en ? approx.en : "?") +
          ", CPT(ko): " +
          (approx && approx.ko ? approx.ko : "?") +
          " | ascii/hangul/other chars: " +
          est.details.counts.ascii +
          "/" +
          est.details.counts.hangul +
          "/" +
          est.details.counts.other;
        if (meta && meta.needs_verification) {
          _msg +=
            " | Note: model parameters unverified (context/output/encoding need confirmation)";
        }
        el.note.textContent = _msg;
      }

      // annotate root with data-level for external CSS if any
      root.setAttribute("data-level", stats.level);

      return { est: est, stats: stats, meta: meta };
    }

    function measureNow() {
      var text = "";
      try {
        text = state.textProvider() || "";
      } catch (_) {
        text = "";
      }
      return computeAndRender(String(text));
    }

    el.measure.addEventListener("click", measureNow);

    // Initial render (without current values)
    updateModelDisplay(
      state.modelId ? resolveModel(state.modelId, state.table) : null,
      state.encodingId ||
        (state.table.defaults && state.table.defaults.encoding) ||
        "cl100k_base",
      state.contextWindow || null,
    );
    updateNumbers(0, state.contextWindow || null);
    setStatus("ok", "OK");

    return {
      updateModel: function (cfg) {
        cfg = cfg || {};
        if (typeof cfg.modelId === "string") state.modelId = cfg.modelId;
        if (typeof cfg.encodingId === "string")
          state.encodingId = cfg.encodingId;
        if (typeof cfg.contextWindow === "number")
          state.contextWindow = cfg.contextWindow;
        updateModelDisplay(
          state.modelId ? resolveModel(state.modelId, state.table) : null,
          state.encodingId ||
            (state.table.defaults && state.table.defaults.encoding) ||
            "cl100k_base",
          state.contextWindow ||
            (state.modelId
              ? (resolveModel(state.modelId, state.table) || {}).context_window
              : null),
        );
      },
      measureNow: measureNow,
      destroy: function () {
        try {
          el.measure.removeEventListener("click", measureNow);
        } catch (_) {}
        if (root.parentNode) root.parentNode.removeChild(root);
      },
    };
  }

  // -----------------------------
  // Public API
  // -----------------------------

  return {
    version: VERSION,
    defaults: {
      table: DEFAULT_TABLE,
    },
    // Data
    loadModelTable: loadModelTable,
    resolveModel: resolveModel,
    getEncodingMeta: getEncodingMeta,
    getThresholds: getThresholds,
    // Estimation
    splitCountsByScript: splitCountsByScript,
    detectLangByRatio: detectLangByRatio,
    estimateTokens: estimateTokens,
    computeStats: computeStats,
    // UI
    renderBoard: renderBoard,
  };
});
