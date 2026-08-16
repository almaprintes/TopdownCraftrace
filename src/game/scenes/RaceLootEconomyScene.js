import { RaceScene as CurrentRaceScene } from './RaceSurvivalPolishScene.js';
import { resetRaceLootSession, getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    resetRaceLootSession(this.trackKey||this.track?.key||'track01');
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
    if(!entries.length)return result;

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
    return result;
  }
}
