export function attachViewportGuards(getInput, getMsgs){
  const sync = ()=> { const strip = document.getElementById('strip'); const h = Math.round(strip?.getBoundingClientRect().height || 46); document.documentElement.style.setProperty('--gg-strip-h', `${h}px`); };
  sync();
  const vv = window.visualViewport;
  const onVV = ()=> sync();
  vv?.addEventListener('resize', onVV);
  vv?.addEventListener('scroll', onVV);
  let io = null;
  if('IntersectionObserver' in window){ io = new IntersectionObserver((ents)=>{ const e = ents[0]; if(!e) return; if(e.intersectionRatio < 0.99){ sync(); const msgs = getMsgs?.(); if(msgs) msgs.scrollTop = msgs.scrollHeight; } }, { root:null, threshold:[0,0.99,1] }); const input = getInput?.(); if(input) io.observe(input); }
  const onResize = ()=> sync();
  window.addEventListener('resize', onResize, { passive: true });
  return ()=> { vv?.removeEventListener('resize', onVV); vv?.removeEventListener('scroll', onVV); if(io) io.disconnect(); window.removeEventListener('resize', onResize); };
}
