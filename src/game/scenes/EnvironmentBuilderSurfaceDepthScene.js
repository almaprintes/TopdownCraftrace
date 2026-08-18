import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderPrecisionScene.js';

const SURFACE_STYLE={
  asphalt:{main:0x2b2c2f,edge:0x656a70},
  grass:{main:0x285936,edge:0x39794a},
  dirt:{main:0x695743,edge:0x806d55},
  gravel:{main:0x77766f,edge:0x97968d}
};

function controlOf(s){
  return {
    x:Number.isFinite(Number(s.cpx))?Number(s.cpx):(s.x1+s.x2)/2,
    y:Number.isFinite(Number(s.cpy))?Number(s.cpy):(s.y1+s.y2)/2
  };
}

function quadPointAndTangent(s,t){
  const c=controlOf(s),mt=1-t;
  const x=mt*mt*s.x1+2*mt*t*c.x+t*t*s.x2;
  const y=mt*mt*s.y1+2*mt*t*c.y+t*t*s.y2;
  let tx=2*mt*(c.x-s.x1)+2*t*(s.x2-c.x);
  let ty=2*mt*(c.y-s.y1)+2*t*(s.y2-c.y);
  let len=Math.hypot(tx,ty);
  if(len<0.0001){tx=s.x2-s.x1;ty=s.y2-s.y1;len=Math.hypot(tx,ty)||1;}
  return {x,y,tx:tx/len,ty:ty/len};
}

function traceOpen(g,pts){
  if(!pts.length)return;
  g.beginPath();g.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
  g.strokePath();
}

function drawSurface(g,s){
  const st=SURFACE_STYLE[s.visual]||SURFACE_STYLE.asphalt;
  const width=Math.max(2,Number(s.width)||120),half=width/2;
  const chord=Math.hypot(s.x2-s.x1,s.y2-s.y1);
  const c=controlOf(s);
  const bend=Math.hypot(c.x-(s.x1+s.x2)/2,c.y-(s.y1+s.y2)/2);
  const steps=Math.max(28,Math.min(220,Math.ceil((chord+bend*1.8)/28)));
  const left=[],right=[];
  for(let i=0;i<=steps;i++){
    const p=quadPointAndTangent(s,i/steps),nx=-p.ty,ny=p.tx;
    left.push({x:p.x+nx*half,y:p.y+ny*half});
    right.push({x:p.x-nx*half,y:p.y-ny*half});
  }
  g.fillStyle(st.main,.98);g.beginPath();g.moveTo(left[0].x,left[0].y);
  for(let i=1;i<left.length;i++)g.lineTo(left[i].x,left[i].y);
  for(let i=right.length-1;i>=0;i--)g.lineTo(right[i].x,right[i].y);
  g.closePath();g.fillPath();
  const edgeW=Math.max(2,Math.min(5,width*.025));
  g.lineStyle(edgeW,st.edge,.92);traceOpen(g,left);traceOpen(g,right);
  g.beginPath();g.moveTo(left[0].x,left[0].y);g.lineTo(right[0].x,right[0].y);g.strokePath();
  const li=left.length-1,ri=right.length-1;
  g.beginPath();g.moveTo(left[li].x,left[li].y);g.lineTo(right[ri].x,right[ri].y);g.strokePath();
}

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  create(){
    super.create();
    // Base circuit is depth 2.35/2.45. Keep authored paddock roads below it by default.
    this._surfaceG?.setDepth?.(2.20);
    this._surfaceOverG=this.add.graphics().setDepth(2.70);
    this.cameras.main.ignore(this._surfaceOverG);
    this._redrawSurfaces();
  }

  _setupUi(){
    super._setupUi();
    const {width,height}=this.scale;
    const rx=width-this._right+14,py=height-174;
    const x=rx+228,y=py+92;
    const b=this.add.rectangle(x,y,48,26,0x172034,1).setOrigin(0)
      .setStrokeStyle(1,0xe1b33b,.95).setInteractive({useHandCursor:true}).setDepth(61000);
    const t=this.add.text(x+24,y+13,'BAJO',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#fff'})
      .setOrigin(.5).setDepth(61001);
    this._editCam?.ignore([b,t]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._toggleSelectedSurfaceDepth();});
    this._surfaceDepthBtn={b,t};
  }

  _addSurface(a,b,width,physics,data=null){
    const before=(this._surfaces||[]).length;
    super._addSurface(a,b,width,physics,data);
    const s=this._surfaces?.[this._surfaces.length-1];
    if(s && this._surfaces.length>before){
      s.trackLayer=data?.trackLayer==='over'?'over':'under';
      this._redrawSurfaces();
    }
  }

  _selectSurface(s){
    if(s && !s.trackLayer)s.trackLayer='under';
    super._selectSurface(s);
    this._refreshSurfaceDepthButton();
  }

  _select(obj){
    super._select(obj);
    this._refreshSurfaceDepthButton();
  }

  _toggleSelectedSurfaceDepth(){
    const s=this._selectedSurface;
    if(!s){this._flash?.('SELECCIONA UN TERRENO');return;}
    s.trackLayer=s.trackLayer==='over'?'under':'over';
    this._redrawSurfaces();
    this._refreshSurfaceDepthButton();
    this._flash?.(s.trackLayer==='over'?'TERRENO SOBRE PISTA':'TERRENO BAJO PISTA');
  }

  _refreshSurfaceDepthButton(){
    const t=this._surfaceDepthBtn?.t;if(!t)return;
    if(!this._selectedSurface){t.setText('—');return;}
    t.setText(this._selectedSurface.trackLayer==='over'?'SOBRE':'BAJO');
  }

  _redrawSurfaces(){
    const under=this._surfaceG,over=this._surfaceOverG;
    under?.clear?.();over?.clear?.();
    for(const s of this._surfaces||[]){
      if(!s.trackLayer)s.trackLayer='under';
      drawSurface(s.trackLayer==='over'?(over||under):under,s);
    }
  }

  _applyProject(p){
    super._applyProject(p);
    for(const s of this._surfaces||[])if(!s.trackLayer)s.trackLayer='under';
    this._redrawSurfaces();
    this._refreshSurfaceDepthButton();
  }
}
