// CrafRace DEV · protocol only. No network or race scene is activated.
export const LIVE_VERSION=1;
const CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TYPES=new Set(['hello','ready','start','position','pause','resume','finish','chat','reaction','rematch','leave']);
const uid=s=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s||'');
const slug=s=>typeof s==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(s);
const int=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
export function parseLiveCode(raw){const s=typeof raw==='string'?raw.trim().toUpperCase():'';return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{7}$/.test(s)?s:null;}
export function makeLiveCode(bytes){if(!(bytes instanceof Uint8Array)||bytes.length<7)throw Error('Invalid random bytes');return Array.from(bytes.slice(0,7),n=>CHARS[n%CHARS.length]).join('');}
export function liveConfig(raw){
 if(!raw||!slug(raw.trackId)||!slug(raw.carId)||!int(raw.laps,1,30)||!int(raw.physicsVersion,1,10000)||!['forward','reverse'].includes(raw.direction))return null;
 return Object.freeze({trackId:raw.trackId,carId:raw.carId,laps:raw.laps,physicsVersion:raw.physicsVersion,direction:raw.direction});
}
export function acceptLivePacket(p,{roomId,from,lastSeq=0,heat=1,generation=1}={}){
 if(!p||p.v!==LIVE_VERSION||!TYPES.has(p.type)||p.roomId!==roomId||!uid(from)||p.from!==from||
  !int(p.seq,1,2147483647)||p.seq<=lastSeq||p.heat!==heat||p.generation!==generation||
  !p.payload||typeof p.payload!=='object'||Array.isArray(p.payload))return false;
 const q=p.payload;
 switch(p.type){
 case 'hello':case 'ready':return slug(q.trackId)&&int(q.physicsVersion,1,10000)&&int(q.laps,1,30)&&['forward','reverse'].includes(q.direction);
 case 'start':return int(q.countdownMs,1000,15000)&&typeof q.restart==='boolean'&&int(q.startAt,1700000000000,4102444800000);
 case 'position':return num(q.x,-100000,100000)&&num(q.y,-100000,100000)&&num(q.angle,-7,7)&&num(q.speed,0,200000)&&int(q.lap,0,31)&&int(q.tick,0,2147483647);
 case 'finish':return int(q.elapsedMs,1000,7200000)&&int(q.laps,1,30)&&Array.isArray(q.lapTimes)&&q.lapTimes.length===q.laps&&q.lapTimes.every(n=>int(n,500,7200000))&&Math.abs(q.lapTimes.reduce((a,b)=>a+b,0)-q.elapsedMs)<=3000;
 case 'chat':return typeof q.text==='string'&&q.text.trim().length>0&&[...q.text].length<=160;
 case 'reaction':return ['👍','🏁','👏','😄','😮','💪','😅','🔥'].includes(q.emoji);
 case 'rematch':return typeof q.accept==='boolean'||q.request===true;
 default:return q.reason===undefined||typeof q.reason==='string'&&q.reason.length<=100;
 }
}
export function chatReady(lastMs,now=Date.now()){return Number.isFinite(now)&&Number.isFinite(lastMs)&&now-lastMs>=5000;}
export function initialLiveRace({roomId,hostId,guestId=null,config}={}){
 if(!uid(roomId)||!uid(hostId)||(guestId!==null&&(!uid(guestId)||guestId===hostId))||!liveConfig(config))throw Error('Invalid room');
 return Object.freeze({roomId,hostId,guestId,config:liveConfig(config),phase:guestId?'ready':'waiting',generation:1,ready:{host:false,guest:false},results:{host:null,guest:null}});
}
export function liveTransition(s,e){
 if(!s||!e)return s;
 const next=(patch)=>Object.freeze({...s,...patch}), reset=()=>({host:false,guest:false});
 if(e.type==='join'&&s.phase==='waiting'&&uid(e.guestId)&&e.guestId!==s.hostId)return next({guestId:e.guestId,phase:'ready'});
 if(e.type==='ready'&&s.phase==='ready'&&s.guestId&&['host','guest'].includes(e.role)&&e.trackId===s.config.trackId&&e.physicsVersion===s.config.physicsVersion&&e.direction===s.config.direction&&e.laps===s.config.laps){
  const ready={...s.ready,[e.role]:true};return next({ready,phase:ready.host&&ready.guest?'countdown':s.phase});
 }
 if(e.type==='start'&&s.phase==='countdown'&&e.hostId===s.hostId)return next({phase:'racing'});
 if(e.type==='disconnect'&&['ready','countdown','racing'].includes(s.phase))return next({phase:'paused',ready:reset()});
 if(e.type==='retry'&&s.phase==='paused'&&e.hostId===s.hostId)return next({phase:'ready',ready:reset(),results:{host:null,guest:null},generation:s.generation+1});
 if(e.type==='finish'&&s.phase==='racing'&&['host','guest'].includes(e.role)&&s.results[e.role]===null&&int(e.elapsedMs,1000,7200000)){
  const results={...s.results,[e.role]:e.elapsedMs};return next({results,phase:results.host&&results.guest?'finished':'racing'});
 }
 if(e.type==='close'&&e.hostId===s.hostId)return next({phase:'closed',ready:reset()});
 return s;
}
export function provisionalLiveWinner(s){
 if(s?.phase!=='finished')return null;
 const a=s.results.host,b=s.results.guest;
 return {winner:a===b?'tie':a<b?'host':'guest',marginMs:Math.abs(a-b),homologated:false};
}
