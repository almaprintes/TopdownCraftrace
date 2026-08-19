import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderVegetationToolStateScene.js';
import { pathPoint, normalizedPoints, fivePointsFromTrace } from '../environment/EditableSpline.js';

const SURFACE_STYLE={
  asphalt:{main:0x2b2c2f,edge:0x656a70},
  grass:{main:0x285936,edge:0x39794a},
  dirt:{main:0x695743,edge:0x806d55},
  gravel:{main:0x77766f,edge:0x97968d}
};

function dist2(a,b){const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy;}
function syncEnds(s,pts){s.points=pts.map(p=>({...p}));s.x1=pts[0].x;s.y1=pts[0].y;s.x2=pts[pts.length-1].x;s.y2=pts[pts.length-1].y;delete s.cpx;delete s.cpy;}

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupUi(){
    super._setupUi();
    const {width,height}=this.scale;
    const rx=width-this._right+14;
    const py=height-174;
    this._straightenSurfaceBtn=this._btn(rx+228,py+122,48,28,'RECTA',()=>this._straightenSelectedSurface(),0x45dfff);
  }

  _setupInput(){
    this._panStart=null;
    this._surfaceStart=null;
    this._surfaceTrace=null;
    this._freePan=null;
    this._surfaceDrag=null;

    const isWorldAsset=obj=>!!obj?._env;
    const worldAt=p=>this._editCam.getWorldPoint(p.x,p.y);

    this.input.on('pointerdown',(p,currentlyOver=[])=>{
      if(!this._inside(p))return;
      const w=worldAt(p);

      if(this._mode==='pan'){
        this._panStart={pointerId:p.id,x:p.x,y:p.y,sx:this._editCam.scrollX,sy:this._editCam.scrollY};
        return;
      }

      if(this._mode==='surface'){
        this._surfaceStart=w;
        this._surfaceTrace=[{...w}];
        return;
      }

      if(this._mode!=='select')return;

      const handle=this._surfaceHandleAt(w);
      if(handle){
        this._surfaceDrag={pointerId:p.id,type:handle};
        return;
      }

      if(Array.isArray(currentlyOver)&&currentlyOver.some(isWorldAsset))return;

      const hit=this._surfaceAt(w);
      if(hit){
        this._selectSurface(hit);
        return;
      }

      this._freePan={pointerId:p.id,x:p.x,y:p.y,scrollX:this._editCam.scrollX,scrollY:this._editCam.scrollY};
    });

    this.input.on('pointermove',p=>{
      if(this._mode==='surface'&&this._surfaceStart&&p.isDown){
        const w=worldAt(p),last=this._surfaceTrace?.[this._surfaceTrace.length-1];
        if(!last||dist2(w,last)>36)this._surfaceTrace.push({...w});
        return;
      }

      if(this._surfaceDrag&&p.isDown&&p.id===this._surfaceDrag.pointerId&&this._selectedSurface){
        const w=worldAt(p),s=this._selectedSurface,pts=normalizedPoints(s);
        if(this._surfaceDrag.type==='start')pts[0]=w;
        else if(this._surfaceDrag.type==='end')pts[pts.length-1]=w;
        else if(String(this._surfaceDrag.type).startsWith('node:')){
          const i=Number(String(this._surfaceDrag.type).split(':')[1]);
          if(i>0&&i<pts.length-1)pts[i]=w;
        }
        syncEnds(s,pts);
        this._redrawSurfaces();
        this._drawSelection();
        return;
      }

      const pan=this._panStart||this._freePan;
      if(pan&&p.isDown&&p.id===pan.pointerId){
        const zoom=Math.max(.0001,this._editCam.zoom||1);
        const dx=(p.x-pan.x)/zoom,dy=(p.y-pan.y)/zoom;
        const visibleW=this._editCam.width/zoom,visibleH=this._editCam.height/zoom;
        const maxX=Math.max(0,8000-visibleW),maxY=Math.max(0,5000-visibleH);
        const sx=Number.isFinite(pan.sx)?pan.sx:pan.scrollX;
        const sy=Number.isFinite(pan.sy)?pan.sy:pan.scrollY;
        this._editCam.scrollX=Math.max(0,Math.min(maxX,sx-dx));
        this._editCam.scrollY=Math.max(0,Math.min(maxY,sy-dy));
      }
    });

    const stop=p=>{
      if(this._mode==='surface'&&this._surfaceStart&&this._inside(p)){
        const end=worldAt(p);
        const dx=end.x-this._surfaceStart.x,dy=end.y-this._surfaceStart.y;
        if(dx*dx+dy*dy>100)this._addSurface(this._surfaceStart,end,this._surfaceWidth,this._surfacePhysics,{points:fivePointsFromTrace(this._surfaceTrace,this._surfaceStart,end)});
      }
      this._surfaceStart=null;
      this._surfaceTrace=null;
      if(!p||!this._surfaceDrag||p.id===this._surfaceDrag.pointerId)this._surfaceDrag=null;
      if(!p||!this._panStart||p.id===this._panStart.pointerId)this._panStart=null;
      if(!p||!this._freePan||p.id===this._freePan.pointerId)this._freePan=null;
    };

    this.input.on('pointerup',stop);
    this.input.on('pointerupoutside',stop);
    this.input.on('wheel',(_p,_gos,_dx,dy)=>this._zoom(dy>0?1/1.1:1.1));
  }

  _select(obj){this._selectedSurface=null;super._select(obj);}

  _selectSurface(s){
    this._selectedSurface=s;
    this._selected=null;
    this._mode='select';
    this._surfaceWidth=Math.round(Number(s.width)||120);
    this._surfacePhysics=s.physics||'grass';
    this._surfaceVisual=s.visual||'asphalt';
    super._updateSurfaceInfo?.();
    this._drawSelection();
    this._status();
    this._updateLayerInfo?.();
  }

  _surfaceControl(s){return normalizedPoints(s)[2];}

  _surfaceHandleAt(w){
    const s=this._selectedSurface;if(!s)return null;
    const pts=normalizedPoints(s),r=28/Math.max(.1,this._editCam.zoom||1),rr=r*r;
    if(dist2(w,pts[0])<=rr)return 'start';
    if(dist2(w,pts[pts.length-1])<=rr)return 'end';
    for(let i=1;i<pts.length-1;i++)if(dist2(w,pts[i])<=rr)return `node:${i}`;
    return null;
  }

  _surfaceAt(w){
    let best=null,bestD=Infinity;
    const zoom=Math.max(.1,this._editCam.zoom||1);
    for(let i=(this._surfaces||[]).length-1;i>=0;i--){
      const s=this._surfaces[i],steps=90;
      let prev=pathPoint(s,0);
      for(let n=1;n<=steps;n++){
        const cur=pathPoint(s,n/steps),vx=cur.x-prev.x,vy=cur.y-prev.y,len2=vx*vx+vy*vy||1;
        const t=Math.max(0,Math.min(1,((w.x-prev.x)*vx+(w.y-prev.y)*vy)/len2));
        const q={x:prev.x+t*vx,y:prev.y+t*vy},d=dist2(w,q),hit=Math.max((Number(s.width)||120)/2,18/zoom);
        if(d<=hit*hit&&d<bestD){best=s;bestD=d;}
        prev=cur;
      }
    }
    return best;
  }

  _drawSelection(){
    if(!this._selectedSurface){super._drawSelection();return;}
    const g=this._selectionG,s=this._selectedSurface,pts=normalizedPoints(s);
    g.clear();
    const zoom=Math.max(.1,this._editCam.zoom||1),radius=11/zoom,steps=80;
    g.lineStyle(4/zoom,0x2bff88,.95);
    let prev=pathPoint(s,0);
    for(let i=1;i<=steps;i++){const cur=pathPoint(s,i/steps);g.lineBetween(prev.x,prev.y,cur.x,cur.y);prev=cur;}
    g.lineStyle(2/zoom,0x45dfff,.65);
    for(let i=1;i<pts.length;i++)g.lineBetween(pts[i-1].x,pts[i-1].y,pts[i].x,pts[i].y);
    g.fillStyle(0x2bff88,1);g.fillCircle(pts[0].x,pts[0].y,radius);g.fillCircle(pts[pts.length-1].x,pts[pts.length-1].y,radius);
    g.fillStyle(0x45dfff,1);for(let i=1;i<pts.length-1;i++)g.fillCircle(pts[i].x,pts[i].y,radius*1.15);
  }

  _addSurface(a,b,width,physics,data=null){
    const visual=data?.visual||this._surfaceVisual||'asphalt';
    const s={x1:a.x,y1:a.y,x2:b.x,y2:b.y,width,visual,physics};
    if(Array.isArray(data?.points)&&data.points.length>=2)syncEnds(s,normalizedPoints({...s,points:data.points}));
    else if(Number.isFinite(Number(data?.cpx))&&Number.isFinite(Number(data?.cpy))){s.cpx=Number(data.cpx);s.cpy=Number(data.cpy);}
    this._surfaces.push(s);
    this._redrawSurfaces();
  }

  _redrawSurfaces(){
    const g=this._surfaceG;g.clear();
    for(const s of this._surfaces||[]){
      const st=SURFACE_STYLE[s.visual]||SURFACE_STYLE.asphalt,steps=100;
      let prev=pathPoint(s,0);g.lineStyle(Number(s.width)||120,st.main,.98);
      for(let i=1;i<=steps;i++){const cur=pathPoint(s,i/steps);g.lineBetween(prev.x,prev.y,cur.x,cur.y);prev=cur;}
      prev=pathPoint(s,0);g.lineStyle(Math.max(2,Math.min(5,(Number(s.width)||120)*.025)),st.edge,.9);
      for(let i=1;i<=steps;i++){const cur=pathPoint(s,i/steps);g.lineBetween(prev.x,prev.y,cur.x,cur.y);prev=cur;}
    }
  }

  _updateSurfaceInfo(){
    if(this._selectedSurface){
      this._selectedSurface.width=this._surfaceWidth;
      this._selectedSurface.physics=this._surfacePhysics;
      this._selectedSurface.visual=this._surfaceVisual||this._selectedSurface.visual||'asphalt';
      this._redrawSurfaces();this._drawSelection();
    }
    super._updateSurfaceInfo?.();
  }

  _straightenSelectedSurface(){
    const s=this._selectedSurface;if(!s)return;
    const a={x:s.x1,y:s.y1},b={x:s.x2,y:s.y2},pts=[0,.25,.5,.75,1].map(t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}));
    syncEnds(s,pts);this._redrawSurfaces();this._drawSelection();this._flash?.('TRAMO RECTO');
  }

  _delete(){
    if(this._selectedSurface){const s=this._selectedSurface;this._surfaces=this._surfaces.filter(x=>x!==s);this._selectedSurface=null;this._selectionG.clear();this._redrawSurfaces();return;}
    super._delete();
  }

  _duplicate(){
    if(this._selectedSurface){
      const s=this._selectedSurface,copy={...s,x1:s.x1+45,y1:s.y1+45,x2:s.x2+45,y2:s.y2+45};
      if(Array.isArray(s.points))copy.points=normalizedPoints(s).map(p=>({x:p.x+45,y:p.y+45}));
      else if(Number.isFinite(Number(s.cpx))){copy.cpx=Number(s.cpx)+45;copy.cpy=Number(s.cpy)+45;}
      this._surfaces.push(copy);this._redrawSurfaces();this._selectSurface(copy);return;
    }
    super._duplicate();
  }

  _rotate(deg){
    if(this._selectedSurface){
      const s=this._selectedSurface,pts=normalizedPoints(s),mx=(pts[0].x+pts[pts.length-1].x)/2,my=(pts[0].y+pts[pts.length-1].y)/2,a=deg*Math.PI/180;
      const rot=p=>{const x=p.x-mx,y=p.y-my;return{x:mx+x*Math.cos(a)-y*Math.sin(a),y:my+x*Math.sin(a)+y*Math.cos(a)};};
      syncEnds(s,pts.map(rot));this._redrawSurfaces();this._drawSelection();return;
    }
    super._rotate(deg);
  }

  _scale(m){
    if(this._selectedSurface){
      const s=this._selectedSurface,pts=normalizedPoints(s),mx=(pts[0].x+pts[pts.length-1].x)/2,my=(pts[0].y+pts[pts.length-1].y)/2;
      syncEnds(s,pts.map(p=>({x:mx+(p.x-mx)*m,y:my+(p.y-my)*m})));this._redrawSurfaces();this._drawSelection();return;
    }
    super._scale(m);
  }

  _zoom(m){super._zoom(m);if(this._selectedSurface)this._drawSelection();}

  _applyProject(p){
    this._selectedSurface=null;
    super._applyProject(p);
    for(const s of this._surfaces||[])if(Array.isArray(s.points))syncEnds(s,normalizedPoints(s));
    this._redrawSurfaces();
  }
}
