import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

export class EnvironmentBuilderScene extends Current {
  _setupInput(){
    super._setupInput();

    // Phaser normally starts with a very small pointer pool. Ensure enough
    // touch pointers are available for a real two-finger gesture on iPhone.
    try{ this.input.addPointer(2); }catch{}

    this._pinchPointers=new Map();
    this._pinchLastDistance=0;
    this._pinching=false;

    const inside=p=>!!p&&this._inside?.(p);
    const activePair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown&&inside(p)).slice(0,2);
    const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);

    const cancelSingleFingerEditing=()=>{
      // Do not let inherited one-finger gestures fight the pinch.
      this._panStart=null;
      this._freePan=null;
      this._surfaceStart=null;
      this._surfaceDrag=null;
      this._railStart=null;
      this._railDrag=null;
    };

    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      this._pinchPointers.set(p.id,p);
      const pair=activePair();
      if(pair.length<2)return;
      this._pinching=true;
      cancelSingleFingerEditing();
      this._pinchLastDistance=Math.max(1,distance(pair[0],pair[1]));
    });

    this.input.on('pointermove',p=>{
      if(this._pinchPointers.has(p.id))this._pinchPointers.set(p.id,p);
      const pair=activePair();
      if(pair.length<2||!this._editCam)return;

      this._pinching=true;
      cancelSingleFingerEditing();

      const d=Math.max(1,distance(pair[0],pair[1]));
      if(!this._pinchLastDistance){this._pinchLastDistance=d;return;}

      // Ignore tiny touch jitter but keep the response immediate.
      const ratio=d/this._pinchLastDistance;
      if(!Number.isFinite(ratio)||Math.abs(ratio-1)<0.003)return;

      const mx=(pair[0].x+pair[1].x)/2;
      const my=(pair[0].y+pair[1].y)/2;
      const before=this._editCam.getWorldPoint(mx,my);
      const current=Number(this._editCam.zoom)||1;
      const next=Math.max(0.012,Math.min(4,current*ratio));

      this._editCam.setZoom(next);
      const after=this._editCam.getWorldPoint(mx,my);
      this._editCam.scrollX+=before.x-after.x;
      this._editCam.scrollY+=before.y-after.y;

      this._pinchLastDistance=d;
      if(this._selectedSurface||this._selRail)this._drawSelection?.();
    });

    const end=p=>{
      this._pinchPointers.delete(p?.id);
      const pair=activePair();
      if(pair.length<2){
        this._pinching=false;
        this._pinchLastDistance=0;
        cancelSingleFingerEditing();
      }
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
