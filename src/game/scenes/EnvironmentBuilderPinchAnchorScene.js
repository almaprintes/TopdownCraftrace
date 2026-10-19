import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';
import {editorCameraPanBounds,scrollForTwoFingerMapGesture,clampEditorScroll} from '../environment/environmentMapNavigation.js';

const ZOOM_MAX=4;
const ASSET_SCALE_MIN=.08;
const ASSET_SCALE_MAX=12;
const START_DEADZONE_PX=4;
function normAngle(a){return Math.atan2(Math.sin(a),Math.cos(a));}

export class EnvironmentBuilderScene extends Current {
  // Give the editor camera actual padded bounds. Merely clamping scroll in the
  // pointer handler does not work: Phaser's camera bounds clamp it again later.
  _syncEditorPanBounds(){
    const cam=this._editCam;if(!cam)return null;
    const size=this._realTrack||{};
    const w=Math.max(1,Number(this._editorWorldW)||Number(size.worldW)||8000);
    const h=Math.max(1,Number(this._editorWorldH)||Number(size.worldH)||5000);
    const b=editorCameraPanBounds(w,h,cam.width,cam.height,cam.zoom);
    cam.setBounds(b.x,b.y,b.width,b.height);
    return b;
  }
  _clampEditorPan(){
    const cam=this._editCam,b=this._syncEditorPanBounds();
    if(!cam||!b)return;
    const scroll=clampEditorScroll(cam.scrollX,cam.scrollY,b);
    cam.scrollX=scroll.x;cam.scrollY=scroll.y;
  }
  _fitRealTrack(){
    super._fitRealTrack();
    // Track selection and delayed refits also change zoom. Keep the margin
    // in SCREEN pixels after every fit, not just after pinch/button zoom.
    this._clampEditorPan();
  }
  _openRealTrack(trackId,resetProject=true){
    super._openRealTrack(trackId,resetProject);
    this._clampEditorPan();
  }
  _zoom(multiplier){
    super._zoom(multiplier);
    this._clampEditorPan();
  }
  _setupInput(){
    super._setupInput();
    try{this.input.addPointer(2);}catch{}
    this._clampEditorPan();

    this._pinchPointers=new Map();
    this._pinching=false;
    this._pinchMode=null;
    this._assetPinch=null;
    this._mapPinch=null;
    this._suppressSinglePanUntilAllUp=false;

    const inside=p=>!!p&&this._inside?.(p);
    // Both fingers must START in the editor, but may drift outside its viewport
    // without abruptly dropping the pair while panning towards photo edges.
    const pair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown).slice(0,2);
    const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
    const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
    const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
    const cancel=()=>{
      this._panStart=null;this._freePan=null;
      this._surfaceStart=null;this._surfaceTrace=null;this._surfaceDrag=null;
      this._railStart=null;this._linearStart=null;this._railDrag=null;
      this._assetTapCandidate=null;this._emptyTapCandidate=null;
    };
    const minZoomFor=cam=>{
      if(!cam)return .08;
      // Do not use cam._bounds: it includes the added editorial padding.
      const w=Math.max(1,Number(this._editorWorldW)||8000);
      const h=Math.max(1,Number(this._editorWorldH)||5000);
      const fit=Math.max(Number(cam.width||1)/w,Number(cam.height||1)/h);
      return Math.max(.06,Math.min(1,fit));
    };

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
      // Scaling a selected asset remains available in SELECT mode. In collision
      // modes, two fingers always navigate the map instead of editing objects.
      if(this._mode==='select'&&selected?._env&&selected?.scene){
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
        // Keep the original anchor so a deliberate drag starts moving the
        // map on this first sample (without discarding its first few pixels).
        mp.active=true;
      }

      const oldZoom=Math.max(.0001,Number(cam.zoom)||1);
      let ratio=d/Math.max(1,mp.lastDistance);
      if(!Number.isFinite(ratio))ratio=1;
      const newZoom=Math.max(mp.minZoom,Math.min(ZOOM_MAX,oldZoom*ratio));

      // Pan both axes even when finger separation remains constant; pinch
      // additionally scales around the midpoint without world-point drift.
      const scroll=scrollForTwoFingerMapGesture(
        cam.scrollX,cam.scrollY,cam.x,cam.y,mp.lastMid,m,oldZoom,newZoom
      );
      cam.setZoom(newZoom);
      const bounds=this._syncEditorPanBounds();
      const limited=clampEditorScroll(scroll.x,scroll.y,bounds);
      cam.scrollX=limited.x;cam.scrollY=limited.y;

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
      // Keep the chosen position at the edge when fingers are lifted.
      this._clampEditorPan();
      this._assetPinch=null;this._mapPinch=null;this._pinchMode=null;
      cancel();
      if(this._pinchPointers.size===0)this._suppressSinglePanUntilAllUp=false;
      this._drawSelection?.();
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
