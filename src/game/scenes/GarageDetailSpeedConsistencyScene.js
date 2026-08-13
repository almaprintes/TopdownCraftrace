import { GarageDetailScene as CurrentGarageDetailScene } from './GarageDetailScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { pxpsToKmh } from '../cars/speedUnits.js';

function savedSpec(carId) {
  try {
    const raw = localStorage.getItem(`tdr2:carSpecs:${carId}`);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' ? obj : {};
  } catch (_) {
    return {};
  }
}

export class GarageDetailScene extends CurrentGarageDetailScene {
  create() {
    super.create();

    const id = this._carId;
    const factory = CAR_SPECS?.[id] || CAR_SPECS?.stock;
    if (!factory) return;

    const currentSpec = { ...factory, ...savedSpec(id) };
    const resolved = resolveCarParams(currentSpec);
    const kmh = Math.round(pxpsToKmh(resolved.maxFwd));

    for (const child of this.children?.list || []) {
      if (!child?.setText || typeof child.text !== 'string') continue;
      const txt = child.text;
      if (/^\s*\d+\s*km\/h\s*$/i.test(txt)) {
        child.setText(`${kmh} km/h`);
      } else if (txt.includes('maxFwd:') && txt.includes('km/h')) {
        child.setText(txt.replace(/maxFwd:[^\n]*/i, `maxFwd: ${resolved.maxFwd.toFixed(1)} px/s · ${kmh} km/h`));
      }
    }
  }
}
