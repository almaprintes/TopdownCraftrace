import { SeasonScene as BaseSeasonScene } from './SeasonScene.js';

// UX layer over the season pass DOM. Keep the detail dock inside the visible
// viewport and, crucially, let claimable content define the dock's real height.
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
    root.style.top=`${Math.round(vv.top)}px`;
    root.style.bottom='auto';
    root.style.height=`${Math.round(vv.height)}px`;

    dock.style.position='fixed';
    dock.style.left='50%';
    dock.style.transform='translateX(-50%)';
    dock.style.bottom='auto';
    const margin=14;
    const h=Math.max(1,dock.getBoundingClientRect().height||dock.offsetHeight||72);
    const top=Math.max(vv.top+8,vv.bottom-margin-h);
    dock.style.top=`${Math.round(top)}px`;
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
/* Normal stages keep the compact dock. */
#tdr-season-dom .detail-dock{height:72px}

/* Claimable stages need more INTERNAL room. Previous attempts moved the dock,
   but the button was actually being clipped by the dock/cell overflow itself. */
#tdr-season-dom .detail-dock:has(.claim){height:108px;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:7px;padding-bottom:7px;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3){
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:3px;
  overflow:visible;
}
#tdr-season-dom .detail-dock:has(.claim) .detail-cell:nth-child(3) .detail-kicker{flex:0 0 auto}
#tdr-season-dom .detail-dock:has(.claim) .detail-reward{flex:0 0 42px;height:42px;min-height:42px;margin:0;overflow:visible}
#tdr-season-dom .detail-dock:has(.claim) .claim{display:block;flex:0 0 28px;width:100%;height:28px;min-height:28px;margin:0;padding:0 10px;position:relative;z-index:2}

@media(max-height:520px){
  #tdr-season-dom .detail-dock:has(.claim){height:100px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-cell{padding-top:5px;padding-bottom:5px}
  #tdr-season-dom .detail-dock:has(.claim) .detail-reward{flex-basis:38px;height:38px;min-height:38px}
  #tdr-season-dom .detail-dock:has(.claim) .claim{flex-basis:27px;height:27px;min-height:27px}
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
