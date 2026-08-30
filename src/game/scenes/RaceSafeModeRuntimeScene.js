import { RaceScene as CurrentRaceScene } from './RaceAdaptiveStartScene.js';

function isMobileDevice(){
  try{
    return /Android|iPhone|iPad|iPod/i.test(String(navigator?.userAgent||'')) ||
      (Number(navigator?.maxTouchPoints||0)>1 && Math.min(Number(screen?.width||0),Number(screen?.height||0))<1100);
  }catch{return false;}
}

// Safe mode focuses on asset pressure and reduced visual systems. HUD layers
// already throttle their own DOM/Text work, so no method rewriting happens here.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    if (isMobileDevice()) {
      this.events.once('shutdown', () => this._releaseMobileRaceAssets());
    }
    return result;
  }

  update(time, delta) {
    return super.update?.(time, delta);
  }

  _releaseMobileRaceAssets() {
    const keys = new Set();

    // Beauty tiles are large once decoded into GPU memory. They are track-local,
    // so keeping them after leaving a race only increases memory pressure.
    for (const tile of this._beautyConfig?.tiles || []) if (tile?.key) keys.add(tile.key);
    for (const tile of this._beautyPreloadConfig?.tiles || []) if (tile?.key) keys.add(tile.key);

    // The stronger safe-mode cleanup retains the previous behaviour.
    if (window.__tdrIosSafeMode === true) {
      for (const key of [
        'grass', 'off', 'asphalt', 'asphaltOverlay', 'banner-inferior',
        'start_base', 'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5', 'start_l6'
      ]) keys.add(key);
      if (this.carId) keys.add(`car_${this.carId}`);
    }

    for (const key of keys) {
      try {
        if (this.textures?.exists?.(key)) this.textures.remove(key);
      } catch {}
    }
  }
}
