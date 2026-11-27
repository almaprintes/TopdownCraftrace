// Reuse the physical LIVE4 bot director, never the network race bridge.
import '../ui/craftraceLiveV2Lobby.css';
import {CrafRaceLive4BotDirector} from '../online/craftraceLiveV2BotDirector.js';
import {live4SeatName} from '../online/craftraceLiveV2PilotNames.js';
import {isLive4GuidedGSupported} from '../online/craftraceLive4GuidedGExperiment.js';
import {offlineFourRoster,rankOfflineFour} from './offlineFourRace.js';
const fmt=ms=>ms==null?'—':(ms/1000).toFixed(3)+' s';
export function attachOfflineFourRace(scene,config){
  const roster=offlineFourRoster(config.difficulty,config.humanSeat),hostId='local-player';
  const seed=config.seed;
  const guided=isLive4GuidedGSupported({trackId:config.trackKey,dev:true,aiDifficulty:config.difficulty});
  const name=entry=>entry.kind==='human'?'TÚ':live4SeatName(entry,[],seed);
  const director=new CrafRaceLive4BotDirector(scene,{roster,hostId,localId:hostId,
    startingGrid:scene._crafRaceLiveV2Grid,laps:config.laps,
    live4GuidedGTrial:guided,aiIdentitySeed:seed});
  const results=document.createElement('section');
  results.className='cr4-result-shell';
  results.style.display='none';
  results.setAttribute('role','dialog');
  results.setAttribute('aria-label','Resultados carrera IA');
  document.body.append(results);
  let stopped=false,started=false,clock=1,startClock=1,lapTimes=[],playerFinish=null,lastSnapshot='';
  const show=()=>{
    const bots=director.results();
    const rows=rankOfflineFour(roster.map(entry=>{
      const result=entry.kind==='human'?playerFinish:bots.find(b=>b.seat===entry.seat);
      return {seat:entry.seat,name:result?.aiPilotName||name(entry),elapsedMs:result?.elapsedMs??null,lapTimes:result?.lapTimes||[]};
    }));
    const snapshot=JSON.stringify(rows);
    if(snapshot===lastSnapshot)return;
    lastSnapshot=snapshot;
    const allFinished=rows.every(x=>x.elapsedMs!==null);
    results.style.display='flex';
    results.classList.toggle('cr4-results-waiting',!allFinished);
    results.replaceChildren();
    const panel=document.createElement('div');panel.className='cr4-result-panel';
    const title=document.createElement('h2');title.textContent='CARRERA IA · RESULTADOS';panel.append(title);
    const status=document.createElement('p');status.textContent=allFinished?'CLASIFICACIÓN FINAL · LOCAL':'ESPERANDO A LOS RIVALES…';panel.append(status);
    const list=document.createElement('ol');list.className='cr4-result-list';
    for(const row of rows){const li=document.createElement('li'),n=document.createElement('strong'),v=document.createElement('span');
      n.textContent=row.name;v.textContent=fmt(row.elapsedMs);li.append(n,v);list.append(li);}
    panel.append(list);
    const table=document.createElement('table');table.className='cr4-laps';
    const header=table.insertRow();for(const label of ['PILOTO',...Array.from({length:config.laps},(_,i)=>'V'+(i+1))]){const cell=document.createElement('th');cell.textContent=label;header.append(cell);}
    for(const row of rows){const tr=table.insertRow();tr.insertCell().textContent=row.name;
      for(let i=0;i<config.laps;i++)tr.insertCell().textContent=fmt(row.lapTimes[i]);}
    panel.append(table);
    if(allFinished){const repeat=document.createElement('button');repeat.type='button';repeat.textContent='REVANCHA · MISMA PARRILLA';
      repeat.onclick=()=>scene.scene.restart({gameMode:'offline-ai',offlineFourRace:config,trackKey:config.trackKey,carId:config.carId});panel.append(repeat);}
    const back=document.createElement('button');back.type='button';back.textContent='VOLVER AL MENÚ';back.onclick=()=>scene.scene.start('menu');panel.append(back);
    results.append(panel);
  };
  const update=(_now,deltaMs)=>{
    if(stopped)return;
    // Use the same local active-frame clock for both human and AI. Ignore long app suspension gaps.
    if(scene._raceStarted||playerFinish)clock+=Math.max(0,Math.min(250,Number(deltaMs)||0));
    if(scene._raceStarted&&!started){started=true;startClock=clock;}
    if(started&&!playerFinish&&scene._raceStarted){
      const done=Math.floor(Number(scene.lapCount)||0);
      if(done===lapTimes.length+1&&done<=config.laps){
        const total=Math.round(clock-startClock),previous=lapTimes.reduce((a,b)=>a+b,0);
        if(total>previous)lapTimes.push(total-previous);
      }
      if(lapTimes.length===config.laps){
        playerFinish={lapTimes:[...lapTimes],elapsedMs:lapTimes.reduce((a,b)=>a+b,0)};
        scene._raceStarted=false;scene.carBody?.body?.setVelocity?.(0,0);scene.carBody?.body?.setAngularVelocity?.(0);
      }
    }
    director.update(deltaMs,clock,started);
    if(playerFinish)show();
  };
  const stop=()=>{if(stopped)return;stopped=true;director.destroy();results.remove();};
  scene.events.once('shutdown',stop);
  return {update,stop,ready:true};
}
