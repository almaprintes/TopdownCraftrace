import { RaceScene as EmbeddedReplayRaceScene } from './RaceEmbeddedReplayScene.js';
import { CarEngineSampleRuntime } from '../audio/CarEngineSampleRuntime.js';

export class RaceScene extends EmbeddedReplayRaceScene{
  create(data){
    const result=super.create(data);
    if(!this._tdrEmbeddedReplay){
      try{
        this._tdrEngineSample?.destroy?.();
        this._tdrEngineSample=new CarEngineSampleRuntime(this);
        this.events.once('shutdown',()=>{this._tdrEngineSample?.destroy?.();this._tdrEngineSample=null;});
      }catch(e){console.warn('[TDR2 engine sample] init failed',e);}
    }
    return result;
  }

  update(time,delta){
    super.update(time,delta);
    try{this._tdrEngineSample?.update?.();}catch{}
  }

  _syncEmbeddedSourceCamera(){
    if(!this._tdrEmbeddedReplay)return;
    const cam=this.cameras?.main;
    const target=this._embeddedReplayTarget?.();
    const gameW=Number(this.scale?.width)||Number(this.game?.canvas?.width)||1;
    const gameH=Number(this.scale?.height)||Number(this.game?.canvas?.height)||1;
    let vw=gameW,vh=gameH,vx=0,vy=0;
    const rect=target?.getBoundingClientRect?.();
    if(rect?.width>1&&rect?.height>1){
      const targetAspect=rect.width/rect.height;
      const gameAspect=gameW/gameH;
      if(gameAspect>targetAspect){vw=Math.max(1,gameH*targetAspect);vx=(gameW-vw)*.5;}
      else{vh=Math.max(1,gameW/targetAspect);vy=(gameH-vh)*.5;}
    }
    this._tdrEmbeddedViewport={x:vx,y:vy,w:vw,h:vh};
    try{cam?.setVisible?.(true);cam?.setViewport?.(vx,vy,vw,vh);}catch{}
  }

  _applyStatsReplayFrame(t){
    super._applyStatsReplayFrame(t);
    if(!this._tdrEmbeddedReplay)return;
    this._syncEmbeddedSourceCamera();
    const x=Number(this.carBody?.x),y=Number(this.carBody?.y);
    if(Number.isFinite(x)&&Number.isFinite(y)){
      try{this.cameras?.main?.stopFollow?.();this.cameras?.main?.centerOn?.(x,y);}catch{}
    }
  }

  _copyEmbeddedReplayFrame(){
    if(!this._tdrEmbeddedReplay)return;
    const src=this.game?.canvas,feed=this._ensureEmbeddedFeed?.(),target=this._embeddedReplayTarget?.();
    if(!src||!feed||!target)return;
    const rect=target.getBoundingClientRect?.();
    if(!rect||rect.width<=1||rect.height<=1)return;
    this._syncEmbeddedSourceCamera();
    const dpr=Math.min(2,Math.max(1,Number(window.devicePixelRatio)||1));
    const dw=Math.max(1,Math.round(rect.width*dpr)),dh=Math.max(1,Math.round(rect.height*dpr));
    if(feed.width!==dw)feed.width=dw;
    if(feed.height!==dh)feed.height=dh;
    const sw=Number(src.width)||1,sh=Number(src.height)||1;
    const gameW=Number(this.scale?.width)||1,gameH=Number(this.scale?.height)||1;
    const scaleX=sw/gameW,scaleY=sh/gameH;
    const vp=this._tdrEmbeddedViewport||{x:0,y:0,w:gameW,h:gameH};
    const sx=Math.max(0,Math.round(vp.x*scaleX)),sy=Math.max(0,Math.round(vp.y*scaleY));
    const cw=Math.max(1,Math.min(sw-sx,Math.round(vp.w*scaleX))),ch=Math.max(1,Math.min(sh-sy,Math.round(vp.h*scaleY)));
    try{
      const ctx=feed.getContext('2d',{alpha:false});
      if(!ctx)return;
      ctx.drawImage(src,sx,sy,cw,ch,0,0,dw,dh);
      this._drawReplayAnalysis?.(ctx,{sx:0,sy:0,cw,ch,dw,dh,dpr});
    }catch{}
  }
}
