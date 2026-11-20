// DEV-only local producer seat: four physical AI without creating an online room.
import {CrafRaceLive4BotDirector} from './craftraceLiveV2BotDirector.js';
import {makeLive4StartingGrid} from './craftraceLiveV2GridGeometry.js';
import {makeDirectorCameraState,stepDirectorCamera,directorZoom,directorStickVector,directorStartPhase} from './craftraceDirectorCamera.js';
import {hideRaceUi,restoreRaceUi} from '../ui/raceUiVisibility.js';
import '../ui/craftraceDirectorPreview.css';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fmt=ms=>Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
export function attachCrafRaceDirectorPreview(scene,{laps=3,difficulty=3}={}){
 if(!scene?._crafRaceDirectorPreview||!scene?.carRig||!scene?.carBody||
   scene._crafRaceLiveV2RoomId||![1,3,5,10,20].includes(laps)||
   ![1,2,3].includes(difficulty))throw Error('Invalid local director preview');
 const hostId='local-director-preview';
 const roster=Array.from({length:4},(_,seat)=>({
   kind:'ai',seat,owner_id:hostId,bot_id:'local-ai-'+(seat+1),difficulty
 }));
 const body=scene.carBody,heading=Number(body.rotation)||0;
 const start={x:body.x+Math.cos(heading)*44,y:body.y+Math.sin(heading)*44,r:heading};
 const grid=makeLive4StartingGrid({start,capacity:4,
   trackWidth:Number(scene.track?.meta?.trackWidth||140),
   carScale:Number(scene.track?.meta?.carScale||1)});
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
  <strong>REALIZADOR · 4 IA</strong><output data-state>SALIDA EN PREPARACIÓN</output>
  <button type="button" data-auto>AUTO · ACCIÓN</button>
  <button type="button" data-exit>SALIR</button>
 </div>
 <div class="crdir-stickbox"><div data-stick class="crdir-stick" role="group"
   aria-label="Palanca de dirección del dron en dos ejes">
   <span data-knob></span></div><small>DIRECCIÓN</small></div>
 <div class="crdir-alt"><button type="button" data-alt-up>SUBIR <small>− ZOOM</small></button>
  <button type="button" data-alt-down>BAJAR <small>+ ZOOM</small></button></div>
 <div class="crdir-drive"><button type="button" data-gas>ACELERAR</button>
  <button type="button" data-brake>FRENAR</button></div>
 <div class="crdir-results" data-results hidden>
  <h2>4 IA · RESULTADOS PROVISIONALES</h2>
  <p>Prueba local. Vueltas estimadas por trayectoria, todavía no homologadas.</p>
  <ol data-order></ol><button type="button" data-finish>VOLVER AL MENÚ</button></div>`;
 document.body.append(root);
 // Stop director touch events reaching legacy driver controls behind the view.
 for(const ev of ['pointerdown','pointermove','pointerup','pointercancel','click'])
   root.addEventListener(ev,e=>e.stopPropagation());
 const $=s=>root.querySelector(s);
 const held={gas:new Set,brake:new Set,rise:new Set,sink:new Set};
 const keyboard=new Set;let stopped=false,shown=false,stickPointer=null,lastInfo=0;
 let stickVector={x:0,y:0};
 let camera=makeDirectorCameraState({x:body.x,y:body.y,heading});
 const addHold=(selector,key)=>{
   const element=$(selector);
   element.addEventListener('pointerdown',e=>{
     if(stopped)return;e.preventDefault();e.stopPropagation();
     element.setPointerCapture?.(e.pointerId);held[key].add(e.pointerId);
     if(key==='gas'||key==='brake')camera.auto=false;
   });
   for(const event of ['pointerup','pointercancel','lostpointercapture'])
     element.addEventListener(event,e=>held[key].delete(e.pointerId));
 };
 addHold('[data-gas]','gas');addHold('[data-brake]','brake');
 addHold('[data-alt-up]','rise');addHold('[data-alt-down]','sink');
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
 const keys=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','Space',
   'ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
 const keyDown=e=>{if(stopped||!keys.has(e.code))return;
   if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
   e.preventDefault();e.stopPropagation();keyboard.add(e.code);
 };
 const keyUp=e=>keyboard.delete(e.code);
 document.addEventListener('keydown',keyDown,true);
 document.addEventListener('keyup',keyUp,true);
 const pressed=(key,variants)=>held[key].size>0||variants.some(k=>keyboard.has(k));
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
   const gas=pressed('gas',['KeyW','ArrowUp'])?1:0;
   const brake=pressed('brake',['KeyS','ArrowDown','Space'])?1:0;
   const rise=pressed('rise',['KeyQ'])?1:0;
   const sink=pressed('sink',['KeyE'])?1:0;
   const steer=clamp((keyboard.has('KeyD')||keyboard.has('ArrowRight')?1:0)-
      (keyboard.has('KeyA')||keyboard.has('ArrowLeft')?1:0),-1,1);
   camera=stepDirectorCamera(camera,{
     gas,brake,rise,sink,steer,stickX:stickVector.x,stickY:stickVector.y
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
   keyboard.clear();for(const group of Object.values(held))group.clear();
   bots.destroy();root.remove();
   document.removeEventListener('focusin',suppressTextFocus,true);
   restoreRaceUi(scene,hiddenUi);
   document.body.classList.remove('tdr-director-active');
 };
 scene.events.once('shutdown',stop);
 return {update,stop,get camera(){return camera;}};
}
