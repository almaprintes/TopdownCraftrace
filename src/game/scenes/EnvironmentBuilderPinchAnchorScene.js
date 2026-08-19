import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

const ZOOM_MIN=.012;
const ZOOM_MAX=4;
const CAMERA_RESPONSE=18;
const ASSET_SCALE_MIN=.08;
const ASSET_SCALE_MAX=12;

function normAngle(a){return Math.atan2(Math.sin(a),Math.cos(a));}

export class EnvironmentBuilderScene extends Current {
  _setupInput(){
    super._setupInput();
    try{this.input.addPointer(2);}catch{}

    this._pinchPointers=new Map();
    this._pinching=false;
    this._pinchMode=null;
    this._assetPinch=null;
    this._mapPinch=null;

    const inside=p=>!!p&&this._inside?.(p);
    const pair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown&&inside(p)).slice(0,2);
    const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
    const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
    const cancel=()=>{
      this._panStart=null;this._freePan=null;
      this._surfaceStart=null;this._surfaceTrace=null;this._surfaceDrag=null;
      this._railStart=null;this._linearStart=null;this._railDrag=null;
      this._assetTapCandidate=null;this._emptyTapCandidate=null;
    };
    const boundsFor=(cam,z=cam?.zoom)=>{
      const zoom=Math.max(.0001,Number(z)||1);
      const b=cam?._bounds;
      const minX=Number(b?.x)||0,minY=Number(b?.y)||0;
      const worldW=Number(b?.width)||this._editorWorldW||8000;
      const worldH=Number(b?.height)||this._editorWorldH||5000;
      return {
        minX,minY,
        maxX:Math.max(minX,minX+worldW-cam.width/zoom),
        maxY:Math.max(minY,minY+worldH-cam.height/zoom)
      };
    };
    const clampCam=cam=>{
      if(!cam)return;
      const b=boundsFor(cam);
      cam.scrollX=Math.max(b.minX,Math.min(b.maxX,cam.scrollX));
      cam.scrollY=Math.max(b.minY,Math.min(b.maxY,cam.scrollY));
    };

    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam)return;

      cancel();
      this._pinching=true;
      const d=Math.max(1,dist(ps[0],ps[1]));
      const m=mid(ps[0],ps[1]);

      // The gesture context is fixed when the second finger lands.
      const selected=this._selected;
      if(selected?._env&&selected?.scene){
        this._pinchMode='asset';
        this._mapPinch=null;
        this._assetPinch={
          asset:selected,
          startDistance:d,
          startAngle:angle(ps[0],ps[1]),
          startScaleX:Number(selected.scaleX)||1,
          startScaleY:Number(selected.scaleY)||1,
          startRotation:Number(selected.rotation)||0
        };
        return;
      }

      this._pinchMode='map';
      this._assetPinch=null;
      const anchor=cam.getWorldPoint(m.x,m.y);
      this._mapPinch={
        startDistance:d,
        startZoom:Number(cam.zoom)||1,
        targetZoom:Number(cam.zoom)||1,
        mid:{...m},
        anchor:{x:anchor.x,y:anchor.y},
        previousUseBounds:cam.useBounds
      };

      // Camera bounds must not fight the fingers during an active map gesture.
      // They are restored as soon as either finger is released.
      if('useBounds' in cam)cam.useBounds=false;
    });

    this.input.on('pointermove',p=>{
      if(this._pinchPointers.has(p.id))this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam||!this._pinching)return;
      cancel();

      if(this._pinchMode==='asset'){
        const ap=this._assetPinch,asset=ap?.asset;
        if(!ap||!asset?.scene)return;
        const d=Math.max(1,dist(ps[0],ps[1]));
        let ratio=d/Math.max(1,ap.startDistance);
        if(!Number.isFinite(ratio))ratio=1;
        ratio=Math.max(ASSET_SCALE_MIN,Math.min(ASSET_SCALE_MAX,ratio));
        asset.scaleX=ap.startScaleX*ratio;
        asset.scaleY=ap.startScaleY*ratio;
        const da=normAngle(angle(ps[0],ps[1])-ap.startAngle);
        asset.rotation=ap.startRotation+da;
        this._drawSelection?.();
        return;
      }

      const mp=this._mapPinch;
      if(this._pinchMode!=='map'||!mp)return;
      const d=Math.max(1,dist(ps[0],ps[1]));
      const m=mid(ps[0],ps[1]);
      let ratio=d/Math.max(1,mp.startDistance);
      if(!Number.isFinite(ratio))ratio=1;
      mp.targetZoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,mp.startZoom*ratio));
      mp.mid={...m};
    });

    // Zoom is smoothed per frame, but scroll is NOT interpolated separately.
    // At every frame it is solved from the same world anchor and the live finger
    // midpoint, so the point between the two fingers cannot drift while zooming.
    this.events.on('update',(_time,delta=16.67)=>{
      if(!this._pinching||this._pinchMode!=='map')return;
      const cam=this._editCam,mp=this._mapPinch;
      if(!cam||!mp)return;

      const dt=Math.max(1,Math.min(50,Number(delta)||16.67))/1000;
      const k=1-Math.exp(-CAMERA_RESPONSE*dt);
      const current=Math.max(.0001,Number(cam.zoom)||1);
      const next=current+(mp.targetZoom-current)*k;
      cam.setZoom(next);

      const localX=mp.mid.x-cam.x;
      const localY=mp.mid.y-cam.y;
      cam.scrollX=mp.anchor.x-localX/next;
      cam.scrollY=mp.anchor.y-localY/next;

      if(this._selectedSurface||this._selRail)this._drawSelection?.();
    });

    const end=p=>{
      const wasPinching=this._pinching;
      const endedMode=this._pinchMode;
      const cam=this._editCam;
      const mp=this._mapPinch;
      this._pinchPointers.delete(p?.id);
      if(!wasPinching)return;
      if(pair().length>=2)return;

      this._pinching=false;
      if(endedMode==='map'&&cam&&mp){
        // Finish at the exact requested zoom/anchor before restoring bounds.
        const z=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,mp.targetZoom));
        cam.setZoom(z);
        const localX=mp.mid.x-cam.x,localY=mp.mid.y-cam.y;
        cam.scrollX=mp.anchor.x-localX/z;
        cam.scrollY=mp.anchor.y-localY/z;
        if('useBounds' in cam)cam.useBounds=mp.previousUseBounds!==false;
        clampCam(cam);
      }

      this._assetPinch=null;
      this._mapPinch=null;
      this._pinchMode=null;
      cancel();
      this._drawSelection?.();
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
