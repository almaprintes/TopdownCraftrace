import { RaceScene as CurrentRaceScene } from './RaceFullWidthFinishGateScene.js';

const START_ASSETS = [
  ['start_red', 'assets/ui/race/start_red.webp'],
  ['start_amber', 'assets/ui/race/start_amber.webp'],
  ['start_green', 'assets/ui/race/start_green.webp'],
];

// Keeps the start-light sequence intact while removing only the legacy text
// labels that sit on top of the semaphore modal.
export class RaceScene extends CurrentRaceScene {
  preload() {
    super.preload?.();
    for (const [key, url] of START_ASSETS) {
      try { if (!this.textures?.exists?.(key)) this.load?.image?.(key, url); } catch (_) {}
    }
  }

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
