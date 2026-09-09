import './raceSessionUi.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function sessionChestTier(laps){
  const n=Math.max(0,Number(laps)||0);
  return n>=5?Math.floor(n/5)*5:0;
}

export function sessionChestTone(tier){
  return tier>=20?'gold':tier>=15?'purple':tier>=10?'green':'blue';
}

export function mountRaceSessionRewards({baseUrl='/',laps=0,bonusLaps=0,entries=[],resultLabel='VER INFORME',canDouble=false,onDouble=null,onFinish=()=>{}}={}){
  if(typeof document==='undefined')return null;
  const tier=sessionChestTier(laps),tone=sessionChestTone(tier),hasChest=tier>=5;
  const total=entries.reduce((sum,row)=>sum+Math.max(0,Number(row?.qty)||0),0);
  const doubleEnabled=canDouble===true&&typeof onDouble==='function'&&total>0;
  const root=document.createElement('div');
  root.className='tdr-session-rewards';
  root.dataset.tdrRaceUi='1';
  root.dataset.rewardCount=String(entries.length||0);
  root.style.setProperty('--reward-visible',hasChest?'0':'1');
  root.style.setProperty('--reward-transform',hasChest?'translateY(8px)':'none');

  const rewardRows=entries.map((row,i)=>{
    const visual=row.asset
      ? `<img class="tdr-session-item-asset" src="${esc(row.asset)}" alt="${esc(row.name||row.id||'Recompensa')}">`
      : '';
    return `<div class="tdr-session-item" data-r="${i}" data-q="${Math.max(0,Number(row.qty)||0)}"><div class="tdr-session-icon">${visual}</div><div class="tdr-session-copy"><div class="tdr-session-name">${esc(row.name||row.id||'')}</div><div class="tdr-session-qty">×${Math.max(0,Number(row.qty)||0)}</div></div></div>`;
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

  const doubleButton=doubleEnabled?`<button data-a="double" type="button" aria-label="Duplicar botín viendo un anuncio recompensado" style="width:100%;min-height:48px;border:1px solid #f6c94c;background:linear-gradient(180deg,#503d09,#251c05);color:#fff;font-size:11px;font-weight:1000;letter-spacing:.08em;display:grid;place-items:center;gap:2px;padding:7px 12px;opacity:${hasChest?'0':'1'};pointer-events:${hasChest?'none':'auto'};transition:.2s"><span data-a="double-main">▶ ×2 DUPLICAR BOTÍN</span><small data-a="double-sub" style="font-size:7px;letter-spacing:.11em;color:#ffe79a">ANUNCIO RECOMPENSADO · OPCIONAL</small></button>`:'';

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
        <div class="tdr-session-head"><small>RECOMPENSAS TOTALES</small><strong data-a="total">${total} PIEZAS</strong></div>
        <div class="tdr-session-grid">${rewardRows}</div>
      </div>
    </main>
    <footer class="tdr-session-footer">
      <div class="tdr-session-meta"><span class="tdr-session-chip">🏁 ${Math.max(0,Number(laps)||0)} VUELTAS PREMIADAS</span>${Number(bonusLaps)>0?`<span class="tdr-session-chip">⚡ ${Math.max(0,Number(bonusLaps)||0)} BONUS</span>`:''}${hasChest?`<span class="tdr-session-chip">▣ COFRE ${tier}</span>`:''}</div>
      ${doubleButton}
      <button class="tdr-session-next" data-a="next">${esc(resultLabel)}</button>
    </footer>
  </section>`;

  const card=root.querySelector('.tdr-session-card'),open=root.querySelector('[data-a="open"]'),next=root.querySelector('[data-a="next"]'),close=root.querySelector('[data-a="close"]'),doubleBtn=root.querySelector('[data-a="double"]'),doubleMain=root.querySelector('[data-a="double-main"]'),doubleSub=root.querySelector('[data-a="double-sub"]'),totalEl=root.querySelector('[data-a="total"]');
  let opened=!hasChest,finished=false,doubling=false,doubled=false;
  const revealDouble=()=>{if(!doubleBtn||doubled)return;doubleBtn.style.opacity='1';doubleBtn.style.pointerEvents='auto';};
  const reveal=()=>{
    if(opened)return;
    opened=true;
    open?.classList.add('open');
    setTimeout(()=>{card?.classList.remove('is-closed');card?.classList.add('is-open');},160);
    entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList.add('show'),190+i*55));
    setTimeout(()=>{next?.classList.add('show');revealDouble();},220+entries.length*55);
  };
  const resetDoubleButton=()=>{
    if(!doubleBtn||doubled)return;
    doubleBtn.disabled=false;
    doubleBtn.style.opacity='1';
    doubleBtn.style.pointerEvents='auto';
    doubleBtn.style.borderColor='#f6c94c';
    doubleBtn.style.background='linear-gradient(180deg,#503d09,#251c05)';
    if(doubleMain)doubleMain.textContent='▶ ×2 DUPLICAR BOTÍN';
    if(doubleSub)doubleSub.textContent='ANUNCIO RECOMPENSADO · OPCIONAL';
  };
  const applyDoubledVisuals=()=>{
    doubled=true;
    for(const row of root.querySelectorAll('.tdr-session-item')){
      const qty=Math.max(0,Number(row.dataset.q)||0);
      const qtyEl=row.querySelector('.tdr-session-qty');
      if(qtyEl)qtyEl.textContent=`×${qty*2}`;
    }
    if(totalEl)totalEl.textContent=`${total*2} PIEZAS`;
    if(doubleBtn){
      doubleBtn.disabled=true;
      doubleBtn.style.pointerEvents='none';
      doubleBtn.style.opacity='1';
      doubleBtn.style.borderColor='#62edbd';
      doubleBtn.style.background='linear-gradient(180deg,#164c3d,#0b2c25)';
    }
    if(doubleMain)doubleMain.textContent='✓ BOTÍN DUPLICADO';
    if(doubleSub)doubleSub.textContent='RECOMPENSA CONCEDIDA';
  };
  const requestDouble=async()=>{
    if(!opened||doubling||doubled||finished||!doubleEnabled)return;
    doubling=true;
    if(doubleBtn){doubleBtn.disabled=true;doubleBtn.style.pointerEvents='none';doubleBtn.style.opacity='.72';}
    if(doubleMain)doubleMain.textContent='CARGANDO ANUNCIO…';
    if(doubleSub)doubleSub.textContent='NO CIERRES ESTA PANTALLA';
    let result=null;
    try{result=await onDouble();}catch(error){console.error('[post-race-x2] UI callback failed',error);}
    doubling=false;
    if(result?.ok){applyDoubledVisuals();return;}
    if(doubleMain)doubleMain.textContent='ANUNCIO NO COMPLETADO';
    if(doubleSub)doubleSub.textContent='CONSERVAS TODO TU BOTÍN · PUEDES REINTENTAR';
    setTimeout(resetDoubleButton,1400);
  };
  const finish=()=>{if(finished||doubling)return;finished=true;try{root.remove();}catch{}onFinish();};
  open?.addEventListener('click',reveal,{once:true});
  open?.addEventListener('touchend',event=>{event.preventDefault();reveal();},{once:true,passive:false});
  doubleBtn?.addEventListener('click',requestDouble);
  next?.addEventListener('click',finish);
  close?.addEventListener('click',finish);
  document.body.appendChild(root);
  return root;
}
