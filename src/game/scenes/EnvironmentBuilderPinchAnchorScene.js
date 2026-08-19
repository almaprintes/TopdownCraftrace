import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

const MID_ALPHA=.38;
const DIST_ALPHA=.34;
const MID_DEAD_PX=.45;
const MAX_ZOOM_STEP=1.055;

export class EnvironmentBuilderScene extends Current {
  _setupInput(){
    super._setupInput();
    try{this.input.addPointer(2);}catch{}

    this._pinchPointers=new Map();
    this._pinchLastDistance=0;
    this._pinchLastMid=null;
    this._pinchSmoothDistance=0;
    this._pinchSmoothMid=null;
    this._pinching=false;

    const inside=p=>!!p&&this._inside?.(p);
    const pair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown&&inside(p)).slice(0,2);
    const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
    const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const mix=(a,b,k)=>a+(b-a)*k;
    const cancel=()=>{
      this._panStart=null;this._freePan=null;
      this._surfaceStart=null;this._surfaceTrace=null;this._surfaceDrag=null;
      this._railStart=null;this._linearStart=null;this._railDrag=null;
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
      const d=Math.max(1,dist(ps[0],ps[1])),m=mid(ps[0],ps[1]);
      this._pinchLastDistance=d;
      this._pinchLastMid={...m};
      this._pinchSmoothDistance=d;
      this._pinchSmoothMid={...m};
    });

    this.input.on('pointermove',p=>{
      if(this._pinchPointers.has(p.id))this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam)return;
      cancel();
      this._pinching=true;

      const rawD=Math.max(1,dist(ps[0],ps[1]));
      const rawMid=mid(ps[0],ps[1]);
      if(!this._pinchSmoothDistance||!this._pinchSmoothMid){
        this._pinchSmoothDistance=rawD;this._pinchSmoothMid={...rawMid};
        this._pinchLastDistance=rawD;this._pinchLastMid={...rawMid};return;
      }

      const smoothD=mix(this._pinchSmoothDistance,rawD,DIST_ALPHA);
      let smoothX=mix(this._pinchSmoothMid.x,rawMid.x,MID_ALPHA);
      let smoothY=mix(this._pinchSmoothMid.y,rawMid.y,MID_ALPHA);
      if(Math.abs(smoothX-this._pinchSmoothMid.x)<MID_DEAD_PX)smoothX=this._pinchSmoothMid.x;
      if(Math.abs(smoothY-this._pinchSmoothMid.y)<MID_DEAD_PX)smoothY=this._pinchSmoothMid.y;
      const smoothMid={x:smoothX,y:smoothY};

      const prevLocalX=this._pinchSmoothMid.x-cam.x;
      const prevLocalY=this._pinchSmoothMid.y-cam.y;
      const nowLocalX=smoothMid.x-cam.x;
      const nowLocalY=smoothMid.y-cam.y;
      if(prevLocalX<0||prevLocalY<0||prevLocalX>cam.width||prevLocalY>cam.height||nowLocalX<0||nowLocalY<0||nowLocalX>cam.width||nowLocalY>cam.height){
        this._pinchSmoothDistance=smoothD;this._pinchSmoothMid=smoothMid;
        this._pinchLastDistance=rawD;this._pinchLastMid=rawMid;return;
      }

      const current=Math.max(.0001,Number(cam.zoom)||1);
      const anchorX=cam.scrollX+prevLocalX/current;
      const anchorY=cam.scrollY+prevLocalY/current;

      let ratio=smoothD/Math.max(1,this._pinchSmoothDistance);
      if(!Number.isFinite(ratio)||Math.abs(ratio-1)<.0015)ratio=1;
      ratio=Math.max(1/MAX_ZOOM_STEP,Math.min(MAX_ZOOM_STEP,ratio));
      const next=Math.max(.012,Math.min(4,current*ratio));

      cam.setZoom(next);
      cam.scrollX=anchorX-nowLocalX/next;
      cam.scrollY=anchorY-nowLocalY/next;
      clampScroll(cam);

      this._pinchSmoothDistance=smoothD;
      this._pinchSmoothMid=smoothMid;
      this._pinchLastDistance=rawD;
      this._pinchLastMid=rawMid;
      if(this._selectedSurface||this._selRail)this._drawSelection?.();
    });

    const end=p=>{
      this._pinchPointers.delete(p?.id);
      if(pair().length<2){
        this._pinching=false;
        this._pinchLastDistance=0;
        this._pinchLastMid=null;
        this._pinchSmoothDistance=0;
        this._pinchSmoothMid=null;
        cancel();
      }
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
