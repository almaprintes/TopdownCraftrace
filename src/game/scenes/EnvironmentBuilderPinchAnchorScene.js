import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

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
    const worldMetrics=cam=>{
      const b=cam?._bounds;
      const minX=Number.isFinite(Number(b?.x))?Number(b.x):0;
      const minY=Number.isFinite(Number(b?.y))?Number(b.y):0;
      const worldW=Math.max(1,Number(b?.width)||Number(this._editorWorldW)||8000);
      const worldH=Math.max(1,Number(b?.height)||Number(this._editorWorldH)||5000);
      return {minX,minY,worldW,worldH};
    };
    const minZoomFor=cam=>{
      if(!cam)return .08;
      const {worldW,worldH}=worldMetrics(cam);
      // Never zoom out so far that the visible viewport becomes larger than the
      // editable world. This prevents the track from escaping outside the canvas.
      const fit=Math.max(Number(cam.width||1)/worldW,Number(cam.height||1)/worldH);
      return Math.max(.06,Math.min(1,fit));
    };
    const boundsFor=(cam,z=cam?.zoom)=>{
      const zoom=Math.max(.0001,Number(z)||1);
      const {minX,minY,worldW,worldH}=worldMetrics(cam);
      return {
        minX,minY,
        maxX:Math.max(minX,minX+worldW-cam.width/zoom),
        maxY:Math.max(minY,minY+worldH-cam.height/zoom)
      };
    };
    const clampCam=(cam,z=cam?.zoom)=>{
      if(!cam)return;
      const b=boundsFor(cam,z);
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
        minZoom:minZoomFor(cam),
        mid:{...m},
        anchor:{x:anchor.x,y:anchor.y}
      };
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
      mp.targetZoom=Math.max(mp.minZoom,Math.min(ZOOM_MAX,mp.startZoom*ratio));
      mp.mid={...m};
    });

    // Zoom remains anchored under the live midpoint between the fingers. After
    // solving the anchor, clamp immediately to the real track world so the map
    // never flies outside the editable canvas.
    this.events.on('update',(_time,delta=16.67)=>{
      if(!this._pinching||this._pinchMode!=='map')return;
      const cam=this._editCam,mp=this._mapPinch;
      if(!cam||!mp)return;

      const dt=Math.max(1,Math.min(50,Number(delta)||16.67))/1000;
      const k=1-Math.exp(-CAMERA_RESPONSE*dt);
      const current=Math.max(.0001,Number(cam.zoom)||1);
      const next=Math.max(mp.minZoom,Math.min(ZOOM_MAX,current+(mp.targetZoom-current)*k));
      cam.setZoom(next);

      const localX=mp.mid.x-cam.x;
      const localY=mp.mid.y-cam.y;
      cam.scrollX=mp.anchor.x-localX/next;
      cam.scrollY=mp.anchor.y-localY/next;
      clampCam(cam,next);

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
        const z=Math.max(mp.minZoom,Math.min(ZOOM_MAX,mp.targetZoom));
        cam.setZoom(z);
        const localX=mp.mid.x-cam.x,localY=mp.mid.y-cam.y;
        cam.scrollX=mp.anchor.x-localX/z;
        cam.scrollY=mp.anchor.y-localY/z;
        clampCam(cam,z);
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
