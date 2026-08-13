import { RaceScene as CurrentRaceScene } from './RaceFullWidthFinishGateScene.js';

// Keeps the start-light sequence intact while removing the legacy text labels
// that sit on top of the semaphore modal.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    const hideStartLabels = () => {
      try { this._startTitle?.setVisible?.(false); } catch (_) {}
      try { this._startHint?.setVisible?.(false); } catch (_) {}
      try { this._startStatus?.setVisible?.(false); } catch (_) {}
    };

    hideStartLabels();
    this.events?.once?.('postupdate', hideStartLabels);

    return result;
  }
}
