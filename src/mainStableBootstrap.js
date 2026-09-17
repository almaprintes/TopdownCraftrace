import './style.css';
import { createGame } from './game/game.js';

function showFatal(msg) {
  try { document.getElementById('tdrStartup')?.remove(); } catch {}
  const el = document.getElementById('app');
  if (!el) return;
  el.innerHTML = `<div style="padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#fff;"><h2 style="margin:0 0 8px">Error de arranque detectado</h2><pre style="white-space:pre-wrap;word-break:break-word;background:#11172e;padding:12px;border-radius:10px;border:1px solid rgba(183,192,255,.25);color:#b7c0ff;">${String(msg || 'Error desconocido')}</pre></div>`;
}

window.addEventListener('error', e => showFatal(e?.error?.stack || e?.message || String(e)));
window.addEventListener('unhandledrejection', e => showFatal(`UnhandledPromiseRejection:\n${e?.reason?.stack || e?.reason?.message || String(e?.reason || e)}`));

let game = null;
function isLandscape() { return window.innerWidth >= window.innerHeight; }
function setOverlay(visible) {
  const ov = document.getElementById('rotateOverlay');
  if (ov) {
    ov.style.display = visible ? 'flex' : 'none';
    ov.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
  try { document.documentElement.classList.toggle('tdr-portrait', !!visible); } catch {}
}
function tickOrientation() {
  const landscape = isLandscape();
  setOverlay(!landscape);
  if (landscape && !game) {
    game = createGame('app');
    try { window.__tdrGame = game; } catch {}
    return;
  }
  if (!game) return;
  try { landscape ? game.loop?.wake?.() : game.loop?.sleep?.(); } catch {}
}

tickOrientation();
window.addEventListener('resize', tickOrientation, { passive:true });
window.addEventListener('orientationchange', tickOrientation, { passive:true });
