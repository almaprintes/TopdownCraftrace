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

// Nine-level championship CREST: bronze / silver / gold finish, with
// 5 / 8 / 12 engraved laureate rays and 1 / 2 / 3 merit chevrons per
// material. The old circular spokes/centre hub resembled an alloy wheel;
// this angular shield is meant to cover most of the car roof.
export function masteryWheelSvg(level,{size=128,blackBackground=true}={}){
  const v=masteryVisualSpec(level),lv=v.level;
  const safeSize=Math.max(8,Math.min(512,Number(size)||128));
  const metal=v.rim,highlight=v.light,shadow=v.dark;
  const shield='M64 6 L112 25 L108 72 C103 91 82 109 64 119 C46 109 25 91 20 72 L16 25 Z';
  const inset='M64 16 L103 32 L99 70 Q95 86 64 107 Q33 86 29 70 L25 32 Z';
  const enamel='M64 26 L94 38 L91 68 Q87 82 64 97 Q41 82 37 68 L34 38 Z';
  // Above the central star, honor rays form a crown rather than a tyre hub.
  let rays='';
  for(let i=0;i<v.spokes;i++){
    const a=Math.PI*(1.13+(.74*i/Math.max(1,v.spokes-1)));
    const x1=64+Math.cos(a)*31,y1=64+Math.sin(a)*31;
    const x2=64+Math.cos(a)*39,y2=64+Math.sin(a)*39;
    rays+=`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${highlight}" stroke-width="2.1" stroke-linecap="round" opacity=".86"/>`;
  }
  const starPoints=[];
  for(let i=0;i<10;i++){
    const a=-Math.PI/2+(Math.PI*i/5);
    const r=i%2?10:24;
    starPoints.push(`${(64+Math.cos(a)*r).toFixed(2)},${(61+Math.sin(a)*r).toFixed(2)}`);
  }
  const rank=lv?((lv-1)%3+1):0;
  let bars='';
  for(let i=0;i<rank;i++){
    const y=91+i*5;
    bars+=`<path d="M54 ${y} L64 ${y+3} L74 ${y}" fill="none" stroke="${highlight}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const backing=blackBackground
    ?'<path d="M64 1 L119 23 L115 76 Q108 101 64 125 Q20 101 13 76 L9 23 Z" fill="#04131b" opacity=".94"/>'
    :'';
  const champion=lv===9
    ?'<path d="M64 3 L115 24 L112 73 Q104 96 64 123 Q24 96 16 73 L13 24 Z" fill="none" stroke="#ffe69c" stroke-width="2" opacity=".93"/>'
    :'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 128 128"><defs><linearGradient id="mastery-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${highlight}"/><stop offset="51%" stop-color="${metal}"/><stop offset="100%" stop-color="${shadow}"/></linearGradient><radialGradient id="mastery-enamel"><stop offset="0%" stop-color="#203943"/><stop offset="100%" stop-color="#051016"/></radialGradient></defs>${backing}<path d="${shield}" fill="${shadow}" stroke="${highlight}" stroke-width="2.4"/><path d="${inset}" fill="url(#mastery-metal)" stroke="${shadow}" stroke-width="2"/><path d="${enamel}" fill="url(#mastery-enamel)" stroke="${highlight}" stroke-width="1.2" stroke-opacity=".66"/>${lv?rays:''}<polygon points="${starPoints.join(' ')}" fill="url(#mastery-metal)" stroke="${highlight}" stroke-width="2" stroke-linejoin="round"/><path d="M64 46 L68 57 L79 57" fill="none" stroke="#fff" stroke-width="1.3" stroke-opacity=".35"/>${bars}<path d="M27 32 L32 70 Q38 86 52 96" fill="none" stroke="${highlight}" stroke-width="1.1" opacity=".4"/>${champion}</svg>`;
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
