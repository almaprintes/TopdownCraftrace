const THRESHOLDS_KM=[25,100,250,500,750,1000,1500,2000,3000];
const SPOKES=[5,8,12,5,8,12,5,8,12];
const MATERIALS=['bronze','bronze','bronze','silver','silver','silver','gold','gold','gold'];
const COLORS={
  bronze:{rim:'#b87333',light:'#e3a15f',dark:'#6f3518'},
  silver:{rim:'#c6cbd0',light:'#f2f5f7',dark:'#6f7880'},
  gold:{rim:'#d8a52f',light:'#ffe082',dark:'#8d6413'}
};
const MATERIAL_LABELS={
  bronze:{es:'BRONCE',en:'BRONZE'},silver:{es:'PLATA',en:'SILVER'},gold:{es:'ORO',en:'GOLD'}
};
const ACK_PREFIX='tdr2:masterySeen:';

export function masteryLevelForMeters(meters){
  const km=Math.max(0,Number(meters)||0)/1000;
  let level=0;
  for(let i=0;i<THRESHOLDS_KM.length;i++)if(km>=THRESHOLDS_KM[i])level=i+1;
  return level;
}

export function masteryVisualSpec(level){
  const lv=Math.max(0,Math.min(9,Number(level)||0));
  if(!lv)return{level:0,spokes:0,material:null,rim:'#252525',light:'#4a4a4a',dark:'#111111'};
  const material=MATERIALS[lv-1],c=COLORS[material];
  return{level:lv,spokes:SPOKES[lv-1],material,...c};
}

export function masteryInfoForMeters(meters){
  const level=masteryLevelForMeters(meters);
  const km=Math.max(0,Number(meters)||0)/1000;
  const next=level<THRESHOLDS_KM.length?THRESHOLDS_KM[level]:null;
  const prev=level>0?THRESHOLDS_KM[level-1]:0;
  const progress=next==null?1:Math.max(0,Math.min(1,(km-prev)/Math.max(.001,next-prev)));
  return{level,km,nextKm:next,prevKm:prev,progress,...masteryVisualSpec(level)};
}

export function masteryMaterialLabel(material,lang='es'){
  return MATERIAL_LABELS[material]?.[lang==='en'?'en':'es']||'';
}

// A single 9-level metal emblem (bronze / silver / gold, 5 / 8 / 12 rays)
// reused by the lobby, Statistics and the unlock celebration. A compact
// dark enamel centre makes the badge legible on both light and dark liveries.
export function masteryWheelSvg(level,{size=128,blackBackground=true}={}){
  const v=masteryVisualSpec(level),lv=v.level;
  const safeSize=Math.max(8,Math.min(512,Number(size)||128));
  const bg=blackBackground
    ?'<circle cx="64" cy="64" r="55" fill="#06141f" opacity=".98"/>'
    :'<circle cx="64" cy="64" r="49" fill="#06141f" opacity=".82"/>';
  const metal=v.rim,highlight=v.light,shadow=v.dark;
  let spokes='';
  for(let i=0;i<v.spokes;i++){
    const a=Math.PI*2*i/v.spokes-Math.PI/2;
    const x1=64+Math.cos(a)*15,y1=64+Math.sin(a)*15;
    const x2=64+Math.cos(a)*36,y2=64+Math.sin(a)*36;
    spokes+=`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${highlight}" stroke-width="${v.spokes>=12?5.4:v.spokes>=8?6.9:8.7}" stroke-linecap="round"/>`;
  }
  let studs='';
  for(let i=0;i<8;i++){
    const a=Math.PI*2*i/8-Math.PI/2;
    studs+=`<circle cx="${(64+Math.cos(a)*44.8).toFixed(2)}" cy="${(64+Math.sin(a)*44.8).toFixed(2)}" r="1.6" fill="${highlight}" opacity=".82"/>`;
  }
  const champion=lv===9?'<circle cx="64" cy="64" r="52" fill="none" stroke="#ffe39b" stroke-width="2" stroke-opacity=".9"/>':'';
  return `<svg viewBox="0 0 128 128" width="${safeSize}" height="${safeSize}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mastery-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${highlight}"/><stop offset="47%" stop-color="${metal}"/><stop offset="100%" stop-color="${shadow}"/></linearGradient><radialGradient id="mastery-enamel"><stop offset="0%" stop-color="#203943"/><stop offset="100%" stop-color="#051016"/></radialGradient></defs>${bg}<circle cx="64" cy="64" r="49" fill="${shadow}" stroke="${highlight}" stroke-width="2" stroke-opacity=".86"/><circle cx="64" cy="64" r="44" fill="url(#mastery-metal)" stroke="${shadow}" stroke-width="2"/><circle cx="64" cy="64" r="39" fill="url(#mastery-enamel)" stroke="${highlight}" stroke-width="1.7" stroke-opacity=".68"/>${lv?spokes:''}${studs}<circle cx="64" cy="64" r="12.8" fill="url(#mastery-metal)" stroke="${highlight}" stroke-width="1.5"/><circle cx="64" cy="64" r="6.8" fill="#07151e" stroke="${shadow}" stroke-width="2"/><circle cx="64" cy="64" r="2.7" fill="${highlight}"/>${champion}</svg>`;
}

export function masteryWheelDataUri(level,opts={}){
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(masteryWheelSvg(level,opts))}`;
}

export function masteryRoofVisible(){
  try{const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');return typeof s?.video?.showMasteryBadge==='boolean'?s.video.showMasteryBadge:true;}catch{return true;}
}
export function acknowledgedMasteryLevel(carId){try{return Math.max(0,Math.min(9,Number(localStorage.getItem(`${ACK_PREFIX}${String(carId||'')}`))||0));}catch{return 0;}}
export function acknowledgeMasteryLevel(carId,level){try{localStorage.setItem(`${ACK_PREFIX}${String(carId||'')}`,String(Math.max(0,Math.min(9,Number(level)||0))));}catch{}}

export const CAR_MASTERY_THRESHOLDS_KM=[...THRESHOLDS_KM];
