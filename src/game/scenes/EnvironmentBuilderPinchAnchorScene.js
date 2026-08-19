import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailAdaptiveScene.js';

export class EnvironmentBuilderScene extends Current {
  _setupInput(){
    super._setupInput();
    try{this.input.addPointer(2);}catch{}

    this._pinchPointers=new Map();
    this._pinchLastDistance=0;

    const inside=p=>!!p&&this._inside?.(p);
    const pair=()=>Array.from(this._pinchPointers.values()).filter(p=>p?.isDown&&inside(p)).slice(0,2);
    const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
    const cancel=()=>{
      this._panStart=null;this._freePan=null;
      this._surfaceStart=null;this._surfaceDrag=null;
      this._railStart=null;this._railDrag=null;
    };

    this.input.on('pointerdown',p=>{
      if(!inside(p))return;
      this._pinchPointers.set(p.id,p);
      const ps=pair();
      if(ps.length<2)return;
      cancel();
      this._pinchLastDistance=Math.max(1,dist(ps[0],ps[1]));
    });

    this.input.on('pointermove',p=>{
      if(this._pinchPointers.has(p.id))this._pinchPointers.set(p.id,p);
      const ps=pair(),cam=this._editCam;
      if(ps.length<2||!cam)return;
      cancel();

      const d=Math.max(1,dist(ps[0],ps[1]));
      if(!this._pinchLastDistance){this._pinchLastDistance=d;return;}
      const ratio=d/this._pinchLastDistance;
      if(!Number.isFinite(ratio)||Math.abs(ratio-1)<0.003)return;

      const mx=(ps[0].x+ps[1].x)/2;
      const my=(ps[0].y+ps[1].y)/2;
      const localX=mx-cam.x;
      const localY=my-cam.y;
      if(localX<0||localY<0||localX>cam.width||localY>cam.height)return;

      const current=Math.max(0.0001,Number(cam.zoom)||1);
      const anchorX=cam.scrollX+localX/current;
      const anchorY=cam.scrollY+localY/current;
      const next=Math.max(0.012,Math.min(4,current*ratio));

      cam.setZoom(next);
      cam.scrollX=anchorX-localX/next;
      cam.scrollY=anchorY-localY/next;

      this._pinchLastDistance=d;
      if(this._selectedSurface||this._selRail)this._drawSelection?.();
    });

    const end=p=>{
      this._pinchPointers.delete(p?.id);
      if(pair().length<2){this._pinchLastDistance=0;cancel();}
    };
    this.input.on('pointerup',end);
    this.input.on('pointerupoutside',end);
  }
}
