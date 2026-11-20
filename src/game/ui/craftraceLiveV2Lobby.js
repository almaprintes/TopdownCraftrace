// CraftRace LIVE 4 — default multiplayer lobby on the browser DEV route only.
// Race start remains server-authorized, unofficial, and isolated from public/native builds.
import {createLiveV2Lobby,joinLiveV2Lobby,configureLiveV2Lobby,
  setReadyLiveV2Lobby,leaveLiveV2Lobby,startLiveV2Lobby,
  CrafRaceLiveV2LobbyMonitor} from '../online/craftraceLiveV2LobbyClient.js';
import {stageLive4RaceSession} from '../online/craftraceLiveV2RaceSession.js';
import {liveIdentity} from '../online/craftraceLiveTransport.js';
import {selectedCircuitRaceId} from '../tracks/trackReverseVariant.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';
import './craftraceLiveV2Lobby.css';

export function openCrafRaceLiveV2Lobby(scene,{carId=null,trackId=null,onOpenClassic=null}={}){
  if(document.getElementById('cr-live4'))return;
  const race4Enabled=(window.location.pathname.includes('/dev/')||
    ['localhost','127.0.0.1'].includes(window.location.hostname))&&
    !globalThis.Capacitor?.isNativePlatform?.();
  const car=String(carId||scene?.selectedCarId||localStorage.getItem('tdr2:carId')||'avenir_gripline');
  const track=String(trackId||selectedCircuitRaceId(scene?.selectedTrackKey||'track01',localStorage));
  const root=document.createElement('section');root.id='cr-live4';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','CraftRace LIVE cuatro pilotos en pruebas');
  root.innerHTML=`
    <div class="cr4-panel">
      <header class="cr4-header">
        <div><small>TOP DOWN RACE · MULTIJUGADOR EXPERIMENTAL</small>
          <h2>CRAFT RACE <em>LIVE 4</em></h2>
          <p>2–4 PILOTOS · HUMANOS E IA · PRUEBA DE PARRILLA</p>
        </div><div class="cr4-header-buttons">
          <button type="button" data-classic>LIVE 2 · CLÁSICO</button>
          <button type="button" data-close aria-label="Cerrar">✕</button>
        </div>
      </header>
      <p class="cr4-status" data-status role="status" aria-live="polite">
        LIVE 4 · Prueba experimental de 2–4 pilotos, sin premios ni récords.</p>
      <div class="cr4-entry" data-entry>
        <section class="cr4-card">
          <h3>CREAR UNA PISTA</h3>
          <p class="cr4-track" data-track></p>
          <div class="cr4-fields">
            <label>Plazas<select data-capacity>
              <option value="2">2</option><option value="3">3</option><option value="4" selected>4</option>
            </select></label>
            <label>Vueltas<select data-laps>
              <option>1</option><option selected>3</option><option>5</option>
              <option>10</option><option>20</option>
            </select></label>
            <label class="cr4-check"><input type="checkbox" data-fill checked> Completar con IA</label>
            <label>Nivel de IA<select data-ai>
              <option value="1">1 · Principiante</option>
              <option value="2" selected>2 · Competitivo</option>
              <option value="3">3 · Experto</option>
            </select></label>
          </div>
          <button type="button" data-create class="cr4-primary">CREAR PISTA</button>
          <div class="cr4-director-entry">
            <label>Dificultad IA del Realizador<select data-director-ai aria-label="Dificultad de las cuatro IA del Realizador">
              <option value="1">1 · Principiante</option>
              <option value="2">2 · Competitivo</option>
              <option value="3" selected>3 · Experto</option>
            </select></label>
            <button type="button" data-director class="cr4-secondary">REALIZADOR · 4 IA</button>
          </div>
          <p>Realizador: EXPERTO por defecto. Nivel independiente de la pista online.
          Prueba local sin premios ni récords.</p>
        </section>
        <section class="cr4-card">
          <h3>UNIRSE A UNA PISTA</h3>
          <p>Introduce el mismo código que te envíe el organizador.</p>
          <label>Código de invitación<input data-code autocomplete="off" autocapitalize="characters"
            maxlength="7" spellcheck="false" placeholder="7 CARACTERES" aria-label="Código de pista"></label>
          <button type="button" data-join class="cr4-secondary">UNIRME</button>
        </section>
      </div>
      <div data-room hidden>
        <div class="cr4-code">
          <div><small>PISTA PRIVADA</small><strong data-roomcode></strong></div>
          <button type="button" data-copy>COPIAR CÓDIGO</button>
        </div>
        <p class="cr4-track" data-rules></p>
        <div class="cr4-seats" data-seats aria-live="polite"></div>
        <div class="cr4-controls">
          <div data-host-settings hidden>
            <label>Plazas<select data-edit-capacity>
              <option value="2">2</option><option value="3">3</option><option value="4">4</option>
            </select></label>
            <label class="cr4-check"><input type="checkbox" data-edit-fill> Completar con IA</label>
            <label>Dificultad<select data-edit-ai>
              <option value="1">1 · Principiante</option>
              <option value="2">2 · Competitivo</option>
              <option value="3">3 · Experto</option>
            </select></label>
            <button type="button" data-apply>APLICAR CAMBIOS</button>
          </div>
          <div class="cr4-actions">
            <button type="button" data-ready class="cr4-primary">ESTOY LISTO</button>
            <button type="button" data-start class="cr4-secondary" hidden>INICIAR CARRERA · BETA</button>
            <button type="button" data-leave>ABANDONAR PISTA</button>
          </div>
        </div>
        <p class="cr4-note" data-rosterstatus></p>
        <p class="cr4-note cr4-note--warning" data-race-warning>La salida de carrera 4P
          requiere el modo experimental y no otorga premios ni récords.</p>
      </div>
      <footer>CRAFT RACE STUDIO · SOLO DEV · SIN PREMIOS NI RÉCORDS</footer>
    </div>`;
  document.body.append(root);
  const $=selector=>root.querySelector(selector);
  const classicButton=$('[data-classic]');
  classicButton.hidden=typeof onOpenClassic!=='function';
  $('[data-director]').hidden=!race4Enabled;
  $('[data-track]').textContent=getTrackPublicName(track);
  let closed=false,loading=false,room=null,identity=null,monitor=null,hydrated=false,launching=false;
  $('[data-race-warning]').textContent=race4Enabled
    ?'CARRERA 4P EXPERIMENTAL · NO HOMOLOGADA · sin monedas ni récords. Comprueba primero la conexión.'
    :'Parrilla de pruebas. La carrera solo puede iniciarse desde el enlace DEV con race4=1.';
  const say=msg=>{if(!closed)$('[data-status]').textContent=msg;};
  const setBusy=on=>{
    loading=on;
    for(const b of root.querySelectorAll('[data-create],[data-director],[data-join],[data-apply],[data-ready],[data-leave],[data-start]'))
      b.disabled=on;
    if(!on&&room?.state!=='waiting')$('[data-ready]').disabled=true;
  };
  const syncOptions=s=>{
    if(hydrated)return;
    $('[data-edit-capacity]').value=String(s.capacity);
    $('[data-edit-fill]').checked=Boolean(s.fill_ai);
    $('[data-edit-ai]').value=String(s.ai_difficulty);
    hydrated=true;
  };
  const update=(s,grid)=>{
    if(closed||!room||s.id!==room.id)return;
    room=s;
    classicButton.hidden=true;
    const host=s.host_id===identity.id;
    $('[data-roomcode]').textContent=s.code;
    $('[data-rules]').textContent=getTrackPublicName(s.track_id)+' · '+s.laps+(s.laps===1?' VUELTA':' VUELTAS');
    $('[data-host-settings]').hidden=!host||s.state!=='waiting';
    syncOptions(s);
    const row=$('[data-seats]');row.replaceChildren();
    for(const seat of grid.seats){
      const card=document.createElement('article');card.className='cr4-seat cr4-seat--'+seat.kind;
      const label=document.createElement('small');label.textContent='PLAZA '+(seat.index+1);card.append(label);
      const name=document.createElement('strong');
      name.textContent=seat.kind==='human'
        ?seat.playerId===identity.id?'TÚ':seat.index===0?'ORGANIZADOR':'PILOTO HUMANO'
        :seat.kind==='ai'?'IA · NIVEL '+seat.difficulty:'LIBRE';
      card.append(name);
      const status=document.createElement('span');
      status.textContent=seat.kind==='human'
        ?seat.online?(seat.ready?'LISTO':'CONECTADO'):'SIN CONEXIÓN'
        :seat.kind==='ai'?'RESERVA PROVISIONAL':'ESPERANDO INVITACIÓN';
      card.append(status);row.append(card);
    }
    const me=s.members.find(m=>m.player_id===identity.id);
    $('[data-ready]').disabled=loading||s.state!=='waiting';
    $('[data-ready]').textContent=me?.ready?'CANCELAR LISTO':'ESTOY LISTO';
    $('[data-start]').hidden=!(race4Enabled&&host&&s.state==='waiting');
    $('[data-start]').disabled=loading||!grid.canStart;
    $('[data-rosterstatus]').textContent=grid.canStart
      ?'PARRILLA PREPARADA · '+grid.humanCount+' HUMANO(S) + '+grid.aiCount+' IA'
      :'PARA SALIR: MÍNIMO 2 PILOTOS Y TODOS LOS HUMANOS LISTOS Y CONECTADOS';
    if(s.state!=='waiting')say('La parrilla de esta pista ya fue bloqueada.');
  };
  const disconnect=()=>{
    monitor?.stop();monitor=null;room=null;hydrated=false;
    if(!closed){$('[data-room]').hidden=true;$('[data-entry]').hidden=false;
      classicButton.hidden=typeof onOpenClassic!=='function';}
  };
  const dispose=()=>{
    if(closed)return;closed=true;monitor?.stop();root.remove();
    scene?.events?.off?.('shutdown',dispose);
    document.removeEventListener('keydown',escape);
  };
  const escape=e=>{if(e.key==='Escape')dispose();};
  $('[data-close]').addEventListener('click',dispose);
  classicButton.addEventListener('click',()=>{
    if(closed||room||typeof onOpenClassic!=='function')return;
    dispose();onOpenClassic();
  });
  document.addEventListener('keydown',escape);
  scene?.events?.once?.('shutdown',dispose);
  const launch=(s)=>{
    if(closed||launching||!race4Enabled||
       !['countdown','racing'].includes(s?.state)||
       !Array.isArray(s.locked_roster))return;
    const seat=s.members?.find(m=>m.player_id===identity?.id)?.seat;
    if(!Number.isInteger(seat)||seat<0||seat>3)return;
    // The server retains the same member seat for reconnection. The room TTL
    // (enforced by snapshot/join RPC) is the real validity limit; a 30-second
    // client guard would incorrectly strand pilots after a network drop.
    launching=true;
    stageLive4RaceSession(s,identity);
    dispose();
    scene.scene.start('race',{
      carId:car,trackKey:s.track_id,gameMode:'online',liveV2RoomId:s.id,
      liveStartAt:Number.isFinite(s.start_at_ms)?s.start_at_ms:null,liveGridSlot:seat,testMode:false
    });
  };
  const enter=async result=>{
    room=result;identity=await liveIdentity();
    if(closed)return;
    if(!result?.members?.some(m=>m.player_id===identity.id))throw Error('No perteneces a esta pista');
    $('[data-entry]').hidden=true;$('[data-room]').hidden=false;
    const {liveV2Grid}=await import('../online/craftraceLiveV2Roster.js');
    update(result,liveV2Grid(result));
    monitor=new CrafRaceLiveV2LobbyMonitor(result.id,{
      onSnapshot:(snapshot,grid)=>{
        update(snapshot,grid);
        if(snapshot.state==='countdown'||snapshot.state==='racing')launch(snapshot);
      },
      onError:e=>say('Comprobando conexión… '+e.message)
    });
    monitor.start();say('Pista conectada. Invita a más pilotos con el código.');
  };
  const action=async(task)=>{
    if(loading||closed)return;
    setBusy(true);
    try{await task();}catch(e){say(e?.message||'Error al comunicar con la pista');}
    finally{if(!closed)setBusy(false);}
  };
  $('[data-director]').addEventListener('click',()=>{
    if(closed||loading||!race4Enabled)return;
    const laps=Number($('[data-laps]').value);
    const difficulty=Number($('[data-director-ai]').value);
    if(![1,3,5,10,20].includes(laps)||![1,2,3].includes(difficulty))return;
    // This separate selector defaults to Expert; online hosts keep level 2
    // as their own existing default. No Supabase room/seat is created.
    dispose();
    scene.scene.start('race',{
      carId:car,trackKey:track,gameMode:'director',testMode:true,
      directorPreview:true,directorLaps:laps,directorAiDifficulty:difficulty
    });
  });
  $('[data-create]').addEventListener('click',()=>void action(async()=>{
    const s=await createLiveV2Lobby({
      trackId:track,carId:car,laps:Number($('[data-laps]').value),
      physicsVersion:1,direction:'forward'
    },{
      capacity:Number($('[data-capacity]').value),
      fillWithAi:$('[data-fill]').checked,aiDifficulty:Number($('[data-ai]').value)
    });
    await enter(s);
  }));
  $('[data-code]').addEventListener('input',()=>{
    $('[data-code]').value=$('[data-code]').value.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g,'');
  });
  $('[data-join]').addEventListener('click',()=>void action(async()=>{
    await enter(await joinLiveV2Lobby($('[data-code]').value.trim().toUpperCase()));
  }));
  $('[data-copy]').addEventListener('click',async()=>{
    if(!room?.code)return;
    try{await navigator.clipboard.writeText(room.code);
      say('Código copiado. Envíalo a tus rivales.');}
    catch{say('Mantén pulsado el código para copiarlo.');}
  });
  $('[data-apply]').addEventListener('click',()=>void action(async()=>{
    if(!room)return;
    const state=await configureLiveV2Lobby(room.id,{
      capacity:Number($('[data-edit-capacity]').value),
      fillWithAi:$('[data-edit-fill]').checked,
      aiDifficulty:Number($('[data-edit-ai]').value)
    });
    hydrated=false;
    const {liveV2Grid}=await import('../online/craftraceLiveV2Roster.js');
    await update(state,liveV2Grid(state));
    say('Cambios aplicados. Los pilotos deben confirmar de nuevo.');
  }));
  $('[data-start]').addEventListener('click',()=>void action(async()=>{
    if(!room||!race4Enabled||room.host_id!==identity?.id)return;
    say('Preparando la salida de los cuatro pilotos…');
    const state=await startLiveV2Lobby(room.id);
    launch(state);
  }));
  $('[data-ready]').addEventListener('click',()=>void action(async()=>{
    if(!room||!identity)return;
    const me=room.members.find(m=>m.player_id===identity.id);
    const state=await setReadyLiveV2Lobby(room.id,!me?.ready);
    const {liveV2Grid}=await import('../online/craftraceLiveV2Roster.js');
    await update(state,liveV2Grid(state));
    say(!me?.ready?'Preparado. Esperando al resto de pilotos.':'Preparación cancelada.');
  }));
  $('[data-leave]').addEventListener('click',()=>void action(async()=>{
    if(!room)return;
    const host=room.host_id===identity?.id;
    if(!confirm(host?'¿Cerrar la pista para todos los pilotos?':'¿Abandonar y liberar tu plaza?'))return;
    const state=await leaveLiveV2Lobby(room.id);
    if(state.rejoinable){say('Puedes volver con el mismo código. Tu plaza está reservada.');return;}
    disconnect();say(host?'Pista cerrada.':'Has abandonado la pista.');
  }));
  return dispose;
}
