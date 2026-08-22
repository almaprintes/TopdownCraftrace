import { RaceScene as TrafficRaceScene } from './RaceSurvivalTrafficScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapPi=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

export class RaceScene extends TrafficRaceScene {
  create(data){
    this._survivalPlayerLapTimes=[];
    this._survivalPlayerLapStartPerf=null;
    return super.create(data);
  }

  _initSurvival(){
    super._initSurvival();
    for(const b of this._survivalBots||[]){
      const s=b?.sprite;
      if(!s)continue;
      b._renderX=Number(s.x);
      b._renderY=Number(s.y);
      b._renderRot=Number(s.rotation||0);
      b._miniMarker=null;
    }
  }

  _registerFinishCross(racer){
    const isPlayer=racer===this._survivalPlayer;
    const wasArmed=Boolean(racer?.armed);
    const completed=super._registerFinishCross(racer);
    if(isPlayer){
      const now=performance.now();
      if(!wasArmed&&racer?.armed){
        // First crossing only arms the survival lap counter. Timing starts here.
        this._survivalPlayerLapStartPerf=now;
      }else if(completed){
        const start=Number(this._survivalPlayerLapStartPerf);
        const lapMs=now-start;
        if(Number.isFinite(start)&&Number.isFinite(lapMs)&&lapMs>1000){
          this._survivalPlayerLapTimes.push(lapMs);
          // Survival has five elimination rounds, therefore at most five player laps
          // belong to its session report.
          if(this._survivalPlayerLapTimes.length>5)this._survivalPlayerLapTimes=this._survivalPlayerLapTimes.slice(-5);
        }
        this._survivalPlayerLapStartPerf=now;
      }
    }
    return completed;
  }

  _survivalSessionBestLapMs(){
    const laps=Array.isArray(this._survivalPlayerLapTimes)?this._survivalPlayerLapTimes:[];
    return laps.length?Math.min(...laps):null;
  }

  _showSurvivalSessionInfo(resultRoot){
    // The inherited report expects ttHistory. Feed it only the player's real
    // survival laps, never Time Attack history or CPU/internal crossings.
    const original=this.ttHistory;
    this.ttHistory=(Array.isArray(this._survivalPlayerLapTimes)?this._survivalPlayerLapTimes:[])
      .slice(0,5)
      .map(lapMs=>({lapMs}));
    try{return super._showSurvivalSessionInfo(resultRoot);}
    finally{this.ttHistory=original;}
  }

  _ensureSurvivalMiniMarkers(){
    if(!this._survivalMode)return;
    const unified=this.minimapUnifiedPanel;
    for(const b of this._survivalBots||[]){
      if(b._miniMarker?.scene){
        if(unified?.scene&&!b._miniInUnified){
          unified.add(b._miniMarker);
          b._miniInUnified=true;
        }
        continue;
      }
      const m=this.add.circle(0,0,3.2,0xffb347,1)
        .setStrokeStyle(1,0x271400,.95)
        .setDepth(2305);
      if(unified?.scene){
        unified.add(m);
        b._miniInUnified=true;
      }else{
        m.setScrollFactor(1);
        try{if(typeof m.cameraFilter==='number'&&this.cameras?.main)m.cameraFilter&=~this.cameras.main.id;}catch{}
      }
      try{this.uiCam?.ignore?.(m);}catch{}
      b._miniMarker=m;
    }
  }

  _smoothSurvivalSprites(deltaMs){
    if(!this._survivalMode)return;
    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    const posK=1-Math.exp(-14*dt);
    const rotK=1-Math.exp(-16*dt);
    for(const b of this._survivalBots||[]){
      const s=b?.sprite;if(!s?.scene)continue;
      if(!b.active){s.setVisible(false);continue;}
      const tx=Number(s.x),ty=Number(s.y),tr=Number(s.rotation||0);
      if(!Number.isFinite(b._renderX)||!Number.isFinite(b._renderY)){
        b._renderX=tx;b._renderY=ty;b._renderRot=tr;
      }else{
        const jump=Math.hypot(tx-b._renderX,ty-b._renderY);
        if(jump<260){
          b._renderX+=(tx-b._renderX)*posK;
          b._renderY+=(ty-b._renderY)*posK;
          const dr=wrapPi(tr-Number(b._renderRot||0));
          b._renderRot=Number(b._renderRot||0)+dr*rotK;
        }else{
          b._renderX=tx;b._renderY=ty;b._renderRot=tr;
        }
      }
      s.setPosition(b._renderX,b._renderY);
      s.rotation=b._renderRot;
    }
  }

  _pinSurvivalMiniMarkers(){
    if(!this._survivalMode)return;
    this._ensureSurvivalMiniMarkers();

    const panel=this.minimapUnifiedPanel;
    const tr=this._minimapUnifiedTransform;
    const useUnified=Boolean(panel?.scene&&tr);
    const cam=this.cameras?.main;
    const pts=this.minimap?.points;
    if(!useUnified&&(!cam||!Array.isArray(pts)||pts.length<2))return;
    const zoom=Math.max(.001,Number(cam?.zoom||1));

    for(const b of this._survivalBots||[]){
      const m=b?._miniMarker;
      if(!m?.scene)continue;
      if(!b.active||!b.sprite?.scene){m.setVisible(false);continue;}
      m.setVisible(true);

      const proj=this._computeCenterlineProjection?.(Number(b.sprite.x),Number(b.sprite.y));
      if(!proj)continue;

      if(useUnified){
        if(!b._miniInUnified){
          panel.add(m);
          b._miniInUnified=true;
        }
        const px=Number.isFinite(proj.x)?Number(proj.x):Number(b.sprite.x);
        const py=Number.isFinite(proj.y)?Number(proj.y):Number(b.sprite.y);
        m.setPosition(tr.ox+px*tr.fitScale,tr.oy+py*tr.fitScale);
        m.setScale(1);
        continue;
      }

      const i=Math.max(0,Math.min(pts.length-2,Number(proj.segIndex||0)));
      const t=clamp(Number(proj.segT||0),0,1);
      const a=pts[i],c=pts[i+1]||a;if(!a||!c)continue;
      const sx=Number(a.x)+(Number(c.x)-Number(a.x))*t;
      const sy=Number(a.y)+(Number(c.y)-Number(a.y))*t;
      const world=cam.getWorldPoint(sx,sy);
      m.setPosition(world.x,world.y);
      m.setScale(1/zoom);
    }
  }

  _destroySurvival(){
    for(const b of this._survivalBots||[]){try{b._miniMarker?.destroy?.();}catch{}}
    return super._destroySurvival();
  }

  update(time,delta){
    const result=super.update(time,delta);
    // La trayectoria lógica ya avanza con delta real. Una segunda interpolación
    // visual introducía efecto acordeón cuando variaba el frame time.
    this._pinSurvivalMiniMarkers();
    return result;
  }
}
