// DEV-only local playable exhibition: YOU + four physical expert AIs.
// It reuses their validated G Bézier, invisible per-lap dice, the player's
// actual rig, inputs and physics. No online room, rewards or persistent Elo.
import {CrafRaceLive4BotDirector} from './craftraceLiveV2BotDirector.js';
import {makeLive4StartingGrid} from './craftraceLiveV2GridGeometry.js';
import {advanceLive4PhysicalLap} from './craftraceLive4LapGates.js';
import {buildDirectorDieAudit} from './craftraceDirectorDieAudit.js';
import {fmtDirectorTime} from './craftraceDirectorLapReport.js';
import '../ui/craftraceDirectorPlayable.css';

export function attachCrafRaceDirectorPlayable(scene,{laps=3,difficulty=3}={}){
 if(!scene?._crafRaceDirectorPlayable||!scene?.carRig||!scene?.carBody||
    scene._crafRaceLiveV2RoomId||![1,3,5,10,20].includes(laps))
  throw Error('Invalid local playable AI exhibition');
 const host='local-vs-four-exhibition';
 const centerline=scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline;
 const finishLine=scene.track?.meta?.finishLine||scene.track?.meta?.finish;
 const body=scene.carBody;
 const grid=makeLive4StartingGrid({
  start:{x:body.x,y:body.y,r:Number(body.rotation)||0},
  capacity:4,frontOffsetPx:240,
  trackWidth:Number(scene.track?.meta?.trackWidth)||140,
  carScale:Number(scene.track?.meta?.carScale)||1,
  centerline,finishLine
 });
 const bots=new CrafRaceLive4BotDirector(scene,{
  roster:Array.from({length:4},(_,seat)=>({
   kind:'ai',seat,owner_id:host,bot_id:'exhibition-ai-'+(seat+1),difficulty
  })),hostId:host,localId:host,startingGrid:grid,laps,preview:true
 });
 if(!bots.previewBezierActive||!bots.previewGuidedProfile){
  bots.destroy();
  throw Error('La trazada G de Santa Cruz no está disponible; no se inicia una carrera engañosa');
 }
 bots.setPreviewLineMode('G');
 // Contacts between physical cars; no teleports or ghost opponents.
 const contacts=[];
 for(const bot of bots.bots){
  contacts.push(scene.physics.add.collider(body,bot.plannerBody));
  for(const other of bots.bots)if(other.seat<bot.seat)
   contacts.push(scene.physics.add.collider(bot.plannerBody,other.plannerBody));
 }
 const human={
  plannerBody:body,lastPhysicalPosition:{x:body.x,y:body.y},
  lastLapAt:null,completedLaps:0,gatePhase:0,lapTimes:[],
  finished:false,finishAt:null
 };
 const root=document.createElement('section');
 root.id='cr-vs4';root.setAttribute('aria-label','Tú contra cuatro IA');
 root.innerHTML=`
 <div class="crvs4-header" role="status">
  <strong>TÚ CONTRA 4 IA · SANTA CRUZ</strong>
  <span data-state>SALIDA EN PREPARACIÓN</span>
  <button type="button" data-exit>PADDOCK</button>
 </div>
 <div class="crvs4-results" data-results hidden>
  <h2>EXHIBICIÓN · RESULTADOS NO OFICIALES</h2>
  <p>Tú y cuatro IA · ${laps} vueltas · mismo coche y desarrollo · trazada G Bézier para IA</p>
  <div class="crvs4-scroll" data-table></div>
  <details data-dice hidden><summary>DIAGNÓSTICO · DADO POR IA Y VUELTA</summary>
    <div data-die-table></div>
    <small>Se muestra la variación máxima PLANIFICADA; no garantiza la distancia física real.</small>
  </details>
  <button type="button" data-return>VOLVER AL PADDOCK</button>
 </div>`;
 document.body.append(root);
 const $=selector=>root.querySelector(selector);
 let stopped=false,shown=false,greenAt=performance.now()+8500;
 scene._startAutoFired=true;
 scene._startState='DIRECTOR_PLAYABLE_COUNTDOWN';
 scene._raceStarted=false;
 scene._startModal?.setVisible(false);
 const exit=()=>{if(stopped)return;
  if(scene._returnSceneKey)scene.scene.start(scene._returnSceneKey,scene._returnSceneData||{});
  else scene.scene.start('menu');
 };
 $('[data-exit]').addEventListener('click',exit);
 $('[data-return]').addEventListener('click',exit);
 function renderResults(){
  const entrants=[
   {seat:-1,label:'TÚ',lapTimes:human.lapTimes.slice(),
    finishAt:human.finishAt,finished:human.finished},
   ...bots.bots.map(b=>({seat:b.seat,label:'IA '+(b.seat+1),
    lapTimes:b.lapTimes.slice(),finishAt:b.finishAt,finished:b.finished}))
  ].sort((a,b)=>{
   const at=a.lapTimes.reduce((x,y)=>x+y,0),bt=b.lapTimes.reduce((x,y)=>x+y,0);
   return at-bt||a.seat-b.seat;
  });
  const table=document.createElement('table');table.className='crvs4-table';
  const row=document.createElement('tr');
  for(const label of ['POS.','PILOTO',...Array.from({length:laps},(_,i)=>'V'+(i+1)),'TOTAL']){
   const th=document.createElement('th');th.textContent=label;row.append(th);
  }
  table.append(row);
  entrants.forEach((pilot,pos)=>{
   const tr=document.createElement('tr');
   if(pilot.seat===-1)tr.className='crvs4-human';
   for(const item of [String(pos+1)+'.º',pilot.label,
     ...pilot.lapTimes.map(fmtDirectorTime),
     fmtDirectorTime(pilot.lapTimes.reduce((a,b)=>a+b,0))]){
    const td=document.createElement('td');td.textContent=item;tr.append(td);
   }
   table.append(tr);
  });
  $('[data-table]').replaceChildren(table);
  const die=buildDirectorDieAudit(bots.results(),laps);
  if(die.complete){
   const dt=document.createElement('table');dt.className='crvs4-table';
   const top=document.createElement('tr');
   for(const title of ['PILOTO',...Array.from({length:laps},(_,i)=>'V'+(i+1))]){
    const th=document.createElement('th');th.textContent=title;top.append(th);
   }
   dt.append(top);
   for(const r of die.rows){
    const tr=document.createElement('tr');
    for(const value of ['IA '+(r.seat+1),...r.rolls.map(x=>
      x.face+'/6 · '+x.plannedVariationPx.toFixed(1)+' px')]){
     const td=document.createElement('td');td.textContent=value;tr.append(td);
    }
    dt.append(tr);
   }
   $('[data-die-table]').replaceChildren(dt);
   $('[data-dice]').hidden=false;
  }
  $('[data-results]').hidden=false;
 }
 const update=(now,deltaMs=16.667)=>{
  if(stopped)return;
  const ready=!scene._iosStaticTrackRender||scene._iosStaticTrackInitialReady;
  if(!scene._raceStarted&&now>=greenAt&&ready){
   scene._raceStarted=true;scene._startState='RACING';
   human.lastLapAt=now;human.lastPhysicalPosition={x:body.x,y:body.y};
   scene._startModal?.setVisible(false);
   if(scene.timing){scene.timing.started=true;scene.timing.lapStart=now;}
   scene.lapStartTick=scene.simTick;
  }
  bots.update(deltaMs,now,scene._raceStarted===true);
  if(scene._raceStarted){
   if(!human.finished)advanceLive4PhysicalLap(human,bots.lapGates,now,laps);
   else body.setVelocity?.(0,0);
   if(human.finished)scene._crafRaceDirectorHumanDone=true;
  }
  const finished=bots.bots.filter(b=>b.finished).length;
  $('[data-state]').textContent=scene._raceStarted
   ?'TÚ '+human.completedLaps+'/'+laps+' · IA '+finished+'/4 · G + DADOS'
   :'SALIDA EN '+Math.max(0,Math.ceil((greenAt-now)/1000))+' · G + DADOS';
  if(!shown&&human.finished&&finished===4){
   shown=true;renderResults();
  }
 };
 const stop=()=>{
  if(stopped)return;stopped=true;
  for(const item of contacts)item?.destroy?.();
  bots.destroy();root.remove();
  scene._crafRaceDirectorHumanDone=false;
 };
 scene.events.once('shutdown',stop);
 return{update,stop};
}
