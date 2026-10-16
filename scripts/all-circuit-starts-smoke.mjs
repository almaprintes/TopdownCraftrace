import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {trackDisplayDirection} from '../src/game/tracks/trackDisplayDirection.js';
import {METERS_PER_PX} from '../src/game/cars/speedUnits.js';

const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
 const {TRACK_REGISTRY}=await server.ssrLoadModule('/src/game/tracks/trackRegistry.js');
 const ids=Object.keys(TRACK_REGISTRY);
 assert.ok(ids.length>=19,'Audit must include all registered circuits, not just those in the public selector');
 const report=[],failures=[];
 for(const id of ids){
  const t=TRACK_REGISTRY[id],f=t.finishLine,s=t.start;
  if(!f?.a||!f?.b||![s?.x,s?.y,s?.r].every(Number.isFinite)){failures.push(id+': no valid start/finish');continue;}
  const cx=(f.a.x+f.b.x)/2,cy=(f.a.y+f.b.y)/2,dist=Math.hypot(s.x-cx,s.y-cy);
  const clockwise=trackDisplayDirection(t),closed=t.closed!==false;
  const facing=f.normal?Math.cos(s.r)*f.normal.x+Math.sin(s.r)*f.normal.y:null;
  if(closed){
   if(dist>Math.max(138,Number(t.trackWidth||80)*.80))failures.push(id+': start too far '+dist.toFixed(1)+'px');
   if(facing!==null&&facing<-.2)failures.push(id+': heading opposite finish '+facing.toFixed(2));
  }else if(id==='rally-arafo-los-loros'){
   if(dist<Number(t.trackWidth)*2)failures.push(id+': A→B start was moved to end');
  }
  if(id==='karting-americas'){
   if(clockwise!=='clockwise')failures.push(id+': should run clockwise');
   if(t.checkpoints?.length!==2)failures.push(id+': authored checkpoints lost');
  }
  report.push({id,direction:clockwise,closed,startBeforeFinishPx:Number(dist.toFixed(1)),
   startBeforeFinishMeters:Number((dist*METERS_PER_PX).toFixed(2)),facing:facing===null?null:Number(facing.toFixed(2))});
 }
 console.log('TRACK_START_AUDIT '+JSON.stringify(report));
 assert.deepEqual(failures,[],'Track start issues');
 console.log('TRACK_START_AUDIT_OK '+ids.length+' circuits, clockwise Americas, A-to-B stage preserved');
}finally{await server.close();}
