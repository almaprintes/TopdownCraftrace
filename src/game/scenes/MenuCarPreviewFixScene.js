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

  renderUI() {
    super.renderUI();
    this._insetLobbySidePanels();
  }

  _insetLobbySidePanels() {
    const ui = this._ui;
    const width = Number(this.scale?.width) || 0;
    if (!ui || !width) return;

    const baseInset = 16;
    const panels = new Map();
    const visit = (node) => {
      if (!node) return;
      if (typeof node.text === 'string') {
        const label = node.text.trim().toUpperCase();
        if (
          label === 'CIRCUITO SELECCIONADO' ||
          label === 'EVENTO GLOBAL' ||
          label === 'EVENTO COMPLETADO'
        ) {
          const panel = node.parentContainer;
          if (panel && panel !== ui) {
            panels.set(panel, label === 'CIRCUITO SELECCIONADO' ? baseInset + 1 : baseInset);
          }
        }
      }
      if (Array.isArray(node.list)) {
        for (const child of node.list) visit(child);
      }
    };
    visit(ui);

    for (const [panel, inset] of panels) {
      const bounds = panel.getBounds?.();
      if (!bounds) continue;
      if (bounds.left < inset) panel.x += inset - bounds.left;
      if (bounds.right > width - inset) panel.x -= bounds.right - (width - inset);
    }
  }
}
