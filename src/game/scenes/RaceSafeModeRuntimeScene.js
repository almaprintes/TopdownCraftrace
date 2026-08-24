import { RaceScene as CurrentRaceScene } from './RaceAdaptiveStartScene.js';

const SAFE_HUD_INTERVAL_MS = 100; // 10 Hz: suficiente para HUD/minimapa en 30 FPS

function patchMethod(target, key, patches) {
  if (!target || typeof target[key] !== 'function') return;
  const original = target[key];
  patches.push(() => { target[key] = original; });
  target[key] = function safeModeNoop() { return this; };
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    if (window.__tdrIosSafeMode === true) {
      this._safeHudNextAt = 0;
      this.events.once('shutdown', () => this._releaseSafeModeRaceAssets());
    }
    return result;
  }

  update(time, delta) {
    if (window.__tdrIosSafeMode !== true) {
      return super.update?.(time, delta);
    }

    const now = Number(time || 0);
    const due = now >= Number(this._safeHudNextAt || 0);
    if (due) {
      this._safeHudNextAt = now + SAFE_HUD_INTERVAL_MS;
      return super.update?.(time, delta);
    }

    // Física, IA y lógica de carrera siguen ejecutándose cada tick.
    // Solo evitamos trabajo visual repetitivo del HUD/minimapa entre refrescos de 10 Hz.
    const restore = [];
    try {
      patchMethod(this.ttHud?.timeText, 'setText', restore);
      patchMethod(this.ttHud?.lapText, 'setText', restore);
      patchMethod(this.ttHud?.bestLapText, 'setText', restore);
      patchMethod(this.ttHud?.barSlider, 'setPosition', restore);
      patchMethod(this.minimap?.car, 'setPosition', restore);
      patchMethod(this.minimap?.shadow, 'setPosition', restore);
      return super.update?.(time, delta);
    } finally {
      for (let i = restore.length - 1; i >= 0; i--) {
        try { restore[i](); } catch {}
      }
    }
  }

  _releaseSafeModeRaceAssets() {
    if (window.__tdrIosSafeMode !== true) return;

    const keys = new Set([
      'grass', 'off', 'asphalt', 'asphaltOverlay', 'banner-inferior',
      'start_base', 'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5', 'start_l6'
    ]);

    if (this.carId) keys.add(`car_${this.carId}`);
    for (const tile of this._beautyConfig?.tiles || []) {
      if (tile?.key) keys.add(tile.key);
    }
    for (const tile of this._beautyPreloadConfig?.tiles || []) {
      if (tile?.key) keys.add(tile.key);
    }

    // Este listener se registra después de los cleanup del RaceScene base, por lo que
    // los GameObjects ya se han destruido cuando retiramos sus texturas del manager.
    for (const key of keys) {
      try {
        if (this.textures?.exists?.(key)) this.textures.remove(key);
      } catch {}
    }
  }
}
