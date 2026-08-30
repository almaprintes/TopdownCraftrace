import './style.css';
import { createGame } from './game/game.js';

function showFatal(msg) {
  const el = document.getElementById('app');
  if (!el) return;
  el.innerHTML = `
    <div style="padding:16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;color:#fff;">
      <h2 style="margin:0 0 8px 0;">Pantalla en blanco: error detectado</h2>
      <pre style="white-space:pre-wrap;word-break:break-word;background:#11172e;padding:12px;border-radius:10px;border:1px solid rgba(183,192,255,.25);color:#b7c0ff;">${String(msg||'Error desconocido')}</pre>
      <p style="color:#b7c0ff;margin:10px 0 0 0;">Si ves esto en iPhone, haz captura y pégamela.</p>
    </div>
  `;
}

// Keep one startup-level error surface. Runtime diagnostics takes over once the
// Phaser game exists; the former second full-screen error overlay was redundant.
window.addEventListener('error', (e) => {
  const msg = e?.error?.stack || e?.message || String(e);
  showFatal(msg);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e?.reason?.stack || e?.reason?.message || String(e?.reason || e);
  showFatal(`UnhandledPromiseRejection:\n${msg}`);
});

// Service worker registration is owned by index.html. Do not register it again
// here or force reload/controller changes from two competing bootstrap paths.

let __game = null;

function __isLandscape() {
  return window.innerWidth >= window.innerHeight;
}

function __setOverlayVisible(visible) {
  const ov = document.getElementById('rotateOverlay');
  if (!ov) return;
  ov.style.display = visible ? 'flex' : 'none';
  ov.setAttribute('aria-hidden', visible ? 'false' : 'true');
}

function __sleepGame() {
  try { __game?.loop?.sleep?.(); } catch {}
}

function __wakeGame() {
  try { __game?.loop?.wake?.(); } catch {}
}

const __legacyTouchHidden = new WeakSet();
function __hideLegacyTouchVisuals(race) {
  if (!race || __legacyTouchHidden.has(race)) return;
  const list = race?.touchUI?.list;
  if (!Array.isArray(list) || list.length < 6) return;
  for (let i = 0; i <= 5; i++) {
    const obj = list[i];
    if (!obj) continue;
    try { obj.setVisible?.(false); } catch {}
    try { obj.setAlpha?.(0); } catch {}
  }
  __legacyTouchHidden.add(race);
}

function __installRaceControlVisuals() {
  if (document.getElementById('tdr-race-controls')) return;

  const style = document.createElement('style');
  style.textContent = `
    #tdr-race-controls {
      position: fixed;
      inset: 0;
      z-index: 50;
      pointer-events: none;
      display: none;
      font-family: Orbitron, system-ui, -apple-system, Segoe UI, sans-serif;
    }

    .tdr-pedal {
      --accent: #55ff9d;
      --level: 0;
      position: absolute;
      right: max(18px, 1.8vw);
      width: clamp(168px, 19vw, 340px);
      height: clamp(78px, 16.5vh, 124px);
      box-sizing: border-box;
      overflow: hidden;
      clip-path: polygon(8% 0, 100% 0, 94% 100%, 0 100%);
      border: 1px solid color-mix(in srgb, var(--accent) 52%, white 8%);
      background:
        linear-gradient(115deg, rgba(255,255,255,.07), transparent 30%),
        linear-gradient(180deg, rgba(16,27,34,.91), rgba(4,10,15,.88));
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.12),
        inset 0 -18px 34px rgba(0,0,0,.25),
        0 0 0 1px rgba(0,0,0,.28),
        0 8px 22px rgba(0,0,0,.18);
      transition: filter 80ms linear, transform 80ms linear;
      transform: translateZ(0);
    }

    .tdr-pedal::before {
      content: '';
      position: absolute;
      inset: 0;
      transform-origin: 50% 100%;
      transform: scaleY(calc(.10 + var(--level) * .90));
      background: linear-gradient(0deg,
        color-mix(in srgb, var(--accent) 34%, transparent),
        color-mix(in srgb, var(--accent) 5%, transparent) 62%,
        transparent 100%);
      opacity: calc(.30 + var(--level) * .70);
    }

    .tdr-pedal::after {
      content: '';
      position: absolute;
      left: 10%;
      right: 6%;
      top: 10px;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      opacity: calc(.42 + var(--level) * .58);
      box-shadow: 0 0 calc(5px + var(--level) * 11px) var(--accent);
    }

    .tdr-pedal-gas { bottom: calc(max(18px, 2.8vh) + clamp(90px, 18vh, 135px)); }
    .tdr-pedal-brake { --accent: #ff5e73; bottom: max(18px, 2.8vh); }

    .tdr-pedal-inner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transform: skewX(-2deg);
    }

    .tdr-pedal-icon {
      width: 24px;
      height: 44%;
      border-left: 3px solid var(--accent);
      border-right: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
      opacity: .85;
      transform: skewX(-7deg);
      box-shadow: -4px 0 10px color-mix(in srgb, var(--accent) 28%, transparent);
    }

    .tdr-pedal-copy { display: flex; flex-direction: column; line-height: 1; }
    .tdr-pedal-label {
      color: white;
      font-size: clamp(24px, 2.5vw, 42px);
      font-weight: 900;
      letter-spacing: .02em;
      text-shadow: 0 2px 3px #000, 0 0 12px color-mix(in srgb, var(--accent) 34%, transparent);
    }
    .tdr-pedal-sub {
      margin-top: 7px;
      color: color-mix(in srgb, var(--accent) 72%, white 10%);
      font-size: clamp(7px, .7vw, 11px);
      font-weight: 800;
      letter-spacing: .18em;
      opacity: .78;
    }

    .tdr-pedal.is-active {
      filter: brightness(1.25) saturate(1.16);
      transform: translateY(2px) scale(.985);
    }

    .tdr-stick {
      --x: 0;
      --y: 0;
      --mag: 0;
      position: absolute;
      left: max(22px, 2vw);
      bottom: max(22px, 3vh);
      width: clamp(142px, 17vw, 190px);
      aspect-ratio: 1;
      opacity: .78;
      transition: opacity 90ms linear;
      filter: drop-shadow(0 7px 18px rgba(0,0,0,.20));
    }

    .tdr-stick.is-active { opacity: .98; }

    .tdr-stick-ring,
    .tdr-stick-core,
    .tdr-stick-energy {
      position: absolute;
      border-radius: 50%;
      inset: 0;
      margin: auto;
    }

    .tdr-stick-ring {
      width: 84%;
      height: 84%;
      border: 3px solid rgba(220,235,255,.30);
      background:
        radial-gradient(circle, rgba(20,40,55,.08) 0 54%, transparent 55%),
        conic-gradient(from -90deg,
          rgba(110,215,255,calc(.05 + var(--mag) * .15)),
          transparent 22%, transparent 78%,
          rgba(110,215,255,calc(.05 + var(--mag) * .15)));
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.055),
        0 0 14px rgba(100,200,255,.11);
    }

    .tdr-stick-ring::before,
    .tdr-stick-ring::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      background: rgba(185,225,255,.12);
      transform: translate(-50%,-50%);
    }
    .tdr-stick-ring::before { width: 62%; height: 1px; }
    .tdr-stick-ring::after { width: 1px; height: 62%; }

    .tdr-stick-energy {
      width: 63%;
      height: 63%;
      border: 1px solid rgba(115,210,255,calc(.10 + var(--mag) * .28));
      box-shadow: 0 0 calc(5px + var(--mag) * 10px) rgba(80,190,255,.14);
      transform: translate(calc(var(--x) * 8px), calc(var(--y) * 8px));
      transition: border-color 80ms linear;
    }

    .tdr-stick-vector {
      position: absolute;
      left: 50%;
      top: 50%;
      width: calc(var(--mag) * 32%);
      height: 3px;
      transform-origin: 0 50%;
      transform: rotate(calc(atan2(var(--y), var(--x))));
      background: linear-gradient(90deg, rgba(120,220,255,.08), rgba(120,220,255,.52));
      box-shadow: 0 0 9px rgba(80,200,255,.24);
      opacity: calc(var(--mag) * .9);
      border-radius: 2px;
    }

    .tdr-stick-knob {
      position: absolute;
      left: 50%;
      top: 50%;
      width: clamp(42px, 5vw, 54px);
      height: clamp(42px, 5vw, 54px);
      border-radius: 50%;
      transform:
        translate(-50%, -50%)
        translate(calc(var(--x) * 42px), calc(var(--y) * 42px))
        scale(calc(1 + var(--mag) * .10));
      background:
        radial-gradient(circle at 38% 32%, rgba(255,255,255,.98), rgba(189,232,255,.92) 28%, rgba(67,145,205,.92) 72%, rgba(17,51,78,.98));
      border: 2px solid rgba(255,255,255,.38);
      box-shadow:
        0 4px 14px rgba(0,0,0,.28),
        0 0 calc(10px + var(--mag) * 10px) rgba(80,190,255,.22),
        inset 0 1px 2px rgba(255,255,255,.55);
      transition: box-shadow 80ms linear, transform 90ms ease-out;
    }

    .tdr-stick-knob::after {
      content: '';
      position: absolute;
      inset: 27%;
      border-radius: 50%;
      border: 1px solid rgba(10,55,90,.38);
      background: rgba(255,255,255,.08);
    }
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'tdr-race-controls';
  root.innerHTML = `
    <div class="tdr-stick" data-stick>
      <div class="tdr-stick-ring"></div>
      <div class="tdr-stick-core"></div>
      <div class="tdr-stick-energy"></div>
      <div class="tdr-stick-vector"></div>
      <div class="tdr-stick-knob"></div>
    </div>
    <div class="tdr-pedal tdr-pedal-gas" data-pedal="gas">
      <div class="tdr-pedal-inner">
        <div class="tdr-pedal-icon"></div>
        <div class="tdr-pedal-copy">
          <div class="tdr-pedal-label">GAS</div>
          <div class="tdr-pedal-sub">ACELERADOR</div>
        </div>
      </div>
    </div>
    <div class="tdr-pedal tdr-pedal-brake" data-pedal="brake">
      <div class="tdr-pedal-inner">
        <div class="tdr-pedal-icon"></div>
        <div class="tdr-pedal-copy">
          <div class="tdr-pedal-label">FRENO</div>
          <div class="tdr-pedal-sub">BRAKE</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const stick = root.querySelector('[data-stick]');
  const gas = root.querySelector('[data-pedal="gas"]');
  const brake = root.querySelector('[data-pedal="brake"]');

  let lastRace=null;
  let lastVisible=false;
  let cachedButtonMode=false;
  let nextSettingsRead=0;
  const setVisible=(visible)=>{if(visible===lastVisible)return;lastVisible=visible;root.style.display=visible?'block':'none';};

  const tick = () => {
    try {
      const race = __game?.scene?.getScene?.('race');
      const active = !!race?.sys?.isActive?.();
      setVisible(active && __isLandscape());
      if (!active) { lastRace=null; return; }

      if (race!==lastRace) {
        lastRace=race;
        __hideLegacyTouchVisuals(race);
        nextSettingsRead=0;
      }

      let buttonMode = race?._tdrSteeringMode === 'buttons';
      const now=performance.now();
      if (!buttonMode && now>=nextSettingsRead) {
        nextSettingsRead=now+1000;
        try {
          const settings = JSON.parse(localStorage.getItem('tdr2:settings') || '{}');
          cachedButtonMode = settings?.controls?.steeringMode === 'buttons';
        } catch { cachedButtonMode=false; }
      }
      buttonMode=buttonMode||cachedButtonMode;
      if (stick) stick.style.display = buttonMode ? 'none' : 'block';

      const throttle = Math.max(0, Math.min(1, Number(race?.touch?.throttle || 0)));
      const braking = Math.max(0, Math.min(1, Number(race?.touch?.brake || 0)));
      gas?.style.setProperty('--level', String(throttle));
      brake?.style.setProperty('--level', String(braking));
      gas?.classList.toggle('is-active', throttle > .12);
      brake?.classList.toggle('is-active', braking > .12);

      if (!buttonMode) {
        const sx = Math.max(-1, Math.min(1, Number(race?.touch?.stickX || 0)));
        const sy = Math.max(-1, Math.min(1, Number(race?.touch?.stickY || 0)));
        const mag = Math.max(0, Math.min(1, Math.hypot(sx, sy)));
        stick?.style.setProperty('--x', String(sx));
        stick?.style.setProperty('--y', String(sy));
        stick?.style.setProperty('--mag', String(mag));
        stick?.classList.toggle('is-active', !!race?.touch?.leftActive || mag > .04);
      } else {
        stick?.classList.remove('is-active');
      }
    } catch {}
  };

  // 20 Hz is visually responsive for the DOM decoration while removing the
  // previous 60/120 Hz requestAnimationFrame workload from WebKit's hot path.
  const timer=setInterval(tick,50);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  tick();
}

function __tickOrientation() {
  const landscape = __isLandscape();
  __setOverlayVisible(!landscape);

  if (landscape && !__game) {
    __game = createGame('app');
    __installRaceControlVisuals();
    return;
  }

  if (__game) {
    if (landscape) __wakeGame();
    else __sleepGame();
  }
}

__tickOrientation();
window.addEventListener('resize', __tickOrientation, {passive:true});
window.addEventListener('orientationchange', __tickOrientation, {passive:true});
