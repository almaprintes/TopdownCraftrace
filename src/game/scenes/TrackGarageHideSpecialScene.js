import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageCleanTypographyScene.js';

export class TrackGarageScene extends CurrentTrackGarageScene{
  create(){
    super.create();
    const before=Array.isArray(this._tracks)?this._tracks:[];
    const filtered=before.filter(t=>t?.meta?.hiddenFromTrackSelect!==true&&t?.key!=='practice-area'&&t?.id!=='practice-area');
    if(filtered.length===before.length)return;

    const selectedKey=before[this._index]?.key;
    this._tracks=filtered;
    const next=this._tracks.findIndex(t=>t?.key===selectedKey);
    this._index=next>=0?next:Math.max(0,Math.min(this._index||0,this._tracks.length-1));
    try{this._commercial?.destroy?.(true);}catch{}
    this._commercial=null;
    try{this._buildCommercial?.();}catch{}
  }
}
