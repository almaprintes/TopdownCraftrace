import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageCleanTypographyScene.js';

export class TrackGarageScene extends CurrentTrackGarageScene{
  create(){
    super.create();
    const before=Array.isArray(this._tracks)?this._tracks:[];
    const filtered=before.filter(t=>t?.meta?.hiddenFromTrackSelect!==true&&t?.key!=='practice-area'&&t?.id!=='practice-area');
    if(filtered.length!==before.length){
      const selectedKey=before[this._index]?.key;
      this._tracks=filtered;
      const next=this._tracks.findIndex(t=>t?.key===selectedKey);
      this._index=next>=0?next:Math.max(0,Math.min(this._index||0,this._tracks.length-1));
      try{this._commercial?.destroy?.(true);}catch{}
      this._commercial=null;
      try{this._buildCommercial?.();}catch{}
    }
  }

  _buildCommercial(...args){
    super._buildCommercial(...args);
    this._applyFloatingTopChrome();
  }

  _applyFloatingTopChrome(){
    const root=this._commercial;
    if(!root?.list?.length)return;
    const W=this.scale.width;
    const top=8;
    const h=58;
    const side=Math.max(10,Math.min(24,W*.015));

    // Move only the direct header controls/text. Content panels remain exactly
    // where the responsive selector laid them out.
    for(const obj of root.list){
      const type=String(obj?.type||'');
      if((type==='Text'||type==='Rectangle')&&Number.isFinite(Number(obj?.y))&&obj.y<64){
        obj.y+=top;
      }
    }

    const plate=this.add.graphics();
    plate.fillStyle(0x06121d,.95).fillRoundedRect(side,top,W-side*2,h,13);
    plate.lineStyle(1,0x46ddff,.36).strokeRoundedRect(side,top,W-side*2,h,13);
    plate.lineStyle(2,0xe6b84e,.82).lineBetween(side+16,top+1,side+Math.min(260,W*.22),top+1);
    root.addAt(plate,Math.min(1,root.list.length));
  }
}
