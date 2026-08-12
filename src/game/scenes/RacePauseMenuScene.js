import { RaceScene as CurrentRaceScene } from './RaceWeightTransferScene.js';

const norm = (s) => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toUpperCase();

export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._pauseMenuOpen = false;
    this._pauseButton = null;
    this._pauseModal = null;
    this._pauseStartedAt = 0;
    this._legacyWorldCapture = null;
    this._legacyTechnicalCapture = null;
    this._legacyHudRoots = new Set();
    this._captureInProgress = false;
    this._captureFrozenState = null;
    this._captureTechnicalOverlay = null;
  }

  _installSessionReportButton() {
    this._sessionReportButton = null;
  }

  create(data) {
    super.create(data);
    this._findAndHideLegacyHudActions();
    this._installPauseButton();

    for (const ms of [0, 80, 200, 500, 1000]) {
      this.time?.delayedCall?.(ms, () => this._findAndHideLegacyHudActions());
    }

    this.events.once('shutdown', () => this._destroyPauseUi());
    this.events.once('destroy', () => this._destroyPauseUi());
  }

  update(time, delta) {
    if (this._pauseMenuOpen && !this._captureInProgress) return;

    super.update(time, delta);

    if (this._captureInProgress && this._captureFrozenState) {
      const s = this._captureFrozenState;
      const body = this.carBody || this.car;
      if (body?.scene) {
        body.setPosition?.(s.x, s.y);
        body.rotation = s.rotation;
        if (body.body?.velocity) {
          body.body.velocity.x = 0;
          body.body.velocity.y = 0;
        }
        body.body?.setAngularVelocity?.(0);
      }
      if (this.carRig?.scene) {
        this.carRig.x = s.x;
        this.carRig.y = s.y;
        this.carRig.rotation = s.rotation + (this._carVisualRotOffset || 0) + (this._visualChassisLag || 0);
      }
    }
  }

  _walkUiTree() {
    const out = [];
    const seen = new Set();
    const walk = (o, parent = null) => {
      if (!o || seen.has(o)) return;
      seen.add(o);
      out.push({ o, parent });
      const list = Array.isArray(o.list) ? o.list : null;
      if (list) for (const child of list) walk(child, o);
    };
    for (const root of (this.children?.list || [])) walk(root, null);
    return out;
  }

  _buttonRootAndTrigger(labelObj, parent) {
    const root = parent || labelObj;
    const candidates = [];
    const collect = (o) => {
      if (!o) return;
      if (o.input?.enabled || o.input?.hitArea || o.listenerCount?.('pointerdown') > 0) candidates.push(o);
      if (Array.isArray(o.list)) for (const child of o.list) collect(child);
    };
    collect(root);

    const trigger = candidates.find((o) => o !== labelObj && o.input?.enabled)
      || candidates.find((o) => o !== labelObj)
      || (labelObj.input?.enabled ? labelObj : null)
      || labelObj;

    return { root, trigger };
  }

  _findAndHideLegacyHudActions() {
    for (const { o, parent } of this._walkUiTree()) {
      if (!o || typeof o.text !== 'string') continue;
      const label = norm(o.text);

      let kind = null;
      if (label.includes('MAPA PNG') || label.includes('CAPTURA MUNDO')) kind = 'world';
      else if (label.includes('MAPA TECNICO') || label.includes('CAPTURA TECNICA')) kind = 'technical';
      else if (label === 'MENU') kind = 'menu';
      if (!kind) continue;

      const { root, trigger } = this._buttonRootAndTrigger(o, parent);
      this._legacyHudRoots.add(root);

      if (kind === 'world' && !this._legacyWorldCapture) this._legacyWorldCapture = trigger;
      if (kind === 'technical' && !this._legacyTechnicalCapture) this._legacyTechnicalCapture = trigger;

      root?.setVisible?.(false);
      o?.setVisible?.(false);
    }
  }

  _installPauseButton() {
    if (typeof document === 'undefined') return;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Pausa');
    b.dataset.tdrRaceUi = '1';
    b.innerHTML = '<span aria-hidden="true">Ⅱ</span>';
    Object.assign(b.style, {
      position: 'fixed', right: '160px', top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      width: '42px', height: '42px', borderRadius: '50%', zIndex: '7600',
      border: '1px solid rgba(255,255,255,.22)', background: 'rgba(7,12,22,.80)', color: '#fff',
      font: '900 18px/1 system-ui,-apple-system,sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.30)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', padding: '0'
    });
    b.addEventListener('click', () => this._openPauseMenu());
    document.body.appendChild(b);
    this._pauseButton = b;
  }

  _destroyPauseUi() {
    try { this._pauseButton?.remove(); } catch (_) {}
    try { this._pauseModal?.remove(); } catch (_) {}
    try { this._captureTechnicalOverlay?.destroy?.(); } catch (_) {}
    this._pauseButton = null;
    this._pauseModal = null;
    this._captureTechnicalOverlay = null;
  }

  _openPauseMenu() {
    if (this._pauseMenuOpen || typeof document === 'undefined') return;
    this._pauseMenuOpen = true;
    this._pauseStartedAt = performance.now();
    try { this.physics?.world?.pause?.(); } catch (_) {}
    if (this._pauseButton) this._pauseButton.style.display = 'none';

    const root = document.createElement('div');
    root.dataset.tdrRaceUi = '1';
    root.innerHTML = `
      <style>
        .tdrp-veil{position:fixed;inset:0;z-index:12000;background:rgba(2,5,10,.70);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:18px}
        .tdrp-card{width:min(88vw,390px);background:linear-gradient(180deg,#0e1725,#080d16);border:1px solid #263850;border-radius:22px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.55);font-family:system-ui,-apple-system,sans-serif;color:#fff}
        .tdrp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.tdrp-head small{font-size:10px;font-weight:900;letter-spacing:.14em;color:#7e91aa}.tdrp-head b{font-size:20px}
        .tdrp-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.tdrp-btn{min-height:49px;border-radius:14px;border:1px solid #273a53;background:#111d2d;color:#f5f7fb;font:800 12px system-ui,-apple-system,sans-serif;letter-spacing:.04em;padding:10px}.tdrp-btn.primary{grid-column:1/-1;background:#173452;border-color:#35638e}.tdrp-btn.danger{color:#ff9aa6;border-color:#62313a;background:#241318}.tdrp-btn.full{grid-column:1/-1}.tdrp-note{margin:13px 2px 0;color:#8292a7;font-size:10px;line-height:1.4;text-align:center}
      </style>
      <div class="tdrp-veil"><div class="tdrp-card">
        <div class="tdrp-head"><div><small>SESIÓN EN PAUSA</small><br><b>Menú de carrera</b></div><span>⏸</span></div>
        <div class="tdrp-grid">
          <button class="tdrp-btn primary" data-a="continue">CONTINUAR</button>
          <button class="tdrp-btn" data-a="world">CAPTURA MUNDO</button>
          <button class="tdrp-btn" data-a="technical">CAPTURA TÉCNICA</button>
          <button class="tdrp-btn full" data-a="report">FIN DE SESIÓN · INFORME</button>
          <button class="tdrp-btn danger full" data-a="menu">SALIR AL MENÚ</button>
        </div>
        <div class="tdrp-note">La captura se realiza con la pausa cerrada y el HUD oculto.</div>
      </div></div>`;

    root.querySelector('[data-a="continue"]')?.addEventListener('click', () => this._closePauseMenu(true));
    root.querySelector('[data-a="world"]')?.addEventListener('click', () => this._captureFromPause('world'));
    root.querySelector('[data-a="technical"]')?.addEventListener('click', () => this._captureFromPause('technical'));
    root.querySelector('[data-a="report"]')?.addEventListener('click', () => { this._closePauseMenu(false); this._openSessionReport?.(); });
    root.querySelector('[data-a="menu"]')?.addEventListener('click', () => {
      this._closePauseMenu(false);
      if (this._testMode && this._returnSceneKey) this.scene.start(this._returnSceneKey, this._returnSceneData || {});
      else this.scene.start('menu');
    });

    document.body.appendChild(root);
    this._pauseModal = root;
  }

  _closePauseMenu(resume = true) {
    const pausedMs = this._pauseStartedAt ? Math.max(0, performance.now() - this._pauseStartedAt) : 0;
    this._pauseStartedAt = 0;
    this._pauseMenuOpen = false;
    try { this._pauseModal?.remove(); } catch (_) {}
    this._pauseModal = null;
    if (this._pauseButton) this._pauseButton.style.display = '';

    if (resume && pausedMs > 0 && Number.isFinite(this.timing?.lapStart)) this.timing.lapStart += pausedMs;
    if (resume) { try { this.physics?.world?.resume?.(); } catch (_) {} }
  }

  _hideHudForCapture() {
    const hidden = [];
    for (const o of (this.children?.list || [])) {
      if (!o?.visible) continue;
      const depth = Number(o.depth || 0);
      const fixed = Number(o.scrollFactorX) === 0 && Number(o.scrollFactorY) === 0;
      if (depth >= 1000 || fixed) {
        hidden.push(o);
        o.setVisible?.(false);
      }
    }
    if (this._pauseButton) this._pauseButton.style.display = 'none';
    return hidden;
  }

  _restoreHudAfterCapture(hidden) {
    for (const o of hidden || []) if (o?.scene) o.setVisible?.(true);
    this._findAndHideLegacyHudActions();
  }

  _makeTechnicalCaptureOverlay() {
    try { this._captureTechnicalOverlay?.destroy?.(); } catch (_) {}
    const g = this.add.graphics().setDepth(900).setScrollFactor(1);
    this._captureTechnicalOverlay = g;
    this.uiCam?.ignore?.(g);

    const raw = this.track?.geom?.center || this.track?.meta?.centerline || [];
    const pts = raw.map((p) => Array.isArray(p)
      ? { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || this.track?.meta?.trackWidth || 160) }
      : { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || this.track?.meta?.trackWidth || 160) }
    ).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (pts.length > 1) {
      g.lineStyle(3, 0x37e6ff, 0.95);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.lineTo(pts[0].x, pts[0].y);
      g.strokePath();

      const stride = Math.max(1, Math.floor(pts.length / 180));
      g.fillStyle(0xffffff, 0.60);
      for (let i = 0; i < pts.length; i += stride) g.fillCircle(pts[i].x, pts[i].y, 2.2);
    }

    const drawGate = (gate, color, width = 5) => {
      if (!gate?.a || !gate?.b) return;
      g.lineStyle(width, color, 0.95);
      g.beginPath();
      g.moveTo(Number(gate.a.x), Number(gate.a.y));
      g.lineTo(Number(gate.b.x), Number(gate.b.y));
      g.strokePath();
    };
    drawGate(this.finishLine || this.track?.meta?.finishLine || this.track?.meta?.finish, 0xffffff, 7);
    drawGate(this.checkpoints?.cp1, 0xffd84f, 6);
    drawGate(this.checkpoints?.cp2, 0x45ff98, 6);

    const b = this.physics?.world?.bounds;
    if (b?.width && b?.height) {
      g.lineStyle(4, 0xff5470, 0.55);
      g.strokeRect(Number(b.x || 0), Number(b.y || 0), Number(b.width), Number(b.height));
    }
    return g;
  }

  _exportSnapshotImage(image, kind) {
    if (!image || typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = image.width || this.scale?.width || 1280;
    canvas.height = image.height || this.scale?.height || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const trackName = String(this.track?.meta?.name || this.trackKey || 'circuito')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'circuito';
    const suffix = kind === 'technical' ? 'tecnico' : 'mundo';
    const filename = `${trackName}-${suffix}.png`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        if (navigator?.share && typeof File !== 'undefined') {
          const file = new File([blob], filename, { type:'image/png' });
          if (!navigator.canShare || navigator.canShare({ files:[file] })) {
            await navigator.share({ files:[file], title: filename });
            return;
          }
        }
      } catch (_) {}

      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (_) {}
    }, 'image/png');
  }

  _captureFromPause(kind) {
    if (this._captureInProgress) return;

    const capturePauseStartedAt = this._pauseStartedAt || performance.now();
    const body = this.carBody || this.car;
    this._captureFrozenState = body?.scene ? {
      x: Number(body.x || 0),
      y: Number(body.y || 0),
      rotation: Number(body.rotation || 0)
    } : null;

    const cam = this.cameras?.main;
    const worldBounds = this.physics?.world?.bounds;
    if (!cam || !worldBounds?.width || !worldBounds?.height) return;

    const saved = {
      zoom: Number(cam.zoom || 1),
      scrollX: Number(cam.scrollX || 0),
      scrollY: Number(cam.scrollY || 0),
      cullEnabled: this._cullEnabled,
      mapZoomOn: this._mapZoomOn
    };

    this._closePauseMenu(false);
    const hidden = this._hideHudForCapture();
    this._captureInProgress = true;

    try { this.physics?.world?.resume?.(); } catch (_) {}
    try { cam.stopFollow?.(); } catch (_) {}

    // Force every generated road cell visible before the snapshot.
    this._cullEnabled = false;
    this._mapZoomOn = true;

    const margin = 26;
    const vw = Math.max(1, Number(this.scale?.width || 1) - margin * 2);
    const vh = Math.max(1, Number(this.scale?.height || 1) - margin * 2);
    const z = Math.max(0.02, Math.min(vw / worldBounds.width, vh / worldBounds.height) * 0.98);
    cam.setZoom(z);
    cam.centerOn(
      Number(worldBounds.x || 0) + Number(worldBounds.width) * 0.5,
      Number(worldBounds.y || 0) + Number(worldBounds.height) * 0.5
    );

    if (kind === 'technical') this._makeTechnicalCaptureOverlay();

    const finish = () => {
      try { this._captureTechnicalOverlay?.destroy?.(); } catch (_) {}
      this._captureTechnicalOverlay = null;

      this._cullEnabled = saved.cullEnabled;
      this._mapZoomOn = saved.mapZoomOn;
      cam.setZoom(saved.zoom);
      cam.setScroll(saved.scrollX, saved.scrollY);
      if (body?.scene) {
        try { cam.startFollow(body, true, 0.12, 0.12); } catch (_) {}
      }

      const excludedMs = Math.max(0, performance.now() - capturePauseStartedAt);
      if (excludedMs > 0 && Number.isFinite(this.timing?.lapStart)) this.timing.lapStart += excludedMs;

      this._captureInProgress = false;
      this._captureFrozenState = null;
      this._restoreHudAfterCapture(hidden);
      try { this.physics?.world?.pause?.(); } catch (_) {}
      this._openPauseMenu();
    };

    const takeSnapshot = () => {
      try {
        const renderer = this.game?.renderer;
        if (!renderer || typeof renderer.snapshot !== 'function') {
          console.warn('[RacePauseMenu] renderer.snapshot unavailable');
          finish();
          return;
        }
        renderer.snapshot((image) => {
          try { this._exportSnapshotImage(image, kind); }
          finally { finish(); }
        }, 'image/png', 1);
      } catch (err) {
        console.warn('[RacePauseMenu] native capture failed', err);
        finish();
      }
    };

    // Give the no-culling full-world camera several actual render frames on iOS.
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(takeSnapshot)));
  }
}
