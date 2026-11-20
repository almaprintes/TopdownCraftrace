// CrafRace LIVE - shared lobby UI for iOS Safari and Android browser.
import {createLiveRoom,joinLiveRoom,CrafRaceLiveTransport,liveIdentity} from '../online/craftraceLiveTransport.js';
import {chatReady} from '../online/craftraceLiveProtocol.js';
import {handoffLiveSession} from '../online/craftraceLiveSession.js';
import {localLivePilot,parseLivePilot,pilotName,pilotMastery,livePilotHandshake} from '../online/craftraceLivePilot.js';
import {selectedCircuitRaceId} from '../tracks/trackReverseVariant.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';
import './craftraceLiveLobby.css';

export function openCrafRaceLiveLobby(scene,{carId=null,trackId=null}={}){
 if(document.getElementById('cr-live-lab'))return;
 // Keep the car and exact NORMAL/INVERSO circuit selected before entering Race Control.
 const localCarId=String(carId||scene?.selectedCarId||localStorage.getItem('tdr2:carId')||'avenir_gripline');
 const localTrackId=String(trackId||selectedCircuitRaceId(scene?.selectedTrackKey||'track01',localStorage));
 const root=document.createElement('div');root.id='cr-live-lab';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.innerHTML='<section class="cr-live-panel">'+
 '<header class="cr-live-head"><div class="cr-live-mark" aria-hidden="true">TDR</div><div class="cr-live-heading"><small>TOP DOWN RACE · MULTIJUGADOR</small><h2>CRAFT RACE <em>LIVE</em></h2><p class="cr-live-subtitle">DOS PILOTOS · UNA PISTA · EN DIRECTO</p></div><span class="cr-live-session-tag">ONLINE · DEV</span><button data-close type="button" aria-label="Cerrar multijugador">✕</button></header>'+
 '<p data-status class="cr-live-status" role="status" aria-live="polite">Elige cómo quieres competir.</p>'+
 '<div data-actions class="cr-live-entry-grid"><section class="cr-live-action-card cr-live-action-card--host" data-settings><div class="cr-live-kicker"><b>01</b> ANFITRIÓN</div><h3>CREAR UNA PISTA</h3><div class="cr-live-trackline"><span>CIRCUITO</span><strong data-selected-track>—</strong></div><div class="cr-live-host-controls"><label for="cr-live-laps">VUELTAS</label><select id="cr-live-laps" data-laps aria-label="Número de vueltas"><option value="1">1 VUELTA</option><option value="3" selected>3 VUELTAS</option><option value="5">5 VUELTAS</option><option value="10">10 VUELTAS</option><option value="20">20 VUELTAS</option></select><button data-create type="button">CREAR PISTA ›</button></div></section>'+
 '<section class="cr-live-action-card cr-live-action-card--guest"><div class="cr-live-kicker"><b>02</b> INVITADO</div><h3>UNIRSE A UNA PISTA</h3><label class="cr-live-code-label" for="cr-live-code">CÓDIGO DE INVITACIÓN</label><div class="cr-live-join-controls"><input id="cr-live-code" data-code maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de pista" placeholder="CÓDIGO"><button data-paste type="button">PEGAR</button><button data-join type="button">UNIRME ›</button></div><p class="cr-live-hint">El anfitrión fija el circuito y las vueltas.</p></section></div>'+
 '<div data-room hidden><div class="cr-live-code-row"><h3 data-roomcode></h3><button data-copy type="button">COPIAR CÓDIGO</button></div><p class="cr-live-rules" data-rules></p>'+
 '<div class="cr-live-versus"><div class="cr-live-driver"><span>TÚ · PILOTO LOCAL</span><strong data-own-name>—</strong><small data-own-level>—</small></div><b>VS</b><div class="cr-live-driver"><span>RIVAL · CONEXIÓN</span><strong data-rival-name>ESPERANDO…</strong><small data-rival-level>—</small></div></div>'+
 '<p data-pilots>Esperando al rival…</p><div class="cr-live-row"><button data-ready type="button" disabled>ESTOY LISTO</button><button data-test-race type="button" hidden>INICIAR CARRERA</button></div><div data-messages aria-live="polite"></div><div class="cr-live-row"><input data-chat maxlength="160" aria-label="Mensaje" placeholder="Mensaje al rival"><button data-send type="button">ENVIAR</button></div></div>'+
 '<footer class="cr-live-footer"><span>CRAFT RACE STUDIO · ONLINE</span><span>DEV · SIN PREMIOS NI RÁNKING OFICIAL</span></footer></section>';
 document.body.append(root);const $=s=>root.querySelector(s);
 const brandImage=document.createElement('img');brandImage.src=(import.meta.env.BASE_URL||'/')+'assets/logo.webp';brandImage.alt='';brandImage.draggable=false;root.querySelector('.cr-live-mark')?.replaceChildren(brandImage);
 $('[data-selected-track]').textContent=getTrackPublicName(localTrackId);
 let transport=null,room=null,busy=false,closed=false,lastChat=0,readySent=false,rivalReady=false,localId=null,launching=false;
 const say=s=>{if(!closed)$('[data-status]').textContent=String(s);};
 const log=s=>{const p=document.createElement('p');p.textContent=s;$('[data-messages]').append(p);while($('[data-messages]').children.length>10)$('[data-messages]').firstChild.remove();};
 const refreshReady=()=>{
  if(closed||!room)return;
  const joined=!!room.guest_id;
  $('[data-test-race]').hidden=!(readySent&&rivalReady&&localId===room.host_id);
  $('[data-own-name]').textContent=pilotName(room.ownPilot,'TÚ');
  $('[data-own-level]').textContent=pilotMastery(room.ownPilot);
  $('[data-rival-name]').textContent=pilotName(room.rivalPilot,joined?'RIVAL CONECTADO':'ESPERANDO…');
  $('[data-rival-level]').textContent=pilotMastery(room.rivalPilot);
  $('[data-rules]').textContent=getTrackPublicName(room.track_id)+' · '+room.laps+(room.laps===1?' VUELTA':' VUELTAS')+' · SALIDA SIMULTÁNEA';
  $('[data-pilots]').textContent=joined?(rivalReady?(readySent?'AMBOS PILOTOS LISTOS':'EL RIVAL ESTÁ LISTO · CONFIRMA TU SALIDA'):'DOS PILOTOS CONECTADOS · ESPERANDO CONFIRMACIÓN'):'ESPERANDO AL SEGUNDO PILOTO';
  $('[data-ready]').disabled=!joined||readySent;
 };
 const launch=()=>{
  if(closed||launching||!room||!readySent)return;
  launching=true;
  const liveRoomId=room.id,carId=localCarId||room.car_id,trackKey=room.track_id;
  handoffLiveSession(room,transport,{id:localId});transport=null;dispose();
  scene.scene.start('race',{carId,trackKey,liveRoomId,liveStartAt:null,liveGridSlot:localId===room.host_id?0:1,gameMode:'online',testMode:false});
 };
 const dispose=()=>{if(closed)return;closed=true;transport?.stop();root.remove();scene?.events?.off?.('shutdown',dispose);document.removeEventListener('keydown',esc);};
 const esc=e=>{if(e.key==='Escape')dispose();};
 $('[data-close]').addEventListener('click',dispose);document.addEventListener('keydown',esc);scene?.events?.once?.('shutdown',dispose);
 async function connect(fn){
  if(busy||closed)return;busy=true;$('[data-create]').disabled=$('[data-join]').disabled=true;
  try{
   say('Conectando con la pista…');
   const watchdog=new Promise((_,reject)=>setTimeout(()=>reject(Error('La conexión tarda demasiado. Revisa la sesión de CraftRace Studio y vuelve a intentarlo.')),12000));
   room=await Promise.race([fn(),watchdog]);if(closed)return;
   if(!room?.id||!room?.code)throw Error('Respuesta incompleta.');
   $('[data-actions]').hidden=true;$('[data-settings]').hidden=true;$('[data-room]').hidden=false;
   $('[data-roomcode]').textContent='CÓDIGO · '+room.code;
   const identity=await liveIdentity();if(closed)return;
   localId=identity.id;room.ownPilot=localLivePilot(localCarId||room.car_id);room.rivalPilot=null;
   transport=new CrafRaceLiveTransport(room.id,{
    onState:d=>{
     if(closed)return;
     if(d.host_id!==room.host_id||d.room_id!==room.id)return;
     room.guest_id=d.guest_id;refreshReady();
    },
    onPacket:p=>{
     if(p.from!==(localId===room.host_id?room.guest_id:room.host_id))return;
     if(p.type==='hello'||p.type==='ready'){
      const info=parseLivePilot(p.payload);
      if(info){room.rivalPilot=info;refreshReady();}
     }
     if(p.type==='start'&&p.from===room.host_id&&p.payload.restart===false&&readySent&&Number.isFinite(p.payload.startAt)){launch();return;}
     if(p.type==='chat')log(pilotName(room.rivalPilot,'RIVAL')+' · '+String(p.payload.text||''));
     if(p.type==='ready'&&p.payload.phase!=='grid'&&p.payload.trackId===room.track_id&&p.payload.physicsVersion===room.physics_version&&p.payload.direction===room.direction&&p.payload.laps===room.laps){
      if(!rivalReady)log(pilotName(room.rivalPilot,'El rival')+' está preparado.');
      rivalReady=true;refreshReady();
      if(readySent)say('Ambos preparados. Esperando salida del anfitrión.');
     }
    },
    onError:e=>say('Reconectando… '+String(e.message||''))
   });
   transport.start();
   refreshReady();
   void transport.send('hello',livePilotHandshake(room,room.ownPilot)).catch(e=>console.warn('[CrafRace LIVE] profile handshake:',e.message));
   say('Pista conectada. Comparte el código con tu rival.');
  }catch(e){
   const message=e?.message||'Error de conexión';say('NO SE PUDO UNIR / CREAR: '+message);
   console.warn('[CrafRace LIVE] join/create failed',message);
  }finally{busy=false;if(!closed)$('[data-create]').disabled=$('[data-join]').disabled=false;}
 }
 $('[data-create]').addEventListener('click',()=>void connect(()=>createLiveRoom({
  trackId:localTrackId,
  carId:localCarId,
  laps:Number($('[data-laps]').value)||3,physicsVersion:1,direction:'forward'
 })));
 $('[data-copy]').addEventListener('click',async()=>{
  if(!room?.code)return;
  try{await navigator.clipboard.writeText(String(room.code));say('Código '+room.code+' copiado. Compártelo por mensaje.');}
  catch{say('No se pudo copiar automáticamente. Mantén pulsado el código para seleccionarlo.');}
 });
 $('[data-paste]').addEventListener('click',async()=>{
  try{
   if(!navigator.clipboard?.readText)throw Error('clipboard unavailable');
   const value=await navigator.clipboard.readText();
   const code=String(value||'').toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g,'').slice(0,7);
   if(!code){say('El portapapeles no contiene un código válido.');return;}
   $('[data-code]').value=code;say('Código pegado. Pulsa UNIRME.');
  }catch{$('[data-code]').focus();say('Mantén pulsado el campo CÓDIGO y utiliza Pegar.');}
 });
 const join=()=>{say('Comprobando código…');const code=$('[data-code]').value.trim().toUpperCase();if(!code){say('Introduce el código de la pista.');$('[data-code]').focus();return;}void connect(()=>joinLiveRoom(code));};
 $('[data-join]').addEventListener('click',join);
 for(const field of [$('[data-code]'),$('[data-chat]')]){
  for(const event of ['keydown','keyup','keypress'])field.addEventListener(event,e=>{e.stopPropagation();},{capture:true});
 }
 $('[data-code]').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();join();}});
 $('[data-code]').addEventListener('input',()=>{$('[data-code]').value=$('[data-code]').value.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g,'');});
 $('[data-ready]').addEventListener('click',async()=>{
  if(!transport||readySent)return;$('[data-ready]').disabled=true;
  try{
   await transport.send('ready',livePilotHandshake(room,room.ownPilot));
   readySent=true;refreshReady();say(rivalReady?'Ambos preparados. Esperando salida del anfitrión.':'Preparado. Esperando al rival.');
  }catch(e){say(e.message);$('[data-ready]').disabled=false;}
 });
 $('[data-test-race]').addEventListener('click',async()=>{
  if(!room||!readySent||!rivalReady||closed||launching||localId!==room.host_id)return;
  $('[data-test-race]').disabled=true;
  try{
   const startAt=Math.ceil((transport.serverNow()+12000)/1000)*1000;
   await transport.send('start',{countdownMs:12000,restart:false,startAt});launch();
  }catch(e){say(e.message);if(!closed)$('[data-test-race]').disabled=false;}
 });
 $('[data-send]').addEventListener('click',async()=>{
  const input=$('[data-chat]'),value=input.value.trim();if(!transport||!value||value.length>160)return;
  if(!chatReady(lastChat)){say('Espera cinco segundos entre mensajes.');return;}
  $('[data-send]').disabled=true;
  try{await transport.send('chat',{text:value});lastChat=Date.now();log(pilotName(room.ownPilot,'TÚ')+' · '+value);input.value='';}
  catch(e){say(e.message);}finally{if(!closed)$('[data-send]').disabled=false;}
 });
 $('[data-close]').focus();return dispose;
}
