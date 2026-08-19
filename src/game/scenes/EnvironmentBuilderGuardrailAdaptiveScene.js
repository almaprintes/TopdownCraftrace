import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailScene.js';
import { pathPoint, pathTangent } from '../environment/EditableSpline.js';

function buildSamples(s){
  const N=420,out=[];let total=0,prev=null;
  for(let i=0;i<=N;i++){
    const t=i/N,p=pathPoint(s,t),v=pathTangent(s,t),angle=Math.atan2(v.y,v.x);
    if(prev)total+=Math.hypot(p.x-prev.x,p.y-prev.y);
    out.push({t,p,angle,d:total});prev=p;
  }
  return {out,total,source:s};
}
function poseAt(samples,d){
  const a=samples.out,total=samples.total,target=Math.max(0,Math.min(total,d));
  let lo=1,hi=a.length-1;
  while(lo<hi){const m=(lo+hi)>>1;if(a[m].d<target)lo=m+1;else hi=m;}
  const b=a[lo],p=a[Math.max(0,lo-1)],span=b.d-p.d||1,u=(target-p.d)/span;
  const t=p.t+(b.t-p.t)*u,pos=pathPoint(samples.source,t),v=pathTangent(samples.source,t);
  return{x:pos.x,y:pos.y,angle:Math.atan2(v.y,v.x)};
}
function angleDelta(a,b){return Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));}
function materialScale(s){
  switch(String(s?.type||'')){
    case 'guardrail': return .82;
    case 'tires': return .78;
    case 'fence': return .86;
    case 'plastic': return .88;
    case 'concrete': return .88;
    default:return .84;
  }
}
function pieces(s){
  const samples=buildSamples(s),total=samples.total,base=Math.max(46,Number(s.spacing)||105);
  const pieceWidth=Math.max(42,base*materialScale(s));
  if(total<1){const p=pathPoint(s,.5),v=pathTangent(s,.5);return[{x:p.x,y:p.y,angle:Math.atan2(v.y,v.x),width:pieceWidth}];}

  // Advance by physical distance. Curves use a smaller step, while the sprite itself
  // remains rigid and constant-sized. This removes stretched pieces and hard elbows.
  const out=[],probe=Math.max(18,pieceWidth*.42);
  let d=Math.min(pieceWidth*.42,total*.5),guard=0;
  while(d<total&&guard++<1000){
    const q=poseAt(samples,d),qa=poseAt(samples,Math.max(0,d-probe)),qb=poseAt(samples,Math.min(total,d+probe));
    const turn=angleDelta(qa.angle,qb.angle);
    const curve=Math.min(1,turn/(Math.PI*.42));
    const step=pieceWidth*(.90-.26*curve);
    out.push({...q,width:pieceWidth});
    d+=Math.max(pieceWidth*.60,step);
  }
  if(!out.length){const q=poseAt(samples,total*.5);out.push({...q,width:pieceWidth});}
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
