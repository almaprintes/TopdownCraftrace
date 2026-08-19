import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

const ZOOM_MIN=.012;
const ZOOM_MAX=4;
const CAMERA_RESPONSE=18;
const MAX_EVENT_RATIO=1.12;

export class EnvironmentBuilderScene extends Current {
  _setupInput(){
    super._setupInput();
    try{this.input.addPointer(2);}catch{}

    this._pinchPointers=new Map();
    this._pinching=false;
    this._pinchPrevDistance=0;
    this._pinchPrevMid=null;
    this._pinchTarget=null;
    this._pinchSettling=false;

    const inside=p=>!!p&&this._inside?.(p);
    const pair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown&&inside(p)).slice(0,2);
    const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
    const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const cancel=()=>{
      this._panStart=null;this._freePan=null;
      this._surfaceStart=null;this._surfaceTrace=null;this._surfaceDrag=null;
      this._railStart=null;this._linearStart=null;this._railDrag=null;
      this._assetTapCandidate=null;this._emptyTapCandidate=null;
    };
    const bounds=cam=>{
      const z=Math.max(.0001,Number(cam.zoom)||1);
      const worldW=Number(cam._bounds?.width)||8000,worldH=Number(cam._bounds?.height)||5000;
      const minX=Number(cam._bounds?.x)||0,minY=Number(cam._bounds?.y)||0;
      return {minX,minY,maxX:Math.max(minX,minX+worldW-cam.width/z),maxY:Math.max(minY,minY+worldH-cam.height/z)};
    };
    const clampTarget=t=>{
      const cam=this._editCam;if(!cam||!t)return;
      const z=Math.max(.0001,t.zoom);
      const worldW=Number(cam._bounds?.width)||8000,worldH=Number(cam._bounds?.height)||5000;
      const minX=Number(cam._bounds?.x)||0,minY=Number(cam._bounds?.y)||0;
      const maxX=Math.max(minX,minX+worldW-cam.width/z),maxY=Math.max(minY,minY+worldH-cam.height/z);
      t.x=Math.max(minX,Math.min(maxX,t.x));t.y=Math.max(minY,Math.min(maxY,t.y));
    };
    const clampCam=cam=>{
      const b=bounds(cam);
      cam.scrollX=Math.max(b.minX,Math.min(b.maxX,cam.scrollX));
      cam.scrollY=Math.max(b.minY,Math.min(b.maxY,cam.scrollY));
    };

    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam)return;
      cancel();
      this._pinching=true;this._pinchSettling=false;
      this._pinchPrevDistance=Math.max(1,dist(ps[0],ps[1]));
      this._pinchPrevMid=mid(ps[0],ps[1]);
      this._pinchTarget={x:cam.scrollX,y:cam.scrollY,zoom:Number(cam.zoom)||1};
    });

    // Pointer events update only the exact desired camera transform. They never
    // move the camera directly; rendering toward this target happens every frame.
    this.input.on('pointermove',p=>{
      if(this._pinchPointers.has(p.id))this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam,t=this._pinchTarget;
      if(ps.length<2||!cam||!t)return;
      cancel();this._pinching=true;

      const d=Math.max(1,dist(ps[0],ps[1])),m=mid(ps[0],ps[1]);
      if(!this._pinchPrevDistance||!this._pinchPrevMid){this._pinchPrevDistance=d;this._pinchPrevMid=m;return;}

      const prevX=this._pinchPrevMid.x-cam.x,prevY=this._pinchPrevMid.y-cam.y;
      const nowX=m.x-cam.x,nowY=m.y-cam.y;
      if(prevX<0||prevY<0||prevX>cam.width||prevY>cam.height||nowX<0||nowY<0||nowX>cam.width||nowY>cam.height){
        this._pinchPrevDistance=d;this._pinchPrevMid=m;return;
      }

      const oldZoom=Math.max(.0001,t.zoom);
      const anchorX=t.x+prevX/oldZoom,anchorY=t.y+prevY/oldZoom;
      let ratio=d/this._pinchPrevDistance;
      if(!Number.isFinite(ratio))ratio=1;
      ratio=Math.max(1/MAX_EVENT_RATIO,Math.min(MAX_EVENT_RATIO,ratio));
      const nextZoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,oldZoom*ratio));

      t.zoom=nextZoom;
      t.x=anchorX-nowX/nextZoom;
      t.y=anchorY-nowY/nextZoom;
      clampTarget(t);

      this._pinchPrevDistance=d;
      this._pinchPrevMid=m;
    });

    // Exponential interpolation is frame-rate independent. The target follows the
    // raw touch geometry exactly; only the camera presentation is smoothed.
    this.events.on('update',(_time,delta=16.67)=>{
      const cam=this._editCam,t=this._pinchTarget;
      if(!cam||!t||(!this._pinching&&!this._pinchSettling))return;
      const dt=Math.max(1,Math.min(50,Number(delta)||16.67))/1000;
      const k=1-Math.exp(-CAMERA_RESPONSE*dt);
      const nz=cam.zoom+(t.zoom-cam.zoom)*k;
      cam.setZoom(nz);
      cam.scrollX+=(t.x-cam.scrollX)*k;
      cam.scrollY+=(t.y-cam.scrollY)*k;
      clampCam(cam);
      if(this._selectedSurface||this._selRail)this._drawSelection?.();

      if(!this._pinching){
        const done=Math.abs(t.zoom-cam.zoom)<.00015&&Math.hypot(t.x-cam.scrollX,t.y-cam.scrollY)<.12;
        if(done){cam.setZoom(t.zoom);cam.scrollX=t.x;cam.scrollY=t.y;clampCam(cam);this._pinchSettling=false;this._pinchTarget=null;}
      }
    });

    const end=p=>{
      const wasPinching=this._pinching;
      this._pinchPointers.delete(p?.id);
      // A normal one-finger pointerup belongs to the selection layer. Do not
      // clear its deferred asset/empty-map tap candidates here. Only an actual
      // two-finger gesture owns and cancels those candidates.
      if(!wasPinching)return;
      if(pair().length<2){
        this._pinching=false;
        this._pinchSettling=!!this._pinchTarget;
        this._pinchPrevDistance=0;
        this._pinchPrevMid=null;
        cancel();
      }
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
