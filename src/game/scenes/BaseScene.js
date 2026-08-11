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

    // Herramienta de trabajo: en escenas de carrera con mundo grande aparecen dos
    // botones para exportar una instantánea COMPLETA del circuito. Se instalan con
    // retraso para dar tiempo a la escena hija a crear pista, decoración y cámaras HUD.
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

    // Si existe una cámara dedicada al HUD, mantenemos estos controles en ella.
    try {
      if (this.uiCam && this.uiCam !== this.cameras.main) {
        this.cameras.main.ignore(ui);
      }
    } catch {}
  }

  async exportCircuitMap({ technical = false } = {}) {
    if (this._mapExportBusy) return;
    this._mapExportBusy = true;

    const main = this.cameras.main;
    const worldW = Math.round(Number(this.track?.meta?.worldW || this.track?.worldW || this.physics?.world?.bounds?.width || main.getBounds?.().width || 0));
    const worldH = Math.round(Number(this.track?.meta?.worldH || this.track?.worldH || this.physics?.world?.bounds?.height || main.getBounds?.().height || 0));
    if (!worldW || !worldH) { this._mapExportBusy = false; return; }

    // iOS/Safari tiene límites bastante estrictos de área de canvas. 0.75 conserva
    // mucho detalle (Karting Canarias: 2250x4200) sin superar esos límites habituales.
    const exportScale = 0.75;
    const outW = Math.max(1, Math.round(worldW * exportScale));
    const outH = Math.max(1, Math.round(worldH * exportScale));
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const ctx = out.getContext('2d', { alpha:false });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Abrimos la pestaña AHORA, dentro del gesto del usuario. Así Safari no bloquea
    // la salida cuando el PNG termine de componerse varios segundos después.
    let previewWindow = null;
    try { previewWindow = window.open('', '_blank'); } catch {}
    if (previewWindow) {
      try {
        previewWindow.document.write('<body style="margin:0;background:#0b1114;color:white;font-family:system-ui;display:grid;place-items:center;height:100vh"><div>Generando mapa del circuito…</div></body>');
      } catch {}
    }

    const old = {
      x:main.scrollX, y:main.scrollY, zoom:main.zoom,
      follow:main._follow,
      roundPixels:main.roundPixels
    };
    const otherCameras = this.cameras.cameras.filter(c => c !== main).map(c => ({ c, visible:c.visible }));
    const exportUiVisible = this._mapExportUi?.visible;

    try {
      // Capturamos SOLO la cámara del mundo. HUD/minimapa/botones no forman parte
      // de la instantánea, pero sí todos los objetos de mundo y decoraciones actuales.
      otherCameras.forEach(({c}) => c.setVisible(false));
      this._mapExportUi?.setVisible(false);
      try { main.stopFollow(); } catch {}
      main.setZoom(1);
      main.roundPixels = false;

      const viewW = Math.round(main.width);
      const viewH = Math.round(main.height);
      const sourceCanvas = this.game.canvas;

      for (let y = 0; y < worldH; y += viewH) {
        for (let x = 0; x < worldW; x += viewW) {
          const tileW = Math.min(viewW, worldW - x);
          const tileH = Math.min(viewH, worldH - y);
          main.setScroll(x, y);
          await waitFrames(this, 2);

          // La cámara principal ocupa normalmente todo el canvas. Recortamos en los
          // bordes del mundo para que las últimas teselas no dupliquen contenido.
          ctx.drawImage(
            sourceCanvas,
            main.x, main.y, tileW, tileH,
            Math.round(x * exportScale), Math.round(y * exportScale),
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
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (err) {
      console.error('[TDR map export]', err);
      try {
        if (previewWindow && !previewWindow.closed) previewWindow.document.body.innerHTML = '<div style="color:white;background:#111;padding:24px;font-family:system-ui">No se pudo generar el mapa. Vuelve al juego e inténtalo otra vez.</div>';
      } catch {}
    } finally {
      main.setZoom(old.zoom || 1);
      main.setScroll(old.x, old.y);
      main.roundPixels = old.roundPixels;
      try { if (old.follow) main.startFollow(old.follow); } catch {}
      otherCameras.forEach(({c,visible}) => c.setVisible(visible));
      if (this._mapExportUi) this._mapExportUi.setVisible(exportUiVisible !== false);
      this._mapExportBusy = false;
    }
  }

  _paintTechnicalOverlay(ctx, scale, worldW, worldH) {
    ctx.save();
    ctx.scale(scale, scale);

    // Cuadrícula cada 250 px; línea más fuerte y etiqueta cada 500 px.
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

    // Centerline y nodos originales numerados. Esto permite marcar una zona y decir
    // "entre nodo 12 y 13" además de usar coordenadas X/Y.
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
