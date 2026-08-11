// src/game/scenes/BaseScene.js
import Phaser from 'phaser';
import { OrientationOverlay } from '../ui/OrientationOverlay.js';

const waitFrames = (scene, count = 2) => new Promise(resolve => {
  const step = () => {
    if (--count <= 0) return resolve();
    scene.game.events.once(Phaser.Core.Events.POST_RENDER, step);
  };
  scene.game.events.once(Phaser.Core.Events.POST_RENDER, step);
});

export class BaseScene extends Phaser.Scene {
  create() {
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

    this._orientationOverlay = new OrientationOverlay(this, { imageKey: 'ui_rotate_landscape' });
    this.time.delayedCall(900, () => this._installMapExportButtons());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._orientationOverlay?.destroy();
      this._orientationOverlay = null;
      this._mapExportUi?.destroy?.(true);
      this._mapExportUi = null;
    });
  }

  _installMapExportButtons() {
    if (this._mapExportUi || !this.track || !this.cameras?.main) return;

    const worldW = Number(this.track?.meta?.worldW || this.track?.worldW || this.physics?.world?.bounds?.width || 0);
    const worldH = Number(this.track?.meta?.worldH || this.track?.worldH || this.physics?.world?.bounds?.height || 0);
    if (worldW < this.scale.width * 1.4 || worldH < this.scale.height * 1.4) return;

    const ui = this.add.container(16, 166).setDepth(999999).setScrollFactor(0);
    const mk = (y, label, technical) => {
      const bg = this.add.rectangle(0, y, 118, 30, 0x061116, 0.88)
        .setOrigin(0)
        .setStrokeStyle(1, technical ? 0x52ff99 : 0x67cfff, 0.9)
        .setInteractive({ useHandCursor:true });
      const tx = this.add.text(59, y + 15, label, {
        fontFamily:'system-ui', fontSize:'10px', fontStyle:'800', color:'#ffffff'
      }).setOrigin(0.5);
      bg.on('pointerdown', () => this.exportCircuitMap({ technical }));
      ui.add([bg, tx]);
    };
    mk(0, 'MAPA PNG', false);
    mk(36, 'MAPA TÉCNICO', true);
    this._mapExportUi = ui;

    try {
      if (this.uiCam && this.uiCam !== this.cameras.main) this.cameras.main.ignore(ui);
    } catch {}
  }

  async exportCircuitMap({ technical = false } = {}) {
    if (this._mapExportBusy) return;
    this._mapExportBusy = true;

    const main = this.cameras.main;
    const worldW = Math.round(Number(this.track?.meta?.worldW || this.track?.worldW || this.physics?.world?.bounds?.width || 0));
    const worldH = Math.round(Number(this.track?.meta?.worldH || this.track?.worldH || this.physics?.world?.bounds?.height || 0));
    if (!worldW || !worldH) { this._mapExportBusy = false; return; }

    // Keep the final PNG comfortably below Safari's large-canvas limits.
    const maxSide = 4200;
    const exportScale = Math.min(1, maxSide / Math.max(worldW, worldH));
    const outW = Math.max(1, Math.round(worldW * exportScale));
    const outH = Math.max(1, Math.round(worldH * exportScale));
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let previewWindow = null;
    try { previewWindow = window.open('', '_blank'); } catch {}
    if (previewWindow) {
      try {
        previewWindow.document.write('<body style="margin:0;background:#0b1114;color:white;font-family:system-ui;display:grid;place-items:center;height:100vh"><div>Generando mapa del circuito…</div></body>');
      } catch {}
    }

    // IMPORTANT: the race scene continuously repositions cameras while driving. Using
    // cameras.main for tiled captures therefore produced the same viewport over and over.
    // A dedicated temporary camera is never touched by race/update logic.
    const previousCameras = this.cameras.cameras.slice();
    const cameraVisibility = previousCameras.map(c => ({ c, visible:c.visible }));
    const hiddenUi = [];
    let exportCam = null;

    try {
      // Hide screen-space HUD objects (timer, minimap, controls, export buttons, etc.).
      // World decoration normally has scrollFactor=1 and remains visible.
      for (const obj of this.children.list) {
        if (!obj || obj === this._mapExportUi || obj === this._orientationOverlay) continue;
        const sx = Number(obj.scrollFactorX ?? 1);
        const sy = Number(obj.scrollFactorY ?? 1);
        if (sx === 0 && sy === 0 && obj.visible !== false) {
          hiddenUi.push(obj);
          obj.setVisible?.(false);
        }
      }
      if (this._mapExportUi?.visible !== false) {
        hiddenUi.push(this._mapExportUi);
        this._mapExportUi.setVisible(false);
      }

      // Disable all live cameras and render the world through one isolated camera.
      cameraVisibility.forEach(({c}) => c.setVisible(false));
      const viewW = Math.max(1, Math.round(this.scale.width));
      const viewH = Math.max(1, Math.round(this.scale.height));
      exportCam = this.cameras.add(0, 0, viewW, viewH, false, '__map_export__');
      exportCam.setVisible(true);
      exportCam.setBackgroundColor(main.backgroundColor || '#25452a');
      exportCam.setBounds(0, 0, worldW, worldH);
      exportCam.setZoom(1);
      exportCam.roundPixels = false;

      // Do not render the two screen-space helper objects even if they are nested.
      try { exportCam.ignore(this._mapExportUi); } catch {}

      const sourceCanvas = this.game.canvas;
      const maxScrollX = Math.max(0, worldW - viewW);
      const maxScrollY = Math.max(0, worldH - viewH);

      for (let destY = 0; destY < worldH; destY += viewH) {
        for (let destX = 0; destX < worldW; destX += viewW) {
          const tileW = Math.min(viewW, worldW - destX);
          const tileH = Math.min(viewH, worldH - destY);

          // At the far right/bottom a bounded camera cannot scroll all the way to destX/Y.
          // Capture from the correct offset inside the final viewport instead of duplicating tiles.
          const actualX = Math.min(destX, maxScrollX);
          const actualY = Math.min(destY, maxScrollY);
          const srcOffsetX = destX - actualX;
          const srcOffsetY = destY - actualY;

          exportCam.setScroll(actualX, actualY);
          await waitFrames(this, 2);

          ctx.drawImage(
            sourceCanvas,
            exportCam.x + srcOffsetX, exportCam.y + srcOffsetY, tileW, tileH,
            Math.round(destX * exportScale), Math.round(destY * exportScale),
            Math.round(tileW * exportScale), Math.round(tileH * exportScale)
          );
        }
      }

      if (technical) this._paintTechnicalOverlay(ctx, exportScale, worldW, worldH);

      const blob = await new Promise(resolve => out.toBlob(resolve, 'image/png', 0.96));
      if (!blob) throw new Error('PNG export failed');
      const url = URL.createObjectURL(blob);
      const safeName = String(this.track?.meta?.name || this.track?.name || this.trackKey || 'circuito')
        .toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-|-$/g, '');
      const filename = `${safeName || 'circuito'}-${technical ? 'tecnico' : 'limpio'}.png`;

      if (previewWindow && !previewWindow.closed) {
        try {
          previewWindow.document.body.innerHTML = '';
          previewWindow.document.body.style.cssText = 'margin:0;background:#111;display:flex;justify-content:center;min-height:100vh';
          const img = previewWindow.document.createElement('img');
          img.src = url;
          img.alt = filename;
          img.style.cssText = 'max-width:100%;height:auto;object-fit:contain';
          previewWindow.document.body.appendChild(img);
          previewWindow.document.title = filename;
        } catch { previewWindow.location.href = url; }
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
      console.error('[TDR map export]', err);
      try {
        if (previewWindow && !previewWindow.closed) previewWindow.document.body.innerHTML = '<div style="color:white;background:#111;padding:24px;font-family:system-ui">No se pudo generar el mapa. Vuelve al juego e inténtalo otra vez.</div>';
      } catch {}
    } finally {
      try { if (exportCam) this.cameras.remove(exportCam); } catch {}
      cameraVisibility.forEach(({c,visible}) => { try { c.setVisible(visible); } catch {} });
      hiddenUi.forEach(obj => { try { obj.setVisible?.(true); } catch {} });
      this._mapExportBusy = false;
    }
  }

  _paintTechnicalOverlay(ctx, scale, worldW, worldH) {
    ctx.save();
    ctx.scale(scale, scale);

    for (let x = 0; x <= worldW; x += 250) {
      const major = x % 500 === 0;
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,worldH);
      ctx.strokeStyle = major ? 'rgba(0,230,255,.42)' : 'rgba(0,230,255,.16)';
      ctx.lineWidth = major ? 2 : 1; ctx.stroke();
      if (major) {
        ctx.font = 'bold 24px system-ui'; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(x+5,5,88,30);
        ctx.fillStyle = '#7ff7ff'; ctx.fillText(`X ${x}`, x+10,28);
      }
    }
    for (let y = 0; y <= worldH; y += 250) {
      const major = y % 500 === 0;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(worldW,y);
      ctx.strokeStyle = major ? 'rgba(0,230,255,.42)' : 'rgba(0,230,255,.16)';
      ctx.lineWidth = major ? 2 : 1; ctx.stroke();
      if (major) {
        ctx.font = 'bold 24px system-ui'; ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(5,y+5,96,30);
        ctx.fillStyle = '#7ff7ff'; ctx.fillText(`Y ${y}`,10,y+28);
      }
    }

    const raw = Array.isArray(this.track?.meta?.centerline)
      ? this.track.meta.centerline
      : Array.isArray(this.track?.centerline) ? this.track.centerline : [];
    const pts = raw.map(p => Array.isArray(p) ? {x:Number(p[0]),y:Number(p[1])} : {x:Number(p?.x),y:Number(p?.y)})
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length > 1) {
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
      ctx.lineTo(pts[0].x,pts[0].y);
      ctx.strokeStyle='rgba(255,220,0,.95)'; ctx.lineWidth=5; ctx.stroke();

      ctx.textAlign='center'; ctx.textBaseline='middle';
      pts.forEach((p,i) => {
        ctx.beginPath(); ctx.arc(p.x,p.y,13,0,Math.PI*2);
        ctx.fillStyle='rgba(10,10,10,.92)'; ctx.fill();
        ctx.strokeStyle='#ffe100'; ctx.lineWidth=3; ctx.stroke();
        ctx.font='bold 14px system-ui'; ctx.fillStyle='#ffffff'; ctx.fillText(String(i),p.x,p.y);
      });
      ctx.textAlign='start'; ctx.textBaseline='alphabetic';
    }

    ctx.restore();
  }
}
