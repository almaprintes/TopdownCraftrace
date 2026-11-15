// DEV-only CrafRace LIVE transport laboratory; no race simulation is connected.
import {createLiveRoom,joinLiveRoom,CrafRaceLiveTransport} from '../online/craftraceLiveTransport.js';
import {chatReady} from '../online/craftraceLiveProtocol.js';
import {selectedCircuitRaceId} from '../tracks/trackReverseVariant.js';
import './craftraceLiveLobby.css';
export function openCrafRaceLiveLobby(scene){
 if(document.getElementById('cr-live-lab'))return;
 const root=document.createElement('div');root.id='cr-live-lab';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.innerHTML='<section class="cr-live-panel"><header><small>CRAFT RACE STUDIO · DEV</small><button data-close aria-label="Cerrar">✕</button><h2>CRAFRACE LIVE</h2></header><p>Laboratorio de conexión de dos pilotos. Prueba técnica online: salida aún no sincronizada.</p><p data-status role="status" aria-live="polite">Crea una pista o introduce un código.</p><div data-actions class="cr-live-row"><button data-create>CREAR PISTA</button><input data-code maxlength="7" aria-label="Código" placeholder="CÓDIGO"><button data-join>UNIRME</button></div><div data-room hidden><h3 data-roomcode></h3><p data-pilots>Esperando al rival…</p><button data-ready disabled>ESTOY LISTO</button><button data-test-race hidden>INICIAR PRUEBA ONLINE</button><div data-messages aria-live="polite"></div><div class="cr-live-row"><input data-chat maxlength="160" aria-label="Mensaje" placeholder="Mensaje al rival"><button data-send>ENVIAR</button></div></div><footer>Sin premios ni clasificaciones · DEV LAB</footer></section>';
 document.body.append(root);const $=s=>root.querySelector(s);
 let transport=null,room=null,busy=false,closed=false,lastChat=0,readySent=false,rivalReady=false,localId=null,launching=false;
 const say=s=>{if(!closed)$('[data-status]').textContent=String(s);};
 const log=s=>{const p=document.createElement('p');p.textContent=s;$('[data-messages]').append(p);while($('[data-messages]').children.length>10)$('[data-messages]').firstChild.remove();};
 const refreshReady=()=>{if(closed||!room)return;$('[data-test-race]').hidden=!(readySent&&rivalReady&&localId===room.host_id);const joined=!!room.guest_id;$('[data-pilots]').textContent=joined?(rivalReady?'RIVAL PREPARADO · '+(readySent?'AMBOS LISTOS':'FALTA TU CONFIRMACIÓN'):'DOS PILOTOS CONECTADOS'):'ESPERANDO AL SEGUNDO PILOTO';$('[data-ready]').disabled=!joined||readySent;};
 const launch=()=>{if(closed||launching||!room||!readySent||!rivalReady)return;launching=true;const liveRoomId=room.id,carId=scene?.selectedCarId||room.car_id,trackKey=room.track_id;dispose();scene.scene.start('race',{carId,trackKey,liveRoomId,gameMode:'online',testMode:true});};
 const dispose=()=>{if(closed)return;closed=true;transport?.stop();root.remove();scene?.events?.off?.('shutdown',dispose);document.removeEventListener('keydown',esc);};
 const esc=e=>{if(e.key==='Escape')dispose();};
 $('[data-close]').addEventListener('click',dispose);document.addEventListener('keydown',esc);scene?.events?.once?.('shutdown',dispose);
 async function connect(fn){
  if(busy||closed)return;busy=true;$('[data-create]').disabled=$('[data-join]').disabled=true;
  try{
   say('Conectando…');room=await fn();if(closed)return;if(!room?.id||!room?.code)throw Error('Respuesta incompleta.');
   $('[data-actions]').hidden=true;$('[data-room]').hidden=false;$('[data-roomcode]').textContent='CÓDIGO · '+room.code;
   const identity=await import('../online/craftraceLiveTransport.js').then(m=>m.liveIdentity());if(closed)return;localId=identity.id;
   transport=new CrafRaceLiveTransport(room.id,{
    onState:d=>{if(closed)return;if(d.host_id!==room.host_id||d.room_id!==room.id)return;room.guest_id=d.guest_id;refreshReady();},
    onPacket:p=>{if(p.from!==(localId===room.host_id?room.guest_id:room.host_id))return;if(p.type==='start'&&p.from===room.host_id&&p.payload.restart===false){launch();return;}if(p.type==='chat')log('RIVAL · '+String(p.payload.text||''));if(p.type==='ready'&&p.payload.trackId===room.track_id&&p.payload.physicsVersion===room.physics_version&&p.payload.direction===room.direction&&p.payload.laps===room.laps){rivalReady=true;log('El rival está preparado.');refreshReady();if(readySent)say('Ambos preparados. Esperando salida del anfitrión.');}},
    onError:e=>say('Reconectando… '+String(e.message||''))
   });transport.start();say('Pista conectada. Esperando al segundo piloto.');
  }catch(e){say(e.message||'Error de conexión');}
  finally{busy=false;if(!closed)$('[data-create]').disabled=$('[data-join]').disabled=false;}
 }
 $('[data-create]').addEventListener('click',()=>void connect(()=>createLiveRoom({trackId:selectedCircuitRaceId(scene?.selectedTrackKey||'track01',localStorage),carId:scene?.selectedCarId||'avenir_gripline',laps:3,physicsVersion:1,direction:'forward'})));
 $('[data-join]').addEventListener('click',()=>void connect(()=>joinLiveRoom($('[data-code]').value)));
 $('[data-ready]').addEventListener('click',async()=>{if(!transport||readySent)return;$('[data-ready]').disabled=true;
  try{await transport.send('ready',{trackId:room.track_id,physicsVersion:room.physics_version,direction:room.direction,laps:room.laps});readySent=true;refreshReady();say(rivalReady?'Ambos preparados. Esperando salida del anfitrión.':'Preparado. Esperando al rival.');}
  catch(e){say(e.message);$('[data-ready]').disabled=false;}
 });
 $('[data-test-race]').addEventListener('click',async()=>{
  if(!room||!readySent||!rivalReady||closed||launching||localId!==room.host_id)return;
  $('[data-test-race]').disabled=true;
  try{await transport.send('start',{countdownMs:8000,restart:false});launch();}
  catch(e){say(e.message);if(!closed)$('[data-test-race]').disabled=false;}
 });
 $('[data-send]').addEventListener('click',async()=>{
  const input=$('[data-chat]'),value=input.value.trim();if(!transport||!value||value.length>160)return;
  if(!chatReady(lastChat)){say('Espera cinco segundos entre mensajes.');return;}
  $('[data-send]').disabled=true;
  try{await transport.send('chat',{text:value});lastChat=Date.now();log('TÚ · '+value);input.value='';}
  catch(e){say(e.message);}finally{if(!closed)$('[data-send]').disabled=false;}
 });
 $('[data-close]').focus();return dispose;
}
