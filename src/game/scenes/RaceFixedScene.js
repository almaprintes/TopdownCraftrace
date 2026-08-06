import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Diagnóstico aislado: la cámara mundo funciona; comprobamos ahora las texturas
// y los objetos que deberían formar fondo, asfalto y coche.
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (main) {
        main.setVisible(true);
        main.setAlpha(1);
      }

      // Mantener uiCam apagada durante esta prueba para que no contamine el diagnóstico.
      if (this.uiCam) this.uiCam.setVisible(false);

      const cx = Number(this.carBody?.x ?? this.car?.x ?? 400);
      const cy = Number(this.carBody?.y ?? this.car?.y ?? 400);

      // Graphics sí renderiza: nos sirve como referencia inequívoca.
      this.add.rectangle(cx, cy, 42, 42, 0xff00ff, 1)
        .setDepth(999999)
        .setScrollFactor(1);

      const exists = (key) => {
        try { return this.textures?.exists?.(key) ? 'Y' : 'N'; } catch { return '?'; }
      };
      const keyOf = (obj) => obj?.texture?.key || obj?.frame?.texture?.key || '-';
      const visOf = (obj) => obj?.visible === false ? 'N' : 'Y';
      const alphaOf = (obj) => Number(obj?.alpha ?? 1).toFixed(1);

      const firstCell = this.track?.gfxByCell?.values?.().next?.().value;
      const tile = firstCell?.tile || null;
      const overlay = firstCell?.overlay || null;

      // Forzamos visibles los objetos originales, sin alterar su geometría.
      for (const obj of [this.bgOff, this.bgGrass, tile, overlay, this.carRig]) {
        try {
          obj?.setVisible?.(true);
          obj?.setAlpha?.(1);
          if (typeof obj?.cameraFilter === 'number') obj.cameraFilter = 0;
        } catch {}
      }

      const lines = [
        `TEX off:${exists('off')} grass:${exists('grass')} asphalt:${exists('asphalt')} car:${exists('car')}`,
        `bgOff key:${keyOf(this.bgOff)} vis:${visOf(this.bgOff)} a:${alphaOf(this.bgOff)}`,
        `bgGrass key:${keyOf(this.bgGrass)} vis:${visOf(this.bgGrass)} a:${alphaOf(this.bgGrass)}`,
        `tile key:${keyOf(tile)} vis:${visOf(tile)} a:${alphaOf(tile)}`,
        `carRig vis:${visOf(this.carRig)} a:${alphaOf(this.carRig)}`,
        `carSprite key:${keyOf(this.carRig?.list?.[0])}`
      ];

      const info = this.add.text(cx + 34, cy - 70, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ff00ff',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 4 }
      }).setDepth(999999).setScrollFactor(1);

      if (main?.id) {
        for (const obj of [info, ...(this.children?.list || [])]) {
          if (obj && typeof obj.cameraFilter === 'number') {
            obj.cameraFilter &= ~main.id;
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Texture diagnostic failed', err);
    }
  }
}
