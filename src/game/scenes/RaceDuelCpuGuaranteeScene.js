import { RaceScene as DuelRaceScene } from './RaceDuelModeScene.js';
import { readSurvivalAiRuntime } from '../ai/survivalAiRuntime.js';

const AI_MODE_KEY='tdr2:survivalAiMode';

export class RaceScene extends DuelRaceScene {
  _ensureDuelCpu1(){
    if(!this._duelMode||this._duelCpuReady)return;

    try{localStorage.setItem(AI_MODE_KEY,'planner_v1');}catch{}
    this._survivalAiRuntime=readSurvivalAiRuntime();

    // First let the homologated Survival initializer do its normal work.
    this._initSurvivalPlannerBot?.();

    // Duel must never depend on a six-car grid being successfully converted.
    // If the planner initializer did not leave a physical rival, bootstrap CPU1
    // explicitly from the first inherited bot and the already-built speed profile.
    let keep=this._survivalPlannerBot;
    if(!keep?.plannerBody?.body){
      const bots=Array.isArray(this._survivalBots)?this._survivalBots:[];
      keep=bots.find(b=>b?.active&&b?.sprite?.scene)||null;
      const samples=this._survivalPlannerSpeedProfile?.samples;
      if(keep&&Array.isArray(samples)&&samples.length>3&&this.physics?.add?.sprite){
        const logical=Number(keep.absProgress||0)+Number(this._survivalPathOffset||0);
        const index=Math.floor((((logical%1)+1)%1)*samples.length)%samples.length;
        const p=samples[index],next=samples[(index+1)%samples.length];
        const body=this.physics.add.sprite(Number(p.x),Number(p.y),'__BODY__');
        body.setVisible(false);
        body.setCircle(Math.max(7,Math.round(Math.min(Number(keep.sprite?.displayWidth||28),Number(keep.sprite?.displayHeight||48))*.22)));
        body.setCollideWorldBounds(true);body.setBounce(0);body.setDrag(0,0);
        body.rotation=Math.atan2(Number(next.y)-Number(p.y),Number(next.x)-Number(p.x));
        body.setVelocity(0,0);
        keep.plannerBody=body;
        keep._plannerSampleIndex=index;
        keep._plannerFrac=((Number(keep.absProgress||0)%1)+1)%1;
        keep._plannerControl=null;
        keep.prevX=Number(body.x);keep.prevY=Number(body.y);
        keep.sprite.setPosition(body.x,body.y);
        keep.sprite.rotation=body.rotation+Number(this._carVisualRotOffset||0);
        this._survivalPlannerBot=keep;
      }
    }

    const bots=Array.isArray(this._survivalBots)?this._survivalBots:[];
    keep=this._survivalPlannerBot;
    const ready=Boolean(keep?.sprite?.scene&&keep?.plannerBody?.body);
    if(!ready){
      this._duelCpuInitAttempts=Number(this._duelCpuInitAttempts||0)+1;
      if(this._duelCpuInitAttempts<12){
        this._survivalHud?._state?.setText?.('DUELO · PREPARANDO CPU1…');
        this.time?.delayedCall?.(120,()=>this._ensureDuelCpu1());
      }else{
        try{this.physics?.world?.pause?.();}catch{}
        this._survivalHud?._title?.setText?.('🏎️ DUELO · CPU1 NO DISPONIBLE').setColor?.('#ff7788');
        this._survivalHud?._state?.setText?.('CPU1 no pudo crearse · duelo detenido');
        this._showSurvivalNotice?.('CPU1 NO PUDO INICIAR','El duelo se ha detenido para no arrancar sin rival','#ff7788',true);
      }
      return;
    }

    // Only now remove the inherited spare grid. CPU1 itself is retained intact.
    for(const b of bots){
      if(b===keep)continue;
      b.active=false;
      try{b.sprite?.destroy?.();}catch{}
      try{b.plannerBody?.destroy?.();}catch{}
    }
    keep.id='CPU1';keep.active=true;keep.finished=false;
    keep.sprite.setVisible(true).setAlpha(1);
    keep.sprite.setDepth(Math.max(31,Number(this.carRig?.depth||30)+1));
    keep.sprite.setPosition(Number(keep.plannerBody.x),Number(keep.plannerBody.y));
    this._survivalBots=[keep];
    this._survivalPlannerBot=keep;
    this._survivalRound=0;
    this._duelCpuReady=true;
    this._survivalHud?._title?.setText?.('🏎️ DUELO · TÚ VS CPU1').setColor?.('#ffb45f');
    this._survivalHud?._state?.setText?.(`STINT · ${this._duelLapTarget} VUELTAS · CPU1 LISTO`);
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(this._duelMode&&this._duelCpuReady){
      const b=this._survivalPlannerBot;
      if(b?.active&&b?.sprite?.scene&&b?.plannerBody?.body){
        // A Duel rival is a permanent game object. No inherited presentation
        // layer is allowed to leave it hidden or detached from its physical body.
        b.sprite.setVisible(true).setAlpha(1);
        b.sprite.setDepth(Math.max(31,Number(this.carRig?.depth||30)+1));
      }
    }
    return result;
  }
}
