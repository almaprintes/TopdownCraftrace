import { CarEditorScene as CurrentCarEditorScene } from './CarEditorScene.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { attainableTopSpeedKmh } from '../cars/speedUnits.js';

export class CarEditorScene extends CurrentCarEditorScene {
  _refreshTechOverlay() {
    super._refreshTechOverlay();

    const txt = this._techOverlayText;
    if (!txt?.setText || typeof txt.text !== 'string') return;

    const liveSpec = { ...(this._base || {}), ...(this._override || {}) };
    const resolved = resolveCarParams(liveSpec);
    const attainable = Math.round(attainableTopSpeedKmh(resolved));

    txt.setText(
      txt.text.replace(
        /maxFwd:[^\n]*/i,
        `maxFwd: ${Number(liveSpec.maxFwd || 0).toFixed(1)} px/s · punta real ${attainable} km/h`
      )
    );
  }
}
