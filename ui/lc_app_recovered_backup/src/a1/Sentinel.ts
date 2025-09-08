export function attachStickyBottom(msgs, getComposer){
  if(!msgs) return ()=>{};
  const NEAR = 24;
  let sentinel = msgs.querySelector('#gg-sentinel-bottom');
  if(!sentinel){ sentinel = document.createElement('div'); sentinel.id='gg-sentinel-bottom'; sentinel.style.height='1px'; sentinel.style.width='100%'; sentinel.style.flexShrink='0'; msgs.appendChild(sentinel);}
  const isNearBottom = ()=> msgs.scrollHeight - (msgs.scrollTop + msgs.clientHeight) <= NEAR;
  const syncPadding = ()=> { const comp = getComposer?.()||null; const h = comp ? Math.ceil(comp.getBoundingClientRect().height) : 0; msgs.style.scrollPaddingBottom = (h>0? h:0)+'px'; };
  syncPadding();
  const mo = new MutationObserver(()=> { if(isNearBottom()) msgs.scrollTop = msgs.scrollHeight; syncPadding(); });
  mo.observe(msgs, { childList:true, subtree:true });
  let ro = null;
  if('ResizeObserver' in window){ ro = new ResizeObserver(syncPadding); const comp = getComposer?.(); if(comp) ro.observe(comp); }
  const onResize = ()=> syncPadding();
  window.addEventListener('resize', onResize, { passive: true });
  return ()=> { mo.disconnect(); if(ro) ro.disconnect(); window.removeEventListener('resize', onResize); };
}
