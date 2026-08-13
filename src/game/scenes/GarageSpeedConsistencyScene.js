import { GarageScene as CurrentGarageScene } from './GarageScene.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { pxpsToKmh } from '../cars/speedUnits.js';

export class GarageScene extends CurrentGarageScene {
  _refreshSelection() {
    super._refreshSelection();
    const selected = this._cars?.[this._selectedIndex];
    const statText = this._uiRefs?.statText;
    if (!selected?.spec || !statText?.scene) return;
    const resolved = resolveCarParams(selected.spec);
    statText.setText(`VEL PUNTA   ${Math.round(pxpsToKmh(resolved.maxFwd))} km/h\nACELERACIÓN ${Math.round(resolved.accel || 0)}\nFRENADA     ${Math.round(resolved.brakeForce || 0)}`);
  }
}
