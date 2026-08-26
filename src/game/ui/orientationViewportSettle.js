// Mobile browsers often report one or more intermediate viewport sizes while
// rotating OR during the very first landscape load. Phaser can receive that
// transient size, rebuild the active scene, then keep a short canvas until a
// later orientation change. This helper keeps sampling until the viewport is
// genuinely settled and prefers the largest trustworthy landscape rectangle.

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
  const r = rawViewport();
  // On iOS a direct landscape launch can expose a stale visualViewport height
  // for a few hundred ms while innerHeight/clientHeight already contain the
  // real usable rectangle. Taking the largest current candidate prevents the
  // game from being permanently letterboxed until the user rotates again.
  const w = Math.max(1, Math.round(Math.max(r.vvW, r.innerW, r.clientW)));
  const h = Math.max(1, Math.round(Math.max(r.vvH, r.innerH, r.clientH)));
  return { w, h, left: 0, top: 0 };
}

function applyViewport(game) {
  if (!game || !isLandscape()) return;
  const { w, h, left, top } = viewportRect();
  const root = document.documentElement;

  // Keep DOM scenes and Phaser reading the exact same final viewport. The app
  // owns the whole page, so do not offset the fixed body by visualViewport's
  // transient offsetTop/offsetLeft during browser-toolbar settling.
  root.style.setProperty('--tdr-vv-width', `${w}px`);
  root.style.setProperty('--tdr-vv-height', `${h}px`);
  root.style.setProperty('--tdr-vv-left', `${left}px`);
  root.style.setProperty('--tdr-vv-top', `${top}px`);

  try {
    const scale = game.scale;
    const currentW = Math.round(Number(scale?.width || 0));
    const currentH = Math.round(Number(scale?.height || 0));
    if (currentW !== w || currentH !== h) scale?.resize?.(w, h);
    else scale?.refresh?.();
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

    // Rotation normally settles quickly; a cold landscape launch on Safari can
    // take noticeably longer. These later passes cost virtually nothing and
    // remove the need for a corrective portrait -> landscape cycle.
    [80, 180, 360, 650, 1000, 1500].forEach(ms => {
      timers.push(setTimeout(() => applyViewport(game), ms));
    });
  };

  window.addEventListener('orientationchange', settle, { passive: true });
  window.addEventListener('resize', settle, { passive: true });
  window.addEventListener('pageshow', settle, { passive: true });
  window.addEventListener('tdr:viewportchange', settle, { passive: true });
  window.visualViewport?.addEventListener?.('resize', settle, { passive: true });
  window.visualViewport?.addEventListener?.('scroll', settle, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) settle(); }, { passive: true });

  settle();
}
