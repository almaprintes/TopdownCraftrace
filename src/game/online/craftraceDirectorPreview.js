// DEV-only local producer seat: four physical AI without creating an online room.
import {CrafRaceLive4BotDirector,LIVE4_AI_LEVELS} from './craftraceLiveV2BotDirector.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';
import {makeLive4StartingGrid} from './craftraceLiveV2GridGeometry.js';
import {makeDirectorCameraState,stepDirectorCamera,directorZoom,directorStickVector,directorAltitudeStick,directorStartPhase} from './craftraceDirectorCamera.js';
import {hideRaceUi,restoreRaceUi} from '../ui/raceUiVisibility.js';
import '../ui/craftraceDirectorPreview.css';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmt=ms=>Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
export function attachCrafRaceDirectorPreview(scene,{laps=3,difficulty=3}={}){
 if(!scene?._crafRaceDirectorPreview||!scene?.carRig||!scene?.carBody||
   scene._crafRaceLiveV2RoomId||![1,3,5,10,20].includes(laps)||
   ![1,2,3].includes(difficulty))throw Error('Invalid local director preview');
 const hostId='local-director-preview';
 const difficultyName=LIVE4_AI_LEVELS[difficulty].title.toUpperCase();
 const circuitLabel=String(getTrackPublicName(scene.trackKey)||scene.trackKey||'CIRCUITO').toUpperCase();
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
 // Director races have no ignition button, no human grid slot and no online
 // ready handshake. Own the 3-second green-light deadline locally, independently
 // of the driver scene's iOS static-track readiness flag.
 const directorGreenAt=performance.now()+3000;
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
  <button type="button" data-auto>AUTO · ACCIÓN</button>
  <button type="button" data-exit>SALIR</button>
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
  <ol data-order></ol><button type="button" data-finish>VOLVER AL MENÚ</button></div>`;
 document.body.append(root);
 // Stop director touch events reaching legacy driver controls behind the view.
 for(const ev of ['pointerdown','pointermove','pointerup','pointercancel','click'])
   root.addEventListener(ev,e=>e.stopPropagation());
 const $=s=>root.querySelector(s);
 $('[data-config]').textContent=circuitLabel+' · '+carLabel+' · '+difficultyName;
 $('[data-session]').textContent=setupLabel+' · FÍSICA A';
 const keyboard=new Set;let stopped=false,shown=false,stickPointer=null;
 let heightPointer=null,lastInfo=0;
 let stickVector={x:0,y:0},altitudeAxis=0;
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
 const exit=()=>{if(!stopped)scene.scene.start('menu');};
 $('[data-exit]').addEventListener('click',exit);
 $('[data-finish]').addEventListener('click',exit);
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
   if(now-lastInfo>=500){
     lastInfo=now;const stats=bots.stats();
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
       li.textContent='IA '+(item.seat+1)+' · '+fmt(item.elapsedMs);list.append(li);}
     $('[data-results]').hidden=false;
   }
 };
 const stop=()=>{
   if(stopped)return;stopped=true;
   scene.events.off('postupdate',draw);
   document.removeEventListener('keydown',keyDown,true);
   document.removeEventListener('keyup',keyUp,true);
   keyboard.clear();stickVector={x:0,y:0};altitudeAxis=0;
   bots.destroy();root.remove();
   document.removeEventListener('focusin',suppressTextFocus,true);
   restoreRaceUi(scene,hiddenUi);
   document.body.classList.remove('tdr-director-active');
 };
 scene.events.once('shutdown',stop);
 return {update,stop,get camera(){return camera;}};
}
