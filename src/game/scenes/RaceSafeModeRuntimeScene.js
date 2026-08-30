import { RaceScene as CurrentRaceScene } from './RaceAdaptiveStartScene.js';

// Safe mode now focuses on asset pressure and reduced visual systems. HUD layers
// already throttle their own DOM/Text work, so rewriting Phaser methods every
// frame created more allocation/churn than it saved.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    if (window.__tdrIosSafeMode === true) {
      this.events.once('shutdown', () => this._releaseSafeModeRaceAssets());
    }
    return result;
  }

  update(time, delta) {
    return super.update?.(time, delta);
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

    for (const key of keys) {
      try {
        if (this.textures?.exists?.(key)) this.textures.remove(key);
      } catch {}
    }
  }
}
