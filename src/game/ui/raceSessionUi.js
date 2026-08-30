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
  const columns=Math.max(1,Math.min(4,entries.length||1));
  const root=document.createElement('div');
  root.className='tdr-session-rewards';
  root.dataset.tdrRaceUi='1';
  root.style.setProperty('--reward-columns',String(columns));
  root.style.setProperty('--reward-visible',hasChest?'0':'1');
  root.style.setProperty('--reward-transform',hasChest?'translateY(8px)':'none');
  const rewardRows=entries.map((row,i)=>{
    const visual=row.asset
      ? `<img class="tdr-session-item-asset" src="${esc(row.asset)}" alt="${esc(row.name||row.id||'Recompensa')}">`
      : '';
    return `<div class="tdr-session-item" data-r="${i}"><div class="tdr-session-icon">${visual}</div><div class="tdr-session-name">${esc(row.name||row.id||'')}</div><div class="tdr-session-qty">×${Math.max(0,Number(row.qty)||0)}</div></div>`;
  }).join('');
  root.innerHTML=`<section class="tdr-session-card ${hasChest?'is-closed':'is-open'}"><button class="tdr-session-close" data-a="close" aria-label="Cerrar">×</button><div class="tdr-session-kicker">SESIÓN FINALIZADA</div><h2>${hasChest?`COFRE DE ${tier} VUELTAS`:'BOTÍN DE LA SESIÓN'}</h2><div class="tdr-session-sub">Todo lo conseguido durante la tanda se entrega junto.</div>${hasChest?`<div class="tdr-session-pass-wrap"><div class="tdr-session-pass" data-a="open"><img class="tdr-session-pass-frame" src="${baseUrl}assets/season/reward_cards/free_${tone}.svg" alt="Tarjeta de cofre ${tier}"><img class="tdr-session-chest-asset" src="${baseUrl}assets/store/daily_gift.webp" alt="Cofre"><span class="free">FREE</span><span class="tier">COFRE ${tier}</span></div><div class="tdr-session-tap">TOCA PARA ABRIR</div></div>`:''}<div class="tdr-session-reward-body"><div class="tdr-session-head"><small>RECOMPENSAS TOTALES</small><strong>${total} PIEZAS</strong></div><div class="tdr-session-grid">${rewardRows}</div><div class="tdr-session-meta"><span class="tdr-session-chip">🏁 ${Math.max(0,Number(laps)||0)} VUELTAS PREMIADAS</span>${Number(bonusLaps)>0?`<span class="tdr-session-chip">⚡ ${Math.max(0,Number(bonusLaps)||0)} BONUS</span>`:''}${hasChest?`<span class="tdr-session-chip">COFRE ${tier}</span>`:''}</div><button class="tdr-session-next" data-a="next">${esc(resultLabel)}</button></div></section>`;
  const card=root.querySelector('.tdr-session-card'),open=root.querySelector('[data-a="open"]'),tap=root.querySelector('.tdr-session-tap'),next=root.querySelector('[data-a="next"]'),close=root.querySelector('[data-a="close"]');
  let opened=!hasChest,finished=false;
  const reveal=()=>{
    if(opened)return;opened=true;open?.classList.add('open');tap?.classList.add('hide');
    setTimeout(()=>{card?.classList.remove('is-closed');card?.classList.add('is-open');},180);
    entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList.add('show'),220+i*70));
    setTimeout(()=>next?.classList.add('show'),260+entries.length*70);
  };
  const finish=()=>{if(finished)return;finished=true;try{root.remove();}catch{}onFinish();};
  open?.addEventListener('click',reveal,{once:true});
  open?.addEventListener('touchend',event=>{event.preventDefault();reveal();},{once:true,passive:false});
  next?.addEventListener('click',finish);close?.addEventListener('click',finish);
  document.body.appendChild(root);
  return root;
}
