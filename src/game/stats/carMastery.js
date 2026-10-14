const THRESHOLDS_KM=[25,100,250,500,750,1000,1500,2000,3000];
const SPOKES=[5,8,12,5,8,12,5,8,12];
const MATERIALS=['bronze','bronze','bronze','silver','silver','silver','gold','gold','gold'];
const COLORS={
  bronze:{rim:'#b87333',light:'#e3a15f',dark:'#6f3518'},
  silver:{rim:'#c6cbd0',light:'#f2f5f7',dark:'#6f7880'},
  gold:{rim:'#d8a52f',light:'#ffe082',dark:'#8d6413'}
};
// Bright stars against almost-black enamel: shield metal remains unchanged.
const STAR_FINISH={
  bronze:{starHighlight:'#ffedcd',starLight:'#ffc985',starShadow:'#d98942'},
  silver:{starHighlight:'#ffffff',starLight:'#edf7ff',starShadow:'#9eafc2'},
  gold:{starHighlight:'#fff8c7',starLight:'#ffe77e',starShadow:'#e5b53a'}
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
  return{level:lv,spokes:SPOKES[lv-1],material,...c,...STAR_FINISH[material]};
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
// 5 / 8 / 12 engraved laureate rays, 1 / 2 / 3 large central stars and
// progressively richer side trims per material. No circular wheel hubs.
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
  // The stars have a brighter metal gradient and a dark separation outline.
  // Smaller graded stars remain inside the near-black enamel field.
  const rank=lv?((lv-1)%3+1):0;
  const stars=rank===1?[{x:64,y:60,r:24}]:
    rank===2?[{x:50,y:61,r:15},{x:78,y:61,r:15}]:
    rank===3?[{x:64,y:47,r:13},{x:51,y:73,r:12},{x:77,y:73,r:12}]:[];
  const starsMarkup=stars.map((star,index)=>{
    const pts=[];
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+(Math.PI*i/5);
      const r=i%2?star.r*.42:star.r;
      pts.push(`${(star.x+Math.cos(a)*r).toFixed(2)},${(star.y+Math.sin(a)*r).toFixed(2)}`);
    }
    return `<polygon data-mastery-star="${index+1}" points="${pts.join(' ')}" fill="url(#mastery-star)" stroke="#020a11" stroke-width="5" paint-order="stroke fill" stroke-linejoin="round"/><polygon points="${pts.join(' ')}" fill="none" stroke="${v.starHighlight}" stroke-width=".65" stroke-opacity=".75" stroke-linejoin="round"/>`;
  }).join('');
  // The side chevrons / championship crown reinforce each star grade
  // without changing the bronze / silver / gold family colours.
  const gradeTrim=rank===2
    ?`<path d="M31 47 L39 54 L39 68 L30 62 Z M97 47 L89 54 L89 68 L98 62 Z" fill="${metal}" stroke="${highlight}" stroke-width="1.5" opacity=".95"/>`
    :rank===3
      ?`<path d="M42 35 L45 23 L56 30 L64 18 L72 30 L83 23 L86 35 Z" fill="${metal}" stroke="${highlight}" stroke-width="1.7"/><path d="M29 48 L37 52 L37 70 L29 65 Z M99 48 L91 52 L91 70 L99 65 Z" fill="${metal}" stroke="${highlight}" stroke-width="1.5"/>`
      :'';
  const gradeBorder=rank===3
    ?`<path d="M64 11 L108 29 L104 70 Q98 89 64 112 Q30 89 24 70 L20 29 Z" fill="none" stroke="${highlight}" stroke-width="2" opacity=".9"/>`
    :'';
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${safeSize}" height="${safeSize}" viewBox="0 0 128 128"><defs><linearGradient id="mastery-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${highlight}"/><stop offset="51%" stop-color="${metal}"/><stop offset="100%" stop-color="${shadow}"/></linearGradient><radialGradient id="mastery-enamel"><stop offset="0%" stop-color="#0d2330"/><stop offset="100%" stop-color="#02070d"/></radialGradient><linearGradient id="mastery-star" x1="0%" y1="0%" x2="80%" y2="100%"><stop offset="0%" stop-color="${v.starHighlight}"/><stop offset="47%" stop-color="${v.starLight}"/><stop offset="100%" stop-color="${v.starShadow}"/></linearGradient></defs>${backing}<path d="${shield}" fill="${shadow}" stroke="${highlight}" stroke-width="2.4"/><path d="${inset}" fill="url(#mastery-metal)" stroke="${shadow}" stroke-width="2"/><path d="${enamel}" fill="url(#mastery-enamel)" stroke="${shadow}" stroke-width="1.7" stroke-opacity=".92"/>${lv?rays:''}${gradeTrim}${starsMarkup}${gradeBorder}${bars}<path d="M27 32 L32 70 Q38 86 52 96" fill="none" stroke="${highlight}" stroke-width="1.1" opacity=".4"/>${champion}</svg>`;
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
