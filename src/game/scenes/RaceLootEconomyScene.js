import { RaceScene as CurrentRaceScene } from './RaceSurvivalPolishScene.js';
import { resetRaceLootSession } from '../garage/garageStore.js';
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
}
