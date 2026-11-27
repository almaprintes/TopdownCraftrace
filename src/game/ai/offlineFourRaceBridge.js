// Reuse the physical LIVE4 bot director, never the network race bridge.
import '../ui/craftraceLiveV2Lobby.css';
import './offlineFourRace.css';
import {dressResultPanel,resultHero,resultPortrait} from '../ui/raceResultsPresentation.js';
import {makeOfflineStandingsRoute,offlineRouteProgress,rankOfflineLive,offlineCommonLapGap,offlineFastestLap} from './offlineFourStandings.js';
import {getLanguage} from '../i18n/index.js';
import {CrafRaceLive4BotDirector} from '../online/craftraceLiveV2BotDirector.js';
import {live4SeatName} from '../online/craftraceLiveV2PilotNames.js';
import {isLive4GuidedGSupported} from '../online/craftraceLive4GuidedGExperiment.js';
import {offlineFourRoster,rankOfflineFour,offlineFullPilotIds,offlineHudEntries} from './offlineFourRace.js';
const fmt=ms=>ms==null?'—':(ms/1000).toFixed(3)+' s';
const gapFmt=ms=>ms==null?'—':(ms>=0?'+':'−')+(Math.abs(ms)/1000).toFixed(3)+' s';
export function attachOfflineFourRace(scene,config){
  const roster=offlineFourRoster(config.difficulty,config.humanSeat,config.capacity),hostId='local-player';
  const seed=config.seed;
  const en=getLanguage()==='en',tr=(es,eng)=>en?eng:es;
  const guided=isLive4GuidedGSupported({trackId:config.trackKey,dev:true,aiDifficulty:config.difficulty});
  const full=config.capacity===17,aiPilotIds=full?offlineFullPilotIds(roster,seed):null;
  const name=entry=>entry.kind==='human'?tr('TÚ','YOU'):live4SeatName(entry,[],seed,aiPilotIds);
  const director=new CrafRaceLive4BotDirector(scene,{roster,hostId,localId:hostId,
    startingGrid:scene._crafRaceLiveV2Grid,laps:config.laps,
    live4GuidedGTrial:guided,aiIdentitySeed:seed,aiPilotIds});
  const centerline=scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline;
  const route=makeOfflineStandingsRoute(centerline,director.lapGates);
  const element=(tag,cls,copy)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(copy!=null)node.textContent=copy;return node;};
  const hud=element('aside','tdr-offline-hud');hud.style.display='none';hud.dataset.tdrRaceUi='1';
  const hudHead=element('div','tdr-offline-hud-head'),position=element('b','','—/'+config.capacity),lap=element('small');
  hudHead.append(position,lap);hud.append(hudHead);
  const hudRows=roster.slice(0,4).map(()=>{const row=element('div','tdr-offline-hud-row');const cells=[element('span'),element('span'),element('span')];row.append(...cells);hud.append(row);return {row,cells};});
  const foot=element('div','tdr-offline-hud-foot',tr('Δ en última vuelta común','Δ at last common lap'));hud.append(foot);const perf=full?element('div','tdr-offline-hud-foot','17 · EXP'):null;if(perf)hud.append(perf);document.body.append(hud);
  const labels=director.bots.map(bot=>({bot,label:scene.add.text(0,0,name(roster.find(r=>r.seat===bot.seat)),{
    fontFamily:'system-ui,sans-serif',fontSize:'11px',fontStyle:'bold',color:'#ffffff',stroke:'#07111d',strokeThickness:3
  }).setOrigin(.5,1).setDepth(75).setVisible(false)}));
  const results=document.createElement('section');
  results.className='cr4-result-shell tdr-offline-results';
  results.style.display='none';
  results.setAttribute('role','dialog');
  results.setAttribute('aria-label','Resultados carrera IA');
  document.body.append(results);
  let stopped=false,started=false,clock=1,startClock=1,lapTimes=[],playerFinish=null,lastSnapshot='',lastHudAt=-Infinity,frameSum=0,frameCount=0;
  const liveRows=()=>rankOfflineLive(roster.map(entry=>{
    const human=entry.kind==='human',bot=human?null:director.bots.find(b=>b.seat===entry.seat);
    const body=human?scene.carBody:bot?.plannerBody;
    const times=human?lapTimes:(bot?.lapTimes||[]);
    const elapsedMs=human?playerFinish?.elapsedMs:bot?.finished?times.reduce((a,b)=>a+b,0):null;
    return {seat:entry.seat,name:name(entry),human,elapsedMs,lapTimes:times,
      progress:offlineRouteProgress(route,{x:body?.x,y:body?.y,laps:times.length,phase:human?scene._cpState:bot?.gatePhase})};
  }));
  const renderHud=()=>{
    if(playerFinish){hud.style.display='none';return;}
    if(!started||clock-lastHudAt<250)return;
    lastHudAt=clock;
    const rows=liveRows(),leader=rows[0],index=rows.findIndex(r=>r.human);
    position.textContent=(index+1)+'º / '+config.capacity;
    if(perf){perf.textContent='EXP · '+(frameSum>0?Math.round(1000*frameCount/frameSum):'—')+' FPS';frameSum=0;frameCount=0;}
    lap.textContent=tr('VUELTA ','LAP ')+Math.min(config.laps,lapTimes.length+1)+'/'+config.laps;
    const visible=offlineHudEntries(rows,config.capacity);
    hudRows.forEach(({row:node,cells},i)=>{
      const entry=visible[i];node.style.display=entry?'':'none';if(!entry)return;
      const {row,rank}=entry,g=offlineCommonLapGap(row,leader);
      node.dataset.human=row.human?'1':'0';cells[0].textContent=String(rank);cells[1].textContent=row.name;
      cells[2].textContent=rank===1?'—':g?gapFmt(g.ms):'—';
    });
    // Never force visibility while the pause overlay owns the controls.
    if(!scene._pauseModal?.isConnected)hud.style.display='';
    else hud.style.display='none';
  };
  const paintLabels=()=>{
    const zoom=Math.max(.1,Number(scene.cameras?.main?.zoom)||1);
    for(const {bot,label} of labels){
      const body=bot.plannerBody;
      label.setVisible(!playerFinish&&!bot.finished&&bot.visual?.visible!==false);
      label.setPosition(body.x,body.y-24/zoom).setScale(1/zoom);
    }
  };
  const show=()=>{
    const bots=director.results();
    const rows=rankOfflineFour(roster.map(entry=>{
      const result=entry.kind==='human'?playerFinish:bots.find(b=>b.seat===entry.seat);
      return {seat:entry.seat,name:result?.aiPilotName||name(entry),human:entry.kind==='human',aiId:director.bots.find(b=>b.seat===entry.seat)?.aiPilot?.id,elapsedMs:result?.elapsedMs??null,lapTimes:result?.lapTimes||[]};
    }));
    const snapshot=JSON.stringify(rows);
    if(snapshot===lastSnapshot)return;
    lastSnapshot=snapshot;
    const allFinished=rows.every(x=>x.elapsedMs!==null);
    results.style.display='flex';
    results.classList.toggle('cr4-results-waiting',!allFinished);
    results.replaceChildren();
    const panel=document.createElement('div');panel.className='cr4-result-panel';dressResultPanel(panel);
    const body=element('div','tdr-result-body');panel.append(body);
    const title=element('h2','',config.capacity===2?tr('DUELO IA · RESULTADOS','AI DUEL · RESULTS'):full?tr('PLANTILLA COMPLETA · RESULTADOS','FULL GRID · RESULTS'):tr('CARRERA IA · RESULTADOS','AI RACE · RESULTS'));body.append(title);
    const status=element('p','',allFinished?tr('CLASIFICACIÓN FINAL · LOCAL','FINAL CLASSIFICATION · LOCAL'):tr('ESPERANDO A LOS RIVALES…','WAITING FOR RIVALS…'));body.append(status);
    if(allFinished){
      body.append(resultHero(rows.map(r=>({...r,time:fmt(r.elapsedMs)}))));
    }
    const list=element('ol','cr4-result-list');
    for(const [i,row] of rows.entries()){
      const li=element('li');li.dataset.human=row.seat===config.humanSeat?'1':'0';
      const driver=element('div','tdr-result-name-with-avatar');driver.append(resultPortrait(row),element('strong','',row.name));
      li.append(element('b','',row.elapsedMs==null?'—':String(i+1)+'º'),driver,element('span','',fmt(row.elapsedMs)));
      if(allFinished)li.append(element('span','tdr-offline-gap',i===0?tr('GANADOR','WINNER'):gapFmt(row.elapsedMs-rows[0].elapsedMs)));
      list.append(li);
    }
    body.append(list);
    if(allFinished){
      const fastest=offlineFastestLap(rows);
      if(fastest){const driver=rows.find(r=>r.seat===fastest.seat);body.append(element('div','tdr-offline-fastest',tr('VUELTA RÁPIDA · ','FASTEST LAP · ')+driver.name+' · V'+fastest.lap+' · '+fmt(fastest.ms)));}
      const scroll=element('div','tdr-offline-laps-scroll'),table=element('table','cr4-laps');
      const header=table.insertRow();for(const label of [tr('PILOTO','DRIVER'),...Array.from({length:config.laps},(_,i)=>'V'+(i+1))])header.append(element('th','',label));
      for(const row of rows){const line=table.insertRow();line.insertCell().textContent=row.name;
        for(let i=0;i<config.laps;i++){const cell=line.insertCell();cell.textContent=fmt(row.lapTimes[i]);if(fastest?.seat===row.seat&&fastest.lap===i+1)cell.dataset.fastest='1';}
      }
      scroll.append(table);body.append(scroll);
    }
    const actions=element('div','tdr-offline-actions');
    if(allFinished){const repeat=element('button','',tr('REVANCHA · MISMA PARRILLA','REMATCH · SAME GRID'));repeat.type='button';
      repeat.onclick=()=>scene.scene.restart({gameMode:'offline-ai',offlineFourRace:config,trackKey:config.trackKey,carId:config.carId});actions.append(repeat);}
    const back=element('button','',tr('VOLVER AL MENÚ','BACK TO MENU'));back.type='button';back.onclick=()=>scene.scene.start('menu');actions.append(back);
    panel.append(actions);
    results.append(panel);
  };
  const update=(_now,deltaMs)=>{
    if(stopped)return;
    if(full&&Number.isFinite(deltaMs)&&deltaMs>0){frameSum+=deltaMs;frameCount++;}
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
    paintLabels();renderHud();
    if(playerFinish)show();
  };
  const stop=()=>{if(stopped)return;stopped=true;for(const {label} of labels)label.destroy();hud.remove();director.destroy();results.remove();};
  scene.events.once('shutdown',stop);
  return {update,stop,ready:true};
}
