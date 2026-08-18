import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderEditableSurfaceScene.js';

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
  if(len<0.0001){
    tx=s.x2-s.x1;ty=s.y2-s.y1;len=Math.hypot(tx,ty)||1;
  }
  return {x,y,tx:tx/len,ty:ty/len};
}

function traceOpen(g,pts){
  if(!pts.length)return;
  g.beginPath();
  g.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
  g.strokePath();
}

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _redrawSurfaces(){
    const g=this._surfaceG;
    g.clear();

    for(const s of this._surfaces||[]){
      const st=SURFACE_STYLE[s.visual]||SURFACE_STYLE.asphalt;
      const width=Math.max(2,Number(s.width)||120);
      const half=width/2;
      const chord=Math.hypot(s.x2-s.x1,s.y2-s.y1);
      const c=controlOf(s);
      const bend=Math.hypot(c.x-(s.x1+s.x2)/2,c.y-(s.y1+s.y2)/2);
      const steps=Math.max(28,Math.min(220,Math.ceil((chord+bend*1.8)/28)));
      const left=[],right=[];

      for(let i=0;i<=steps;i++){
        const p=quadPointAndTangent(s,i/steps);
        const nx=-p.ty,ny=p.tx;
        left.push({x:p.x+nx*half,y:p.y+ny*half});
        right.push({x:p.x-nx*half,y:p.y-ny*half});
      }

      // One closed polygon for the whole road band. This removes the wedges/gaps
      // created by thick independent line segments on tight curves.
      g.fillStyle(st.main,.98);
      g.beginPath();
      g.moveTo(left[0].x,left[0].y);
      for(let i=1;i<left.length;i++)g.lineTo(left[i].x,left[i].y);
      for(let i=right.length-1;i>=0;i--)g.lineTo(right[i].x,right[i].y);
      g.closePath();
      g.fillPath();

      const edgeW=Math.max(2,Math.min(5,width*.025));
      g.lineStyle(edgeW,st.edge,.92);
      traceOpen(g,left);
      traceOpen(g,right);

      // Close both ends so straight and curved pieces remain visually solid.
      g.beginPath();g.moveTo(left[0].x,left[0].y);g.lineTo(right[0].x,right[0].y);g.strokePath();
      const li=left.length-1,ri=right.length-1;
      g.beginPath();g.moveTo(left[li].x,left[li].y);g.lineTo(right[ri].x,right[ri].y);g.strokePath();
    }
  }
}
