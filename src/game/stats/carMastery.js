const THRESHOLDS_KM=[25,100,250,500,750,1000,1500,2000,3000];
const SPOKES=[5,8,12,5,8,12,5,8,12];
const MATERIALS=['bronze','bronze','bronze','silver','silver','silver','gold','gold','gold'];
const COLORS={
  bronze:{rim:'#b87333',light:'#e3a15f',dark:'#6f3518'},
  silver:{rim:'#c6cbd0',light:'#f2f5f7',dark:'#6f7880'},
  gold:{rim:'#d8a52f',light:'#ffe082',dark:'#8d6413'}
};

export function masteryLevelForMeters(meters){
  const km=Math.max(0,Number(meters)||0)/1000;
  let level=0;
  for(let i=0;i<THRESHOLDS_KM.length;i++)if(km>=THRESHOLDS_KM[i])level=i+1;
  return level;
}

export function masteryInfoForMeters(meters){
  const level=masteryLevelForMeters(meters);
  const km=Math.max(0,Number(meters)||0)/1000;
  const next=level<THRESHOLDS_KM.length?THRESHOLDS_KM[level]:null;
  const prev=level>0?THRESHOLDS_KM[level-1]:0;
  const progress=next==null?1:Math.max(0,Math.min(1,(km-prev)/Math.max(.001,next-prev)));
  return{level,km,nextKm:next,progress,spokes:level?SPOKES[level-1]:0,material:level?MATERIALS[level-1]:null};
}

export function masteryWheelSvg(level,{size=128,blackBackground=true}={}){
  const lv=Math.max(0,Math.min(9,Number(level)||0));
  const bg=blackBackground?'<circle cx="64" cy="64" r="58" fill="#030303" stroke="#151515" stroke-width="4"/>':'';
  if(!lv)return `<svg viewBox="0 0 128 128" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${bg}<circle cx="64" cy="64" r="46" fill="none" stroke="#252525" stroke-width="7"/><circle cx="64" cy="64" r="9" fill="#111" stroke="#333" stroke-width="4"/></svg>`;
  const spokes=SPOKES[lv-1],material=MATERIALS[lv-1],c=COLORS[material];
  let spokeMarkup='';
  for(let i=0;i<spokes;i++){
    const a=(Math.PI*2*i/spokes)-Math.PI/2;
    const x1=64+Math.cos(a)*13,y1=64+Math.sin(a)*13,x2=64+Math.cos(a)*43,y2=64+Math.sin(a)*43;
    spokeMarkup+=`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="url(#metal)" stroke-width="${spokes===12?5:spokes===8?7:9}" stroke-linecap="round"/>`;
  }
  const glow=material==='gold'&&lv===9?'<circle cx="64" cy="64" r="52" fill="none" stroke="#ffd65a" stroke-opacity=".45" stroke-width="4"/>':'';
  return `<svg viewBox="0 0 128 128" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset=".48" stop-color="${c.rim}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient></defs>${bg}${glow}<circle cx="64" cy="64" r="47" fill="#050505" stroke="url(#metal)" stroke-width="7"/>${spokeMarkup}<circle cx="64" cy="64" r="13" fill="#080808" stroke="url(#metal)" stroke-width="6"/><circle cx="64" cy="64" r="4" fill="${c.light}"/></svg>`;
}

export function masteryWheelDataUri(level,opts={}){
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(masteryWheelSvg(level,opts))}`;
}

export const CAR_MASTERY_THRESHOLDS_KM=[...THRESHOLDS_KM];
