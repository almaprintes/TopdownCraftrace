import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageProgressionScene.js';

const ROOT_ID='tdr-track-selector-dom';
const TAP_MOVE_PX=14;
const TAP_TIME_MS=650;

export class TrackGarageScene extends CurrentTrackGarageScene {
  _installDomSelector(){
    super._installDomSelector?.();
    const root=this._trackSelectorDom||document.getElementById(ROOT_ID);
    if(!root||root.__tdrPointerTapInstalled)return;
    root.__tdrPointerTapInstalled=true;

    let down=null;
    let suppressClickUntil=0;

    const actionable=(target)=>target?.closest?.('[data-index],.tdr-ts-select,.tdr-ts-back')||null;

    root.addEventListener('pointerdown',(e)=>{
      if(e.pointerType==='mouse')return;
      const action=actionable(e.target);
      if(!action)return;
      down={
        pointerId:e.pointerId,
        x:e.clientX,
        y:e.clientY,
        t:performance.now(),
        action
      };
    },{passive:true});

    root.addEventListener('pointercancel',(e)=>{
      if(down?.pointerId===e.pointerId)down=null;
    },{passive:true});

    root.addEventListener('pointerup',(e)=>{
      if(e.pointerType==='mouse'||!down||down.pointerId!==e.pointerId)return;
      const start=down;down=null;
      const dx=e.clientX-start.x,dy=e.clientY-start.y;
      const moved=Math.hypot(dx,dy);
      const elapsed=performance.now()-start.t;
      const action=actionable(e.target);
      if(!action||action!==start.action||moved>TAP_MOVE_PX||elapsed>TAP_TIME_MS)return;

      suppressClickUntil=performance.now()+500;
      e.preventDefault();
      e.stopPropagation();

      if(action.matches('[data-index]')){
        const i=Math.max(0,Math.min(this._tracks.length-1,Number(action.dataset.index)||0));
        if(i!==this._index){
          this._index=i;
          this._installDomSelector();
          requestAnimationFrame(()=>this._trackSelectorDom?.querySelector?.(`[data-index="${i}"]`)?.scrollIntoView?.({block:'nearest'}));
        }
        return;
      }
      if(action.matches('.tdr-ts-select')){
        if(!action.disabled)this._launchSelected?.();
        return;
      }
      if(action.matches('.tdr-ts-back'))this.scene.start('menu');
    },{passive:false});

    root.addEventListener('click',(e)=>{
      if(performance.now()<suppressClickUntil&&actionable(e.target)){
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },true);
  }
}
