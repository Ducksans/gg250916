# DEV Console Verification — ST-1206 T3 (Simple mode)

Purpose
- One-paste console snippet to verify UI Pitstop(Simple) guardrails on any snapshot/page that loads the overlays.
- Designed to minimize false positives and focus strictly on the A1 subtree.

What it checks
- #a1-wrap is a CSS grid
- Middle grid track is minmax(0, 1fr) (accepts browser-normalized 0px)
- Global scroll is hidden in Simple mode (html/body overflow hidden)
- Exactly two scroll containers within A1: #gg-threads and #chat-msgs
- [data-gg="composer-actions"] row exists (right-aligned actions)
- Diagnostic dumps for any unexpected scrollers found

How to use
1) Open DevTools Console on the A1 page
2) Paste the snippet below and press Enter

Tip: If you’re testing dev sensors, set localStorage first:
localStorage.gg_env = 'dev';

----------------------------------------
MAIN VERIFICATION SNIPPET
----------------------------------------
(() => {
  // Utils
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = (el) => (el ? getComputedStyle(el) : null);
  const gridMinmaxOk = (s) => /minmax\(\s*0(px)?\s*,\s*1fr\s*\)/i.test(s || '');
  const isAutoOrScroll = (st) =>
    st === 'auto' || st === 'scroll' || st === 'overlay'; // overlay seen on some platforms

  // Scope: A1 subtree only
  const a1 = q('#a1');
  const wrap = q('#a1-wrap');
  const msgs = q('#chat-msgs');
  const threads = q('#gg-threads');
  const wrapCS = css(wrap);

  // Collect scrollers within A1 subtree only
  const inA1 = a1 ? qa('*', a1) : [];
  const autosInA1 = inA1.filter((el) => {
    const s = css(el);
    if (!s) return false;
    // Exclude textareas and inputs from scroller detection
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'input') return false;
    return (
      isAutoOrScroll(s.overflow) ||
      isAutoOrScroll(s.overflowY) ||
      isAutoOrScroll(s.overflowX)
    );
  });

  // Whitelist
  const WL = new Set(['gg-threads', 'chat-msgs']);
  const wlAutos = autosInA1.filter((el) => WL.has(el.id));
  const extraAutos = autosInA1.filter((el) => !WL.has(el.id));

  // Globals
  const htmlHidden = css(document.documentElement)?.overflow === 'hidden';
  const bodyHidden = css(document.body)?.overflow === 'hidden';

  // Composer actions marking
  const composerActions = q('[data-gg="composer-actions"]');

  // Results table
  console.table({
    a1_found: !!a1,
    a1Wrap_found: !!wrap,
    a1Wrap_isGrid: wrapCS?.display === 'grid',
    a1Wrap_rows_ok: gridMinmaxOk(wrapCS?.gridTemplateRows || ''),
    html_hidden: htmlHidden,
    body_hidden: bodyHidden,
    scroller_count_whitelisted: wlAutos.length, // should be 2
    extra_scrollers_in_a1: extraAutos.length,
    composerActions_found: !!composerActions
  });

  // Assertions (dev)
  console.assert(!!a1, '#a1 not found');
  console.assert(!!wrap, '#a1-wrap not found');
  console.assert(wrapCS?.display === 'grid', '#a1-wrap is not grid');
  console.assert(
    gridMinmaxOk(wrapCS?.gridTemplateRows || ''),
    'grid middle track not minmax(0,1fr)'
  );
  console.assert(htmlHidden, 'html overflow must be hidden in Simple mode');
  console.assert(bodyHidden, 'body overflow must be hidden in Simple mode');
  console.assert(
    wlAutos.length === 2,
    'Whitelist scroller count must be exactly 2 (#gg-threads, #chat-msgs)'
  );
  console.assert(
    extraAutos.length === 0,
    'Unexpected extra scrollers in #a1 subtree'
  );
  console.assert(
    !!composerActions,
    'Composer actions row missing [data-gg="composer-actions"]'
  );

  // Detailed dump for unexpected scrollers
  if (extraAutos.length) {
    const summarize = (el) => {
      const s = css(el);
      const id = el.id ? `#${el.id}` : '';
      const cls =
        (el.className && String(el.className).trim())
          ? '.' + String(el.className).trim().split(/\s+/).join('.')
          : '';
      const tag = (el.tagName || '').toLowerCase();
      const sel = [tag, id, cls].join('');
      return {
        element: sel || '(anonymous)',
        overflow: s.overflow,
        overflowY: s.overflowY,
        overflowX: s.overflowX,
        display: s.display,
        parent: el.parentElement ? el.parentElement.tagName.toLowerCase() : ''
      };
    };
    console.group('EXTRA_SCROLLER_DETAILS');
    console.table(extraAutos.map(summarize));
    console.groupEnd();
  }

  // Return machine-friendly result
  return {
    ok:
      !!a1 &&
      !!wrap &&
      wrapCS?.display === 'grid' &&
      gridMinmaxOk(wrapCS?.gridTemplateRows || '') &&
      htmlHidden &&
      bodyHidden &&
      wlAutos.length === 2 &&
      extraAutos.length === 0 &&
      !!composerActions,
    meta: {
      wlAutos: wlAutos.map((el) => el.id),
      extraAutosCount: extraAutos.length
    }
  };
})();

----------------------------------------
OPTIONAL: QUICK REMEDIATION SNIPPET (DEV ONLY)
- Use this when you need to stabilize a broken state quickly without reload.
- It mirrors overlay hardening: force Simple grid, hide global scroll, and mark composer actions.
----------------------------------------
(() => {
  try {
    const b = document.body || document.documentElement;
    if (b && !b.classList.contains('simple')) b.classList.add('simple');

    const wrap = document.getElementById('a1-wrap');
    if (!wrap) return;

    // Force grid + minmax shrink
    wrap.style.display = 'grid';
    wrap.style.gridTemplateRows = 'auto minmax(0, 1fr) auto';
    wrap.style.gridTemplateColumns = 'minmax(0, var(--gg-chat-width, 880px)) auto';
    wrap.style.justifyContent = 'center';
    wrap.style.height = 'calc(100dvh - var(--gg-strip-h, 46px))';
    wrap.style.overflow = 'hidden';

    // Global scroll hidden
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Allow shrink in chain
    ['a1', 'a1-right', 'a1-wrap', 'chat-msgs'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.minHeight = '0';
    });

    // Ensure only two scroll containers within A1
    const msgs = document.getElementById('chat-msgs');
    if (msgs) {
      msgs.style.overflowY = 'auto';
      msgs.style.height = 'auto';
      msgs.style.maxHeight = 'none';
    }
    const threads = document.getElementById('gg-threads');
    if (threads) {
      threads.style.overflowY = 'auto';
    }

    // Composer actions marking
    const input = document.getElementById('chat-input');
    if (input && input.nextElementSibling) {
      const btnRow = input.nextElementSibling;
      btnRow.setAttribute('data-gg', 'composer-actions');
      btnRow.style.gridRow = '3';
      btnRow.style.gridColumn = '2';
      btnRow.style.justifySelf = 'end';
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      btnRow.style.alignItems = 'flex-end';
    }

    // Thinking badge alignment (inside timeline)
    const host = document.getElementById('chat-msgs');
    if (host && !document.getElementById('gg-thinking')) {
      const badge = document.createElement('div');
      badge.id = 'gg-thinking';
      badge.style.cssText = [
        'position:sticky',
        'top:4px',
        'z-index:5',
        'max-width:var(--gg-chat-width, 880px)',
        'margin:0 auto 6px',
        'background:rgba(59,130,246,.12)',
        'border:1px solid rgba(59,130,246,.45)',
        'color:#60a5fa',
        'padding:6px 8px',
        'border-radius:8px',
        'font:12px system-ui,-apple-system,Segoe UI,Roboto,Arial',
        'display:none'
      ].join(';');
      host.insertAdjacentElement('afterbegin', badge);
    }

    console.info('[DEV] Quick remediation applied.');
  } catch (e) {
    console.warn('[DEV] Remediation failed:', e);
  }
})();

----------------------------------------
INTERPRETATION
----------------------------------------
- a1Wrap_isGrid: true
- a1Wrap_rows_ok: true (accepts both "minmax(0, 1fr)" and "minmax(0px, 1fr)")
- html_hidden/body_hidden: true
- scroller_count_whitelisted: 2
- extra_scrollers_in_a1: 0
- composerActions_found: true
→ All assertions should pass (no console.assert failures)

If any assertion fails:
- rows_ok=false → some earlier CSS overwrote grid-template-rows; run the Quick Remediation or reload after overlays load
- html/body hidden=false → ensure ensureSimpleGrid ran (Quick Remediation sets both)
- extra_scrollers_in_a1>0 → inspect the console group EXTRA_SCROLLER_DETAILS and remove/relax overflow from those nodes (or scope them outside #a1)
- composerActions missing → the Quick Remediation marks it via the sibling row after #chat-input

Notes
- This check intentionally ignores overflow outside #a1 subtree (modals or global panels can manage their own scroll).
- If overlays are injected late, ensureSimpleGrid is invoked on DOMContentLoaded and on load; the Quick Remediation covers accidental misses without a reload.
- “생각 중…” badge is anchored inside #chat-msgs to keep its width/centering consistent with the timeline.

Last updated: 2025-08-25