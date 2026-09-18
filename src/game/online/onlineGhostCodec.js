// Compact online ghost codec for RACE Control.
// Keeps the racing line faithful while removing verbose JSON field names and camera data.

export const ONLINE_GHOST_FORMAT='TDRGHOST';
export const ONLINE_GHOST_VERSION=1;
export const ONLINE_GHOST_INTERVAL_MS=50;
const XY_SCALE=4;       // 0.25 world-unit precision
const ANGLE_SCALE=10000; // 0.0001 rad precision
const TAU=Math.PI*2;

const finite=n=>Number.isFinite(Number(n));
const round=(n,scale)=>Math.round(Number(n)*scale);
const normAngle=a=>{let n=Number(a)||0;while(n>Math.PI)n-=TAU;while(n<=-Math.PI)n+=TAU;return n;};
const mixAngle=(a,b,q)=>{let d=normAngle(b)-normAngle(a);while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return normAngle(normAngle(a)+d*q);};

function normalizeSamples(samples){
  return (Array.isArray(samples)?samples:[])
    .filter(s=>finite(s?.t)&&finite(s?.x)&&finite(s?.y)&&finite(s?.r))
    .map(s=>({t:Number(s.t),x:Number(s.x),y:Number(s.y),r:normAngle(s.r)}))
    .filter(s=>s.t>=0)
    .sort((a,b)=>a.t-b.t);
}

function sampleAt(samples,t){
  if(!samples.length)return null;
  let lo=0,hi=samples.length-1;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(samples[mid].t<t)lo=mid+1;else hi=mid;}
  const bi=lo,ai=Math.max(0,bi-1),a=samples[ai],b=samples[bi]||a;
  if(!a||!b)return null;
  if(a===b||b.t<=a.t)return{x:a.x,y:a.y,r:a.r};
  const q=Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t)));
  return{x:a.x+(b.x-a.x)*q,y:a.y+(b.y-a.y)*q,r:mixAngle(a.r,b.r,q)};
}

export function encodeOnlineGhost(ghost,{intervalMs=ONLINE_GHOST_INTERVAL_MS}={}){
  const source=normalizeSamples(ghost?.samples);
  const lapMs=Math.round(Number(ghost?.lapMs)||Number(source.at(-1)?.t)||0);
  const step=Math.max(20,Math.min(100,Math.round(Number(intervalMs)||ONLINE_GHOST_INTERVAL_MS)));
  if(source.length<2||lapMs<=0)throw new Error('Ghost replay is empty or invalid.');

  const frames=[];
  for(let t=0;t<lapMs;t+=step){
    const p=sampleAt(source,t);if(p)frames.push([round(p.x,XY_SCALE),round(p.y,XY_SCALE),round(p.r,ANGLE_SCALE)]);
  }
  const end=sampleAt(source,lapMs)||source.at(-1);
  frames.push([round(end.x,XY_SCALE),round(end.y,XY_SCALE),round(end.r,ANGLE_SCALE)]);

  return{
    f:ONLINE_GHOST_FORMAT,
    v:ONLINE_GHOST_VERSION,
    dt:step,
    ms:lapMs,
    tr:String(ghost?.trackKey||ghost?.trackId||''),
    car:String(ghost?.carId||''),
    at:Number(ghost?.recordedAt)||0,
    q:[XY_SCALE,ANGLE_SCALE],
    p:frames
  };
}

export function encodeOnlineGhostNative(ghost){
  const source=normalizeSamples(ghost?.samples);
  const lapMs=Math.round(Number(ghost?.lapMs)||Number(source.at(-1)?.t)||0);
  if(source.length<2||lapMs<=0)throw new Error('Ghost replay is empty or invalid.');
  return{
    f:ONLINE_GHOST_FORMAT,
    v:2,
    ms:lapMs,
    tr:String(ghost?.trackKey||ghost?.trackId||''),
    car:String(ghost?.carId||''),
    at:Number(ghost?.recordedAt)||0,
    q:[XY_SCALE,ANGLE_SCALE],
    p:source.map(s=>[Math.round(s.t),round(s.x,XY_SCALE),round(s.y,XY_SCALE),round(s.r,ANGLE_SCALE)])
  };
}

function zigzag(n){const v=Math.trunc(Number(n)||0);return v>=0?v*2:-v*2-1;}
function varintBytes(n){let v=Math.max(0,Math.trunc(Number(n)||0)),bytes=1;while(v>=128){v=Math.floor(v/128);bytes++;}return bytes;}
function writeVarint(out,n){let v=Math.max(0,Math.trunc(Number(n)||0));while(v>=128){out.push((v%128)|128);v=Math.floor(v/128);}out.push(v);}
function readVarint(bytes,state){let value=0,mul=1;for(let guard=0;guard<8;guard++){if(state.i>=bytes.length)throw new Error('Truncated ghost binary.');const b=bytes[state.i++];value+=(b&127)*mul;if((b&128)===0)return value;mul*=128;}throw new Error('Invalid ghost varint.');}
function unzigzag(v){return v%2===0?v/2:-(v+1)/2;}
export function encodeOnlineGhostNativeBinary(packet){
  if(!packet||Number(packet.v)!==2||!Array.isArray(packet.p)||packet.p.length<2)throw new Error('Native online ghost payload is invalid.');
  const out=[],prev=[0,0,0,0];
  for(let i=0;i<packet.p.length;i++){const row=packet.p[i].map(v=>Math.trunc(Number(v)||0));for(let j=0;j<4;j++){writeVarint(out,zigzag(i===0?row[j]:row[j]-prev[j]));}for(let j=0;j<4;j++)prev[j]=row[j];}
  return Uint8Array.from(out);
}
export function decodeOnlineGhostNativeBinary(bytes,meta){
  const src=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]),state={i:0},prev=[0,0,0,0],rows=[],count=Math.max(0,Math.trunc(Number(meta?.n)||0));
  if(count<2)throw new Error('Native ghost binary metadata is invalid.');
  for(let i=0;i<count;i++){const row=[];for(let j=0;j<4;j++){const delta=unzigzag(readVarint(src,state));row[j]=i===0?delta:prev[j]+delta;}rows.push(row);for(let j=0;j<4;j++)prev[j]=row[j];}
  if(state.i!==src.length)throw new Error('Native ghost binary has trailing data.');
  return{f:ONLINE_GHOST_FORMAT,v:2,ms:Number(meta.ms)||0,tr:String(meta.tr||''),car:String(meta.car||''),at:Number(meta.at)||0,q:Array.isArray(meta.q)?meta.q:[XY_SCALE,ANGLE_SCALE],p:rows};
}
export function verifyOnlineGhostNativeBinary(packet){
  const bytes=encodeOnlineGhostNativeBinary(packet),meta={ms:packet.ms,tr:packet.tr,car:packet.car,at:packet.at,q:packet.q,n:packet.p.length},decoded=decodeOnlineGhostNativeBinary(bytes,meta);
  const exact=JSON.stringify(decoded.p)===JSON.stringify(packet.p);
  return{exact,bytes:bytes.byteLength,frames:decoded.p.length,decoded};
}

export function onlineGhostNativeDeltaBinaryBytes(packet){
  if(!packet||Number(packet.v)!==2||!Array.isArray(packet.p)||packet.p.length<2)throw new Error('Native online ghost payload is invalid.');
  let bytes=0,prev=[0,0,0,0];
  for(let i=0;i<packet.p.length;i++){
    const row=packet.p[i].map(v=>Math.trunc(Number(v)||0));
    for(let j=0;j<4;j++){const value=i===0?row[j]:row[j]-prev[j];bytes+=varintBytes(zigzag(value));}
    prev=row;
  }
  const meta=new TextEncoder().encode(JSON.stringify({f:packet.f,v:packet.v,ms:packet.ms,tr:packet.tr,car:packet.car,at:packet.at,q:packet.q,n:packet.p.length})).byteLength;
  return meta+bytes;
}

export function decodeOnlineGhostNative(packet){
  if(!packet||packet.f!==ONLINE_GHOST_FORMAT||Number(packet.v)!==2)throw new Error('Unsupported native online ghost format.');
  const lapMs=Math.round(Number(packet.ms)||0),xy=Number(packet?.q?.[0])||XY_SCALE,ang=Number(packet?.q?.[1])||ANGLE_SCALE;
  const samples=(Array.isArray(packet.p)?packet.p:[]).map(row=>({t:Number(row?.[0]),x:Number(row?.[1])/xy,y:Number(row?.[2])/xy,r:Number(row?.[3])/ang})).filter(s=>finite(s.t)&&finite(s.x)&&finite(s.y)&&finite(s.r));
  if(lapMs<=0||samples.length<2)throw new Error('Native online ghost payload is invalid.');
  return{version:2,kind:'online-ghost-native',trackKey:String(packet.tr||''),carId:String(packet.car||''),lapMs,recordedAt:Number(packet.at)||0,samples};
}

export function measureNativeOnlineGhostError(originalGhost,packet,{probeMs=10}={}){
  const original=normalizeSamples(originalGhost?.samples),decoded=decodeOnlineGhostNative(packet).samples;
  const lapMs=Math.min(Math.round(Number(originalGhost?.lapMs)||0),Number(packet?.ms)||0);
  if(original.length<2||decoded.length<2||lapMs<=0)return{maxPositionError:Infinity,rmsPositionError:Infinity,maxAngleError:Infinity,probes:0};
  const step=Math.max(5,Math.round(Number(probeMs)||10));let maxPositionError=0,maxAngleError=0,sumSq=0,probes=0;
  for(let t=0;t<=lapMs;t+=step){const a=sampleAt(original,t),b=sampleAt(decoded,t);if(!a||!b)continue;const pos=Math.hypot(a.x-b.x,a.y-b.y),ang=Math.abs(normAngle(a.r-b.r));maxPositionError=Math.max(maxPositionError,pos);maxAngleError=Math.max(maxAngleError,ang);sumSq+=pos*pos;probes++;}
  return{maxPositionError,rmsPositionError:probes?Math.sqrt(sumSq/probes):Infinity,maxAngleError,probes};
}

export function decodeOnlineGhost(packet){
  if(!packet||packet.f!==ONLINE_GHOST_FORMAT||Number(packet.v)!==ONLINE_GHOST_VERSION)throw new Error('Unsupported online ghost format.');
  const step=Math.max(1,Math.round(Number(packet.dt)||0)),lapMs=Math.round(Number(packet.ms)||0);
  const xy=Number(packet?.q?.[0])||XY_SCALE,ang=Number(packet?.q?.[1])||ANGLE_SCALE;
  if(lapMs<=0||!Array.isArray(packet.p)||packet.p.length<2)throw new Error('Online ghost payload is invalid.');
  const samples=packet.p.map((row,i)=>({
    t:i===packet.p.length-1?lapMs:Math.min(lapMs,i*step),
    x:Number(row?.[0])/xy,
    y:Number(row?.[1])/xy,
    r:Number(row?.[2])/ang
  })).filter(s=>finite(s.t)&&finite(s.x)&&finite(s.y)&&finite(s.r));
  if(samples.length<2)throw new Error('Online ghost contains no usable samples.');
  return{
    version:ONLINE_GHOST_VERSION,
    kind:'online-ghost',
    trackKey:String(packet.tr||''),
    carId:String(packet.car||''),
    lapMs,
    recordedAt:Number(packet.at)||0,
    samples
  };
}

export function onlineGhostJsonBytes(packet){
  return new TextEncoder().encode(JSON.stringify(packet)).byteLength;
}

// Compare the compact reconstruction with the original at a denser cadence.
// Useful for DEV validation before a codec version is accepted for publishing.
export function measureOnlineGhostError(originalGhost,packet,{probeMs=10}={}){
  const original=normalizeSamples(originalGhost?.samples),decoded=decodeOnlineGhost(packet).samples;
  const lapMs=Math.min(Math.round(Number(originalGhost?.lapMs)||0),Number(packet?.ms)||0);
  if(original.length<2||decoded.length<2||lapMs<=0)return{maxPositionError:Infinity,rmsPositionError:Infinity,maxAngleError:Infinity,probes:0};
  const step=Math.max(5,Math.round(Number(probeMs)||10));
  let maxPositionError=0,maxAngleError=0,sumSq=0,probes=0;
  for(let t=0;t<=lapMs;t+=step){
    const a=sampleAt(original,t),b=sampleAt(decoded,t);if(!a||!b)continue;
    const pos=Math.hypot(a.x-b.x,a.y-b.y),ang=Math.abs(normAngle(a.r-b.r));
    maxPositionError=Math.max(maxPositionError,pos);maxAngleError=Math.max(maxAngleError,ang);sumSq+=pos*pos;probes++;
  }
  return{maxPositionError,rmsPositionError:probes?Math.sqrt(sumSq/probes):Infinity,maxAngleError,probes};
}
