import { RaceScene as CurrentRaceScene } from './RaceStaticGhostStatusScene.js';

const TOP_REPLAY_PREFIX='tdr2:topReplay:';
const positive=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
const text=v=>String(v??'').trim();
function lapId(trackId,row,index=0){const t=Number(row?.t||row?.timestamp||0);const car=text(row?.carId)||'car';const ms=Math.round(positive(row?.lapMs??row?.ms??row?.time)||0);return`${trackId}:${car}:${t||index}:${ms}`;}
function replayKey(trackId,row,index=0){return`${TOP_REPLAY_PREFIX}${encodeURIComponent(String(trackId||''))}:${encodeURIComponent(lapId(trackId,row,index))}`;}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function remove(key){try{localStorage.removeItem(key);}catch{}}
function validLap(row){const ms=positive(row?.lapMs??row?.ms??row?.time);return row?.valid!==false&&row?.invalid!==true&&ms!=null;}
function cameraSample(scene,t){
  const cam=scene?.cameras?.main,view=cam?.worldView;
  if(!cam||!view)return null;
  const x=Number(view.x),y=Number(view.y),w=Number(view.width),h=Number(view.height),zoom=Number(cam.zoom);
  if(![x,y,w,h,zoom].every(Number.isFinite)||w<=0||h<=0||zoom<=0)return null;
  return{t:Number(t)||0,x,y,w,h,zoom};
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._tdrReplayCameraSamples=[];
    this._tdrReplayCameraLastT=-Infinity;
    this.events?.once?.('shutdown',()=>{this._tdrReplayCameraSamples=[];});
    return result;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(this._replayActive)return result;
    const latest=Array.isArray(this._ghostSamples)&&this._ghostSamples.length?this._ghostSamples[this._ghostSamples.length-1]:null;
    const t=Number(latest?.t);
    if(Number.isFinite(t)&&t>=0&&t>this._tdrReplayCameraLastT+20){
      const sample=cameraSample(this,t);
      if(sample){this._tdrReplayCameraSamples.push(sample);this._tdrReplayCameraLastT=t;}
    }
    return result;
  }

  _completedLapCheck(now){
    if(this._replayActive)return super._completedLapCheck(now);
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    if(hist.length>this._ghostHistoryLen){
      const last=hist[hist.length-1]||{};
      const lapMs=positive(last.lapMs??this.timing?.lastLap);
      const trackId=String(this._ghostTrackKey||this.trackKey||'track01');
      const ranked=hist.filter(validLap).map((row,index)=>({row,index,ms:positive(row?.lapMs??row?.ms??row?.time)})).sort((a,b)=>a.ms-b.ms);
      const rankedIndex=ranked.findIndex(item=>item.row===last);
      const qualifies=lapMs&&rankedIndex>=0&&rankedIndex<10&&Array.isArray(this._ghostSamples)&&this._ghostSamples.length>4;
      if(qualifies){
        const samples=this._ghostSamples.filter(s=>Number.isFinite(Number(s?.t))&&Number(s.t)>=0&&Number(s.t)<lapMs).map(s=>({t:Number(s.t),x:Number(s.x),y:Number(s.y),r:Number(s.r||0)}));
        if(this.carBody)samples.push({t:Math.round(lapMs),x:Number(this.carBody.x||0),y:Number(this.carBody.y||0),r:Number(this.carBody.rotation||0)});
        const cameraSamples=(this._tdrReplayCameraSamples||[]).filter(s=>Number.isFinite(Number(s?.t))&&Number(s.t)>=0&&Number(s.t)<=lapMs).map(s=>({t:Number(s.t),x:Number(s.x),y:Number(s.y),w:Number(s.w),h:Number(s.h),zoom:Number(s.zoom)}));
        const finalCam=cameraSample(this,lapMs);if(finalCam)cameraSamples.push(finalCam);
        const key=replayKey(trackId,last,hist.length-1);
        if(samples.length>4)write(key,{version:3,kind:'local-top10-lap',trackKey:trackId,carId:text(last.carId)||this._tdrCurrentGhostCarId||this.carId||null,lapMs:Math.round(lapMs),recordedAt:Number(last.t||last.timestamp)||Date.now(),historyIndex:hist.length-1,samples,cameraSamples,viewport:{w:Number(this.scale?.width)||0,h:Number(this.scale?.height)||0}});
        try{Promise.resolve(this.cacheReplayWorldSnapshot?.()).catch(()=>{});}catch{}
      }
      const keep=new Set(ranked.slice(0,10).map(item=>replayKey(trackId,item.row,item.index)));
      try{const prefix=`${TOP_REPLAY_PREFIX}${encodeURIComponent(trackId)}:`;for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i)||'';if(key.startsWith(prefix)&&!keep.has(key))remove(key);}}catch{}
    }
    const result=super._completedLapCheck(now);
    this._tdrReplayCameraSamples=[];
    this._tdrReplayCameraLastT=-Infinity;
    return result;
  }
}
