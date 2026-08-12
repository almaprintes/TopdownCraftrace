import { RaceScene as TimingCelebrationRaceScene } from './RaceTimingCelebrationScene.js';

// Fix de cámara para el banner de récords.
// La capa anterior ocultaba el banner tanto de la cámara principal como de la UI.
// Aquí mantenemos el banner visible en la cámara principal y evitamos un posible
// duplicado en la cámara UI, sin modificar cronometraje ni persistencia de récords.
export class RaceScene extends TimingCelebrationRaceScene {
  _showTimingAchievement(records, lapMs) {
    super._showTimingAchievement(records, lapMs);

    const banner = this._timingBanner;
    const main = this.cameras?.main;
    if (!banner?.scene || !main) return;

    // cameras.main.ignore() activa el bit de filtro de la cámara principal.
    // Lo limpiamos para que el banner vuelva a renderizarse.
    const allowMain = (obj) => {
      if (!obj || typeof obj.cameraFilter !== 'number') return;
      obj.cameraFilter &= ~main.id;
    };
    allowMain(banner);
    for (const child of banner.list || []) allowMain(child);

    // El banner ya usa scrollFactor 0, por lo que queda fijo arriba en pantalla.
    // Si existe una cámara UI independiente, la excluimos de ella para no dibujarlo dos veces.
    try { this.uiCam?.ignore?.(banner); } catch (_) {}
  }
}
