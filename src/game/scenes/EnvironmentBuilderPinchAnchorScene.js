import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

export class EnvironmentBuilderScene extends Current {
  _setupInput(){
    super._setupInput();
    try{this.input.addPointer(2);}catch{}

    this._pinchPointers=new Map();
    this._pinchLastDistance=0;
    this._pinchLastMid=null;
    this._pinching=false;

    const inside=p=>!!p&&this._inside?.(p);
    const pair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown&&inside(p)).slice(0,2);
    const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
    const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const cancel=()=>{
      this._panStart=null;this._freePan=null;
      this._surfaceStart=null;this._surfaceTrace=null;this._surfaceDrag=null;
      this._railStart=null;this._linearStart=null;this._railDrag=null;
      // Higher interaction layers use these candidates for pointerup selection.
      // A two-finger gesture must never become a select/deselect tap afterwards.
      this._assetTapCandidate=null;this._emptyTapCandidate=null;
    };
    const clampScroll=cam=>{
      const z=Math.max(.0001,Number(cam.zoom)||1);
      const worldW=Number(cam._bounds?.width)||8000,worldH=Number(cam._bounds?.height)||5000;
      const minX=Number(cam._bounds?.x)||0,minY=Number(cam._bounds?.y)||0;
      const maxX=Math.max(minX,minX+worldW-cam.width/z),maxY=Math.max(minY,minY+worldH-cam.height/z);
      cam.scrollX=Math.max(minX,Math.min(maxX,cam.scrollX));
      cam.scrollY=Math.max(minY,Math.min(maxY,cam.scrollY));
    };

    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      this._pinchPointers.set(p.id,p);
      const ps=pair();
      if(ps.length<2)return;
      cancel();
      this._pinching=true;
      this._pinchLastDistance=Math.max(1,dist(ps[0],ps[1]));
      this._pinchLastMid=mid(ps[0],ps[1]);
    });

    this.input.on('pointermove',p=>{
      if(this._pinchPointers.has(p.id))this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam)return;
      cancel();
      this._pinching=true;

      const d=Math.max(1,dist(ps[0],ps[1]));
      const nowMid=mid(ps[0],ps[1]);
      if(!this._pinchLastDistance||!this._pinchLastMid){
        this._pinchLastDistance=d;this._pinchLastMid=nowMid;return;
      }

      const prevLocalX=this._pinchLastMid.x-cam.x;
      const prevLocalY=this._pinchLastMid.y-cam.y;
      const nowLocalX=nowMid.x-cam.x;
      const nowLocalY=nowMid.y-cam.y;
      if(prevLocalX<0||prevLocalY<0||prevLocalX>cam.width||prevLocalY>cam.height||nowLocalX<0||nowLocalY<0||nowLocalX>cam.width||nowLocalY>cam.height){
        this._pinchLastDistance=d;this._pinchLastMid=nowMid;return;
      }

      const current=Math.max(.0001,Number(cam.zoom)||1);
      // World point that was under the previous midpoint of the two fingers.
      const anchorX=cam.scrollX+prevLocalX/current;
      const anchorY=cam.scrollY+prevLocalY/current;

      let ratio=d/this._pinchLastDistance;
      if(!Number.isFinite(ratio))ratio=1;
      // Distance jitter should not cause visible breathing, but midpoint movement
      // must still pan even when the pinch distance barely changes.
      if(Math.abs(ratio-1)<.002)ratio=1;
      const next=Math.max(.012,Math.min(4,current*ratio));

      cam.setZoom(next);
      // Put the same world anchor under the NEW midpoint. This single transform
      // gives simultaneous two-finger translation and pinch zoom, map-style.
      cam.scrollX=anchorX-nowLocalX/next;
      cam.scrollY=anchorY-nowLocalY/next;
      clampScroll(cam);

      this._pinchLastDistance=d;
      this._pinchLastMid=nowMid;
      if(this._selectedSurface||this._selRail)this._drawSelection?.();
    });

    const end=p=>{
      this._pinchPointers.delete(p?.id);
      if(pair().length<2){
        this._pinching=false;
        this._pinchLastDistance=0;
        this._pinchLastMid=null;
        cancel();
      }
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
