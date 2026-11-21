// Authored AI soft apex hints. Never interpreted as race checkpoints.
export const AI_LINE_GUIDE_MAX=32;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function normalizeAiLineGuides(raw){
 const input=Array.isArray(raw)?raw:Array.isArray(raw?.points)?raw.points:[];
 const points=[],used=new Set();
 for(const p of input){
  if(points.length>=AI_LINE_GUIDE_MAX)break;
  if(!finite(p?.x)||!finite(p?.y)||p.x<0||p.y<0||p.x>8192||p.y>8192)continue;
  const id=String(p.id??'').trim();
  if(!/^[a-zA-Z0-9_-]{1,48}$/.test(id)||used.has(id))continue;
  used.add(id);
  points.push({id,x:p.x,y:p.y,kind:'apex',direction:'forward',
    radiusPx:clamp(finite(p.radiusPx)?p.radiusPx:30,8,300),
    strength:clamp(finite(p.strength)?p.strength:.65,.05,1)});
 }
 return{version:1,points};
}
export function makeAiLineGuide(existing,x,y,trackWidth=140){
 if(!finite(x)||!finite(y)||x<0||y<0||x>8192||y>8192)
  throw Error('La guía está fuera del área del circuito');
 const current=normalizeAiLineGuides(existing).points;
 if(current.length>=AI_LINE_GUIDE_MAX)throw Error('Máximo de 32 guías IA por circuito');
 let index=1;
 while(current.some(p=>p.id==='apex-'+index))index++;
 return{id:'apex-'+index,x,y,kind:'apex',direction:'forward',
  radiusPx:clamp((finite(trackWidth)?trackWidth:140)*.22,12,160),strength:.65};
}
export function modifyAiLineGuide(data,id,change){
 const current=normalizeAiLineGuides(data);
 return{version:1,points:current.points.map(p=>p.id===id?{
  ...p,
  ...(finite(change?.x)&&change.x>=0&&change.x<=8192?{x:change.x}:{}),
  ...(finite(change?.y)&&change.y>=0&&change.y<=8192?{y:change.y}:{}),
  ...(finite(change?.radiusPx)?{radiusPx:clamp(change.radiusPx,8,300)}:{}),
  ...(finite(change?.strength)?{strength:clamp(change.strength,.05,1)}:{})
 }:p)};
}
export function resizeAiLineGuides(data,sx,sy){
 const normalized=normalizeAiLineGuides(data);
 return{version:1,points:normalized.points.map(p=>({
  ...p,x:p.x*sx,y:p.y*sy,radiusPx:p.radiusPx*(sx+sy)/2
 }))};
}
