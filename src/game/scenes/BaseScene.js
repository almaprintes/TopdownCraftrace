// src/game/scenes/BaseScene.js
import Phaser from 'phaser';
import { OrientationOverlay } from '../ui/OrientationOverlay.js';

export class BaseScene extends Phaser.Scene {
  create() {
    // FIX TDR2: cualquier cámara adicional (HUD/UI) debe ser transparente.
    // Si no, puede quedar encima de la cámara del mundo y tapar pista/coche con negro.
    if (!this._cameraAddPatched && this.cameras?.add) {
      const originalAdd = this.cameras.add.bind(this.cameras);
      this.cameras.add = (...args) => {
        const cam = originalAdd(...args);
        try {
          cam.setBackgroundColor('rgba(0,0,0,0)');
          cam.transparent = true;
        } catch {}
        return cam;
      };
      this._cameraAddPatched = true;
    }

    // Overlay global (portrait -> bloquea)
    this._orientationOverlay = new OrientationOverlay(this, {
      imageKey: 'ui_rotate_landscape'
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._orientationOverlay?.destroy();
      this._orientationOverlay = null;
    });
  }
}
