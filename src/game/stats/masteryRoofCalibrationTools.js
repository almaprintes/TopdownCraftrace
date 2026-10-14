import {normalizedMasteryCalibration} from './masteryBadgePlacement.js';

const supportedViews=['lobby','race'];
export const CALIBRATION_EXPORT_FILENAME='tdr-mastery-roof-calibration.json';

export function nudgeMasteryCalibration(row,axis,pixels,paintedShortAxis){
  const current=normalizedMasteryCalibration(row);
  if(!['x','y','size'].includes(axis))return current;
  const width=Number(paintedShortAxis),step=Number(pixels);
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(step))return current;
  return normalizedMasteryCalibration({...current,[axis]:current[axis]+step/width});
}

export function mergeMasteryCalibration(official,draft,allowedCarIds){
  const cars={};
  const ids=Array.from(new Set(allowedCarIds||[])).sort();
  for(const id of ids){
    const source=(draft&&Object.prototype.hasOwnProperty.call(draft,id)?draft[id]:null)
      ||official?.cars?.[id]||null;
    if(!source)continue;
    const row={};
    for(const view of supportedViews)row[view]=normalizedMasteryCalibration(source[view]);
    cars[id]=row;
  }
  return {schema_version:1,units:'car_short_axis_ratio',cars};
}
