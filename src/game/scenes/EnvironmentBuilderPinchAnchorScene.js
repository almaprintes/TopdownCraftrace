import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

const ZOOM_MAX=4;
const ASSET_SCALE_MIN=.08;
const ASSET_SCALE_MAX=12;
const START_DEADZONE_PX=4;
const EDGE_OVERSCROLL_PX=28;

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
    this._suppressSinglePanUntilAllUp=false;

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
      const fit=Math.max(Number(cam.width||1)/worldW,Number(cam.height||1)/worldH);
      return Math.max(.06,Math.min(1,fit));
    };
    const boundsFor=(cam,z=cam?.zoom)=>{
      const zoom=Math.max(.0001,Number(z)||1);
      const {minX,minY,worldW,worldH}=worldMetrics(cam);
      return {minX,minY,maxX:Math.max(minX,minX+worldW-cam.width/zoom),maxY:Math.max(minY,minY+worldH-cam.height/zoom)};
    };
    const clampCam=(cam,z=cam?.zoom,padScreen=0)=>{
      if(!cam)return;
      const b=boundsFor(cam,z),zoom=Math.max(.0001,Number(z)||1),pad=padScreen/zoom;
      cam.scrollX=Math.max(b.minX-pad,Math.min(b.maxX+pad,cam.scrollX));
      cam.scrollY=Math.max(b.minY-pad,Math.min(b.maxY+pad,cam.scrollY));
    };
    const settleCam=cam=>{
      if(!cam)return;
      const b=boundsFor(cam,cam.zoom);
      const tx=Math.max(b.minX,Math.min(b.maxX,cam.scrollX));
      const ty=Math.max(b.minY,Math.min(b.maxY,cam.scrollY));
      if(Math.abs(tx-cam.scrollX)<.01&&Math.abs(ty-cam.scrollY)<.01)return;
      try{this.tweens.killTweensOf(cam);this.tweens.add({targets:cam,scrollX:tx,scrollY:ty,duration:110,ease:'Sine.Out'});}catch{cam.scrollX=tx;cam.scrollY=ty;}
    };
    const worldAtScreen=(cam,p,z=cam?.zoom)=>({
      x:cam.scrollX+(p.x-cam.x)/Math.max(.0001,Number(z)||1),
      y:cam.scrollY+(p.y-cam.y)/Math.max(.0001,Number(z)||1)
    });

    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam)return;

      try{this.tweens.killTweensOf(cam);}catch{}
      cancel();
      this._pinching=true;
      this._suppressSinglePanUntilAllUp=true;
      const d=Math.max(1,dist(ps[0],ps[1]));
      const m=mid(ps[0],ps[1]);

      const selected=this._selected;
      if(selected?._env&&selected?.scene){
        this._pinchMode='asset';
        this._mapPinch=null;
        this._assetPinch={asset:selected,startDistance:d,startAngle:angle(ps[0],ps[1]),startScaleX:Number(selected.scaleX)||1,startScaleY:Number(selected.scaleY)||1,startRotation:Number(selected.rotation)||0};
        return;
      }

      this._pinchMode='map';
      this._assetPinch=null;
      // Capture the exact camera state at the instant finger #2 lands.
      // No camera mutation occurs here.
      this._mapPinch={
        active:false,
        minZoom:minZoomFor(cam),
        initialDistance:d,
        initialMid:{...m},
        lastDistance:d,
        lastMid:{...m}
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
        asset.scaleX=ap.startScaleX*ratio;asset.scaleY=ap.startScaleY*ratio;
        asset.rotation=ap.startRotation+normAngle(angle(ps[0],ps[1])-ap.startAngle);
        this._drawSelection?.();
        return;
      }

      const mp=this._mapPinch;
      if(this._pinchMode!=='map'||!mp)return;
      const d=Math.max(1,dist(ps[0],ps[1]));
      const m=mid(ps[0],ps[1]);

      if(!mp.active){
        const panDrift=Math.hypot(m.x-mp.initialMid.x,m.y-mp.initialMid.y);
        const zoomDrift=Math.abs(d-mp.initialDistance);
        if(panDrift<START_DEADZONE_PX&&zoomDrift<START_DEADZONE_PX)return;
        // First meaningful sample becomes the incremental baseline. This throws
        // away iOS's tiny contact-settling movement when finger #2 lands.
        mp.active=true;
        mp.lastDistance=d;
        mp.lastMid={...m};
        return;
      }

      const oldZoom=Math.max(.0001,Number(cam.zoom)||1);
      let ratio=d/Math.max(1,mp.lastDistance);
      if(!Number.isFinite(ratio))ratio=1;
      const newZoom=Math.max(mp.minZoom,Math.min(ZOOM_MAX,oldZoom*ratio));

      // Incremental map transform: preserve the world point that was under the
      // previous midpoint, then place it under the current midpoint. This makes
      // pan + zoom one continuous gesture instead of two competing operations.
      const anchor=worldAtScreen(cam,mp.lastMid,oldZoom);
      cam.setZoom(newZoom);
      cam.scrollX=anchor.x-(m.x-cam.x)/newZoom;
      cam.scrollY=anchor.y-(m.y-cam.y)/newZoom;
      clampCam(cam,newZoom,EDGE_OVERSCROLL_PX);

      mp.lastDistance=d;
      mp.lastMid={...m};
      if(this._selectedSurface||this._selRail)this._drawSelection?.();
    });

    const end=p=>{
      const wasPinching=this._pinching;
      this._pinchPointers.delete(p?.id);
      if(!wasPinching){if(this._pinchPointers.size===0)this._suppressSinglePanUntilAllUp=false;return;}
      if(pair().length>=2)return;

      this._pinching=false;
      settleCam(this._editCam);
      this._assetPinch=null;this._mapPinch=null;this._pinchMode=null;
      cancel();
      if(this._pinchPointers.size===0)this._suppressSinglePanUntilAllUp=false;
      this._drawSelection?.();
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
