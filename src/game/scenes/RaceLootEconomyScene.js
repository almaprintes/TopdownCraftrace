import { RaceScene as CurrentRaceScene } from './RaceSurvivalPolishScene.js';
import { resetRaceLootSession, getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    resetRaceLootSession(this.trackKey||this.track?.key||'track01');
    this._pendingChestMeta=null;
    this._chestDom=null;
    this.events.once('shutdown',()=>{
      try{this._chestDom?.remove?.();}catch{}
      this._chestDom=null;
    });
    return result;
  }

  _showRaceLoot(reward){
    const entries=Object.entries(reward||{}).filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0);
    if(!entries.length)return;

    const meta=reward?.meta||{};
    const bits=entries.map(([id,n])=>{
      const item=GARAGE_ITEMS[id];
      return `${item?.icon||'•'} ${item?.name||id} ×${n}`;
    });

    const kicker=meta.circuitRecord
      ? '🏆 RÉCORD · BOTÍN PREMIUM'
      : meta.carBest
        ? '⚡ MEJOR VUELTA · BONUS'
        : meta.within110
          ? '✓ VUELTA RÁPIDA'
          : '✓ VUELTA VÁLIDA';

    const extras=[];
    if(meta.ecuDrop)extras.push('ECU');
    if(meta.bonusCommon)extras.push('+1 MATERIAL');
    if(meta.chest)extras.push('COFRE 5 VUELTAS');
    const sub=extras.length?`  ·  ${extras.join(' · ')}`:'';

    const color=meta.circuitRecord?'#ffe06a':meta.carBest?'#63ffd1':meta.chest?'#8ad8ff':'#eafff2';
    const border=meta.circuitRecord?'#8a6d18':meta.carBest?'#1b5b50':'#143823';

    try{this._lootToast?.destroy?.();}catch{}
    const t=this.add.text(this.scale.width/2,92,`${kicker}${sub}\n${bits.join('   ')}`,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial,sans-serif',fontSize:'12px',fontStyle:'bold',
      color,backgroundColor:'#07160fee',padding:{x:14,y:9},stroke:border,strokeThickness:2,
      align:'center',lineSpacing:5
    }).setOrigin(.5,0).setScrollFactor(0).setDepth(99999);
    this._lootToast=t;

    try{this.cameras.main.ignore(t);}catch{}
    try{this.uiCam?.removeFromRenderList?.(t);}catch{}

    this.tweens.add({
      targets:t,alpha:0,y:76,delay:2200,duration:420,
      onComplete:()=>{if(t?.scene)t.destroy();if(this._lootToast===t)this._lootToast=null;}
    });

    if(meta.chest){
      if(this._survivalMode)this._pendingChestMeta=meta;
      else this.time.delayedCall(420,()=>this._showChestOpening(meta));
    }
  }

  _showChestOpening(meta,resultRoot=null){
    if(typeof document==='undefined'||!meta?.chest)return;
    try{this._chestDom?.remove?.();}catch{}

    const lootEntries=Object.entries(meta.chestLoot||{})
      .filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0);
    if(!lootEntries.length){
      if(resultRoot)resultRoot.style.display='';
      return;
    }

    if(resultRoot)resultRoot.style.display='none';
    const shouldPause=!this._survivalMode;
    if(shouldPause){try{this.physics?.world?.pause?.();}catch{}}

    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    root.innerHTML=`
      <style>
        .tdrchest-veil{position:fixed;inset:0;z-index:16000;background:radial-gradient(circle at 50% 42%,rgba(67,44,12,.34),rgba(2,5,10,.92) 58%);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff}
        .tdrchest-card{width:min(88vw,460px);padding:22px 24px 20px;text-align:center;background:linear-gradient(180deg,#13202a,#081018);border:1px solid rgba(255,202,91,.48);box-shadow:0 30px 100px rgba(0,0,0,.66),0 0 50px rgba(255,188,70,.09)}
        .tdrchest-k{font-size:9px;font-weight:950;letter-spacing:.18em;color:#ffd36e}.tdrchest-card h2{margin:5px 0 2px;font-size:25px;letter-spacing:.02em}.tdrchest-sub{font-size:10px;color:#9eafbd;margin-bottom:14px}
        .tdrchest-box{position:relative;width:146px;height:112px;margin:6px auto 16px;cursor:pointer;filter:drop-shadow(0 18px 24px rgba(0,0,0,.42));transform:translateZ(0)}
        .tdrchest-base{position:absolute;left:12px;right:12px;bottom:0;height:72px;border-radius:8px 8px 14px 14px;background:linear-gradient(180deg,#b77625,#7a4315);border:3px solid #e6ad4f;box-shadow:inset 0 0 0 3px rgba(61,29,8,.38)}
        .tdrchest-band{position:absolute;left:60px;top:39px;width:26px;height:72px;background:linear-gradient(180deg,#ffe39b,#c98a2e);border:2px solid #f7cb6c;z-index:3}.tdrchest-lock{position:absolute;left:58px;top:65px;width:30px;height:28px;border-radius:5px;background:#f4c85b;border:3px solid #7b4c13;z-index:5;box-shadow:0 0 16px rgba(255,205,79,.25)}
        .tdrchest-lid{position:absolute;left:8px;right:8px;top:22px;height:43px;border-radius:18px 18px 7px 7px;background:linear-gradient(180deg,#ce8b2c,#8d5019);border:3px solid #e8b554;transform-origin:50% 100%;transition:transform .45s cubic-bezier(.2,.8,.2,1),filter .3s;z-index:4}.tdrchest-open .tdrchest-lid{transform:translateY(-7px) rotateX(68deg);filter:brightness(1.25)}
        .tdrchest-glow{position:absolute;left:50%;top:56px;width:20px;height:20px;border-radius:50%;transform:translate(-50%,-50%) scale(.2);background:#fff3a8;box-shadow:0 0 18px 8px #ffd15d,0 0 54px 22px rgba(255,186,55,.7);opacity:0;transition:.45s;z-index:2}.tdrchest-open .tdrchest-glow{opacity:1;transform:translate(-50%,-50%) scale(1.65)}
        .tdrchest-tap{font-size:9px;font-weight:900;letter-spacing:.12em;color:#ffd36e;margin-top:-4px}.tdrchest-open+.tdrchest-tap{opacity:0}
        .tdrchest-rewards{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(2,lootEntries.length))},1fr);gap:9px;margin:4px 0 14px}.tdrchest-item{opacity:0;transform:translateY(12px) scale(.92);background:#0d1a24;border:1px solid #2a3c49;padding:11px 8px;transition:.34s ease}.tdrchest-item.show{opacity:1;transform:none}.tdrchest-ico{font-size:30px;line-height:1}.tdrchest-name{font-size:8px;color:#a9bac9;font-weight:850;margin-top:5px}.tdrchest-q{font-size:17px;font-weight:950;color:#fff;margin-top:2px}
        .tdrchest-continue{width:100%;height:44px;border:1px solid #e0ad4e;background:linear-gradient(180deg,#684317,#39240d);color:#fff;font:950 11px system-ui,-apple-system,sans-serif;letter-spacing:.09em;opacity:0;pointer-events:none;transition:.25s}.tdrchest-continue.show{opacity:1;pointer-events:auto}
      </style>
      <div class="tdrchest-veil"><div class="tdrchest-card">
        <div class="tdrchest-k">BONUS DE SESIÓN · VUELTA ${Number(meta.sessionLap||5)}</div>
        <h2>COFRE DE 5 VUELTAS</h2>
        <div class="tdrchest-sub">La recompensa ya está guardada. Ábrelo para descubrirla.</div>
        <div class="tdrchest-box" data-a="open"><div class="tdrchest-glow"></div><div class="tdrchest-base"></div><div class="tdrchest-band"></div><div class="tdrchest-lid"></div><div class="tdrchest-lock"></div></div>
        <div class="tdrchest-tap">TOCA EL COFRE PARA ABRIR</div>
        <div class="tdrchest-rewards">${lootEntries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrchest-item" data-r="${i}"><div class="tdrchest-ico">${item.icon||'◆'}</div><div class="tdrchest-name">${item.name||id}</div><div class="tdrchest-q">×${Number(n)}</div></div>`;}).join('')}</div>
        <button class="tdrchest-continue" data-a="continue">CONTINUAR</button>
      </div></div>`;

    const box=root.querySelector('[data-a="open"]');
    const btn=root.querySelector('[data-a="continue"]');
    let opened=false;
    const open=()=>{
      if(opened)return;opened=true;
      box?.classList?.add('tdrchest-open');
      lootEntries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList?.add('show'),430+i*260));
      setTimeout(()=>btn?.classList?.add('show'),520+lootEntries.length*260);
    };
    box?.addEventListener('click',open,{once:true});
    box?.addEventListener('touchend',(e)=>{e.preventDefault();open();},{once:true,passive:false});
    btn?.addEventListener('click',()=>{
      try{root.remove();}catch{}
      if(this._chestDom===root)this._chestDom=null;
      if(shouldPause){try{this.physics?.world?.resume?.();}catch{}}
      if(resultRoot)resultRoot.style.display='';
    });
    document.body.appendChild(root);
    this._chestDom=root;
  }

  _showSurvivalResults(){
    const result=super._showSurvivalResults();
    const root=this._survivalResultDom;
    const card=root?.querySelector?.('.tdrsurv-card');
    const actions=root?.querySelector?.('.tdrsurv-actions');
    if(!card||!actions)return result;

    const summary=getRaceLootSessionSummary();
    const entries=Object.entries(summary?.totals||{})
      .filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1]));

    if(entries.length){
      const total=entries.reduce((s,[,n])=>s+Number(n||0),0);
      const loot=document.createElement('div');
      loot.className='tdrsurv-loot';
      loot.innerHTML=`
        <style>
          .tdrsurv-loot{margin:0 0 18px;padding:14px;background:linear-gradient(180deg,rgba(72,255,170,.08),rgba(35,93,72,.08));border:1px solid rgba(79,255,176,.34)}
          .tdrsurv-loot-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:11px}
          .tdrsurv-loot-k{font-size:9px;font-weight:950;letter-spacing:.16em;color:#61ffc0}.tdrsurv-loot-total{font-size:11px;font-weight:900;color:#fff}.tdrsurv-loot-total b{font-size:19px;color:#61ffc0}
          .tdrsurv-loot-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.tdrsurv-loot-item{min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.10);padding:6px 4px;text-align:center}
          .tdrsurv-loot-icon{font-size:22px;line-height:1}.tdrsurv-loot-name{font-size:7px;line-height:1.05;color:#a9bac9;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tdrsurv-loot-qty{font-size:13px;line-height:1;font-weight:950;color:#fff}
          .tdrsurv-loot-meta{margin-top:9px;display:flex;gap:7px;flex-wrap:wrap}.tdrsurv-loot-chip{font-size:7px;font-weight:900;letter-spacing:.05em;color:#b9c9d5;background:#0b1822;border:1px solid #21384a;padding:4px 7px}.tdrsurv-loot-chip.ecu{color:#85ffd0;border-color:#1f6b50}.tdrsurv-loot-chip.chest{color:#d3a9ff;border-color:#59347d}
        </style>
        <div class="tdrsurv-loot-head"><div class="tdrsurv-loot-k">BOTÍN DE LA CARRERA</div><div class="tdrsurv-loot-total"><b>${total}</b> PIEZAS</div></div>
        <div class="tdrsurv-loot-grid">${entries.map(([id,n])=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrsurv-loot-item"><div class="tdrsurv-loot-icon">${item.icon||'◆'}</div><div class="tdrsurv-loot-name">${item.name||id}</div><div class="tdrsurv-loot-qty">×${Number(n)}</div></div>`;}).join('')}</div>
        <div class="tdrsurv-loot-meta">
          <span class="tdrsurv-loot-chip">🏁 ${summary.laps} VUELTAS PREMIADAS</span>
          ${summary.bonusLaps?`<span class="tdrsurv-loot-chip">⚡ ${summary.bonusLaps} BONUS</span>`:''}
          ${summary.ecuDrops?`<span class="tdrsurv-loot-chip ecu">ECU ×${summary.ecuDrops}</span>`:''}
          ${summary.chests?`<span class="tdrsurv-loot-chip chest">▣ COFRE ×${summary.chests}</span>`:''}
        </div>`;
      card.insertBefore(loot,actions);
    }

    if(this._pendingChestMeta){
      const meta=this._pendingChestMeta;
      this._pendingChestMeta=null;
      setTimeout(()=>this._showChestOpening(meta,root),120);
    }
    return result;
  }
}
