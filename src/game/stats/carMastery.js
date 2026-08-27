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

export function masteryWheelSvg(level,{size=128,blackBackground=true}={}){
  const v=masteryVisualSpec(level),lv=v.level;
  const bg=blackBackground?'<circle cx="64" cy="64" r="59" fill="#020202" stroke="#151515" stroke-width="4"/>':'';
  if(!lv)return `<svg viewBox="0 0 128 128" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${bg}<circle cx="64" cy="64" r="47" fill="#050505" stroke="#252525" stroke-width="7"/><circle cx="64" cy="64" r="13" fill="#080808" stroke="#333" stroke-width="6"/></svg>`;
  let spokeMarkup='';
  for(let i=0;i<v.spokes;i++){
    const a=(Math.PI*2*i/v.spokes)-Math.PI/2;
    const x1=64+Math.cos(a)*13.2,y1=64+Math.sin(a)*13.2,x2=64+Math.cos(a)*38.5,y2=64+Math.sin(a)*38.5;
    spokeMarkup+=`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${v.light}" stroke-width="${v.spokes>=12?5.6:v.spokes>=8?7.2:9.2}" stroke-linecap="round"/>`;
  }
  const glow=v.material==='gold'&&lv===9?'<circle cx="64" cy="64" r="53" fill="none" stroke="#ffd65a" stroke-opacity=".58" stroke-width="4"/>':'';
  return `<svg viewBox="0 0 128 128" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${bg}${glow}<circle cx="64" cy="64" r="47" fill="#050505" stroke="${v.rim}" stroke-width="7"/>${spokeMarkup}<circle cx="64" cy="64" r="13" fill="#080808" stroke="${v.rim}" stroke-width="6"/><circle cx="64" cy="64" r="4" fill="${v.light}"/></svg>`;
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
