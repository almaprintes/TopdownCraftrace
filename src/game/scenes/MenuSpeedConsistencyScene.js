import { MenuScene as CurrentMenuScene } from './MenuScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { attainableTopSpeedKmh } from '../cars/speedUnits.js';

const LEGACY_CAR_IDS = new Set(['stock', 'touring', 'power']);

function firstPlayableCarId() {
  const cars = Object.values(CAR_SPECS || {}).filter(c => c?.id && !LEGACY_CAR_IDS.has(c.id));
  return cars[0]?.id || Object.values(CAR_SPECS || {})[0]?.id || 'stock';
}

function selectedCarId(scene) {
  const id = scene?.selectedCarId;
  return CAR_SPECS?.[id] ? id : firstPlayableCarId();
}

function savedSpec(carId) {
  try {
    const raw = localStorage.getItem(`tdr2:carSpecs:${carId}`);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' ? obj : {};
  } catch (_) {
    return {};
  }
}

function walk(obj, fn) {
  if (!obj) return;
  fn(obj);
  const list = obj.list || obj.getAll?.();
  if (Array.isArray(list)) for (const child of list) walk(child, fn);
}

export class MenuScene extends CurrentMenuScene {
  renderUI() {
    super.renderUI();

    const id = selectedCarId(this);
    const factory = CAR_SPECS?.[id];
    if (!factory || !this._ui) return;

    const resolved = resolveCarParams({ ...factory, ...savedSpec(id) });
    const kmh = Math.round(attainableTopSpeedKmh(resolved));

    walk(this._ui, (obj) => {
      if (!obj?.setText || typeof obj.text !== 'string') return;
      if (/^\s*\d+\s*km\/h\s*$/i.test(obj.text)) obj.setText(`${kmh} km/h`);
    });
  }
}
