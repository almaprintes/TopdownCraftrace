// CraftRace LIVE 4 — preview of the authenticated v2 lobby only.
// Explicit DEV opt-in via ?live4=1. No racing or physics is started here.
import {createLiveV2Lobby,joinLiveV2Lobby,configureLiveV2Lobby,
  setReadyLiveV2Lobby,leaveLiveV2Lobby,CrafRaceLiveV2LobbyMonitor} from '../online/craftraceLiveV2LobbyClient.js';
import {liveIdentity} from '../online/craftraceLiveTransport.js';
import {selectedCircuitRaceId} from '../tracks/trackReverseVariant.js';
import {getTrackPublicName} from '../tracks/trackPublicNames.js';
import './craftraceLiveV2Lobby.css';

export function openCrafRaceLiveV2Lobby(scene,{carId=null,trackId=null}={}){
  if(document.getElementById('cr-live4'))return;
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
        </div><button type="button" data-close aria-label="Cerrar">✕</button>
      </header>
      <p class="cr4-status" data-status role="status" aria-live="polite">
        Beta de invitaciones. Las carreras de cuatro aún no están habilitadas.</p>
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
            <button type="button" data-leave>ABANDONAR PISTA</button>
          </div>
        </div>
        <p class="cr4-note" data-rosterstatus></p>
        <p class="cr4-note cr4-note--warning">La parrilla ya se puede probar con otros
          jugadores. <strong>La salida de carrera 4P todavía está desactivada</strong> hasta
          integrar y validar los tres rivales, la IA física y los resultados.</p>
      </div>
      <footer>CRAFT RACE STUDIO · SOLO DEV · SIN PREMIOS NI RÉCORDS</footer>
    </div>`;
  document.body.append(root);
  const $=selector=>root.querySelector(selector);
  $('[data-track]').textContent=getTrackPublicName(track);
  let closed=false,loading=false,room=null,identity=null,monitor=null,hydrated=false;
  const say=msg=>{if(!closed)$('[data-status]').textContent=msg;};
  const setBusy=on=>{
    loading=on;
    for(const b of root.querySelectorAll('[data-create],[data-join],[data-apply],[data-ready],[data-leave]'))
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
    $('[data-rosterstatus]').textContent=grid.canStart
      ?'PARRILLA PREPARADA · '+grid.humanCount+' HUMANO(S) + '+grid.aiCount+' IA'
      :'PARA SALIR: MÍNIMO 2 PILOTOS Y TODOS LOS HUMANOS LISTOS Y CONECTADOS';
    if(s.state!=='waiting')say('La parrilla de esta pista ya fue bloqueada.');
  };
  const disconnect=()=>{
    monitor?.stop();monitor=null;room=null;hydrated=false;
    if(!closed){$('[data-room]').hidden=true;$('[data-entry]').hidden=false;}
  };
  const dispose=()=>{
    if(closed)return;closed=true;monitor?.stop();root.remove();
    scene?.events?.off?.('shutdown',dispose);
    document.removeEventListener('keydown',escape);
  };
  const escape=e=>{if(e.key==='Escape')dispose();};
  $('[data-close]').addEventListener('click',dispose);
  document.addEventListener('keydown',escape);
  scene?.events?.once?.('shutdown',dispose);
  const enter=async result=>{
    room=result;identity=await liveIdentity();
    if(closed)return;
    if(!result?.members?.some(m=>m.player_id===identity.id))throw Error('No perteneces a esta pista');
    $('[data-entry]').hidden=true;$('[data-room]').hidden=false;
    const {liveV2Grid}=await import('../online/craftraceLiveV2Roster.js');
    update(result,liveV2Grid(result));
    monitor=new CrafRaceLiveV2LobbyMonitor(result.id,{
      onSnapshot:(snapshot,grid)=>update(snapshot,grid),
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
