import { RaceScene as StableRaceScene } from './RaceFixedScene.js';

// Capa visual v2 del HUD inferior.
// Mantiene intacta toda la lógica estable de RaceFixedScene y solo sustituye
// la presentación de velocidad / marcha / superficie.
export class RaceScene extends StableRaceScene {
  create() {
    super.create();

    try {
      // Ocultamos únicamente la presentación v1. Su lógica sigue actualizando
      // sus valores y la usamos como fuente de datos estable.
      if (this.raceInfoHud?.scene) this.raceInfoHud.setVisible(false);

      const main = this.cameras?.main;
      if (!main) return;

      const W = 356;
      const H = 62;
      const c = this.add.container(0, 0).setDepth(2190);
      this.raceInfoHudV2 = c;

      // Fondo muy ligero: evita el aspecto de "caja pegada".
      const bg = this.add.rectangle(0, 0, W, H, 0x07111a, 0.64)
        .setOrigin(0.5, 1)
        .setStrokeStyle(1, 0x5bbcff, 0.24);

      // Banda superior y pequeño brillo central.
      const topLine = this.add.rectangle(0, -H + 2, W - 20, 1, 0x5bc6ff, 0.72)
        .setOrigin(0.5, 0);
      const glow = this.add.rectangle(0, -H + 3, 116, 2, 0x9ee8ff, 0.34)
        .setOrigin(0.5, 0);

      // Velocidad protagonista.
      const speed = this.add.text(0, -32, '000', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '38px',
        fontStyle: '900',
        color: '#F7FBFF'
      }).setOrigin(0.5).setShadow(0, 2, '#000000', 3, false, true);

      const unit = this.add.text(53, -23, 'km/h', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '10px',
        fontStyle: '700',
        color: '#7FCBFF'
      }).setOrigin(0, 0.5);

      // Marcha: bloque izquierdo, muy compacto.
      const gearLabel = this.add.text(-151, -45, 'MARCHA', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px',
        fontStyle: '700',
        color: '#7E8D9A'
      }).setOrigin(0, 0.5);

      const gear = this.add.text(-126, -24, 'N', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: '900',
        color: '#FFFFFF'
      }).setOrigin(0.5);

      // Superficie: bloque derecho.
      const surfaceLabel = this.add.text(103, -45, 'SUPERFICIE', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px',
        fontStyle: '700',
        color: '#7E8D9A'
      }).setOrigin(0, 0.5);

      const surface = this.add.text(103, -24, 'PISTA', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: '800',
        color: '#70FFB0'
      }).setOrigin(0, 0.5);

      // Separadores cortos, no recorren todo el panel.
      const leftSep = this.add.rectangle(-82, -28, 1, 30, 0xffffff, 0.10);
      const rightSep = this.add.rectangle(84, -28, 1, 30, 0xffffff, 0.10);

      c.add([
        bg, topLine, glow,
        leftSep, rightSep,
        gearLabel, gear,
        speed, unit,
        surfaceLabel, surface
      ]);

      c._speedText = speed;
      c._gearText = gear;
      c._surfaceText = surface;

      // Debe renderizarlo la main, porque uiCam sigue desactivada por el fix iOS.
      if (typeof c.cameraFilter === 'number') c.cameraFilter &= ~main.id;
      for (const child of c.list || []) {
        if (typeof child.cameraFilter === 'number') child.cameraFilter &= ~main.id;
      }
      c.setScrollFactor(1, 1);

      this._layoutRaceInfoHudV2 = () => {
        const vw = Number(this.scale?.width || 1);
        const vh = Number(this.scale?.height || 1);
        this._raceInfoHudV2State = {
          screenX: vw * 0.5,
          // Casi pegado abajo, dejando hueco al home indicator del iPhone.
          screenY: vh - 4,
          scale: Math.min(1, Math.max(0.86, vw / 980))
        };
      };

      this._pinRaceInfoHudV2 = () => {
        const cam = this.cameras?.main;
        const state = this._raceInfoHudV2State;
        const hud = this.raceInfoHudV2;
        if (!cam || !state || !hud?.scene) return;

        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(state.screenX, state.screenY);
        hud.setPosition(world.x, world.y);
        hud.setScale(state.scale / zoom);
      };

      this._syncRaceInfoHudV2 = () => {
        const src = this.raceInfoHud;
        const dst = this.raceInfoHudV2;
        if (!src || !dst?.scene) return;

        dst._speedText?.setText(src._speedText?.text || '000');
        dst._gearText?.setText(src._gearText?.text || 'N');

        const surf = src._surfaceText?.text || 'PISTA';
        dst._surfaceText?.setText(surf);
        if (surf === 'CÉSPED') dst._surfaceText?.setColor('#FFD56A');
        else if (surf === 'FUERA') dst._surfaceText?.setColor('#FF7373');
        else dst._surfaceText?.setColor('#70FFB0');
      };

      this._layoutRaceInfoHudV2();
      this._pinRaceInfoHudV2();
      this._syncRaceInfoHudV2();

      this.scale.off('resize', this._onResizeRaceInfoHudV2);
      this._onResizeRaceInfoHudV2 = () => {
        this._layoutRaceInfoHudV2?.();
        this._pinRaceInfoHudV2?.();
      };
      this.scale.on('resize', this._onResizeRaceInfoHudV2);
    } catch (err) {
      console.warn('[TDR2] Styled race HUD setup failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    try {
      this._pinRaceInfoHudV2?.();
      this._syncRaceInfoHudV2?.();
    } catch (err) {
      console.warn('[TDR2] Styled race HUD update failed', err);
    }
  }
}
