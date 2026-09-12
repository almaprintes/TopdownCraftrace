import { RaceScene as CurrentRaceScene } from './RaceStaticGhostStatusScene.js';

const TOP_REPLAY_PREFIX='tdr2:topReplay:';
const positive=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:null;};
const text=v=>String(v??'').trim();
function lapId(trackId,row,index=0){const t=Number(row?.t||row?.timestamp||0);const car=text(row?.carId)||'car';const ms=Math.round(positive(row?.lapMs??row?.ms??row?.time)||0);return`${trackId}:${car}:${t||index}:${ms}`;}
function replayKey(trackId,row,index=0){return`${TOP_REPLAY_PREFIX}${encodeURIComponent(String(trackId||''))}:${encodeURIComponent(lapId(trackId,row,index))}`;}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function remove(key){try{localStorage.removeItem(key);}catch{}}
function validLap(row){const ms=positive(row?.lapMs??row?.ms??row?.time);return row?.valid!==false&&row?.invalid!==true&&ms!=null;}

export class RaceScene extends CurrentRaceScene{
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
        const key=replayKey(trackId,last,hist.length-1);
        if(samples.length>4)write(key,{version:1,kind:'local-top10-lap',trackKey:trackId,carId:text(last.carId)||this._tdrCurrentGhostCarId||this.carId||null,lapMs:Math.round(lapMs),recordedAt:Number(last.t||last.timestamp)||Date.now(),historyIndex:hist.length-1,samples});
        try{Promise.resolve(this.cacheReplayWorldSnapshot?.()).catch(()=>{});}catch{}
      }
      const keep=new Set(ranked.slice(0,10).map(item=>replayKey(trackId,item.row,item.index)));
      try{const prefix=`${TOP_REPLAY_PREFIX}${encodeURIComponent(trackId)}:`;for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i)||'';if(key.startsWith(prefix)&&!keep.has(key))remove(key);}}catch{}
    }
    return super._completedLapCheck(now);
  }
}
