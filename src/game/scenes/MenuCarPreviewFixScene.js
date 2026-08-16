import { MenuScene as CurrentMenuScene } from './MenuTrackPresentationScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

export class MenuScene extends CurrentMenuScene {
  preload() {
    try { super.preload?.(); } catch {}

    let carId = null;
    try { carId = localStorage.getItem('tdr2:carId'); } catch {}
    const spec = CAR_SPECS?.[carId];
    if (!spec?.id || !spec?.skin) return;

    const key = `skin:${spec.id}`;
    if (this.textures?.exists?.(key)) return;

    // Cargamos la miniatura antes de renderizar el lobby. Antes se solicitaba
    // durante renderUI y durante unos frames se usaba el fallback; en iPhone
    // podía quedarse así si el loader ya estaba ocupado.
    this.load.image(key, `assets/skins/${spec.skin}`);
  }
}
