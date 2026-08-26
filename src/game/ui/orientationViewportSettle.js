// Mobile browsers often report one or more intermediate viewport sizes while
// rotating. Phaser can receive that transient size, rebuild the active scene,
// then never receive the final geometry until the next rotation. This helper
// waits for the visual viewport to settle and reapplies the authoritative size.

function isLandscape() {
  const vv = window.visualViewport;
  const w = Number(vv?.width || window.innerWidth || 0);
  const h = Number(vv?.height || window.innerHeight || 0);
  return w >= h;
}

function viewportRect() {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 1));
  const h = Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 1));
  const left = Math.max(0, Math.round(vv?.offsetLeft || 0));
  const top = Math.max(0, Math.round(vv?.offsetTop || 0));
  return { w, h, left, top };
}

function applyViewport(game) {
  if (!game || !isLandscape()) return;
  const { w, h, left, top } = viewportRect();
  const root = document.documentElement;

  // Keep DOM scenes and Phaser reading the exact same final viewport.
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

    // First frame fixes obvious stale geometry. Later passes catch Safari/Chrome
    // toolbar + safe-area settling without requiring a second rotation.
    raf = requestAnimationFrame(() => {
      raf = 0;
      applyViewport(game);
    });
    timers.push(setTimeout(() => applyViewport(game), 80));
    timers.push(setTimeout(() => applyViewport(game), 180));
    timers.push(setTimeout(() => applyViewport(game), 360));
  };

  window.addEventListener('orientationchange', settle, { passive: true });
  window.addEventListener('resize', settle, { passive: true });
  window.addEventListener('tdr:viewportchange', settle, { passive: true });
  window.visualViewport?.addEventListener?.('resize', settle, { passive: true });

  // The orientation overlay sleeps the game in portrait. When landscape returns,
  // give the browser one frame and settle the active scene immediately.
  settle();
}
