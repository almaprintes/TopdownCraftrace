import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageHideSpecialScene.js';
import { isTrackUnlocked, devFullTrackAccessEnabled } from '../tracks/trackUnlocks.js';

const FONT='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

export class TrackGarageScene extends CurrentTrackGarageScene {
  _fullTrackAccess(){return this._mode==='admin'||devFullTrackAccessEnabled();}
  _lockedTrack(track){return !this._fullTrackAccess()&&!isTrackUnlocked(track?.key||track?.id);}

  create(){
    super.create();

    if(!this._fullTrackAccess()&&Array.isArray(this._tracks)&&this._tracks.length){
      const selectedKey=this._tracks?.[this._index]?.key||this._tracks?.[this._index]?.id;
      const originalOrder=new Map(this._tracks.map((track,i)=>[track?.key||track?.id,i]));

      // Player UX: discovered/unlocked circuits always come first, while preserving
      // the original catalog order inside both groups. Locked content therefore
      // stays stable and predictable as more circuits are released over time.
      this._tracks=[...this._tracks].sort((a,b)=>{
        const aLocked=this._lockedTrack(a)?1:0;
        const bLocked=this._lockedTrack(b)?1:0;
        if(aLocked!==bLocked)return aLocked-bLocked;
        return (originalOrder.get(a?.key||a?.id)??0)-(originalOrder.get(b?.key||b?.id)??0);
      });

      let next=this._tracks.findIndex(t=>(t?.key||t?.id)===selectedKey);
      if(next<0||this._lockedTrack(this._tracks[next])){
        next=this._tracks.findIndex(t=>!this._lockedTrack(t));
      }
      this._index=next>=0?next:0;

      try{this._commercial?.destroy?.(true);}catch{}
      this._commercial=null;
      try{this._buildCommercial?.();}catch{}
    }
  }

  _trackItem(x,y,w,h,track,i){
    const out=super._trackItem(x,y,w,h,track,i);
    if(!out?.item||!this._lockedTrack(track))return out;
    const veil=this.add.rectangle(0,0,w,h,0x03070d,.88).setOrigin(0);
    const lock=this.add.text(w/2,h/2-12,'🔒',{fontFamily:FONT,fontSize:'25px',color:'#ffffff'}).setOrigin(.5);
    const mystery=this.add.text(w/2,h/2+22,'???',{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#d7e4ee',letterSpacing:2}).setOrigin(.5);
    out.item.add([veil,lock,mystery]);
    // Keep the original hit target on top so locked cards can still be inspected.
    try{out.item.bringToTop(out.hit);}catch{}
    return out;
  }

  _trackHero(root,g,x,y,w,h){
    const track=this._tracks?.[this._index];
    super._trackHero(root,g,x,y,w,h);
    if(!root||!this._lockedTrack(track))return;
    const veil=this.add.rectangle(x,y,w,h,0x03070d,.91).setOrigin(0).setStrokeStyle(2,0x526a7a,.75);
    const lock=this.add.text(x+w/2,y+h*.39,'🔒',{fontFamily:FONT,fontSize:'44px',color:'#ffffff'}).setOrigin(.5);
    const title=this.add.text(x+w/2,y+h*.54,'???',{fontFamily:FONT,fontSize:'34px',fontStyle:'bold',color:'#ffffff',letterSpacing:4}).setOrigin(.5);
    const note=this.add.text(x+w/2,y+h*.66,'CIRCUITO BLOQUEADO\nDESCÚBRELO JUGANDO',{fontFamily:FONT,fontSize:'12px',fontStyle:'bold',color:'#8fa9ba',align:'center',lineSpacing:5}).setOrigin(.5);
    root.add([veil,lock,title,note]);
  }

  _launchSelected(...args){
    const track=this._tracks?.[this._index];
    if(this._lockedTrack(track)){
      const root=this._commercial;if(root){const msg=this.add.text(this.scale.width/2,this.scale.height-30,'🔒 CIRCUITO TODAVÍA BLOQUEADO',{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5).setDepth(9999);root.add(msg);this.time.delayedCall(1200,()=>{try{msg.destroy();}catch{}});}
      return;
    }
    return super._launchSelected(...args);
  }
}
