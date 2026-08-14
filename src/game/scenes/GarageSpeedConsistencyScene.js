import { GarageScene as CurrentGarageScene } from './GarageScene.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { attainableTopSpeedKmh } from '../cars/speedUnits.js';

function savedSpec(carId) {
  try {
    const raw = localStorage.getItem(`tdr2:carSpecs:${carId}`);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' ? obj : {};
  } catch (_) {
    return {};
  }
}

export class GarageScene extends CurrentGarageScene {
  _refreshSelection() {
    super._refreshSelection();
    const selected = this._cars?.[this._selectedIndex];
    const statText = this._uiRefs?.statText;
    if (!selected?.spec || !statText?.scene) return;

    const carId = selected.spec.id || selected.id;
    const liveSpec = { ...selected.spec, ...savedSpec(carId) };
    const resolved = resolveCarParams(liveSpec);
    const topKmh = Math.round(attainableTopSpeedKmh(resolved));

    statText.setText(
      `VEL PUNTA   ${topKmh} km/h\n` +
      `ACELERACIÓN ${Math.round(resolved.accel || 0)}\n` +
      `FRENADA     ${Math.round(resolved.brakeForce || 0)}`
    );
  }
}
