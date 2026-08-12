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
  }

  _installSessionReportButton() {
    this._sessionReportButton = null;
  }

  create(data) {
    super.create(data);
    this._findAndHideLegacyHudActions();
    this._installPauseButton();

    // Several HUD wrappers finish mounting slightly later on iOS.
    for (const ms of [0, 80, 200, 500, 1000]) {
      this.time?.delayedCall?.(ms, () => this._findAndHideLegacyHudActions());
    }

    this.events.once('shutdown', () => this._destroyPauseUi());
    this.events.once('destroy', () => this._destroyPauseUi());
  }

  update(time, delta) {
    if (this._pauseMenuOpen && !this._captureInProgress) return;

    super.update(time, delta);

    // Capture generation needs the scene update/render pipeline alive, but the
    // driver's car must remain visually and physically frozen while that happens.
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
    // Most legacy buttons are a Container holding a Text + an interactive Rectangle/Image.
    const root = parent || labelObj;
    const candidates = [];
    const collect = (o) => {
      if (!o) return;
      if (o.input?.enabled || o.input?.hitArea || o.listenerCount?.('pointerdown') > 0) candidates.push(o);
      if (Array.isArray(o.list)) for (const child of o.list) collect(child);
    };
    collect(root);

    // Prefer the actual clickable surface over the text label.
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

      // Hide the WHOLE legacy button/container, not only its text label.
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
    this._pauseButton = null;
    this._pauseModal = null;
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

  _emitLegacyCapture(trigger) {
    if (!trigger) return false;
    try {
      if (typeof trigger.emit === 'function') {
        trigger.emit('pointerdown', null, 0, 0, { stopPropagation() {} });
        return true;
      }
    } catch (_) {}
    return false;
  }

  _captureFromPause(kind) {
    // Re-scan immediately in case a late HUD wrapper created/replaced the buttons.
    this._findAndHideLegacyHudActions();
    const trigger = kind === 'technical' ? this._legacyTechnicalCapture : this._legacyWorldCapture;

    const capturePauseStartedAt = this._pauseStartedAt || performance.now();
    const body = this.carBody || this.car;
    this._captureFrozenState = body?.scene ? {
      x: Number(body.x || 0),
      y: Number(body.y || 0),
      rotation: Number(body.rotation || 0)
    } : null;

    this._closePauseMenu(false);
    const hidden = this._hideHudForCapture();
    this._captureInProgress = true;

    // Critical: the legacy whole-world generator needs the scene/render pipeline alive.
    // We resume Arcade Physics, while update() above freezes the driver's car every frame.
    try { this.physics?.world?.resume?.(); } catch (_) {}

    const finishCapture = () => {
      const excludedMs = Math.max(0, performance.now() - capturePauseStartedAt);
      if (excludedMs > 0 && Number.isFinite(this.timing?.lapStart)) {
        this.timing.lapStart += excludedMs;
      }

      this._captureInProgress = false;
      this._captureFrozenState = null;
      this._restoreHudAfterCapture(hidden);
      try { this.physics?.world?.pause?.(); } catch (_) {}
      this._openPauseMenu();
    };

    const fire = () => {
      const fired = this._emitLegacyCapture(trigger);
      if (!fired) {
        console.warn('[RacePauseMenu] capture trigger not found:', kind);
        finishCapture();
        return;
      }

      // Give iOS enough time for the legacy whole-world camera/culling pass to complete.
      window.setTimeout(finishCapture, 2400);
    };

    // Two clean frames: pause modal gone + HUD hidden before the capture starts.
    requestAnimationFrame(() => requestAnimationFrame(fire));
  }
}
