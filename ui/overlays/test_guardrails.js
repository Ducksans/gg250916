(function () {
  const results = [];
  const log = (name, ok, msg) => results.push({ name, ok, msg });
  const $ = (s, sc) => (sc || document).querySelector(s);
  const $$ = (s, sc) => Array.from((sc || document).querySelectorAll(s));

  const simple = document.body.classList.contains("simple");
  log(
    "Mode Check",
    simple,
    simple ? "Simple mode active" : "Simple mode inactive",
  );

  const htmlHidden =
    getComputedStyle(document.documentElement).overflow === "hidden";
  const bodyHidden = getComputedStyle(document.body).overflow === "hidden";
  log(
    "Global Scroll Hidden",
    htmlHidden && bodyHidden,
    htmlHidden && bodyHidden ? "Global scroll hidden" : "Global scroll alive",
  );

  const wrap = $("#a1-wrap");
  const wrapCS = wrap && getComputedStyle(wrap);
  const isGrid = !!wrap && wrapCS.display === "grid";
  log(
    "Wrap is Grid",
    isGrid,
    isGrid ? "#a1-wrap is grid" : "#a1-wrap not grid",
  );

  // T1) Grid Rows (declare 우선 + 3트랙 허용)
  let okRows = false,
    rowsMsg = "";
  if (wrap) {
    const declared = (
      (wrap.style && wrap.style.gridTemplateRows) ||
      ""
    ).replace(/\s+/g, " ");
    const computed = (wrapCS.gridTemplateRows || "").trim();
    const threeTracks = computed.split(" ").filter(Boolean).length === 3;
    okRows = /minmax\(0,\s*1fr\)/i.test(declared) || threeTracks;
    rowsMsg = `decl:'${declared || "-"}' comp:'${computed}' tracks:${threeTracks ? 3 : "?"} minmax:${/minmax\(0,\s*1fr\)/i.test(declared)}`;
  }
  log(
    "Grid Rows (3 rows)",
    okRows,
    okRows ? "OK" : `Grid rows issue: ${rowsMsg}`,
  );

  const kids = wrap ? Array.from(wrap.children) : [];
  log(
    "Direct Children Count",
    kids.length === 3,
    kids.length === 3 ? "Direct children count OK (3)" : `Got ${kids.length}`,
  );

  // T2) Scrollers (#a1 서브트리 한정, whitelist 2개)
  const inA1 = $$("#a1 *");
  const autosInA1 = inA1.filter((el) => {
    const s = getComputedStyle(el);
    return (
      s.overflow === "auto" || s.overflowY === "auto" || s.overflowX === "auto"
    );
  });
  const ids = autosInA1.map((el) => el.id || "");
  const whitelist = new Set(["gg-threads", "chat-msgs"]);
  const unexpected = autosInA1.filter((el) => !whitelist.has(el.id));
  const hasBoth = ["gg-threads", "chat-msgs"].every((id) => ids.includes(id));
  log(
    "Scrollers (2 allowed)",
    hasBoth && unexpected.length === 0,
    hasBoth && unexpected.length === 0
      ? "OK"
      : `Scroller violation in A1: found ${ids.filter(Boolean).length}, unexpected: ${unexpected.map((e) => e.id).join(",") || "-"}`,
  );

  const hasActions = !!$('[data-gg="composer-actions"]', wrap);
  log(
    "Composer Actions Mark",
    hasActions,
    hasActions
      ? "Composer actions marked correctly"
      : "Composer actions missing",
  );

  // T3) Input Area Config
  const input = $("#chat-input");
  let inputOk = false,
    imsg = "";
  if (input) {
    const s = getComputedStyle(input);
    const overflowOk =
      !["auto", "scroll"].includes(s.overflow) &&
      !["auto", "scroll"].includes(s.overflowY);
    const visibleOk = input.offsetHeight > 0;
    const actions = $('[data-gg="composer-actions"]', wrap);
    const sameParent = actions && actions.parentElement === input.parentElement;
    inputOk = overflowOk && visibleOk && !!sameParent;
    imsg = `overflow:${s.overflow}/${s.overflowY} visible:${visibleOk} sameParent:${!!sameParent}`;
  }
  log(
    "Input Area Config",
    inputOk,
    inputOk ? "OK" : `Input area configuration issues: ${imsg}`,
  );

  const msgs = $("#chat-msgs");
  const msgsCS = msgs && getComputedStyle(msgs);
  const msgsOk = !!msgs && msgsCS.overflowY === "auto";
  log(
    "Timeline Container",
    msgsOk,
    msgsOk ? "OK" : "Timeline container misconfigured",
  );

  const misplacedHeartbeat = !!$('#a1 [data-gg="heartbeat"]');
  const thinkingInMsgs =
    !!$("#gg-thinking") && !!msgs && msgs.contains($("#gg-thinking"));
  const auxOk = !misplacedHeartbeat && thinkingInMsgs;
  log(
    "Auxiliary Elements",
    auxOk,
    auxOk
      ? "OK"
      : `heartbeat in A1:${misplacedHeartbeat} thinkingInMsgs:${thinkingInMsgs}`,
  );

  const passed = results.filter((r) => r.ok).length,
    failed = results.length - passed;
  console.log("🔍 ST-1206 T3 UI Guardrails v1.0.1");
  console.table(results);
  console.log("==================================================");
  console.log("📊 Summary:");
  console.log("✅ Passed:", passed);
  console.log("❌ Failed:", failed);
  console.log("⚠️ Warnings:", 0);
  window.__ST1206_TEST_RESULTS__ = results;
  if (failed > 0) console.warn("⚠️ SOME TESTS FAILED");
})();
