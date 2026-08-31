import './raceInstrumentHud.css';

const BASE=import.meta.env.BASE_URL||'/';
const CAR_BRANDS={helix:'HÉLIX',crown:'CROWN',avenir:'AVENIR',forge:'FORGE',veloce:'VELOCE'};

function fmtLap(ms){
  if(!Number.isFinite(Number(ms)))return '--:--.--';
  const t=Math.max(0,Number(ms));
  const m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

function readRacePosition(scene){
  const systems=[scene.standingsSystem,scene.standings,scene._standings].filter(Boolean);
  const ids=[scene.playerStandingsId,'player','you','user',scene.carId].filter(Boolean).map(String);
  for(const sys of systems){
    if(typeof sys?.getPosition!=='function')continue;
    for(const id of ids){
      try{
        const pos=Number(sys.getPosition(id));
        if(Number.isFinite(pos)&&pos>0){
          const total=typeof sys.getCarCount==='function'?Number(sys.getCarCount()||0):0;
          return {pos,total};
        }
      }catch{}
    }
  }
  return null;
}

function carBadge(scene){
  const id=String(scene?.carId||scene?.selectedCarId||'').toLowerCase();
  const parts=id.split('_');
  const brand=parts.shift();
  if(!CAR_BRANDS[brand])return'';
  const model=parts.join(' ').toUpperCase();
  return `<div class="tdr-race-car-id"><img class="tdr-race-car-logo" src="${BASE}assets/logos/logo_${brand}_negativo.webp" alt=""><span class="tdr-race-car-model">${model}</span></div>`;
}

export function destroyRaceInstrumentHud(scene){
  try{scene?._raceHudDom?.remove?.();}catch{}
  if(scene){scene._raceHudDom=null;scene._raceHudRefs=null;}
}

export function mountRaceInstrumentHud(scene){
  if(typeof document==='undefined'||!scene)return null;
  destroyRaceInstrumentHud(scene);
  const canvas=scene.game?.canvas;
  const host=canvas?.parentElement||document.getElementById('app')||document.body;
  if(!host)return null;
  try{if(getComputedStyle(host).position==='static')host.style.position='relative';}catch{}

  const root=document.createElement('div');
  root.className='tdr-race-hud';
  root.dataset.tdrRaceUi='1';
  root.innerHTML=`
    <div class="tdr-race-hud-top">
      <div class="tdr-race-lap"><small>VUELTA</small><b data-lap>1</b></div>
      <div class="tdr-race-sector"><div class="tdr-race-sector-label">SECTOR <b data-sector>1/3</b></div><div class="tdr-race-sector-bars"><i></i><i></i><i></i></div></div>
      <div class="tdr-race-times"><div class="tdr-race-time"><span>LAST</span><b data-last>--:--.--</b></div><div class="tdr-race-time"><span>BEST</span><b data-best>--:--.--</b></div><div class="tdr-race-time tdr-race-delta"><span>DELTA</span><b data-delta>--</b></div></div>
    </div>
    <div class="tdr-race-hud-bottom">
      <div class="tdr-race-speedbar">${Array.from({length:18},(_,i)=>`<i class="${i>=15?'red':i>=12?'hot':''}"></i>`).join('')}</div>
      ${carBadge(scene)}
      <div class="tdr-race-speed-wrap"><b class="tdr-race-speed" data-speed>000</b><span class="tdr-race-unit">KM/H</span></div>
      <div class="tdr-race-clock"><small>TIEMPO</small><b data-clock>0:00.00</b></div><div class="tdr-race-pos" data-pos></div>
    </div>`;
  host.appendChild(root);
  scene._raceHudDom=root;
  scene._raceHudRefs={
    lap:root.querySelector('[data-lap]'),sector:root.querySelector('[data-sector]'),last:root.querySelector('[data-last]'),best:root.querySelector('[data-best]'),
    delta:root.querySelector('[data-delta]'),speed:root.querySelector('[data-speed]'),clock:root.querySelector('[data-clock]'),pos:root.querySelector('[data-pos]'),
    sectorBars:Array.from(root.querySelectorAll('.tdr-race-sector-bars i')),speedBars:Array.from(root.querySelectorAll('.tdr-race-speedbar i'))
  };
  scene._raceHudAccum=100;
  return root;
}

export function updateRaceInstrumentHud(scene,delta=0){
  const root=scene?._raceHudDom,refs=scene?._raceHudRefs;
  if(!root?.isConnected||!refs)return;
  scene._raceHudAccum=(Number(scene._raceHudAccum)||0)+Math.max(0,Number(delta)||0);
  if(scene._raceHudAccum<80)return;
  scene._raceHudAccum=0;

  const now=performance.now();
  const body=scene.carBody?.body;
  const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
  const kmh=Math.max(0,Math.hypot(vx,vy)*0.185);
  const started=!!scene.timing?.started&&scene.timing?.lapStart!=null;
  const elapsed=started?Math.max(0,now-Number(scene.timing.lapStart)):0;
  const lap=Math.max(1,Number(scene.lapCount||0)+1);
  const cp=Math.max(0,Math.min(2,Number(scene._cpState||0)));
  const sector=cp+1;
  const pos=readRacePosition(scene);
  const hist=Array.isArray(scene.ttHistory)?scene.ttHistory:[];
  const histLast=hist.length?Number(hist[hist.length-1]?.lapMs):NaN;
  const lastMs=Number.isFinite(Number(scene.timing?.lastLap))?Number(scene.timing.lastLap):histLast;
  const bestMs=Number(scene.ttBest?.lapMs);

  let deltaMs=NaN;
  if(cp>=2&&Number.isFinite(Number(scene.timing?.s2))&&Number.isFinite(Number(scene.ttBest?.s2)))deltaMs=Number(scene.timing.s2)-Number(scene.ttBest.s2);
  else if(cp>=1&&Number.isFinite(Number(scene.timing?.s1))&&Number.isFinite(Number(scene.ttBest?.s1)))deltaMs=Number(scene.timing.s1)-Number(scene.ttBest.s1);
  const deltaTxt=Number.isFinite(deltaMs)?`${deltaMs>=0?'+':'−'}${(Math.abs(deltaMs)/1000).toFixed(2)}`:'--';

  refs.lap.textContent=String(lap);
  refs.sector.textContent=`${sector}/3`;
  refs.last.textContent=fmtLap(lastMs);
  refs.best.textContent=fmtLap(bestMs);
  refs.delta.textContent=deltaTxt;
  refs.delta.parentElement?.classList.toggle('good',Number.isFinite(deltaMs)&&deltaMs<0);
  refs.delta.parentElement?.classList.toggle('bad',Number.isFinite(deltaMs)&&deltaMs>0);
  refs.speed.textContent=String(Math.round(kmh)).padStart(3,'0');
  refs.clock.textContent=fmtLap(elapsed);
  refs.pos.innerHTML=pos&&pos.total>1?`POS <b>${pos.pos}/${pos.total}</b>`:'';
  for(let i=0;i<refs.sectorBars.length;i++)refs.sectorBars[i].classList.toggle('on',i<sector);
  const fill=Math.max(0,Math.min(18,Math.round(kmh/200*18)));
  for(let i=0;i<refs.speedBars.length;i++)refs.speedBars[i].classList.toggle('on',i<fill);
}
