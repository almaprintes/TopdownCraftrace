import './raceSessionUi.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function sessionChestTier(laps){
  const n=Math.max(0,Number(laps)||0);
  return n>=5?Math.floor(n/5)*5:0;
}

export function sessionChestTone(tier){
  return tier>=20?'gold':tier>=15?'purple':tier>=10?'green':'blue';
}

export function mountRaceSessionRewards({baseUrl='/',laps=0,bonusLaps=0,entries=[],resultLabel='VER INFORME',onFinish=()=>{}}={}){
  if(typeof document==='undefined')return null;
  const tier=sessionChestTier(laps),tone=sessionChestTone(tier),hasChest=tier>=5;
  const total=entries.reduce((sum,row)=>sum+Math.max(0,Number(row?.qty)||0),0);
  const visibleCount=Math.max(1,Math.min(4,entries.length||1));
  const modalWidth=hasChest?620:Math.min(980,420+visibleCount*180);
  const root=document.createElement('div');
  root.className='tdr-session-rewards';
  root.dataset.tdrRaceUi='1';
  root.dataset.rewardCount=String(entries.length||0);
  root.style.setProperty('--session-width',`${modalWidth}px`);
  root.style.setProperty('--reward-visible',hasChest?'0':'1');
  root.style.setProperty('--reward-transform',hasChest?'translateY(8px)':'none');

  const rewardRows=entries.map((row,i)=>{
    const visual=row.asset
      ? `<img class="tdr-session-item-asset" src="${esc(row.asset)}" alt="${esc(row.name||row.id||'Recompensa')}">`
      : '';
    return `<div class="tdr-session-item" data-r="${i}"><div class="tdr-session-icon">${visual}</div><div class="tdr-session-copy"><div class="tdr-session-name">${esc(row.name||row.id||'')}</div><div class="tdr-session-qty">×${Math.max(0,Number(row.qty)||0)}</div></div></div>`;
  }).join('');

  const chestHero=hasChest?`
    <div class="tdr-session-chest-stage" data-a="open">
      <div class="tdr-session-pass">
        <img class="tdr-session-pass-frame" src="${baseUrl}assets/season/reward_cards/free_${tone}.svg" alt="Tarjeta de cofre ${tier}">
        <img class="tdr-session-chest-asset" src="${baseUrl}assets/store/daily_gift.webp" alt="Cofre">
        <span class="free">FREE</span><span class="tier">COFRE ${tier}</span>
      </div>
      <div class="tdr-session-chest-copy"><strong>COFRE DE ${tier} VUELTAS</strong><span>Has alcanzado el siguiente tramo de recompensa.</span><b>TOCA PARA ABRIR</b></div>
    </div>`:'';

  root.innerHTML=`<section class="tdr-session-card ${hasChest?'is-closed':'is-open'}">
    <button class="tdr-session-close" data-a="close" aria-label="Cerrar">×</button>
    <header class="tdr-session-header">
      <div class="tdr-session-kicker">SESIÓN FINALIZADA</div>
      <h2>BOTÍN DE LA SESIÓN</h2>
      <div class="tdr-session-sub">Todo lo conseguido durante la tanda se entrega junto.</div>
    </header>
    <main class="tdr-session-main">
      ${chestHero}
      <div class="tdr-session-reward-body">
        <div class="tdr-session-head"><small>RECOMPENSAS TOTALES</small><strong>${total} PIEZAS</strong></div>
        <div class="tdr-session-grid">${rewardRows}</div>
      </div>
    </main>
    <footer class="tdr-session-footer">
      <div class="tdr-session-meta"><span class="tdr-session-chip">🏁 ${Math.max(0,Number(laps)||0)} VUELTAS PREMIADAS</span>${Number(bonusLaps)>0?`<span class="tdr-session-chip">⚡ ${Math.max(0,Number(bonusLaps)||0)} BONUS</span>`:''}${hasChest?`<span class="tdr-session-chip">▣ COFRE ${tier}</span>`:''}</div>
      <button class="tdr-session-next" data-a="next">${esc(resultLabel)}</button>
    </footer>
  </section>`;

  const card=root.querySelector('.tdr-session-card'),open=root.querySelector('[data-a="open"]'),next=root.querySelector('[data-a="next"]'),close=root.querySelector('[data-a="close"]');
  let opened=!hasChest,finished=false;
  const reveal=()=>{
    if(opened)return;
    opened=true;
    open?.classList.add('open');
    setTimeout(()=>{card?.classList.remove('is-closed');card?.classList.add('is-open');},160);
    entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList.add('show'),190+i*55));
    setTimeout(()=>next?.classList.add('show'),220+entries.length*55);
  };
  const finish=()=>{if(finished)return;finished=true;try{root.remove();}catch{}onFinish();};
  open?.addEventListener('click',reveal,{once:true});
  open?.addEventListener('touchend',event=>{event.preventDefault();reveal();},{once:true,passive:false});
  next?.addEventListener('click',finish);
  close?.addEventListener('click',finish);
  document.body.appendChild(root);
  return root;
}
