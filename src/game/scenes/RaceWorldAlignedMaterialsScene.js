import { RaceScene as RealSurfaceRaceScene } from './RaceRealSurfaceAssetsScene.js';

// Alinea la fase de los TileSprite al mundo antes del bake.
// Sin esto, cada chunk reinicia grass/asphalt desde (0,0) y aparecen
// cuadrados/repeticiones visibles en las uniones de celda.
export class RaceScene extends RealSurfaceRaceScene {
  _alignBakedSurfaceTilesToWorld() {
    const map = this.track?.gfxByCell;
    if (!(map instanceof Map)) return;

    for (const cell of map.values()) {
      for (const obj of [cell?.tile, cell?.overlay]) {
        if (!obj?.scene) continue;
        if (!('tilePositionX' in obj) || !('tilePositionY' in obj)) continue;

        const originX = Number.isFinite(Number(obj.originX)) ? Number(obj.originX) : 0.5;
        const originY = Number.isFinite(Number(obj.originY)) ? Number(obj.originY) : 0.5;
        const width = Number(obj.width || obj.displayWidth || 0);
        const height = Number(obj.height || obj.displayHeight || 0);
        const leftWorld = Number(obj.x || 0) - width * originX;
        const topWorld = Number(obj.y || 0) - height * originY;
        const tileScaleX = Number(obj.tileScaleX || 1) || 1;
        const tileScaleY = Number(obj.tileScaleY || 1) || 1;

        // Phaser samplea TileSprite como local/tileScale + tilePosition.
        // Usar el origen mundial mantiene la misma fase en todas las celdas.
        obj.tilePositionX = leftWorld / tileScaleX;
        obj.tilePositionY = topWorld / tileScaleY;
      }
    }
  }

  _bakeAsphaltNow() {
    this._alignBakedSurfaceTilesToWorld();
    return super._bakeAsphaltNow();
  }
}
