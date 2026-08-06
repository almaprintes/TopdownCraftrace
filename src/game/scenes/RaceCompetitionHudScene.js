import { RaceScene as StyledRaceScene } from './RaceStyledHudScene.js';

// HUD de competición: sustituye la antigua barra superior izquierda
// sin tocar lógica de vueltas, checkpoints, cronómetro ni cámara estable.
export class RaceScene extends StyledRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (!main) return;

      // Ocultar SOLO diagnósticos de desarrollo.
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

      // Ocultar presentación antigua de la esquina superior izquierda.
      for (const obj of [
        this.ttHud?.lapText,
        this.ttHud?.bestLapText,
        this.ttHud?.barBase,
        this.ttHud?.barSlider,
        this.ttHud?.ticksGfx
      ]) {
        if (obj?.scene) obj.setVisible(false);
      }

      const c = this.add.container(0, 0).setDepth(2210);
      this.competitionHud = c;

      const accent = this.add.rectangle(0, 0, 3, 58, 0x61c9ff, 0.82)
        .setOrigin(0, 0);

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
        fontSize: '10px',
        fontStyle: '800',
        color: '#8999A6'
      };
      const s1 = this.add.text(10, 42, 'S1 —', sectorStyle).setOrigin(0, 0);
      const s2 = this.add.text(48, 42, 'S2 —', sectorStyle).setOrigin(0, 0);
      const s3 = this.add.text(86, 42, 'S3 —', sectorStyle).setOrigin(0, 0);

      c.add([accent, lapLabel, lap, deltaLabel, deltaText, s1, s2, s3]);
      c._lap = lap;
      c._delta = deltaText;
      c._s1 = s1;
      c._s2 = s2;
      c._s3 = s3;

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

      this._setCompetitionDelta = (ms) => {
        const hud = this.competitionHud;
        if (!hud?._delta?.scene) return;
        if (!Number.isFinite(ms)) {
          hud._delta.setText('Δ --.--').setColor('#DCE7EF');
          return;
        }
        const sign = ms > 0 ? '+' : '−';
        const sec = Math.abs(ms) / 1000;
        hud._delta
          .setText(`Δ ${sign}${sec.toFixed(2)}`)
          .setColor(ms <= 0 ? '#68F0A4' : '#FF7272');
      };

      const setSectorState = (obj, done, active) => {
        if (!obj?.scene) return;
        if (done) {
          obj.setText(`${obj.text.slice(0, 2)} ✓`);
          obj.setColor('#39FF6A');
          obj.setShadow(0, 0, '#39FF6A', 7, true, true);
          obj.setAlpha(1);
        } else if (active) {
          obj.setText(`${obj.text.slice(0, 2)} —`);
          obj.setColor('#EAF6FF');
          obj.setShadow(0, 0, '#68D7FF', 4, true, true);
          obj.setAlpha(0.95);
        } else {
          obj.setText(`${obj.text.slice(0, 2)} —`);
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
      };

      // Flash de checkpoint inequívoco: refuerza las marcas existentes y
      // dibuja durante unas décimas la puerta luminosa completa.
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

      this._pinCompetitionHud();
      this._syncCompetitionHud();
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
      this._syncCompetitionHud?.();
    } catch (err) {
      console.warn('[TDR2] Competition HUD update failed', err);
    }
  }
}
