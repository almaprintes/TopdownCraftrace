import { RaceScene as TimingRaceScene } from './RaceWideCameraPreviewScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

// Capa de celebración premium para récords.
// El banner se dibuja como HUD fijo en la cámara principal y tapa temporalmente
// solo el cronómetro, manteniendo libre la zona de conducción.
export class RaceScene extends TimingRaceScene {
  _destroyTimingBanner() {
    if (this._timingBannerTimer) {
      try { this._timingBannerTimer.remove(false); } catch (_) {}
      this._timingBannerTimer = null;
    }
    if (this._timingBanner?.scene) {
      try { this._timingBanner.destroy(true); } catch (_) {}
    }
    this._timingBanner = null;
    this._restoreTimingHudAfterBanner();
  }

  _hideTimingHudForBanner() {
    const hud = this.competitionHud;
    if (!hud?.scene) return;
    if (this._timingHudWasVisible == null) this._timingHudWasVisible = hud.visible !== false;
    hud.setVisible(false);
  }

  _restoreTimingHudAfterBanner() {
    const hud = this.competitionHud;
    if (hud?.scene && this._timingHudWasVisible !== false) hud.setVisible(true);
    this._timingHudWasVisible = null;
  }

  _showTimingAchievement({ carBest, circuitRecord }, lapMs) {
    if (!carBest && !circuitRecord) return;

    this._destroyTimingBanner();
    this._hideTimingHudForBanner();

    const cam = this.cameras?.main;
    const w = Math.max(320, Number(this.scale?.width || 0));
    const isRecord = !!circuitRecord;
    const bannerW = Math.min(w - 20, Math.max(430, w * 0.72));
    const bannerH = isRecord ? 86 : 76;
    const screenX = w / 2;
    const screenStartY = -bannerH - 12;
    const screenTargetY = 8;
    const tone = isRecord ? 0xffd85c : 0x57f0cf;
    const toneText = isRecord ? '#FFE48A' : '#72F7DA';
    const softTone = isRecord ? '#C8A84B' : '#4DBFA9';
    const carName = String(CAR_SPECS[this._recordCarId]?.name || this._recordCarId || 'COCHE').toUpperCase();

    // El HUD de esta carrera vive en coordenadas de mundo ancladas a la cámara principal.
    // Convertimos la posición de pantalla a mundo y compensamos el zoom para que el banner
    // permanezca exactamente arriba aunque la cámara haga zoom o siga al coche.
    const zoom = Math.max(0.001, Number(cam?.zoom || 1));
    const startWorld = cam?.getWorldPoint ? cam.getWorldPoint(screenX, screenStartY) : { x:screenX, y:screenStartY };
    const targetWorld = cam?.getWorldPoint ? cam.getWorldPoint(screenX, screenTargetY) : { x:screenX, y:screenTargetY };

    const c = this.add.container(startWorld.x, startWorld.y).setDepth(100500);
    c.setScale(1 / zoom);
    this._timingBanner = c;

    const shell = this.add.graphics();
    shell.fillStyle(0x02070b, 0.96);
    shell.fillRoundedRect(-bannerW / 2, 0, bannerW, bannerH, 13);
    shell.lineStyle(1.5, tone, 0.95);
    shell.strokeRoundedRect(-bannerW / 2, 0, bannerW, bannerH, 13);
    shell.lineStyle(1, tone, 0.18);
    shell.strokeRoundedRect(-bannerW / 2 + 6, 6, bannerW - 12, bannerH - 12, 9);
    shell.fillStyle(tone, isRecord ? 0.10 : 0.07);
    shell.fillRect(-bannerW / 2 + 16, 0, bannerW - 32, 3);
    shell.fillStyle(0xffffff, 0.035);
    shell.fillRect(-bannerW / 2 + 22, 8, bannerW - 44, 1);

    const accentL = this.add.rectangle(-bannerW / 2 + 10, bannerH / 2, 3, bannerH - 20, tone, 0.9).setOrigin(.5);
    const accentR = this.add.rectangle(bannerW / 2 - 10, bannerH / 2, 3, bannerH - 20, tone, 0.32).setOrigin(.5);

    const eyebrow = this.add.text(0, isRecord ? 10 : 9,
      isRecord ? 'TOP DOWN RACE · RÉCORD OFICIAL' : 'TOP DOWN RACE · MEJOR VUELTA DEL COCHE', {
        fontFamily:'system-ui, -apple-system, Segoe UI, Arial',
        fontSize:isRecord?'9px':'8px', fontStyle:'800', color:softTone, letterSpacing:1.2
      }).setOrigin(.5,0);

    const title = this.add.text(0, isRecord ? 25 : 22,
      isRecord ? '🏆  NUEVO RÉCORD DEL CIRCUITO' : 'NUEVA MEJOR VUELTA', {
        fontFamily:'Orbitron, system-ui, sans-serif',
        fontSize:isRecord?'19px':'17px', fontStyle:'900', color:toneText,
        stroke:'#000000', strokeThickness:2
      }).setOrigin(.5,0);

    const detail = this.add.text(0, isRecord ? 51 : 46,
      `${this._fmtRecord(lapMs)}   ·   ${carName}`, {
        fontFamily:'Orbitron, system-ui, sans-serif',
        fontSize:isRecord?'14px':'12px', fontStyle:'800', color:'#F4F8FB'
      }).setOrigin(.5,0);

    c.add([shell, accentL, accentR, eyebrow, title, detail]);

    const particleCount = isRecord ? 22 : 10;
    for (let i = 0; i < particleCount; i++) {
      const px = -bannerW * 0.42 + Math.random() * bannerW * 0.84;
      const py = 17 + Math.random() * (bannerH - 32);
      const size = 1.5 + Math.random() * (isRecord ? 3.2 : 2.2);
      const p = this.add.rectangle(px, py, size, size * (0.6 + Math.random() * 1.5), tone, 0.28 + Math.random() * 0.52)
        .setRotation(Math.random() * Math.PI);
      c.add(p);
      this.tweens.add({
        targets:p,
        y:py + 5 + Math.random() * 10,
        alpha:0.05,
        angle:p.angle + (Math.random() > .5 ? 45 : -45),
        duration:900 + Math.random() * 1100,
        yoyo:true,
        repeat:1
      });
    }

    const flash = this.add.rectangle(-bannerW * 0.34, bannerH - 7, bannerW * 0.68, 1, tone, 0).setOrigin(0,.5);
    c.add(flash);
    this.tweens.add({targets:flash,alpha:{from:0,to:.72},duration:220,yoyo:true,hold:80});

    // El banner debe verse en la cámara principal, pero no duplicarse en uiCam.
    try { this.uiCam?.ignore?.(c); } catch (_) {}

    // Reanclado continuo durante la celebración para que el movimiento/zoom de cámara
    // no desplace el banner respecto a la pantalla.
    const pin = (screenY) => {
      if (!c?.scene || !cam) return;
      const z = Math.max(0.001, Number(cam.zoom || 1));
      const wp = cam.getWorldPoint(screenX, screenY);
      c.setPosition(wp.x, wp.y);
      c.setScale(1 / z);
    };

    c.setAlpha(0.98);
    this.tweens.addCounter({
      from:0,
      to:1,
      duration:330,
      ease:'Back.Out',
      onUpdate:(tw)=>{
        const t=tw.getValue();
        pin(screenStartY + (screenTargetY-screenStartY)*t);
      },
      onComplete:()=>{
        pin(screenTargetY);
        this._timingBannerTimer = this.time.delayedCall(isRecord ? 2550 : 2100, () => {
          if (!c?.scene) return this._restoreTimingHudAfterBanner();
          this.tweens.addCounter({
            from:0,
            to:1,
            duration:300,
            ease:'Quad.In',
            onUpdate:(tw)=>{
              const t=tw.getValue();
              pin(screenTargetY + (-bannerH-16-screenTargetY)*t);
              c.setAlpha(0.98*(1-t));
            },
            onComplete:()=>{
              if (c?.scene) c.destroy(true);
              if (this._timingBanner === c) this._timingBanner = null;
              this._timingBannerTimer = null;
              this._restoreTimingHudAfterBanner();
            }
          });
        });
      }
    });
  }
}
