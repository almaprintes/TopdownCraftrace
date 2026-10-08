// src/game/cars/performanceRating.js
// Rating 2.0: 0..200 internally, 0..100 in player-facing Factory bars.
// ROAD and FORGE are deliberately separate classes. Physics remains the source of driving behaviour.
const clamp200=n=>Math.max(0,Math.min(200,Math.round(Number(n)||0)));

export const PERFORMANCE_RATINGS={
  helix_spark:{vehicleClass:'ROAD',speed:106,accel:112,grip:128,control:125},
  helix_comet:{vehicleClass:'ROAD',speed:114,accel:116,grip:126,control:124},
  helix_pulse:{vehicleClass:'ROAD',speed:118,accel:120,grip:128,control:126},
  crown_axis:{vehicleClass:'ROAD',speed:120,accel:122,grip:130,control:132},
  crown_vector:{vehicleClass:'ROAD',speed:130,accel:124,grip:128,control:134},
  crown_equinox:{vehicleClass:'ROAD',speed:134,accel:130,grip:130,control:134},
  avenir_gripline:{vehicleClass:'ROAD',speed:116,accel:118,grip:150,control:156},
  avenir_apex:{vehicleClass:'ROAD',speed:120,accel:124,grip:152,control:156},
  avenir_torque:{vehicleClass:'ROAD',speed:124,accel:128,grip:156,control:156},
  veloce_flash:{vehicleClass:'ROAD',speed:150,accel:146,grip:136,control:144},
  veloce_surge:{vehicleClass:'ROAD',speed:154,accel:152,grip:136,control:146},
  veloce_photon:{vehicleClass:'ROAD',speed:158,accel:156,grip:138,control:148},
  helix_vortex:{vehicleClass:'ROAD',speed:146,accel:158,grip:154,control:154},
  veloce_juanicar_c220:{vehicleClass:'ROAD',speed:160,accel:160,grip:146,control:158},
  forge_hammer:{vehicleClass:'FORGE',speed:126,accel:154,grip:150,control:118},
  forge_anvil:{vehicleClass:'FORGE',speed:122,accel:162,grip:152,control:116},
  forge_colossus:{vehicleClass:'FORGE',speed:132,accel:158,grip:164,control:124}
};

export function getBaseInternalStats(specOrId){
  const id=typeof specOrId==='string'?specOrId:specOrId?.id;
  const r=PERFORMANCE_RATINGS[id];
  if(r)return{speed:r.speed,accel:r.accel,grip:r.grip,control:r.control};
  const d=typeof specOrId==='object'?specOrId?.designStats:null;
  return{
    speed:clamp200((d?.VEL??55)*2),
    accel:clamp200((d?.ACC??55)*2),
    grip:clamp200((((d?.EST??55)+(d?.GIR??55))/2)*2),
    control:clamp200((((d?.GIR??55)+(d?.FRN??55))/2)*2)
  };
}
export function getVehicleClass(specOrId){const id=typeof specOrId==='string'?specOrId:specOrId?.id;return PERFORMANCE_RATINGS[id]?.vehicleClass||'ROAD';}
export function internalPr(stats){return ['speed','accel','grip','control'].reduce((n,k)=>n+clamp200(stats?.[k]),0);}
export function displayStat(v){return Math.max(0,Math.min(100,Math.round((Number(v)||0)/2)));}
export function applyPerformanceIdentity(carSpecs){
  for(const [id,r] of Object.entries(PERFORMANCE_RATINGS)){
    const spec=carSpecs?.[id];if(!spec)continue;
    spec.vehicleClass=r.vehicleClass;spec.category=r.vehicleClass;
    spec.performanceStats={speed:r.speed,accel:r.accel,grip:r.grip,control:r.control};
    spec.performanceRating=internalPr(r);
  }
}
