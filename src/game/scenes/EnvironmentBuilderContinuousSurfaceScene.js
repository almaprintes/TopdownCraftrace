import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderEditableSurfaceScene.js';
import { pathPoint, pathTangent, pathLength } from '../environment/EditableSpline.js';

const SURFACE_STYLE={
  asphalt:{main:0x2b2c2f,edge:0x656a70},
  grass:{main:0x285936,edge:0x39794a},
  dirt:{main:0x695743,edge:0x806d55},
  gravel:{main:0x77766f,edge:0x97968d}
};

function pointAndTangent(s,t){
  const p=pathPoint(s,t),v=pathTangent(s,t),len=Math.hypot(v.x,v.y)||1;
  return{x:p.x,y:p.y,tx:v.x/len,ty:v.y/len};
}
function traceOpen(g,pts){if(!pts.length)return;g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.strokePath();}

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _redrawSurfaces(){
    const g=this._surfaceG;g.clear();
    for(const s of this._surfaces||[]){
      const st=SURFACE_STYLE[s.visual]||SURFACE_STYLE.asphalt;
      const width=Math.max(2,Number(s.width)||120),half=width/2;
      const steps=Math.max(32,Math.min(260,Math.ceil(pathLength(s,120)/24))),left=[],right=[];
      for(let i=0;i<=steps;i++){
        const p=pointAndTangent(s,i/steps),nx=-p.ty,ny=p.tx;
        left.push({x:p.x+nx*half,y:p.y+ny*half});right.push({x:p.x-nx*half,y:p.y-ny*half});
      }
      g.fillStyle(st.main,.98);g.beginPath();g.moveTo(left[0].x,left[0].y);
      for(let i=1;i<left.length;i++)g.lineTo(left[i].x,left[i].y);
      for(let i=right.length-1;i>=0;i--)g.lineTo(right[i].x,right[i].y);
      g.closePath();g.fillPath();
      const edgeW=Math.max(2,Math.min(5,width*.025));g.lineStyle(edgeW,st.edge,.92);traceOpen(g,left);traceOpen(g,right);
      g.beginPath();g.moveTo(left[0].x,left[0].y);g.lineTo(right[0].x,right[0].y);g.strokePath();
      const li=left.length-1,ri=right.length-1;g.beginPath();g.moveTo(left[li].x,left[li].y);g.lineTo(right[ri].x,right[ri].y);g.strokePath();
    }
  }
}
