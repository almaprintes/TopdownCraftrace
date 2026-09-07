import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceTuningScene.js';

const SURVIVAL_MAX_LAPS=5;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function playerVisual(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>o?.visible!==false&&o?.texture?.key&&o.texture.key!=='__BODY__'&&scene.textures?.exists?.(o.texture.key))||null;
}

function survivalBotKey(bot){
  return [bot?.id,bot?.key,bot?.carId,bot?.carKey,bot?.model,bot?.name,bot?.sprite?.texture?.key]
    .filter(Boolean).join(' ').toLowerCase();
}

function survivalBotLabel(bot){
  const raw=bot?.displayName||bot?.name||bot?.model||bot?.carName||bot?.carId||bot?.carKey||bot?.id||bot?.sprite?.texture?.key||'RIVAL';
  return String(raw).replace(/^car[-_ ]?/i,'').replace(/[_-]+/g,' ').trim().toUpperCase()||'RIVAL';
}

function survivalBotVisualScale(bot){
  return survivalBotKey(bot).includes('colossus')?1.28:1;
}

export class RaceScene extends CurrentRaceScene{
  _registerFinishCross(racer){
    const isSurvivalPlayer=this._survivalMode&&racer===this._survivalPlayer;
    if(isSurvivalPlayer&&(this._survivalFinished||Number(racer?.completedLaps||0)>=SURVIVAL_MAX_LAPS))return false;

    const completed=super._registerFinishCross(racer);
    if(!completed||!isSurvivalPlayer)return completed;

    const laps=Number(racer?.completedLaps||0);
    if(laps<SURVIVAL_MAX_LAPS)return completed;

    racer.completedLaps=SURVIVAL_MAX_LAPS;
    if(Array.isArray(racer._survivalLapTimesMs)){
      racer._survivalLapTimesMs=racer._survivalLapTimesMs.slice(0,SURVIVAL_MAX_LAPS);
      this._syncSurvivalAuthoritativeHistory?.(racer);
    }
    if(Array.isArray(this.ttHistory)&&this.ttHistory.length>SURVIVAL_MAX_LAPS)this.ttHistory=this.ttHistory.slice(0,SURVIVAL_MAX_LAPS);
    this._survivalRound=SURVIVAL_MAX_LAPS;

    try{
      if(this.carBody?.body?.velocity){
        this.carBody.body.velocity.x=0;
        this.carBody.body.velocity.y=0;
      }
      if(Number.isFinite(this.carBody?.body?.angularVelocity))this.carBody.body.angularVelocity=0;
    }catch{}

    if(!this._survivalFinished)this._finishSurvival?.(true);
    return true;
  }

  _survivalAuthoritativePlayerTimes(){
    const participants=this._survivalRaceState?.participants;
    const player=Array.isArray(participants)
      ?participants.find(p=>p?.player===true||p?.id==='TÚ')
      :null;
    return (Array.isArray(player?.lapTimesMs)?player.lapTimesMs:[])
      .map(Number)
      .filter(ms=>Number.isFinite(ms)&&ms>1000)
      .slice(0,SURVIVAL_MAX_LAPS);
  }

  _survivalSessionBestLapMs(){
    const times=this._survivalAuthoritativePlayerTimes();
    if(times.length)return Math.min(...times);
    return super._survivalSessionBestLapMs?.()??null;
  }

  _showSurvivalSessionInfo(resultRoot){
    // The race authority is the source of truth. Mirror its five player times
    // into the legacy fields only while the inherited report is assembled.
    const authoritativeTimes=this._survivalAuthoritativePlayerTimes();
    if(authoritativeTimes.length){
      if(this._survivalPlayer)this._survivalPlayer._survivalLapTimesMs=[...authoritativeTimes];
      this._survivalPlayerLapTimes=[...authoritativeTimes];
    }

    const realHistory=Array.isArray(this.ttHistory)?this.ttHistory.slice(0,SURVIVAL_MAX_LAPS):[];
    const originalDescriptor=Object.getOwnPropertyDescriptor(this,'ttHistory');
    let value=this.ttHistory;
    try{
      Object.defineProperty(this,'ttHistory',{
        configurable:true,
        enumerable:originalDescriptor?.enumerable??true,
        get:()=>value,
        set:(next)=>{
          let rows=Array.isArray(next)?next:null;
          const lapOnly=rows&&rows.length<=SURVIVAL_MAX_LAPS&&rows.every(row=>{
            if(!row||typeof row!=='object')return false;
            const keys=Object.keys(row);
            return keys.length===1&&keys[0]==='lapMs';
          });
          if(lapOnly&&authoritativeTimes.length&&rows.length!==authoritativeTimes.length){
            rows=authoritativeTimes.map(lapMs=>({lapMs}));
          }
          value=lapOnly
            ?rows.map((row,i)=>({...realHistory[i],lapMs:row.lapMs}))
            :next;
        }
      });
      return super._showSurvivalSessionInfo(resultRoot);
    }finally{
      if(originalDescriptor)Object.defineProperty(this,'ttHistory',originalDescriptor);
      else{
        try{delete this.ttHistory;}catch{}
        this.ttHistory=value;
      }
    }
  }

  _survivalPlayerVisualSize(){
    const visual=playerVisual(this);
    if(!visual)return{w:30,h:54};
    const rigSX=Math.abs(Number(this.carRig?.scaleX));
    const rigSY=Math.abs(Number(this.carRig?.scaleY));
    let w=Math.abs(Number(visual.displayWidth||visual.width||30))*(Number.isFinite(rigSX)&&rigSX>0?rigSX:1);
    let h=Math.abs(Number(visual.displayHeight||visual.height||54))*(Number.isFinite(rigSY)&&rigSY>0?rigSY:1);
    if(!Number.isFinite(w)||w<8)w=30;
    if(!Number.isFinite(h)||h<12)h=54;
    const long=Math.max(w,h),short=Math.min(w,h);
    const safeShort=clamp(short,18,46);
    const aspect=clamp(long/Math.max(1,short),1.25,2.35);
    const safeLong=clamp(safeShort*aspect,32,86);
    return w<=h?{w:safeShort,h:safeLong}:{w:safeLong,h:safeShort};
  }

  _normalizeSurvivalRivals(){
    if(!this._survivalMode||!Array.isArray(this._survivalBots)||!this._survivalBots.length)return;
    const size=this._survivalPlayerVisualSize();
    this._survivalContactSize=size;
    for(const bot of this._survivalBots){
      const sprite=bot?.sprite;if(!sprite?.scene)continue;
      const visualScale=survivalBotVisualScale(bot);
      try{sprite.setDisplaySize(size.w*visualScale,size.h*visualScale);}catch{}
      bot._contactX=Number(bot._contactX)||0;
      bot._contactY=Number(bot._contactY)||0;
    }
  }

  _destroySurvivalEliminationHud(){
    try{this._survivalEliminationHudDom?.remove?.();}catch{}
    this._survivalEliminationHudDom=null;
  }

  _syncSurvivalEliminationHud(){
    if(typeof document==='undefined'||!this._survivalMode)return;
    const bots=Array.isArray(this._survivalBots)?this._survivalBots:[];
    this._survivalSeenActiveBots??=new Set();
    this._survivalEliminatedBots??=[];
    this._survivalEliminatedSet??=new Set();

    for(const bot of bots){
      if(bot?.active&&bot?.sprite?.visible!==false)this._survivalSeenActiveBots.add(bot);
      const wasActive=this._survivalSeenActiveBots.has(bot);
      const nowOut=bot?.active===false||bot?.sprite?.visible===false||!bot?.sprite?.scene;
      if(wasActive&&nowOut&&!this._survivalEliminatedSet.has(bot)){
        this._survivalEliminatedSet.add(bot);
        this._survivalEliminatedBots.push(bot);
      }
    }

    const eliminated=this._survivalEliminatedBots.slice(0,SURVIVAL_MAX_LAPS);
    if(!eliminated.length){
      if(this._survivalEliminationHudDom)this._survivalEliminationHudDom.style.display='none';
      return;
    }

    let root=this._survivalEliminationHudDom;
    if(!root){
      root=document.createElement('div');
      root.dataset.tdrRaceUi='1';
      root.style.cssText='position:fixed;right:max(12px,env(safe-area-inset-right));top:max(58px,env(safe-area-inset-top));z-index:2147482500;pointer-events:none;min-width:150px;max-width:31vw;padding:8px 10px;background:rgba(5,12,20,.86);border:1px solid rgba(88,232,255,.36);box-shadow:0 8px 28px rgba(0,0,0,.38);font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;';
      document.body.appendChild(root);
      this._survivalEliminationHudDom=root;
    }
    root.style.display='block';
    root.innerHTML=`<div style="font-size:8px;font-weight:950;letter-spacing:.16em;color:#63e8ff;margin-bottom:5px">ELIMINADOS</div>${eliminated.map((bot,i)=>`<div style="font-size:10px;font-weight:850;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="opacity:.55">${i+1}.</span> ${survivalBotLabel(bot)}</div>`).join('')}`;
  }

  // El panel DOM de eliminados es la única información de eliminación durante
  // la carrera. Las antiguas tarjetas Phaser duplicaban esa información y,
  // además, heredaban la cámara/zoom dinámico, por eso aparecían como cuadros
  // vacíos que se desplazaban por el circuito.
  _showSurvivalNotice(){
    try{this._survivalNotice?.destroy?.(true);}catch{}
    this._survivalNotice=null;
  }

  _initSurvival(){
    const result=super._initSurvival();
    this._destroySurvivalEliminationHud();
    this._survivalSeenActiveBots=new Set();
    this._survivalEliminatedBots=[];
    this._survivalEliminatedSet=new Set();
    this._normalizeSurvivalRivals();
    this.events?.once?.('shutdown',()=>this._destroySurvivalEliminationHud());
    this.events?.once?.('destroy',()=>this._destroySurvivalEliminationHud());
    return result;
  }

  _resolveSurvivalCarContacts(delta){
    if(!this._survivalMode||!Array.isArray(this._survivalBots)||!this._survivalBots.length||this._survivalFinished)return;
    const active=this._survivalBots.filter(b=>b?.active&&b?.sprite?.scene&&b.sprite.visible!==false);
    if(!active.length)return;

    const dt=clamp((Number(delta)||16.67)/1000,.001,.05);
    const size=this._survivalContactSize||this._survivalPlayerVisualSize();
    const short=Math.min(size.w,size.h),long=Math.max(size.w,size.h);
    const radius=clamp(Math.min(short*.57,long*.31),10,27);
    const minDist=radius*2;
    const decay=Math.exp(-5.2*dt);

    for(const bot of active){
      bot._contactX=(Number(bot._contactX)||0)*decay;
      bot._contactY=(Number(bot._contactY)||0)*decay;
      bot.sprite.x+=bot._contactX;
      bot.sprite.y+=bot._contactY;
    }

    const player=this.carBody;
    if(player&&Number.isFinite(Number(player.x))&&Number.isFinite(Number(player.y))){
      for(let i=0;i<active.length;i++){
        const bot=active[i],sx=Number(bot.sprite.x),sy=Number(bot.sprite.y),px=Number(player.x),py=Number(player.y);
        let dx=sx-px,dy=sy-py,dist=Math.hypot(dx,dy);
        if(dist>=minDist)continue;
        if(dist<.001){const a=(i+1)*1.91;dx=Math.cos(a);dy=Math.sin(a);dist=1;}
        const nx=dx/dist,ny=dy/dist,overlap=minDist-dist+.15;
        const playerPush=overlap*.58,botPush=overlap*.42;
        try{player.x-=nx*playerPush;player.y-=ny*playerPush;}catch{}
        bot._contactX=(Number(bot._contactX)||0)+nx*botPush;
        bot._contactY=(Number(bot._contactY)||0)+ny*botPush;
        bot.sprite.x+=nx*botPush;bot.sprite.y+=ny*botPush;

        const body=player.body;
        if(body?.velocity){
          const vn=Number(body.velocity.x||0)*nx+Number(body.velocity.y||0)*ny;
          if(vn>0){
            body.velocity.x-=nx*vn*.72;
            body.velocity.y-=ny*vn*.72;
          }
        }
      }
    }

    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
      const a=active[i],b=active[j];
      let dx=Number(b.sprite.x)-Number(a.sprite.x),dy=Number(b.sprite.y)-Number(a.sprite.y),dist=Math.hypot(dx,dy);
      if(dist>=minDist)continue;
      if(dist<.001){const ang=(i*7+j*3)*.73;dx=Math.cos(ang);dy=Math.sin(ang);dist=1;}
      const nx=dx/dist,ny=dy/dist,push=(minDist-dist+.1)*.5;
      a._contactX=(Number(a._contactX)||0)-nx*push;a._contactY=(Number(a._contactY)||0)-ny*push;
      b._contactX=(Number(b._contactX)||0)+nx*push;b._contactY=(Number(b._contactY)||0)+ny*push;
      a.sprite.x-=nx*push;a.sprite.y-=ny*push;b.sprite.x+=nx*push;b.sprite.y+=ny*push;
    }
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(this._survivalMode){
      this._normalizeSurvivalRivals();
      this._syncSurvivalEliminationHud();
      this._resolveSurvivalCarContacts(delta);
    }
    return result;
  }
}

export { SURVIVAL_MAX_LAPS };