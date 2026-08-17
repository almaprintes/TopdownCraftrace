import { RaceScene as CurrentRaceScene } from './RaceSessionFinalPolishScene.js';

const PENALTY_MS=2000;

function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._penaltyByHistoryIndex=new Map();
    this._penaltyPersistedIndices=new Set();
    return result;
  }

  _applyAntiCutPenalty(){
    const wasApplied=!!this._antiCutPenaltyApplied;
    const nextHistoryIndex=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    const result=super._applyAntiCutPenalty?.();
    if(!wasApplied&&this._antiCutPenaltyApplied){
      this._penaltyByHistoryIndex.set(
        nextHistoryIndex,
        Number(this._penaltyByHistoryIndex.get(nextHistoryIndex)||0)+PENALTY_MS
      );
    }
    return result;
  }

  update(time,delta){
    const result=super.update(time,delta);
    this._persistCompletedLapPenalties();
    return result;
  }

  _persistCompletedLapPenalties(){
    const h=Array.isArray(this.ttHistory)?this.ttHistory:null;
    if(!h||!this._penaltyByHistoryIndex?.size)return;
    let changed=false;

    for(const [index,penaltyMs] of this._penaltyByHistoryIndex){
      if(this._penaltyPersistedIndices.has(index)||!h[index])continue;
      const rec=h[index];
      const raw=num(rec.rawLapMs)??num(rec.lapMs)??num(rec.ms)??num(rec.time);
      if(raw==null)continue;
      rec.rawLapMs=raw;
      rec.penaltyMs=Math.max(0,Number(penaltyMs)||0);
      rec.penalized=rec.penaltyMs>0;
      this._penaltyPersistedIndices.add(index);
      changed=true;
    }

    if(!changed)return;
    try{
      if(this.ttHistKey)localStorage.setItem(this.ttHistKey,JSON.stringify({v:2,history:h}));
    }catch{}
    this._reconcileBestLapWithPenalties();
  }

  _effectiveRecordLapMs(rec){
    const raw=num(rec?.rawLapMs)??num(rec?.lapMs)??num(rec?.ms)??num(rec?.time);
    if(raw==null)return null;
    return raw+Math.max(0,Number(rec?.penaltyMs)||0);
  }

  _reconcileBestLapWithPenalties(){
    const h=Array.isArray(this.ttHistory)?this.ttHistory:[];
    let bestRec=null,bestMs=Infinity;
    for(const rec of h){
      const effective=this._effectiveRecordLapMs(rec);
      if(effective==null||effective<=0||effective>=bestMs)continue;
      bestMs=effective;bestRec=rec;
    }
    if(!bestRec||!Number.isFinite(bestMs))return;

    const current=num(this.ttBest?.lapMs);
    if(current!=null&&Math.abs(current-bestMs)<0.5)return;

    this.ttBest={
      lapMs:bestMs,
      lapTick:bestRec.lapTick??null,
      s1:num(bestRec.s1),
      s1Tick:bestRec.s1Tick??null,
      s2:num(bestRec.s2),
      s2Tick:bestRec.s2Tick??null
    };
    try{if(this.ttKey)localStorage.setItem(this.ttKey,JSON.stringify(this.ttBest));}catch{}
  }

  _sessionLaps(){
    const h=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const base=Math.max(0,Number(this._sessionLapBaseline)||0);
    return h.slice(base).map((e,i)=>{
      const absoluteIndex=base+i;
      const raw=num(e?.rawLapMs)??num(e?.lapMs)??num(e?.ms)??num(e?.time);
      const penaltyMs=Math.max(0,Number(e?.penaltyMs)||Number(this._penaltyByHistoryIndex?.get(absoluteIndex))||0);
      return {
        n:i+1,
        lapMs:raw==null?null:raw+penaltyMs,
        rawLapMs:raw,
        penaltyMs,
        carId:e?.carId||this.carId
      };
    }).filter(x=>Number.isFinite(x.lapMs)&&x.lapMs>0);
  }

  _reportInnerHtml(r){
    let html=super._reportInnerHtml?.(r)||'';
    for(const lap of r?.laps||[]){
      const penalty=Math.max(0,Number(lap?.penaltyMs)||0);
      if(!penalty)continue;
      const re=new RegExp(`<div class="lap"><b>V${lap.n}</b><span>([^<]*)</span><i[^>]*>([^<]*)</i></div>`);
      html=html.replace(re,(_m,time,label)=>{
        const tag=`+${(penalty/1000).toFixed(3)} s`;
        const best=String(label||'').includes('MEJOR')?'MEJOR · ':'';
        return `<div class="lap"><b>V${lap.n}</b><span>${time}</span><i style="color:#ff8f74">${best}${tag}</i></div>`;
      });
    }
    return html;
  }
}
