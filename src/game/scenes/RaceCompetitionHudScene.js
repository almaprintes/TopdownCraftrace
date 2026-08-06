import { RaceScene as StyledRaceScene } from './RaceStyledHudScene.js';

// HUD de competición: capa visual sobre la carrera estable.
// No altera cronometraje, checkpoints, cámara, minimapa ni física.
export class RaceScene extends StyledRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (!main) return;

      this._hideRaceDebugOnly = () => {
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
      };
      this._hideRaceDebugOnly();
      this.time.delayedCall(0, () => this._hideRaceDebugOnly?.());
      this.time.delayedCall(250, () => this._hideRaceDebugOnly?.());
      this.time.delayedCall(1000, () => this._hideRaceDebugOnly?.());

      for (const obj of [
        this.ttHud?.lapText,
        this.ttHud?.bestLapText,
        this.ttHud?.barBase,
        this.ttHud?.barSlider,
        this.ttHud?.ticksGfx
      ]) {
        if (obj?.scene) obj.setVisible(false);
      }

      // =========================================================
      // HUD SPORT — vuelta, delta, sectores, LAST y BEST
      // =========================================================
      const c = this.add.container(0, 0).setDepth(2210);
      this.competitionHud = c;

      const accent = this.add.rectangle(0, 0, 3, 58, 0x61c9ff, 0.82).setOrigin(0, 0);

      const lapLabel = this.add.text(10, -1, 'VUELTA', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '9px', fontStyle: '700', color: '#8092A2'
      }).setOrigin(0, 0);

      const lap = this.add.text(10, 10, '1', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '22px', fontStyle: '900', color: '#F6FAFF'
      }).setOrigin(0, 0).setShadow(0, 2, '#000000', 3, false, true);

      const deltaLabel = this.add.text(52, 1, 'DELTA', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px', fontStyle: '700', color: '#8092A2'
      }).setOrigin(0, 0);

      const deltaText = this.add.text(52, 12, 'Δ --.--', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '14px', fontStyle: '800', color: '#DCE7EF'
      }).setOrigin(0, 0).setShadow(0, 1, '#000000', 2, false, true);

      const sectorStyle = {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '10px', fontStyle: '800', color: '#8999A6'
      };
      const s1 = this.add.text(10, 42, 'S1 —', sectorStyle).setOrigin(0, 0);
      const s2 = this.add.text(48, 42, 'S2 —', sectorStyle).setOrigin(0, 0);
      const s3 = this.add.text(86, 42, 'S3 —', sectorStyle).setOrigin(0, 0);

      const timingSep = this.add.rectangle(127, 4, 1, 48, 0xffffff, 0.12).setOrigin(0, 0);

      const lastLabel = this.add.text(139, 1, 'LAST', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px', fontStyle: '800', color: '#7E8D9A'
      }).setOrigin(0, 0);

      const lastText = this.add.text(139, 12, '--:--.--', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '12px', fontStyle: '800', color: '#EAF4FA'
      }).setOrigin(0, 0).setShadow(0, 1, '#000000', 2, false, true);

      const bestLabel = this.add.text(139, 32, 'BEST', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px', fontStyle: '800', color: '#7E8D9A'
      }).setOrigin(0, 0);

      const bestText = this.add.text(139, 43, '--:--.--', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '12px', fontStyle: '900', color: '#63FFD1'
      }).setOrigin(0, 0).setShadow(0, 1, '#001610', 1.5, false, true);

      c.add([
        accent,
        lapLabel, lap,
        deltaLabel, deltaText,
        s1, s2, s3,
        timingSep,
        lastLabel, lastText,
        bestLabel, bestText
      ]);

      c._lap = lap;
      c._delta = deltaText;
      c._s1 = s1;
      c._s2 = s2;
      c._s3 = s3;
      c._last = lastText;
      c._best = bestText;

      if (typeof c.cameraFilter === 'number') c.cameraFilter &= ~main.id;
      for (const child of c.list || []) {
        if (typeof child.cameraFilter === 'number') child.cameraFilter &= ~main.id;
      }
      c.setScrollFactor(1, 1);

      this._competitionHudState = { screenX: 12, screenY: 10, scale: 1 };
      this._competitionLastDeltaMs = null;
      this._competitionFinalDeltaUntil = 0;

      this._pinCompetitionHud = () => {
        const cam = this.cameras?.main;
        const hud = this.competitionHud;
        const s = this._competitionHudState;
        if (!cam || !hud?.scene || !s) return;
        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(s.screenX, s.screenY);
        hud.setPosition(world.x, world.y);
        hud.setScale(s.scale / zoom);
      };

      const fmtLap = (ms) => {
        if (!Number.isFinite(ms)) return '--:--.--';
        if (typeof this._fmtTT2 === 'function') return this._fmtTT2(ms);
        const t = Math.max(0, ms);
        const m = Math.floor(t / 60000);
        const s = Math.floor((t % 60000) / 1000);
        const cs = Math.floor((t % 1000) / 10);
        return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
      };

      this._setCompetitionDelta = (ms) => {
        const hud = this.competitionHud;
        if (!hud?._delta?.scene) return;
        if (!Number.isFinite(ms)) {
          hud._delta.setText('Δ --.--').setColor('#DCE7EF');
          return;
        }
        const sign = ms > 0 ? '+' : '−';
        const sec = Math.abs(ms) / 1000;
        hud._delta.setText(`Δ ${sign}${sec.toFixed(2)}`).setColor(ms <= 0 ? '#68F0A4' : '#FF7272');
      };

      const setSectorState = (obj, done, active) => {
        if (!obj?.scene) return;
        const key = obj.text.slice(0, 2);
        if (done) {
          obj.setText(`${key} ✓`);
          obj.setColor('#39FF6A');
          obj.setShadow(0, 0, '#39FF6A', 7, true, true);
          obj.setAlpha(1);
        } else if (active) {
          obj.setText(`${key} —`);
          obj.setColor('#EAF6FF');
          obj.setShadow(0, 0, '#68D7FF', 4, true, true);
          obj.setAlpha(0.95);
        } else {
          obj.setText(`${key} —`);
          obj.setColor('#73818C');
          obj.setShadow(0, 0, '#000000', 0, false, false);
          obj.setAlpha(0.72);
        }
      };

      this._syncCompetitionHud = () => {
        const hud = this.competitionHud;
        if (!hud?.scene) return;

        const lapNo = Number(this.lapCount || 0) + 1;
        hud._lap?.setText(String(lapNo));

        const cp = Number(this._cpState || 0);
        setSectorState(hud._s1, cp >= 1, cp === 0);
        setSectorState(hud._s2, cp >= 2, cp === 1);
        setSectorState(hud._s3, false, cp === 2);

        let deltaMs = this._competitionLastDeltaMs;
        if (cp >= 2 && Number.isFinite(this.timing?.s2) && Number.isFinite(this.ttBest?.s2)) {
          deltaMs = this.timing.s2 - this.ttBest.s2;
        } else if (cp >= 1 && Number.isFinite(this.timing?.s1) && Number.isFinite(this.ttBest?.s1)) {
          deltaMs = this.timing.s1 - this.ttBest.s1;
        } else if (performance.now() > this._competitionFinalDeltaUntil) {
          deltaMs = null;
        }
        this._competitionLastDeltaMs = deltaMs;
        this._setCompetitionDelta(deltaMs);

        const hist = Array.isArray(this.ttHistory) ? this.ttHistory : [];
        const histLast = hist.length ? Number(hist[hist.length - 1]?.lapMs) : NaN;
        const lastMs = Number.isFinite(Number(this.timing?.lastLap)) ? Number(this.timing.lastLap) : histLast;
        const bestMs = Number(this.ttBest?.lapMs);

        hud._last?.setText(fmtLap(lastMs));
        hud._best?.setText(fmtLap(bestMs));
      };

      // =========================================================
      // MINIMAPA PREMIUM — misma familia visual que pedales/HUD
      // =========================================================
      const mapFrame = this.add.container(0, 0).setDepth(1998);
      this.minimapSportFrame = mapFrame;

      const mapW = 154;
      const mapH = 104;
      const cut = 10;
      const shell = this.add.graphics();

      // Sombra exterior tenue.
      shell.fillStyle(0x000000, 0.24);
      shell.beginPath();
      shell.moveTo(cut + 2, 4);
      shell.lineTo(mapW - cut + 2, 4);
      shell.lineTo(mapW + 2, cut + 4);
      shell.lineTo(mapW + 2, mapH - cut + 4);
      shell.lineTo(mapW - cut + 2, mapH + 4);
      shell.lineTo(cut + 2, mapH + 4);
      shell.lineTo(2, mapH - cut + 4);
      shell.lineTo(2, cut + 4);
      shell.closePath();
      shell.fillPath();

      // Cuerpo oscuro translúcido.
      shell.fillStyle(0x061019, 0.72);
      shell.lineStyle(2, 0x5bdcff, 0.72);
      shell.beginPath();
      shell.moveTo(cut, 0);
      shell.lineTo(mapW - cut, 0);
      shell.lineTo(mapW, cut);
      shell.lineTo(mapW, mapH - cut);
      shell.lineTo(mapW - cut, mapH);
      shell.lineTo(cut, mapH);
      shell.lineTo(0, mapH - cut);
      shell.lineTo(0, cut);
      shell.closePath();
      shell.fillPath();
      shell.strokePath();

      // Segundo borde interior para dar profundidad tipo pedal.
      shell.lineStyle(1, 0x9beaff, 0.24);
      shell.beginPath();
      shell.moveTo(cut + 5, 6);
      shell.lineTo(mapW - cut - 5, 6);
      shell.lineTo(mapW - 6, cut + 5);
      shell.lineTo(mapW - 6, mapH - cut - 5);
      shell.lineTo(mapW - cut - 5, mapH - 6);
      shell.lineTo(cut + 5, mapH - 6);
      shell.lineTo(6, mapH - cut - 5);
      shell.lineTo(6, cut + 5);
      shell.closePath();
      shell.strokePath();

      const topRail = this.add.rectangle(19, 8, mapW - 38, 1, 0x6ee6ff, 0.72).setOrigin(0, 0);
      const topGlow = this.add.rectangle(52, 7, 50, 2, 0xa7f1ff, 0.22).setOrigin(0, 0);
      const leftAccent = this.add.rectangle(7, 31, 2, 22, 0x39ff9a, 0.46).setOrigin(0, 0);

      // Pequeños detalles técnicos como en el mockup, sin texto decorativo.
      const detail = this.add.graphics();
      detail.lineStyle(1, 0x70dfff, 0.32);
      detail.beginPath();
      detail.moveTo(16, 17); detail.lineTo(31, 17);
      detail.moveTo(16, 20); detail.lineTo(25, 20);
      detail.moveTo(mapW - 30, mapH - 14); detail.lineTo(mapW - 15, mapH - 14);
      detail.moveTo(mapW - 24, mapH - 11); detail.lineTo(mapW - 15, mapH - 11);
      detail.strokePath();

      mapFrame.add([shell, topRail, topGlow, leftAccent, detail]);
      if (typeof mapFrame.cameraFilter === 'number') mapFrame.cameraFilter &= ~main.id;
      for (const child of mapFrame.list || []) {
        if (typeof child.cameraFilter === 'number') child.cameraFilter &= ~main.id;
      }
      mapFrame.setScrollFactor(1, 1);

      this._layoutMinimapSportFrame = () => {
        const vw = Math.max(1, Number(this.scale?.width || 1));
        this._minimapSportFrameState = {
          screenX: vw - mapW - 12,
          screenY: 28,
          scale: 1
        };
      };

      // Recentrar TODO el contenido existente del minimapa dentro del panel.
      // Se hace una sola vez: puntos, trazado, bandera y marcador comparten el mismo offset.
      this._centerMinimapInsideSportFrame = () => {
        const mini = this.minimap;
        const state = this._minimapSportFrameState;
        if (!mini || !state || this._minimapSportContentCentered) return;

        const pts = Array.isArray(mini.points) ? mini.points : [];
        if (pts.length < 2) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
          if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;

        const contentCX = (minX + maxX) * 0.5;
        const contentCY = (minY + maxY) * 0.5;
        const targetCX = state.screenX + mapW * 0.5;
        const targetCY = state.screenY + mapH * 0.54;
        const dx = targetCX - contentCX;
        const dy = targetCY - contentCY;

        for (const p of pts) {
          if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
          p.x += dx;
          p.y += dy;
        }

        // El trazado y la bandera originales son objetos de pantalla; desplazarlos igual.
        for (const obj of [mini.gfx, mini.flag]) {
          if (!obj?.scene) continue;
          obj.x = Number(obj.x || 0) + dx;
          obj.y = Number(obj.y || 0) + dy;
        }

        // El marcador se vuelve a pinnear desde mini.points en RaceFixedScene.
        this._miniScreenPos = null;
        this._minimapSportContentCentered = true;
      };

      this._pinMinimapSportFrame = () => {
        const cam = this.cameras?.main;
        const frame = this.minimapSportFrame;
        const s = this._minimapSportFrameState;
        if (!cam || !frame?.scene || !s) return;
        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(s.screenX, s.screenY);
        frame.setPosition(world.x, world.y);
        frame.setScale(s.scale / zoom);
      };

      this._flashCheckpointGate = (idx) => {
        const gate = idx === 1 ? this.checkpoints?.cp1 : this.checkpoints?.cp2;
        if (!gate?.a || !gate?.b) return;

        const marker = idx === 1 ? this.cp1IntegratedGfx : this.cp2IntegratedGfx;
        if (marker?.scene) {
          this.tweens.killTweensOf(marker);
          marker.setAlpha(1);
          this.tweens.add({ targets: marker, alpha: 0.72, duration: 520, ease: 'Sine.easeOut' });
        }

        const flash = this.add.graphics().setDepth(18.4).setScrollFactor(1);
        flash.lineStyle(12, 0x39ff9a, 0.28);
        flash.beginPath();
        flash.moveTo(gate.a.x, gate.a.y);
        flash.lineTo(gate.b.x, gate.b.y);
        flash.strokePath();
        flash.lineStyle(5, 0x68f7ff, 0.95);
        flash.beginPath();
        flash.moveTo(gate.a.x, gate.a.y);
        flash.lineTo(gate.b.x, gate.b.y);
        flash.strokePath();
        flash.lineStyle(2, 0xffffff, 0.95);
        flash.beginPath();
        flash.moveTo(gate.a.x, gate.a.y);
        flash.lineTo(gate.b.x, gate.b.y);
        flash.strokePath();
        if (typeof flash.cameraFilter === 'number') flash.cameraFilter &= ~main.id;
        this.uiCam?.ignore?.(flash);

        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => flash.destroy()
        });
      };

      this._layoutMinimapSportFrame();
      this._centerMinimapInsideSportFrame();
      this._pinCompetitionHud();
      this._pinMinimapSportFrame();
      this._syncCompetitionHud();

      this.scale.off('resize', this._onResizeCompetitionSport);
      this._onResizeCompetitionSport = () => {
        this._layoutMinimapSportFrame?.();
        this._pinCompetitionHud?.();
        this._pinMinimapSportFrame?.();
      };
      this.scale.on('resize', this._onResizeCompetitionSport);
    } catch (err) {
      console.warn('[TDR2] Competition HUD setup failed', err);
    }
  }

  update(time, delta) {
    const lapBefore = Number(this.lapCount || 0);
    const bestBefore = Number(this.ttBest?.lapMs);
    const cpBefore = Number(this._cpState || 0);

    super.update(time, delta);

    try {
      const lapAfter = Number(this.lapCount || 0);
      const cpAfter = Number(this._cpState || 0);

      if (cpAfter !== cpBefore) {
        if (cpAfter === 1) this._flashCheckpointGate?.(1);
        if (cpAfter === 2) this._flashCheckpointGate?.(2);
      }

      if (lapAfter > lapBefore && Number.isFinite(this.timing?.lastLap) && Number.isFinite(bestBefore)) {
        this._competitionLastDeltaMs = this.timing.lastLap - bestBefore;
        this._competitionFinalDeltaUntil = performance.now() + 2000;
      }

      this._hideRaceDebugOnly?.();
      this._pinCompetitionHud?.();
      this._pinMinimapSportFrame?.();
      this._syncCompetitionHud?.();
    } catch (err) {
      console.warn('[TDR2] Competition HUD update failed', err);
    }
  }
}
