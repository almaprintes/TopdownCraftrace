// One visual odometer unit = 10 m = 0.01 km. Do not round early:
// speedometers and the Statistics screen must display the SAME persisted metres.
export const ODOMETER_STEP_METERS=10;
export function formatOdometerKm(meters,language='es'){
  const n=Number(meters);
  const safe=Number.isFinite(n)?Math.max(0,n):0;
  const decameters=Math.floor((safe+1e-9)/ODOMETER_STEP_METERS);
  const km=decameters/100;
  return km.toLocaleString(language==='en'?'en-US':'es-ES',
    {minimumFractionDigits:2,maximumFractionDigits:2});
}
