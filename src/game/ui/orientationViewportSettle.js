// Mobile browsers report intermediate viewport sizes while rotating and during
// first landscape load. index.html owns the early VisualViewport measurement;
// once Phaser exists this helper only reacts to that single normalized signal.

function rawViewport() {
  const vv = window.visualViewport;
  return {
    vvW: Number(vv?.width || 0),
    vvH: Number(vv?.height || 0),
    innerW: Number(window.innerWidth || 0),
    innerH: Number(window.innerHeight || 0),
    clientW: Number(document.documentElement?.clientWidth || 0),
    clientH: Number(document.documentElement?.clientHeight || 0)
  };
}

function isLandscape() {
  const r = rawViewport();
  const w = Math.max(r.vvW, r.innerW, r.clientW, 0);
  const h = Math.max(r.vvH, r.innerH, r.clientH, 0);
  return w >= h;
}

function viewportRect() {
  const root=document.documentElement;
  const cssW=parseFloat(root.style.getPropertyValue('--tdr-vv-width'))||0;
  const cssH=parseFloat(root.style.getPropertyValue('--tdr-vv-height'))||0;
  const r = rawViewport();
  const w = Math.max(1, Math.round(Math.max(cssW, r.vvW, r.innerW, r.clientW)));
  const h = Math.max(1, Math.round(Math.max(cssH, r.vvH, r.innerH, r.clientH)));
  return { w, h };
}

function applyViewport(game) {
  if (!game || !isLandscape()) return;
  const { w, h } = viewportRect();
  try {
    const scale = game.scale;
    const currentW = Math.round(Number(scale?.width || 0));
    const currentH = Math.round(Number(scale?.height || 0));
    if (currentW !== w || currentH !== h) scale?.resize?.(w, h);
  } catch {}
}

export function installOrientationViewportSettle(game) {
  if (!game || game.__tdrOrientationViewportSettleInstalled) return;
  game.__tdrOrientationViewportSettleInstalled = true;

  let timers = [];
  let raf = 0;
  const clear = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    for (const id of timers) clearTimeout(id);
    timers = [];
  };

  const settle = () => {
    clear();
    if (!isLandscape()) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      applyViewport(game);
    });
    [120, 320, 700, 1300].forEach(ms => {
      timers.push(setTimeout(() => applyViewport(game), ms));
    });
  };

  // index.html normalizes resize/orientation/VisualViewport events into this.
  window.addEventListener('tdr:viewportchange', settle, { passive: true });
  window.addEventListener('pageshow', settle, { passive: true });
  const onVisible=()=>{if(!document.hidden)settle();};
  document.addEventListener('visibilitychange',onVisible,{passive:true});

  game.events?.once?.('destroy',()=>{
    clear();
    window.removeEventListener('tdr:viewportchange',settle);
    window.removeEventListener('pageshow',settle);
    document.removeEventListener('visibilitychange',onVisible);
  });

  settle();
}
