import { RaceScene as CurrentRaceScene } from './RaceSurvivalAvoidanceScene.js';

export class RaceScene extends CurrentRaceScene {
  _disableLegacyGridCars() {
    if (!this._survivalMode || !Array.isArray(this.gridCars)) return;
    for (const gc of this.gridCars) {
      if (!gc || gc.__survivalDisabled) continue;
      gc.__survivalDisabled = true;
      gc.active = false;
      try { gc.body?.setVelocity?.(0, 0); } catch {}
      try { gc.body?.disableBody?.(true, true); } catch {}
      try { gc.body?.setActive?.(false); gc.body?.setVisible?.(false); } catch {}
      try { gc.rig?.setActive?.(false); gc.rig?.setVisible?.(false); } catch {}
      try { gc.sprite?.setActive?.(false); gc.sprite?.setVisible?.(false); } catch {}
    }
  }

  _initSurvival() {
    super._initSurvival();
    this._disableLegacyGridCars();
  }

  _survivalRaceIsLive() {
    if (this._raceStarted === true) return true;
    if (this._startState === 'RACING' || this._startState === 'GO') return true;

    const body = this.carBody?.body || this.carBody;
    const vx = Number(body?.velocity?.x || 0);
    const vy = Number(body?.velocity?.y || 0);
    if (Math.hypot(vx, vy) > 2) return true;

    const lapMs = Number(this.timing?.lapStartMs ?? this.timing?.lapStart ?? 0);
    if (lapMs > 0) return true;
    return false;
  }

  _updateSurvivalBots(deltaMs) {
    if (!this._survivalMode) return super._updateSurvivalBots(deltaMs);

    this._disableLegacyGridCars();

    // No dependemos exclusivamente de un booleano que puede quedar desincronizado
    // con el semáforo. En cuanto el estado real de carrera está vivo, liberamos CPU.
    if (!this._raceStarted && this._survivalRaceIsLive()) {
      this._raceStarted = true;
    }

    return super._updateSurvivalBots(deltaMs);
  }

  update(time, delta) {
    const result = super.update(time, delta);
    if (this._survivalMode) this._disableLegacyGridCars();
    return result;
  }
}
