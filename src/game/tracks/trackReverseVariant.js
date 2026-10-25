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
    name:'KARTING TENERIFE',
    raceDirection:'reverse',
    raceCenterline,
    finishLine,finishAnchor,
    checkpoints,
    start:{x:start.x,y:start.y,r:start.r},
    // Never apply the base game's grid, which is oriented the other way.
    grid:null,startLine:null,
    meta:{...base.meta,id:TENERIFE_CLOCKWISE_ID,key:TENERIFE_CLOCKWISE_ID,trackId:TENERIFE_CLOCKWISE_ID,
      reverseOf:TENERIFE_LEGACY_ID,variant:'clockwise',
      imageNative:base.meta?.imageNative,
      publicName:'KARTING TENERIFE'}};
}

// A published original keeps its original ID and historic lap data. In Tenerife
// the previously published anticlockwise route is visually the INVERSE, and the
// confirmed clockwise alternate is visually NORMAL. Only labels change.
export const CLOSED_CIRCUIT_VARIANTS=Object.freeze([
  {base:'karting-tenerife',alternate:TENERIFE_CLOCKWISE_ID,legacy:'counterclockwise'},
  {base:'karting-americas',alternate:'karting-americas-inverso',legacy:'clockwise'},
  {base:'karting-canarias-4096',alternate:'karting-canarias-4096-inverso',legacy:'counterclockwise'},
  {base:'karting-canarias',alternate:'karting-canarias-inverso',legacy:'counterclockwise'},
  {base:'santa-cruz',alternate:'santa-cruz-inverso',legacy:'clockwise'},
  {base:'circuito-atlantico',alternate:'circuito-atlantico-inverso',legacy:'clockwise'},
  {base:'siete-picos',alternate:'siete-picos-inverso',legacy:'clockwise'}
]);
export const circuitVariantFor=id=>CLOSED_CIRCUIT_VARIANTS.find(v=>v.base===id)||null;
export const circuitVariantParent=id=>CLOSED_CIRCUIT_VARIANTS.find(v=>v.alternate===id)?.base||null;
export const isCircuitAlternate=id=>!!circuitVariantParent(id);
export function readCircuitDirection(storage,base){
  if(base===TENERIFE_LEGACY_ID)
    return readTenerifeDirection(storage)==='clockwise'?'normal':'inverse';
  if(!circuitVariantFor(base))return 'normal';
  try{return storage?.getItem('tdr2:'+base+':direction:v1')==='inverse'?'inverse':'normal';}
  catch{return 'normal';}
}
export function saveCircuitDirection(storage,base,choice){
  const selected=choice==='inverse'?'inverse':'normal';
  if(base===TENERIFE_LEGACY_ID){
    saveTenerifeDirection(storage,selected==='normal'?'clockwise':'counterclockwise');
  }else if(circuitVariantFor(base)){
    try{storage?.setItem('tdr2:'+base+':direction:v1',selected);}catch{}
  }
  return selected;
}
export function selectedCircuitRaceId(base,storage){
  const variant=circuitVariantFor(base);
  if(!variant)return base;
  const normal=readCircuitDirection(storage,base)==='normal';
  return base===TENERIFE_LEGACY_ID
    ?(normal?variant.alternate:base)
    :(normal?base:variant.alternate);
}
export function physicalCircuitId(id){return circuitVariantParent(id)||id;}

// Reverse an already widened/authored CLOSED geometry. The immutable original
// carries existing PB and leaderboard IDs. The new variant gets an isolated ID.
export function makeInvertedClosedTrack(base,id){
  if(!base||base.closed!==true||!Array.isArray(base.raceCenterline)||
    base.raceCenterline.length<4||!Array.isArray(base.checkpoints)||
    base.checkpoints.length<2||!base.finishLine?.normal)
    throw Error('No se puede invertir circuito sin trazado, meta y 2 CP: '+(base?.key||id));
  const raceCenterline=base.raceCenterline.map(p=>({...p})).reverse();
  const finishLine=invertRaceGate(base.finishLine);
  const checkpoints=base.checkpoints.slice().reverse().map(invertRaceGate);
  const start=spawnUpstreamOfFinish(raceCenterline,finishLine,
    base.key==='santa-cruz'?65:Math.max(32,Math.min(100,Number(base.trackWidth)*.6)),
    base.key==='santa-cruz'?{minDistancePx:30}:undefined);
  if(!start||!Number.isFinite(start.r))throw Error('Inverso sin salida orientada: '+id);
  const name=String(base.name||base.key).replace(/\s+INVERSO$/i,'')+' INVERSO';
  return {...base,id,key:id,name,
    raceDirection:base.raceDirection==='reverse'?'forward':'reverse',
    raceCenterline,finishLine,checkpoints,
    finishAnchor:base.finishAnchor?{...base.finishAnchor,
      r:Math.atan2(finishLine.normal.y,finishLine.normal.x)}:null,
    start:{x:start.x,y:start.y,r:start.r},
    grid:null,startLine:null,
    meta:{...base.meta,id,key:id,trackId:id,reverseOf:base.key,
      // The paddock is an alternative crossing of the SAME finish axis.
      // Reverse its timing normal too: leaving it forward breaks inverse laps.
      ...(base.meta?.paddockFinishLine
        ?{paddockFinishLine:invertRaceGate(base.meta.paddockFinishLine)}:{}),
      variant:'inverse',publicName:name}};
}
