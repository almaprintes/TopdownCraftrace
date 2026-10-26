// Race Control — light, bounded rival matchmaking UI.
// Only requested candidates are fetched; NOT the whole leaderboard or ghosts.
import {getRaceControlNearbyGhostRivals} from '../online/raceControlOnline.js';

const cache=new Map(),TTL_MS=90000;
const limits=Object.freeze([{name:'0,3 s',ms:300},{name:'1 s',ms:1000},
  {name:'3 s',ms:3000},{name:'10 s',ms:10000}]);
const duration=ms=>{const n=Number(ms)||0;return Math.floor(n/60000)+':'+((n%60000)/1000).toFixed(3).padStart(6,'0');};
const seconds=ms=>(Number(ms)/1000).toFixed(3)+' s';
const carNameSafe=carId=>String(carId||'COCHE').replaceAll('_',' ').slice(0,42);
const boundedId=key=>String(key||'').slice(0,80);

function fetchRivals(trackId,bestMs,maxMs){
  const key=[trackId,bestMs,maxMs].join('|'),now=Date.now();
  const current=cache.get(key);
  if(current&&now-current.at<TTL_MS)return current.promise;
  const promise=getRaceControlNearbyGhostRivals({trackId,referenceMs:bestMs,
    minGapMs:1,maxGapMs:maxMs,limit:8});
  cache.set(key,{at:now,promise});
  promise.catch(()=>{if(cache.get(key)?.promise===promise)cache.delete(key);});
  if(cache.size>90)cache.clear();
  return promise;
}
export function nearbyRivalRanges(){return limits.map(x=>({...x}));}

// Same panel on every Race Control track, normal/inverse have distinct IDs.
export function installNearbyRivalsPanel(scene,{trackId,bestLapMs,onChallenge,onReplay}){
  const hero=scene?._root?.querySelector('.br-main .br-hero');
  const id=boundedId(trackId),best=Math.round(Number(bestLapMs)||0);
  if(!hero||!id)return null;
  const panel=document.createElement('section');
  panel.className='br-panel br-nearby';
  panel.dataset.brNearbyTrack=id;
  panel.innerHTML=`<header class="br-nearby-head">
    <div class="br-nearby-icon" aria-hidden="true">◎</div>
    <div class="br-nearby-title"><small>EMPAREJAMIENTO POR TIEMPO</small>
    <strong>RIVALES A TU NIVEL</strong><span>Persigue a un piloto solo unas décimas más rápido</span></div>
    <div class="br-nearby-filters" role="group" aria-label="Ventaja máxima del rival"></div>
  </header><div class="br-nearby-results" aria-live="polite"></div>`;
  hero.after(panel);
  const filters=panel.querySelector('.br-nearby-filters'),
    results=panel.querySelector('.br-nearby-results');
  const message=str=>{results.textContent='';const p=document.createElement('p');
    p.className='br-nearby-message';p.textContent=str;results.appendChild(p);};
  const isActive=()=>panel.isConnected&&scene._raceControlRenderedTrack===id;
  let seq=0,chosen=1000;
  function display(rows){
    results.textContent='';
    const list=Array.isArray(rows)?rows:[];
    if(!list.length){message('No hay un fantasma de otro piloto en este intervalo. Amplía la diferencia.');return;}
    for(const item of list){
      const row=document.createElement('div');row.className='br-nearby-rival';
      const car=document.createElement('div');car.className='br-nearby-car';
      car.textContent='🏎';car.setAttribute('aria-hidden','true');
      const info=document.createElement('div');info.className='br-nearby-pilot';
      const name=document.createElement('strong');name.textContent=String(item.nick||'PILOTO').slice(0,32);
      const carLabel=document.createElement('small');
      carLabel.textContent='#'+String(item.rank||'—')+' · '+carNameSafe(item.car_id);
      info.append(name,carLabel);
      const time=document.createElement('div');time.className='br-nearby-time';
      const timeValue=document.createElement('strong');timeValue.textContent=duration(item.best_time_ms);
      const delta=document.createElement('small');delta.textContent='−'+seconds(item.delta_ms);
      time.append(timeValue,delta);
      const buttons=document.createElement('div');buttons.className='br-nearby-actions';
      const replay=document.createElement('button');replay.type='button';replay.className='br-nearby-replay';
      replay.textContent='▶ REPLAY';replay.title='Ver esta repetición exacta';
      const vs=document.createElement('button');vs.type='button';vs.className='br-nearby-vs';
      vs.textContent='👻 VS';vs.title='Competir contra este fantasma';
      const act=async(handler,button)=>{
        if(!isActive()||button.disabled)return;
        replay.disabled=true;vs.disabled=true;
        const original=button.textContent;button.textContent='…';
        try{await handler(item);}
        catch(error){
          console.error('[race-control] rival action failed',error);
          if(isActive())message('No se pudo abrir este fantasma: '+String(error?.message||error));
        }finally{
          if(isActive()){button.textContent=original;replay.disabled=false;vs.disabled=false;}
        }
      };
      replay.addEventListener('click',()=>void act(onReplay,replay));
      vs.addEventListener('click',()=>void act(onChallenge,vs));
      buttons.append(replay,vs);row.append(car,info,time,buttons);results.appendChild(row);
    }
  }
  async function load(maxMs){
    const request=++seq;chosen=maxMs;
    for(const b of filters.querySelectorAll('button'))b.classList.toggle('active',Number(b.dataset.range)===maxMs);
    if(!(best>1000)){message('Completa una vuelta válida para encontrar rivales de tu nivel.');return;}
    message('Buscando pilotos con fantasma cercano a tu tiempo…');
    try{
      const rows=await fetchRivals(id,best,maxMs);
      if(isActive()&&request===seq)display(rows);
    }catch(err){
      if(isActive()&&request===seq){
        console.warn('[race-control] nearby rivals unavailable',err);
        message('Conecta tu perfil online para buscar rivales. '+String(err?.message||err).slice(0,120));
      }
    }
  }
  for(const range of limits){
    const b=document.createElement('button');b.type='button';b.dataset.range=String(range.ms);
    b.textContent='≤ '+range.name;b.addEventListener('click',()=>void load(range.ms));
    filters.appendChild(b);
  }
  void load(chosen);
  return panel;
}
