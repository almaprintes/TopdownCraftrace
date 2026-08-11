import { RaceScene as KerbSurfaceRaceScene } from './RaceKerbSurfaceScene.js';

const FORGE_OFFROAD_CARS = new Set([
  'forge_hammer',
  'forge_anvil',
  'forge_colossus'
]);

// Identidad de terreno FORGE:
// - TRACK: física normal.
// - GRASS: se trata como TRACK => cero penalización.
// - OFF: se trata como GRASS => exactamente la penalización media de hierba
//   definida por la física base, sin copiar multiplicadores aquí.
//
// Esta capa solo remapea la clasificación de superficie para los tres FORGE.
// La física real sigue viviendo en RaceScene, así cualquier rebalance futuro
// de GRASS se trasladará automáticamente al comportamiento OFF de FORGE.
export class RaceScene extends KerbSurfaceRaceScene {
  create() {
    super.create();

    const carId = this.carId || this._carId || (() => {
      try { return localStorage.getItem('tdr2:carId') || 'stock'; }
      catch (_) { return 'stock'; }
    })();

    if (!FORGE_OFFROAD_CARS.has(carId)) return;
    if (typeof this._isOnTrack !== 'function' || typeof this._isInBand !== 'function') return;

    const originalIsOnTrack = this._isOnTrack.bind(this);
    const originalIsInBand = this._isInBand.bind(this);
    const grassBand = this.track?.geom?.grass;

    // La banda de hierba cuenta como pista para FORGE.
    this._isOnTrack = (x, y) => (
      originalIsOnTrack(x, y) || originalIsInBand(grassBand, x, y)
    );

    // Todo lo que quede fuera de pista + hierba se clasifica como GRASS.
    // RaceScene le aplicará por tanto exactamente el paquete de penalización
    // media de hierba, en vez del paquete OFF duro.
    this._isInBand = (_band, _x, _y) => true;

    this._forgeTerrainProfile = true;
  }
}
