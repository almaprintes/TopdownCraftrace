import { RaceScene as TrafficRaceScene } from './RaceSurvivalTrafficScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapPi=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

export class RaceScene extends TrafficRaceScene {
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

  _ensureSurvivalMiniMarkers(){
    if(!this._survivalMode)return;
    for(const b of this._survivalBots||[]){
      if(b._miniMarker?.scene)continue;
      const m=this.add.circle(0,0,3.2,0xffb347,1)
        .setStrokeStyle(1,0x271400,.95)
        .setDepth(2305)
        .setScrollFactor(1);
      // RaceFixed uses the main camera for HUD on iOS; keep these markers there too.
      try{if(typeof m.cameraFilter==='number'&&this.cameras?.main)m.cameraFilter&=~this.cameras.main.id;}catch{}
      try{this.uiCam?.ignore?.(m);}catch{}
      b._miniMarker=m;
    }
  }

  _smoothSurvivalSprites(deltaMs){
    if(!this._survivalMode)return;
    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    // Time-based damping: removes one-frame lane/mistake jumps without creating visible lag.
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
        // For ordinary motion interpolate. A true scene reset / impossible jump snaps once.
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
    const cam=this.cameras?.main,pts=this.minimap?.points;
    if(!cam||!Array.isArray(pts)||pts.length<2)return;
    const zoom=Math.max(.001,Number(cam.zoom||1));

    for(const b of this._survivalBots||[]){
      const m=b?._miniMarker;
      if(!m?.scene)continue;
      if(!b.active||!b.sprite?.scene){m.setVisible(false);continue;}
      m.setVisible(true);

      const proj=this._computeCenterlineProjection?.(Number(b.sprite.x),Number(b.sprite.y));
      if(!proj)continue;
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
    this._smoothSurvivalSprites(delta);
    this._pinSurvivalMiniMarkers();
    return result;
  }
}
