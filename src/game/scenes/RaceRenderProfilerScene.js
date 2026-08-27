import Phaser from 'phaser';
import { RaceScene as CurrentRaceScene } from './RaceHudPerformanceScene.js';

function videoPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return {showFPS:!!s?.video?.showFPS};
  }catch{return {showFPS:false};}
}

// Render/frame profiler. This does not change physics, timing or rendering.
// It measures the parts that the scene update profiler cannot see:
// - scene update CPU time
// - renderer wall time between PRE_RENDER and POST_RENDER
// - frame interval and the residual time not explained by update+render
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    const prefs=videoPrefs();
    this._renderPerfEnabled=!!prefs.showFPS;
    if(!this._renderPerfEnabled)return result;

    this._rp={
      updateMs:0,
      renderStart:0,
      renderAccum:0,renderMax:0,renderSamples:0,
      frameAccum:0,frameMax:0,frameSamples:0,
      otherAccum:0,otherMax:0,
      lastPost:0,
      at:performance.now()
    };

    this._rpPre=()=>{
      if(!this._rp)return;
      this._rp.renderStart=performance.now();
    };
    this._rpPost=()=>{
      const p=this._rp;if(!p)return;
      const now=performance.now();
      const render=Math.max(0,now-(p.renderStart||now));
      p.renderAccum+=render;p.renderMax=Math.max(p.renderMax,render);p.renderSamples++;
      if(p.lastPost>0){
        const frame=now-p.lastPost;
        p.frameAccum+=frame;p.frameMax=Math.max(p.frameMax,frame);p.frameSamples++;
        const other=Math.max(0,frame-(p.updateMs||0)-render);
        p.otherAccum+=other;p.otherMax=Math.max(p.otherMax,other);
      }
      p.lastPost=now;
    };

    this.game.events.on(Phaser.Core.Events.PRE_RENDER,this._rpPre);
    this.game.events.on(Phaser.Core.Events.POST_RENDER,this._rpPost);

    this._renderPerfText=this.add.text(10,164,'FRAME PROFILER --',{
      fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
      fontSize:'10px',fontStyle:'bold',color:'#ffe89a',
      backgroundColor:'rgba(0,0,0,.62)',padding:{x:6,y:4},lineSpacing:2
    }).setScrollFactor(0).setDepth(5002);
    try{this.cameras.main.ignore(this._renderPerfText);}catch{}

    this.events.once('shutdown',()=>{
      try{this.game.events.off(Phaser.Core.Events.PRE_RENDER,this._rpPre);}catch{}
      try{this.game.events.off(Phaser.Core.Events.POST_RENDER,this._rpPost);}catch{}
      this._rp=null;
    });

    return result;
  }

  update(time,delta){
    const t0=performance.now();
    const result=super.update(time,delta);
    const p=this._rp;
    if(!p)return result;
    p.updateMs=performance.now()-t0;

    const now=performance.now();
    if(now-p.at>=700){
      const rAvg=p.renderSamples?p.renderAccum/p.renderSamples:0;
      const fAvg=p.frameSamples?p.frameAccum/p.frameSamples:0;
      const oAvg=p.frameSamples?p.otherAccum/p.frameSamples:0;
      const fps=fAvg>0?1000/fAvg:0;
      const children=Array.isArray(this.children?.list)?this.children.list:[];
      let visible=0;
      for(const o of children){if(o?.visible!==false&&o?.active!==false)visible++;}
      const renderer=this.game?.renderer?.type===Phaser.WEBGL?'WEBGL':this.game?.renderer?.type===Phaser.CANVAS?'CANVAS':'?';
      const cams=this.cameras?.cameras?.length||0;
      const res=Number(this.game?.config?.resolution||1);
      this._renderPerfText?.setText(
        `FRAME ${fAvg.toFixed(1)}/${p.frameMax.toFixed(1)}ms  ${fps.toFixed(0)}fps\n`+
        `UPDATE ${p.updateMs.toFixed(1)}ms\n`+
        `RENDER ${rAvg.toFixed(1)}/${p.renderMax.toFixed(1)}ms\n`+
        `OTHER  ${oAvg.toFixed(1)}/${p.otherMax.toFixed(1)}ms\n`+
        `${renderer} RES ${res.toFixed(2)}  CAM ${cams}  VIS ${visible}/${children.length}`
      );
      p.renderAccum=0;p.renderMax=0;p.renderSamples=0;
      p.frameAccum=0;p.frameMax=0;p.frameSamples=0;
      p.otherAccum=0;p.otherMax=0;
      p.at=now;
    }
    return result;
  }
}
