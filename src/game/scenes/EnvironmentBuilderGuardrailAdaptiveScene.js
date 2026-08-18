import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailScene.js';

const C=s=>({x:Number.isFinite(+s.cpx)?+s.cpx:(s.x1+s.x2)/2,y:Number.isFinite(+s.cpy)?+s.cpy:(s.y1+s.y2)/2});
const P=(s,t)=>{const c=C(s),m=1-t;return{x:m*m*s.x1+2*m*t*c.x+t*t*s.x2,y:m*m*s.y1+2*m*t*c.y+t*t*s.y2}};
const T=(s,t)=>{const c=C(s);return{x:2*(1-t)*(c.x-s.x1)+2*t*(s.x2-c.x),y:2*(1-t)*(c.y-s.y1)+2*t*(s.y2-c.y)}};
const A=v=>Math.atan2(v.y,v.x);
const AD=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

function pieces(s){
  const N=180, pts=[], cum=[0];
  let total=0;
  for(let i=0;i<=N;i++){
    const t=i/N,p=P(s,t),v=T(s,t),ang=A(v);
    pts.push({t,p,v,ang});
    if(i){total+=Math.hypot(p.x-pts[i-1].p.x,p.y-pts[i-1].p.y);cum.push(total);}
  }
  const out=[];
  let next=0;
  for(let i=1;i<N;i++){
    const turn=AD(pts[i-1].ang,pts[i+1].ang);
    const target=Math.max(44,Math.min(Number(s.spacing)||105,105/(1+turn*13)));
    if(cum[i]<next)continue;
    const width=Math.max(46,target*1.16);
    out.push({x:pts[i].p.x,y:pts[i].p.y,angle:pts[i].ang,width});
    next=cum[i]+target;
  }
  if(!out.length){const p=P(s,.5),v=T(s,.5);out.push({x:p.x,y:p.y,angle:A(v),width:Math.max(46,total*1.06)});}
  return out;
}

export class EnvironmentBuilderScene extends Current{
  _drawRails(){
    if(!this._railRoot)return;
    this._railRoot.removeAll(true);
    for(const s of this._rails||[]){
      for(const q of pieces(s)){
        const im=this.add.image(q.x,q.y,`env:${s.asset}`);
        if(im.width>0)im.setDisplaySize(q.width,imgHeight(im,q.width));
        im.setRotation(q.angle);
        this._railRoot.add(im);
      }
    }
  }
}

function imgHeight(im,w){return im.height*(w/im.width);}
