import Phaser from 'phaser';
import { RaceScene as CurrentRaceScene } from './RaceRenderProfilerScene.js';

function videoPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return {showFPS:!!s?.video?.showFPS};
  }catch{return {showFPS:false};}
}

// Diagnostic-only A/B render isolation. Enabled only when "show FPS" is on.
// It cycles short render tests so we can see which visual layer is expensive
// on a real device without changing physics or timing.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    if(!videoPrefs().showFPS)return result;

    this._isoModes=['ALL','NO UI CAM','NO OVERLAY','NO TRACK CHUNKS'];
    this._isoIndex=0;
    this._isoAt=performance.now();
    this._isoWindowMs=1500;
    this._isoStats=new Map();
    this._isoRenderStart=0;
    this._isoSavedUiVisible=null;

    this._isoPre=()=>{this._isoRenderStart=performance.now();};
    this._isoPost=()=>{
      const now=performance.now();
      const ms=Math.max(0,now-(this._isoRenderStart||now));
      const mode=this._isoModes[this._isoIndex]||'ALL';
      const s=this._isoStats.get(mode)||{sum:0,max:0,n:0};
      s.sum+=ms;s.max=Math.max(s.max,ms);s.n++;
      this._isoStats.set(mode,s);
    };
    this.game.events.on(Phaser.Core.Events.PRE_RENDER,this._isoPre);
    this.game.events.on(Phaser.Core.Events.POST_RENDER,this._isoPost);

    this._isoText=this.add.text(10,246,'RENDER ISOLATION --',{
      fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
      fontSize:'10px',fontStyle:'bold',color:'#b8ffcf',
      backgroundColor:'rgba(0,0,0,.62)',padding:{x:6,y:4},lineSpacing:2
    }).setScrollFactor(0).setDepth(5003);
    try{this.cameras.main.ignore(this._isoText);}catch{}

    this.events.once('shutdown',()=>{
      this._restoreIsolation();
      try{this.game.events.off(Phaser.Core.Events.PRE_RENDER,this._isoPre);}catch{}
      try{this.game.events.off(Phaser.Core.Events.POST_RENDER,this._isoPost);}catch{}
    });

    return result;
  }

  _restoreIsolation(){
    try{
      const cams=this.cameras?.cameras||[];
      if(cams[1]&&this._isoSavedUiVisible!=null)cams[1].visible=this._isoSavedUiVisible;
    }catch{}
    try{
      if(this.track?.gfxByCell instanceof Map){
        for(const cell of this.track.gfxByCell.values()){
          if(cell?.tile)cell.tile.setVisible(true);
          if(cell?.overlay)cell.overlay.setVisible(true);
          if(cell?.stroke)cell.stroke.setVisible(true);
        }
      }
    }catch{}
  }

  _applyIsolation(mode){
    this._restoreIsolation();
    try{
      if(mode==='NO UI CAM'){
        const cams=this.cameras?.cameras||[];
        if(cams[1]){
          if(this._isoSavedUiVisible==null)this._isoSavedUiVisible=cams[1].visible!==false;
          cams[1].visible=false;
        }
      }else if(mode==='NO OVERLAY'){
        if(this.track?.gfxByCell instanceof Map){
          for(const cell of this.track.gfxByCell.values())cell?.overlay?.setVisible(false);
        }
      }else if(mode==='NO TRACK CHUNKS'){
        if(this.track?.gfxByCell instanceof Map){
          for(const cell of this.track.gfxByCell.values()){
            cell?.tile?.setVisible(false);
            cell?.overlay?.setVisible(false);
            cell?.stroke?.setVisible(false);
          }
        }
      }
    }catch{}
  }

  _renderIsolationReport(){
    const lines=[`TEST ${this._isoModes[this._isoIndex]}`];
    for(const mode of this._isoModes){
      const s=this._isoStats.get(mode);
      if(!s?.n){lines.push(`${mode.padEnd(15)} --`);continue;}
      lines.push(`${mode.padEnd(15)} ${(s.sum/s.n).toFixed(1)}/${s.max.toFixed(1)}ms x${s.n}`);
    }
    this._isoText?.setText(lines.join('\n'));
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(!this._isoModes)return result;

    const now=performance.now();
    const mode=this._isoModes[this._isoIndex]||'ALL';
    this._applyIsolation(mode);

    if(now-this._isoAt>=this._isoWindowMs){
      this._isoIndex=(this._isoIndex+1)%this._isoModes.length;
      // Clear after a full cycle so the numbers stay current for the current track position.
      if(this._isoIndex===0)this._isoStats.clear();
      this._isoAt=now;
    }
    this._renderIsolationReport();
    return result;
  }
}
