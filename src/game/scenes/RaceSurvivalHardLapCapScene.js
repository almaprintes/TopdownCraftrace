import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceTuningScene.js';

const SURVIVAL_MAX_LAPS=5;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function playerVisual(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>o?.visible!==false&&o?.texture?.key&&o.texture.key!=='__BODY__'&&scene.textures?.exists?.(o.texture.key))||null;
}

export class RaceScene extends CurrentRaceScene{
  _registerFinishCross(racer){
    const completed=super._registerFinishCross(racer);
    if(!completed||!this._survivalMode||racer!==this._survivalPlayer)return completed;

    const laps=Number(racer?.completedLaps||0);
    if(laps<SURVIVAL_MAX_LAPS)return completed;

    // Hard guard in the ACTIVE race chain. Survival is a five-lap / five-round
    // mode: once the player accepts lap 5, a sixth lap must never be possible.
    racer.completedLaps=SURVIVAL_MAX_LAPS;
    if(Array.isArray(racer._survivalLapTimesMs)){
      racer._survivalLapTimesMs=racer._survivalLapTimesMs.slice(0,SURVIVAL_MAX_LAPS);
      this._syncSurvivalAuthoritativeHistory?.(racer);
    }

    this._survivalRound=SURVIVAL_MAX_LAPS;

    try{
      if(this.carBody?.body?.velocity){
        this.carBody.body.velocity.x=0;
        this.carBody.body.velocity.y=0;
      }
      if(Number.isFinite(this.carBody?.body?.angularVelocity))this.carBody.body.angularVelocity=0;
    }catch{}

    // With two survivors in round 5, crossing the fifth finish line means the
    // player cannot be the last pending racer: the survival run is won.
    if(!this._survivalFinished)this._finishSurvival?.(true);
    return true;
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
    // Guard against ever copying the native high-resolution texture dimensions.
    // The player footprint is the source of truth, but a race car must remain a
    // world-sized object rather than a several-hundred-pixel asset.
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
      try{sprite.setDisplaySize(size.w,size.h);}catch{}
      bot._contactX=Number(bot._contactX)||0;
      bot._contactY=Number(bot._contactY)||0;
    }
  }

  _initSurvival(){
    const result=super._initSurvival();
    this._normalizeSurvivalRivals();
    return result;
  }

  _resolveSurvivalCarContacts(delta){
    if(!this._survivalMode||!Array.isArray(this._survivalBots)||!this._survivalBots.length||this._survivalFinished)return;
    const active=this._survivalBots.filter(b=>b?.active&&b?.sprite?.scene&&b.sprite.visible!==false);
    if(!active.length)return;

    const dt=clamp((Number(delta)||16.67)/1000,.001,.05);
    const size=this._survivalContactSize||this._survivalPlayerVisualSize();
    const short=Math.min(size.w,size.h),long=Math.max(size.w,size.h);
    // Compact circular footprint: enough to prevent visual overlap without
    // turning nose-to-tail taps into wide invisible walls.
    const radius=clamp(Math.min(short*.57,long*.31),10,27);
    const minDist=radius*2;
    const decay=Math.exp(-5.2*dt);

    for(const bot of active){
      bot._contactX=(Number(bot._contactX)||0)*decay;
      bot._contactY=(Number(bot._contactY)||0)*decay;
      bot.sprite.x+=bot._contactX;
      bot.sprite.y+=bot._contactY;
    }

    // Player <-> rivals. Rivals are kinematic path followers, so the contact
    // response moves the physical player and gives the rival a short-lived
    // visual/path offset. This prevents sticking and pinball impulses.
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

    // Rival <-> rival separation. Their pace/path planner remains untouched;
    // only the short-lived contact offset keeps cars from occupying one space.
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
      this._resolveSurvivalCarContacts(delta);
    }
    return result;
  }
}

export { SURVIVAL_MAX_LAPS };
