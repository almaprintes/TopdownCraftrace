import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderGuardrailScene.js';
import { pathPoint, pathTangent } from '../environment/EditableSpline.js';

function buildSamples(s){
  const N=520,out=[];let total=0,prev=null;
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
    case 'guardrail': return .72;
    case 'tires': return .68;
    case 'fence': return .76;
    case 'plastic': return .78;
    case 'concrete': return .78;
    default:return .74;
  }
}
function chordAngle(samples,d,halfSpan){
  const a=poseAt(samples,Math.max(0,d-halfSpan)),b=poseAt(samples,Math.min(samples.total,d+halfSpan));
  const dx=b.x-a.x,dy=b.y-a.y;
  return Math.hypot(dx,dy)>1e-4?Math.atan2(dy,dx):poseAt(samples,d).angle;
}
function pieces(s){
  const samples=buildSamples(s),total=samples.total,base=Math.max(46,Number(s.spacing)||105),baseWidth=Math.max(38,base*materialScale(s));
  if(total<1){const p=pathPoint(s,.5),v=pathTangent(s,.5);return[{x:p.x,y:p.y,angle:Math.atan2(v.y,v.x),width:baseWidth}];}

  const out=[];let d=Math.min(baseWidth*.38,total*.5),guard=0;
  while(d<total&&guard++<1400){
    const probe=Math.max(20,baseWidth*.58);
    const qa=poseAt(samples,Math.max(0,d-probe)),qb=poseAt(samples,Math.min(total,d+probe));
    const turn=angleDelta(qa.angle,qb.angle),curve=Math.min(1,turn/(Math.PI*.34));
    // Tight curves use genuinely shorter rigid modules instead of forcing a long
    // straight sprite through a changing tangent.
    const width=Math.max(34,baseWidth*(1-.30*curve));
    const q=poseAt(samples,d);
    const angle=chordAngle(samples,d,width*.34);
    out.push({x:q.x,y:q.y,angle,width});
    d+=Math.max(width*.72,width*(.90-.08*curve));
  }
  if(!out.length){const q=poseAt(samples,total*.5);out.push({...q,width:baseWidth});}
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
