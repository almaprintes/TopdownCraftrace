// DEV-only local producer seat: four physical AI without creating an online room.
import {CrafRaceLive4BotDirector,LIVE4_AI_LEVELS} from './craftraceLiveV2BotDirector.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';
import {LOCAL_KARTING_PREVIEW_KEY} from '../tracks/localKartingPreview.js';
import {makeLive4StartingGrid} from './craftraceLiveV2GridGeometry.js';
import {makeDirectorCameraState,stepDirectorCamera,directorZoom,directorStickVector,directorAltitudeStick,directorStartPhase} from './craftraceDirectorCamera.js';
import {hideRaceUi,restoreRaceUi} from '../ui/raceUiVisibility.js';
import {sampleShapeEdge,shapeIsValid} from '../studio/trackShapeGeometry.js';
import {measureLateralUse,summarizeLateralUse} from './craftraceRacingLineTelemetry.js';
import '../ui/craftraceDirectorPreview.css';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmt=ms=>Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
export function attachCrafRaceDirectorPreview(scene,{laps=3,difficulty=3}={}){
 if(!scene?._crafRaceDirectorPreview||!scene?.carRig||!scene?.carBody||
   scene._crafRaceLiveV2RoomId||![1,3,5,10,20].includes(laps)||
   ![1,2,3].includes(difficulty))throw Error('Invalid local director preview');
 const hostId='local-director-preview';
 const difficultyName=LIVE4_AI_LEVELS[difficulty].title.toUpperCase();
 const fromStudio=scene.trackKey===LOCAL_KARTING_PREVIEW_KEY;
 const circuitLabel=String(fromStudio?scene.track?.meta?.name||'TRACKSTUDIO DEV':getTrackPublicName(scene.trackKey)||scene.trackKey||'CIRCUITO').toUpperCase();
 const carLabel=String(scene.baseSpec?.name||scene.carId||'COCHE').replaceAll('_',' ').toUpperCase();
 const setupLabel=circuitLabel+' · '+carLabel+' · '+laps+' VUELTAS · IA '+difficulty+' '+difficultyName;
 // Keep the chosen configuration visible. The prior results did not say
 // whether they were level 2 (default online) or the new level 3 Expert.
 const roster=Array.from({length:4},(_,seat)=>({
   kind:'ai',seat,owner_id:hostId,bot_id:'local-ai-'+(seat+1),difficulty
 }));
 const body=scene.carBody,heading=Number(body.rotation)||0;
 const start={x:body.x+Math.cos(heading)*44,y:body.y+Math.sin(heading)*44,r:heading};
 const grid=makeLive4StartingGrid({start,capacity:4,
   trackWidth:Number(scene.track?.meta?.trackWidth||140),
   carScale:Number(scene.track?.meta?.carScale||1),
   centerline:scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline,
   finishLine:scene.track?.meta?.finishLine||scene.track?.meta?.finish});
 const bots=new CrafRaceLive4BotDirector(scene,{
   roster,hostId,localId:hostId,startingGrid:grid,laps,preview:true
 });
 // Prototype B is opt-in to this local spectator/diagnostic session only.
 // Online LIVE 4 and all its original physical AI profiles remain unchanged.
 bots.setPreviewLineMode(bots.previewGuidedProfile?'G':'B');
 // Director races have no ignition button, no human grid slot and no online
 // ready handshake. Own the 3-second green-light deadline locally, independently
 // of the driver scene's iOS static-track readiness flag.
 const directorGreenAt=performance.now()+(bots.previewGuidedProfile?8500:3000);
 scene._startAutoFired=true;
 scene._startState='DIRECTOR_COUNTDOWN';
 scene._raceStarted=false;
 scene.carRig.setVisible(false);body.setVisible(false);
 // Keep the whole scene for real circuit and AI physics, but hide every
 // driver-only HUD and all its interactive pedal/handbrake layers.
 document.body.classList.add('tdr-director-active');
 const hiddenUi=hideRaceUi(scene);
 scene._tdrRemoveIgnitionButton?.();
 const wasTextInput=()=>{
   const el=document.activeElement;
   return el?.matches?.('input,textarea,select,[contenteditable="true"]')?el:null;
 };
 wasTextInput()?.blur?.();
 const suppressTextFocus=e=>{
   if(e.target?.matches?.('input,textarea,select,[contenteditable="true"]'))
     e.target.blur?.();
 };
 document.addEventListener('focusin',suppressTextFocus,true);
 const root=document.createElement('section');root.id='cr-director';
 root.setAttribute('aria-label','Realizador de CraftRace');
 root.innerHTML=`
 <div class="crdir-top">
  <strong>REALIZADOR · 4 IA · NIVEL ${difficulty}</strong>
  <small data-config></small><output data-state>SALIDA EN PREPARACIÓN</output>
  <button type="button" data-mode>B · VÉRTICES</button>
  <button type="button" data-lines>TRAZAS · ON</button>
  <button type="button" data-auto>AUTO · ACCIÓN</button>
  <button type="button" data-exit>SALIR</button>
 </div>
 <div class="crdir-line-legend" data-legend>
  <span class="crdir-center">EJE</span>
  <span class="crdir-target">OBJETIVO</span>
  <span class="crdir-border">BORDES</span>
  <span class="crdir-ai1">IA 1</span><span class="crdir-ai2">IA 2</span>
  <span class="crdir-ai3">IA 3</span><span class="crdir-ai4">IA 4</span>
  <span data-roadstats>USO LATERAL: SIN MUESTRAS</span>
 </div>
 <div class="crdir-stickbox"><div data-stick class="crdir-stick" role="group"
   aria-label="Palanca izquierda: mover dron en todas las direcciones y controlar velocidad">
   <span data-knob></span></div><small>MOVER · VELOCIDAD</small></div>
 <div class="crdir-heightbox"><div data-height-stick class="crdir-height-stick" role="group"
   aria-label="Palanca derecha: arriba acerca la cámara; abajo aleja la cámara">
   <span data-height-knob></span></div><small>↑ ACERCAR · ↓ ALEJAR</small></div>
 <div class="crdir-results" data-results hidden>
  <h2>4 IA · RESULTADOS PROVISIONALES</h2>
  <p data-session></p>
  <p>Prueba local. Vueltas estimadas por trayectoria, todavía no homologadas.</p>
  <p data-roadreport></p>
  <ol data-order></ol><button type="button" data-finish>VOLVER AL MENÚ</button></div>`;
 document.body.append(root);
 // Stop director touch events reaching legacy driver controls behind the view.
 for(const ev of ['pointerdown','pointermove','pointerup','pointercancel','click'])
   root.addEventListener(ev,e=>e.stopPropagation());
 const $=s=>root.querySelector(s);
 if(fromStudio){
   $('[data-exit]').textContent='EDITOR';
   $('[data-finish]').textContent='VOLVER AL EDITOR';
 }else if(scene._returnSceneData?.fromPaddockDirector){
   $('[data-exit]').textContent='PADDOCK';
   $('[data-finish]').textContent='VOLVER AL PADDOCK';
 }
 $('[data-config]').textContent=circuitLabel+' · '+carLabel+' · '+difficultyName;
 const updateModeLabel=()=>{
   const mode=bots.previewMode;
   $('[data-mode]').textContent=mode==='G'?'G · GUIADA':mode==='B'?'B · VÉRTICES':'A · ORIGINAL';
   $('[data-session]').textContent=setupLabel+' · FÍSICA A · TRAZADA '+
     (mode==='G'?'G GUIADA (PRUEBA)':mode==='B'?'B EXPERIMENTAL':'A ORIGINAL');
 };
 updateModeLabel();
 const keyboard=new Set;let stopped=false,shown=false,stickPointer=null;
 let heightPointer=null,lastInfo=0;
 let stickVector={x:0,y:0},altitudeAxis=0;
 // World-space telemetry, drawn only for the Realizador and destroyed on exit.
 // Actual pilot tracks are sampled at a bounded rate to protect mobile FPS.
 const traceColors=[0xffc35b,0x73d7ff,0xee81ce,0x9affbb];
 const trail=bots.bots.map(()=>[]);
 const lateralSamples=bots.bots.map(()=>[]);
 const shape=scene.track?.meta?.trackShape;
 const authoredBorders=shapeIsValid(shape)&&shape.closed?[
   sampleShapeEdge(shape.leftEdge,true,12),
   sampleShapeEdge(shape.rightEdge,true,12)
 ]:[];
 const hasAuthoredBounds=authoredBorders.length===2;
 const thin=points=>{
   const jump=Math.max(1,Math.ceil(points.length/1400));
   return jump===1?points:points.filter((_,i)=>i%jump===0);
 };
 let showLines=true,lastTrace=0,lastLinePaint=-1;
 const lineGraphics=scene.add.graphics().setDepth(38);
 const drawLine=(points,color,width,alpha,close)=>{
   if(points.length<2)return;
   lineGraphics.lineStyle(width,color,alpha);
   lineGraphics.beginPath();
   lineGraphics.moveTo(points[0].x,points[0].y);
   for(let i=1;i<points.length;i++)lineGraphics.lineTo(points[i].x,points[i].y);
   if(close)lineGraphics.closePath();
   lineGraphics.strokePath();
 };
 const paintLines=(now)=>{
   if(!showLines){lineGraphics.clear();return;}
   if(now-lastLinePaint<180)return;
   lastLinePaint=now;lineGraphics.clear();
   const data=bots.diagnosticLines();
   drawLine(data.centerline,0x67d7ff,3,.70,true);
   drawLine(data.target,0xffcb65,4,.96,true);
   for(const edge of authoredBorders)drawLine(thin(edge),0xbaff7f,2,.92,true);
   trail.forEach((points,i)=>drawLine(points,traceColors[i],3,.85,false));
 };
 const captureTrails=(now)=>{
   if(now-lastTrace<180)return;
   lastTrace=now;
   const line=bots.previewActiveLine();
   bots.bots.forEach((bot,i)=>{
     const p=bot.plannerBody,history=trail[i];
     if(!p||!scene._raceStarted||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
     const measure=measureLateralUse(line,p.x,p.y,bot._plannerSampleIndex);
     if(measure&&lateralSamples[i].length<1500)lateralSamples[i].push(measure);
     if(!showLines)return;
     const last=history[history.length-1];
     if(!last||Math.hypot(last.x-p.x,last.y-p.y)>=5){
       history.push({x:p.x,y:p.y});
       if(history.length>900)history.shift();
     }
   });
 };
 const firstGridCar=grid.positions[0];
 let camera=makeDirectorCameraState({x:firstGridCar.x,y:firstGridCar.y,
   heading:firstGridCar.r});
 const stick=$('[data-stick]'),knob=$('[data-knob]');
 const move=e=>{
   if(e.pointerId!==stickPointer)return;
   e.preventDefault();e.stopPropagation();
   const v=directorStickVector(e.clientX,e.clientY,stick.getBoundingClientRect());
   stickVector={x:v.x,y:v.y};
   // The thumb is freely dragged inside a circular travel radius.
   knob.style.transform='translate('+Math.round(v.offsetX)+'px,'+
     Math.round(v.offsetY)+'px)';
   camera.auto=false;
 };
 stick.addEventListener('pointerdown',e=>{
   if(stopped||stickPointer!==null)return;
   e.preventDefault();e.stopPropagation();stickPointer=e.pointerId;
   stick.setPointerCapture?.(e.pointerId);move(e);
 });
 stick.addEventListener('pointermove',move);
 const release=e=>{if(e.pointerId!==stickPointer)return;
   stickPointer=null;stickVector={x:0,y:0};
   knob.style.transform='translate(0px,0px)';
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
   stick.addEventListener(event,release);
 // The second analog lever is wholly independent: true two-finger operation.
 const heightStick=$('[data-height-stick]'),heightKnob=$('[data-height-knob]');
 const moveHeight=e=>{
   if(e.pointerId!==heightPointer)return;
   e.preventDefault();e.stopPropagation();
   const result=directorAltitudeStick(e.clientY,heightStick.getBoundingClientRect());
   altitudeAxis=result.axis;
   heightKnob.style.transform='translateY('+Math.round(result.offsetY)+'px)';
 };
 heightStick.addEventListener('pointerdown',e=>{
   if(stopped||heightPointer!==null)return;
   e.preventDefault();e.stopPropagation();
   heightPointer=e.pointerId;
   heightStick.setPointerCapture?.(e.pointerId);
   moveHeight(e);
 });
 heightStick.addEventListener('pointermove',moveHeight);
 const releaseHeight=e=>{
   if(e.pointerId!==heightPointer)return;
   heightPointer=null;altitudeAxis=0;
   heightKnob.style.transform='translateY(0px)';
 };
 for(const event of ['pointerup','pointercancel','lostpointercapture'])
   heightStick.addEventListener(event,releaseHeight);
 const keys=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE',
   'ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
 const keyDown=e=>{if(stopped||!keys.has(e.code))return;
   if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
   e.preventDefault();e.stopPropagation();keyboard.add(e.code);
 };
 const keyUp=e=>keyboard.delete(e.code);
 document.addEventListener('keydown',keyDown,true);
 document.addEventListener('keyup',keyUp,true);
 const exit=()=>{
   if(stopped)return;
   if(scene._returnSceneKey&&
     (scene._returnSceneData?.fromTrackStudioPreview||
      scene._returnSceneData?.fromPaddockDirector))
     scene.scene.start(scene._returnSceneKey,scene._returnSceneData);
   else scene.scene.start('menu');
 };
 $('[data-exit]').addEventListener('click',exit);
 $('[data-finish]').addEventListener('click',exit);
 $('[data-mode]').addEventListener('click',()=>{
   if(scene._raceStarted)return;
   const modes=bots.previewGuidedProfile?['A','B','G']:['A','B'];
   const next=modes[(modes.indexOf(bots.previewMode)+1)%modes.length];
   if(bots.setPreviewLineMode(next)){
     trail.forEach(points=>points.length=0);
     lateralSamples.forEach(points=>points.length=0);
     lastLinePaint=-1;updateModeLabel();paintLines(performance.now());
   }
 });
 $('[data-lines]').addEventListener('click',()=>{
   showLines=!showLines;
   $('[data-lines]').textContent=showLines?'TRAZAS · ON':'TRAZAS · OFF';
   $('[data-legend]').hidden=!showLines;
   lastLinePaint=-1;paintLines(performance.now());
 });
 $('[data-auto]').addEventListener('click',()=>{
   camera.auto=!camera.auto;camera.speed=0;
   $('[data-auto]').textContent=camera.auto?'AUTO ACTIVADO':'AUTO · ACCIÓN';
 });
 // Override the gameplay camera after the normal RaceScene zoom/follow update.
 const draw=()=>{
   if(stopped||!scene.cameras?.main)return;
   // Several inherited scene layers can repaint UI after the initial hide.
   // Keep only the producer's independent DOM controls visible.
   if(scene.uiCam?.visible!==false)scene.uiCam?.setVisible(false);
   if(scene._startModal?.visible!==false)scene._startModal?.setVisible(false);
   if(scene.touchUI?.visible!==false)scene.touchUI?.setVisible(false);
   const cam=scene.cameras.main;
   cam.stopFollow();cam.setZoom(directorZoom(camera.altitude));
   cam.centerOn(camera.x,camera.y);
 };
 scene.events.on('postupdate',draw);
 const update=(now,deltaMs=16.667)=>{
   if(stopped)return;
   const keyX=(keyboard.has('KeyD')||keyboard.has('ArrowRight')?1:0)-
     (keyboard.has('KeyA')||keyboard.has('ArrowLeft')?1:0);
   const keyY=(keyboard.has('KeyS')||keyboard.has('ArrowDown')?1:0)-
     (keyboard.has('KeyW')||keyboard.has('ArrowUp')?1:0);
   const keyboardLength=Math.max(1,Math.hypot(keyX,keyY));
   // Touch wins over desktop keys, and diagonal keys are normalized.
   const leftActive=Math.hypot(stickVector.x,stickVector.y)>.08;
   const x=leftActive?stickVector.x:keyX/keyboardLength;
   const y=leftActive?stickVector.y:keyY/keyboardLength;
   const height=altitudeAxis||((keyboard.has('KeyE')?1:0)-(keyboard.has('KeyQ')?1:0));
   camera=stepDirectorCamera(camera,{
     stickX:x,stickY:y,altitudeAxis:height
   },Math.min(50,Math.max(0,deltaMs))/1000,bots.bots);
   const countdown=directorStartPhase(now,directorGreenAt);
   if(!scene._raceStarted&&countdown.started){
     scene._startAutoFired=true;
     scene._startState='RACING';
     scene._raceStarted=true;
     scene._startModal?.setVisible(false);
     if(scene.timing){
       scene.timing.started=true;
       scene.timing.lapStart=now;
       scene.timing.s1=null;scene.timing.s2=null;scene.timing.s3=null;
     }
     scene.lapStartTick=scene.simTick;
   }
   bots.update(deltaMs,now,scene._raceStarted===true);
   if(scene._raceStarted)$('[data-mode]').disabled=true;
   captureTrails(now);paintLines(now);
   if(now-lastInfo>=500){
     lastInfo=now;const stats=bots.stats();
     const line=bots.previewActiveLine();
     const averageTarget=line.offsets.reduce((sum,o,i)=>sum+
       Math.abs(o)/Math.max(1,line.limits[i]),0)/Math.max(1,line.offsets.length);
     const actual=summarizeLateralUse(lateralSamples.flat());
     const guide=bots.previewGuideReport;
     $('[data-roadstats]').textContent='OBJ '+Math.round(averageTarget*100)+
       '% · IA '+(actual.samples?actual.meanPct+'%':'—')+
       ' · '+(guide?'GUÍAS '+guide.accepted+'/'+guide.total+
         ' · G '+(guide.active?'ACTIVA':'NO DISPONIBLE'):'SIN GUÍAS')+
       ' · '+(hasAuthoredBounds?'BORDES AUTÉNTICOS':'SIN BORDES');
     $('[data-state]').textContent=(scene._raceStarted?'EN DIRECTO':'SALIDA EN '+countdown.seconds)+
      ' · FINALIZADAS '+stats.finished+'/4 · DRON '+Math.round(camera.speed)+
      ' · ZOOM '+directorZoom(camera.altitude).toFixed(2)+'×';
     $('[data-auto]').textContent=camera.auto?'AUTO ACTIVADO':'AUTO · ACCIÓN';
   }
   if(!shown&&bots.results().length===4){
     shown=true;
     const ordered=bots.results().sort((a,b)=>a.elapsedMs-b.elapsedMs);
     const list=$('[data-order]');list.replaceChildren();
     for(const item of ordered){const li=document.createElement('li');
       const stat=summarizeLateralUse(lateralSamples[item.seat]);
       li.textContent='IA '+(item.seat+1)+' · '+fmt(item.elapsedMs)+
         ' · LATERAL '+(stat.samples?stat.meanPct+'%':'—');list.append(li);}
     const used=summarizeLateralUse(lateralSamples.flat());
     const guide=bots.previewGuideReport;
     $('[data-roadreport]').textContent='TRAZADA '+bots.previewMode+
       ' · Uso lateral medio: '+(used.samples?used.meanPct+'%':'sin medición')+
       ' del semiancho útil estimado; muestras ≥70%: '+used.nearEdgePct+'%. '+
       (guide?'Guías admitidas '+guide.accepted+'/'+guide.total+
        (guide.active?' · trazada G NO HOMOLOGADA':' · trazada G no disponible')+
        ' · '+(guide.entries||[]).filter(e=>e.status!=='accepted')
          .map(e=>e.id+': '+e.status).join(', ')+'. ':'')+
       (hasAuthoredBounds?'Bordes Bézier originales en verde.'
         :'Sin bordes originales para contrastar pianos.');
     $('[data-results]').hidden=false;
   }
 };
 const stop=()=>{
   if(stopped)return;stopped=true;
   scene.events.off('postupdate',draw);
   document.removeEventListener('keydown',keyDown,true);
   document.removeEventListener('keyup',keyUp,true);
   keyboard.clear();stickVector={x:0,y:0};altitudeAxis=0;
   lineGraphics.destroy();
   bots.destroy();root.remove();
   document.removeEventListener('focusin',suppressTextFocus,true);
   restoreRaceUi(scene,hiddenUi);
   document.body.classList.remove('tdr-director-active');
 };
 scene.events.once('shutdown',stop);
 return {update,stop,get camera(){return camera;}};
}
