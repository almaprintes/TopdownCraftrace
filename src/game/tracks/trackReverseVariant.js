import {spawnUpstreamOfFinish} from './imageNativeDriving.js';

// A race variant is an independent timing identity over the SAME authored road,
// masks and photo tiles. The published legacy ID always keeps historical times.
export const TENERIFE_CLOCKWISE_ID='karting-tenerife-horario';
export const TENERIFE_LEGACY_ID='karting-tenerife';
export const TENERIFE_DIRECTION_PREF='tdr2:karting-tenerife:direction:v1';
export function readTenerifeDirection(storage){
  try{return storage?.getItem(TENERIFE_DIRECTION_PREF)==='clockwise'?'clockwise':'counterclockwise';}
  catch{return'counterclockwise';}
}
export function saveTenerifeDirection(storage,direction){
  const next=direction==='clockwise'?'clockwise':'counterclockwise';
  try{storage?.setItem(TENERIFE_DIRECTION_PREF,next);}catch{}
  return next;
}


export function selectedTenerifeRaceId(baseId,choice){
  return baseId===TENERIFE_LEGACY_ID&&choice==='clockwise'
    ?TENERIFE_CLOCKWISE_ID:baseId;
}
export function baseCircuitId(id){
  return id===TENERIFE_CLOCKWISE_ID?TENERIFE_LEGACY_ID:id;
}
export function clockwiseVariant(id){
  return id===TENERIFE_CLOCKWISE_ID;
}
export function invertRaceGate(gate){
  if(!gate?.a||!gate?.b||!gate?.normal)throw Error('No se puede invertir puerta sin normal de carrera');
  return {...gate,a:{...gate.a},b:{...gate.b},
    normal:{x:-Number(gate.normal.x),y:-Number(gate.normal.y)}};
}

export function makeTenerifeClockwiseTrack(base){
  if(!base||base.key!==TENERIFE_LEGACY_ID||base.closed!==true||
    !Array.isArray(base.raceCenterline)||base.raceCenterline.length<4||
    !Array.isArray(base.checkpoints)||base.checkpoints.length!==2)
    throw Error('Karting Tenerife: geometría o checkpoints base inválidos');
  const raceCenterline=base.raceCenterline.map(p=>({...p})).reverse();
  const finishLine=invertRaceGate(base.finishLine);
  // The original authored finish and both checkpoint positions stay fixed:
  // reverse direction requires reversing their normals AND crossing order.
  const checkpoints=base.checkpoints.slice().reverse().map(invertRaceGate);
  const span=Math.hypot(finishLine.b.x-finishLine.a.x,finishLine.b.y-finishLine.a.y);
  const beforeFinish=Math.max(32,Math.min(100,Number(base.trackWidth)*.60));
  const start=spawnUpstreamOfFinish(raceCenterline,finishLine,beforeFinish);
  if(!start||!Number.isFinite(start.r))
    throw Error('Karting Tenerife horario: sin salida segura antes de meta');
  const finishAnchor=base.finishAnchor
    ?{...base.finishAnchor,r:Math.atan2(finishLine.normal.y,finishLine.normal.x)}
    :null;
  return {...base,id:TENERIFE_CLOCKWISE_ID,key:TENERIFE_CLOCKWISE_ID,
    name:'KARTING TENERIFE · HORARIO',
    raceDirection:'reverse',
    raceCenterline,
    finishLine,finishAnchor,
    checkpoints,
    start:{x:start.x,y:start.y,r:start.r},
    // Never apply the base game's grid, which is oriented the other way.
    grid:null,startLine:null,
    meta:{...base.meta,reverseOf:TENERIFE_LEGACY_ID,variant:'clockwise',
      imageNative:base.meta?.imageNative,
      publicName:'KARTING TENERIFE · HORARIO'}};
}
