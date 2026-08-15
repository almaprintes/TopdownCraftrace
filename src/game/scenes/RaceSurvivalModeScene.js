import { RaceScene as CurrentRaceScene } from './RaceAntiCutPenaltyScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MODE_KEY='tdr2:gameMode';

function readMode(data){
  if(['timeattack','ghost','survival'].includes(data?.gameMode))return data.gameMode;
  try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}
}

function visualCarSprite(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>o?.visible!==false&&o?.texture?.key&&o.texture.key!=='__BODY__'&&scene.textures?.exists?.(o.texture.key))||null;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    this._survivalMode=readMode(data)==='survival';
    this._survivalBots=[];
    this._survivalLastLeaderLap=0;
    this._survivalFinished=false;
    this._survivalPlayerOut=false;
    const result=super.create(data);
    if(this._survivalMode){
      this.time.delayedCall(350,()=>this._initSurvival());
      this.time.delayedCall(900,()=>{if(!this._survivalBots.length)this._initSurvival();});
      this.events.once('shutdown',()=>this._destroySurvival());
    }
    return result;
  }

  _survivalCenterline(){
    const cl=this.track?.meta?.centerline||this.track?.meta?.raceCenterline||this.track?.centerline;
    return Array.isArray(cl)?cl:[];
  }

  _survivalPathPoint(progress){
    const cl=this._survivalCenterline();
    const n=cl.length;if(n<2)return null;
    let p=((progress%1)+1)%1;
    const f=p*n,i=Math.floor(f)%n,j=(i+1)%n,t=f-Math.floor(f);
    const a=cl[i],b=cl[j];
    const ax=Number(a?.x??a?.[0]),ay=Number(a?.y??a?.[1]),bx=Number(b?.x??b?.[0]),by=Number(b?.y??b?.[1]);
    if(![ax,ay,bx,by].every(Number.isFinite))return null;
    return{x:ax+(bx-ax)*t,y:ay+(by-ay)*t,r:Math.atan2(by-ay,bx-ax)};
  }

  _initSurvival(){
    if(!this._survivalMode||this._survivalBots.length)return;
    const visual=visualCarSprite(this);if(!visual||this._survivalCenterline().length<2)return;
    const tex=visual.texture.key;
    const tints=[0x59d7ff,0xff7b5c,0xf5d85c,0xb784ff,0x70f08b];
    const baseLapSec=clamp((Number(this._ttCl?.total)||1200)/Math.max(180,Number(this.maxFwd||500)),20,55);
    for(let i=0;i<5;i++){
      const sprite=this.add.image(0,0,tex).setOrigin(visual.originX??.5,visual.originY??.5).setDepth(Math.max(29,Number(this.carRig?.depth||30)-1));
      sprite.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));
      sprite.setTint(tints[i]).setAlpha(.92);
      try{this.uiCam?.ignore?.(sprite);}catch{}
      this._survivalBots.push({id:`CPU ${i+1}`,sprite,absProgress:-.012*(i+1),lapRate:(1/baseLapSec)*(0.94+i*.018),active:true});
    }
    this._createSurvivalHud();
    this._updateSurvivalBots(0);
  }

  _createSurvivalHud(){
    if(this._survivalHud?.scene)return;
    const c=this.add.container(this.scale.width/2,14).setDepth(5200).setScrollFactor(0);
    const bg=this.add.rectangle(0,0,300,42,0x06131b,.84).setOrigin(.5,0).setStrokeStyle(1,0xffc94a,.65);
    const title=this.add.text(0,7,'⚡ SUPERVIVENCIA · 6 COCHES',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffd76e'}).setOrigin(.5,0);
    const state=this.add.text(0,24,'5 rivales · último eliminado al completar cada vuelta',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#d8e4ec'}).setOrigin(.5,0);
    c.add([bg,title,state]);c._state=state;this._survivalHud=c;
  }

  _survivalEntries(){
    const playerProgress=Number(this.lapCount||0)+clamp(Number(this._computeLapProgress01?.(Number(this.carBody?.x),Number(this.carBody?.y))||0),0,1);
    const arr=[{id:'TÚ',player:true,active:!this._survivalPlayerOut,absProgress:playerProgress}];
    for(const b of this._survivalBots)if(b.active)arr.push(b);
    return arr.filter(e=>e.active).sort((a,b)=>b.absProgress-a.absProgress);
  }

  _eliminateSurvivalLast(){
    const ranked=this._survivalEntries();if(ranked.length<=1)return;
    const last=ranked[ranked.length-1];
    if(last.player){
      this._survivalPlayerOut=true;
      this._showSurvivalNotice('ELIMINADO','Has terminado último en la vuelta','#ff667a');
    }else{
      const bot=this._survivalBots.find(b=>b.id===last.id);if(bot){bot.active=false;bot.sprite?.setVisible(false);}
      this._showSurvivalNotice(`${last.id} ELIMINADO`,'Queda fuera el último clasificado','#ffd76e');
    }
    const remaining=this._survivalEntries();
    if(remaining.length===1){
      this._survivalFinished=true;
      const win=remaining[0].player;
      this._showSurvivalNotice(win?'¡SUPERVIVENCIA GANADA!':`${remaining[0].id} GANA`,win?'Eres el último coche en pista':'Carrera terminada',win?'#62ffb2':'#ff8b78',true);
    }
  }

  _showSurvivalNotice(title,sub,color='#ffd76e',persistent=false){
    try{this._survivalNotice?.destroy?.(true);}catch{}
    const c=this.add.container(this.scale.width/2,82).setDepth(9000).setScrollFactor(0);
    const bg=this.add.rectangle(0,0,310,62,0x071018,.92).setOrigin(.5,0).setStrokeStyle(2,Number(`0x${color.replace('#','')}`),.8);
    const a=this.add.text(0,10,title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color}).setOrigin(.5,0);
    const b=this.add.text(0,36,sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#d7e2e9'}).setOrigin(.5,0);
    c.add([bg,a,b]);this._survivalNotice=c;
    if(!persistent)this.time.delayedCall(1700,()=>{if(c?.scene)c.destroy(true);if(this._survivalNotice===c)this._survivalNotice=null;});
  }

  _updateSurvivalBots(deltaMs){
    if(!this._survivalMode||!this._survivalBots.length)return;
    const dt=Math.max(0,Number(deltaMs)||0)/1000;
    for(const b of this._survivalBots){
      if(!b.active)continue;
      b.absProgress+=b.lapRate*dt;
      const p=this._survivalPathPoint(b.absProgress);if(!p)continue;
      b.sprite.setPosition(p.x,p.y);b.sprite.rotation=p.r+Number(this._carVisualRotOffset||0);
    }
    const ranked=this._survivalEntries();
    const leaderLap=ranked.length?Math.floor(Math.max(...ranked.map(e=>e.absProgress))):0;
    if(this._raceStarted&&leaderLap>this._survivalLastLeaderLap){
      for(let lap=this._survivalLastLeaderLap+1;lap<=leaderLap;lap++)if(this._survivalEntries().length>1)this._eliminateSurvivalLast();
      this._survivalLastLeaderLap=leaderLap;
    }
    const alive=this._survivalEntries();
    if(this._survivalHud?._state?.scene){
      const pos=Math.max(1,alive.findIndex(e=>e.player)+1);
      this._survivalHud._state.setText(this._survivalPlayerOut?`ELIMINADO · ${alive.length} coches siguen`:`POSICIÓN ${pos}/${alive.length} · último fuera en cada vuelta`);
    }
  }

  _destroySurvival(){
    for(const b of this._survivalBots){try{b.sprite?.destroy?.();}catch{}}
    this._survivalBots=[];
    try{this._survivalHud?.destroy?.(true);}catch{}try{this._survivalNotice?.destroy?.(true);}catch{}
    this._survivalHud=null;this._survivalNotice=null;
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(this._survivalMode){
      this._updateSurvivalBots(delta);
      if(this._survivalPlayerOut||this._survivalFinished){
        try{this.carBody?.setVelocity?.(0,0);this.carBody?.setAngularVelocity?.(0);}catch{}
      }
    }
    return result;
  }
}
