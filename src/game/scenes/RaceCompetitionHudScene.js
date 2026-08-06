import { RaceScene as StyledRaceScene } from './RaceStyledHudScene.js';

// Capa final de limpieza visual de carrera.
// Conserva toda la lógica y los HUD útiles, pero elimina textos/overlays
// provisionales que tapan la pista en móvil.
export class RaceScene extends StyledRaceScene {
  create() {
    super.create();

    try {
      this._hideRaceClutter = () => {
        // Diagnósticos de desarrollo.
        for (const obj of [
          this._diagText,
          this._touchDbg,
          this.devBox,
          this.devTitle,
          this.devInfo,
          this.devBtnMap,
          this.devTuneBtn
        ]) {
          if (obj?.scene) obj.setVisible(false);
        }

        // HUD superior izquierdo anterior: dejamos esa zona completamente libre.
        for (const obj of [
          this.ttHud?.lapText,
          this.ttHud?.bestLapText,
          this.ttHud?.barBase,
          this.ttHud?.barSlider,
          this.ttHud?.ticksGfx
        ]) {
          if (obj?.scene) obj.setVisible(false);
        }

        // Si venimos de una versión anterior de esta escena, ocultar también
        // cualquier contenedor de competición que hubiera quedado vivo.
        if (this.competitionHud?.scene) this.competitionHud.setVisible(false);
      };

      this._hideRaceClutter();

      // Repeticiones cortas por seguridad: algunos elementos se crean/ajustan
      // unas décimas después al entrar en iPhone/Safari.
      this.time.delayedCall(0, () => this._hideRaceClutter?.());
      this.time.delayedCall(250, () => this._hideRaceClutter?.());
      this.time.delayedCall(1000, () => this._hideRaceClutter?.());
    } catch (err) {
      console.warn('[TDR2] Race clutter cleanup failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    try {
      // Los overlays DEV actualizan su texto cada frame; mantenerlos ocultos
      // evita que reaparezcan tras resize, reinicio o reentrada en carrera.
      this._hideRaceClutter?.();
    } catch (err) {
      console.warn('[TDR2] Race clutter cleanup update failed', err);
    }
  }
}
