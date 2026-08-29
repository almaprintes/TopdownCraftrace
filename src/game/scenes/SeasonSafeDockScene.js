import { SeasonScene as BaseSeasonScene } from './SeasonScene.js';

// UX layer over the season pass DOM. iOS can expose a layout viewport that is
// taller than the actually visible viewport in landscape. Size the season root
// from VisualViewport so the bottom dock is anchored to what the player can see.
export class SeasonScene extends BaseSeasonScene {
  _syncVisibleViewport(){
    const root=this._root;
    if(!root)return;
    const vv=window.visualViewport;
    const h=Math.max(1,Math.floor(Number(vv?.height||window.innerHeight||document.documentElement.clientHeight||1)));
    const top=Math.max(0,Math.floor(Number(vv?.offsetTop||0)));
    root.style.top=`${top}px`;
    root.style.bottom='auto';
    root.style.height=`${h}px`;
  }

  _mount(){
    super._mount();
    const style=document.getElementById('tdr-season-dom-style');
    if(!style)return;
    style.textContent+=`
#tdr-season-dom .detail-dock{bottom:16px}
#tdr-season-dom .detail-dock:has(.claim){height:96px;overflow:hidden}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:6px;padding-bottom:6px}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){
  display:grid;
  grid-template-rows:9px 38px 27px;
  align-content:center;
  row-gap:3px;
  overflow:hidden;
}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3) .detail-kicker{align-self:center}
#tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:38px;min-height:38px;margin:0;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .claim{display:block;width:100%;height:27px;min-height:27px;margin:0;padding:0 10px}
@media(max-height:520px){
  #tdr-season-dom .detail-dock{bottom:12px}
  #tdr-season-dom .detail-dock:has(.claim){height:90px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:5px;padding-bottom:5px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){grid-template-rows:8px 34px 26px;row-gap:3px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:34px;min-height:34px}
  #tdr-season-dom .detail-dock:has(.claim) .claim{height:26px;min-height:26px}
}
`;

    this._syncVisibleViewport();
    this._seasonViewportHandler=()=>this._syncVisibleViewport();
    try{window.visualViewport?.addEventListener('resize',this._seasonViewportHandler,{passive:true});}catch{}
    try{window.visualViewport?.addEventListener('scroll',this._seasonViewportHandler,{passive:true});}catch{}
    window.addEventListener('resize',this._seasonViewportHandler,{passive:true});
  }

  _unmount(){
    const fn=this._seasonViewportHandler;
    if(fn){
      try{window.visualViewport?.removeEventListener('resize',fn);}catch{}
      try{window.visualViewport?.removeEventListener('scroll',fn);}catch{}
      try{window.removeEventListener('resize',fn);}catch{}
    }
    this._seasonViewportHandler=null;
    super._unmount();
  }
}
