import { SeasonScene as BaseSeasonScene } from './SeasonScene.js';

// UX layer over the season pass DOM. Do not guess at safe-area offsets: measure
// the rendered dock against the actually visible viewport and clamp it inside.
export class SeasonScene extends BaseSeasonScene {
  _visibleViewport(){
    const vv=window.visualViewport;
    const top=Math.max(0,Number(vv?.offsetTop||0));
    const height=Math.max(1,Number(vv?.height||window.innerHeight||document.documentElement.clientHeight||1));
    return {top,height,bottom:top+height};
  }

  _placeSeasonDock(){
    const root=this._root;
    const dock=root?.querySelector?.('.detail-dock');
    if(!root||!dock)return;

    const vv=this._visibleViewport();
    // Keep the root matched to the visible viewport too, but the dock placement
    // below is based on its measured DOM rect, so browser chrome/safe-area quirks
    // cannot leave it outside the screen.
    root.style.top=`${Math.round(vv.top)}px`;
    root.style.bottom='auto';
    root.style.height=`${Math.round(vv.height)}px`;

    dock.style.position='fixed';
    dock.style.left='50%';
    dock.style.transform='translateX(-50%)';
    dock.style.bottom='auto';

    // Let CSS settle, then measure the real rendered height and place its bottom
    // a fixed visible margin above the VisualViewport bottom edge.
    const margin=14;
    const h=Math.max(1,dock.getBoundingClientRect().height||dock.offsetHeight||72);
    const top=Math.max(vv.top+8,vv.bottom-margin-h);
    dock.style.top=`${Math.round(top)}px`;

    // Final clamp from the actual post-positioning rect. This is intentionally
    // defensive: if WebKit reports a shifted fixed-position coordinate space,
    // correct by the exact measured overflow rather than another guessed offset.
    const rect=dock.getBoundingClientRect();
    const overflowBottom=rect.bottom-(vv.bottom-margin);
    if(overflowBottom>0.5){dock.style.top=`${Math.round(top-overflowBottom)}px`;}
    const rect2=dock.getBoundingClientRect();
    const overflowTop=(vv.top+8)-rect2.top;
    if(overflowTop>0.5){dock.style.top=`${Math.round(parseFloat(dock.style.top||'0')+overflowTop)}px`;}
  }

  _scheduleDockPlacement(){
    cancelAnimationFrame(this._seasonDockRaf||0);
    this._seasonDockRaf=requestAnimationFrame(()=>{
      this._seasonDockRaf=requestAnimationFrame(()=>this._placeSeasonDock());
    });
  }

  _mount(){
    super._mount();
    const style=document.getElementById('tdr-season-dom-style');
    if(!style)return;
    style.textContent+=`
#tdr-season-dom .detail-dock{height:72px}
#tdr-season-dom .detail-dock:has(.claim){height:96px;overflow:hidden}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:6px;padding-bottom:6px}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){display:grid;grid-template-rows:9px 38px 27px;align-content:center;row-gap:3px;overflow:hidden}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3) .detail-kicker{align-self:center}
#tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:38px;min-height:38px;margin:0;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .claim{display:block;width:100%;height:27px;min-height:27px;margin:0;padding:0 10px}
@media(max-height:520px){
  #tdr-season-dom .detail-dock:has(.claim){height:90px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:5px;padding-bottom:5px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){grid-template-rows:8px 34px 26px;row-gap:3px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-reward{height:34px;min-height:34px}
  #tdr-season-dom .detail-dock:has(.claim) .claim{height:26px;min-height:26px}
}
`;

    this._seasonViewportHandler=()=>this._scheduleDockPlacement();
    try{window.visualViewport?.addEventListener('resize',this._seasonViewportHandler,{passive:true});}catch{}
    try{window.visualViewport?.addEventListener('scroll',this._seasonViewportHandler,{passive:true});}catch{}
    window.addEventListener('resize',this._seasonViewportHandler,{passive:true});
    this._scheduleDockPlacement();
  }

  _renderDom(){
    super._renderDom();
    this._scheduleDockPlacement();
  }

  _unmount(){
    cancelAnimationFrame(this._seasonDockRaf||0);
    this._seasonDockRaf=0;
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
