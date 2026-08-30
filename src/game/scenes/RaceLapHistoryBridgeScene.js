import { RaceScene as CurrentRaceScene } from './RaceHandbrakeFrontAxleFixScene.js';

const finitePositive=v=>Number.isFinite(Number(v))&&Number(v)>0;

// Final timing bridge.
// The race counter/timer can successfully complete a lap while some WebKit runs
// fail to append that lap to ttHistory. Reports, clean-lap telemetry and loot all
// consume ttHistory, so one missing append makes the whole post-lap pipeline look
// dead even though lapCount and timing.lastLap have advanced.
//
// This layer never replaces the normal path: it waits briefly after lapCount moves
// and only synthesizes a row if the normal history length did not advance.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._tdrLapBridgeLastCount=Math.max(0,Number(this.lapCount)||0);
    this._tdrLapBridgePending=[];
    return result;
  }

  _queueMissingHistoryRows(){
    const current=Math.max(0,Number(this.lapCount)||0);
    let last=Math.max(0,Number(this._tdrLapBridgeLastCount)||0);
    if(current<=last)return;

    const histLen=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    while(last<current){
      last+=1;
      this._tdrLapBridgePending.push({lapNumber:last,historyLength:histLen,waitMs:0});
    }
    this._tdrLapBridgeLastCount=current;
  }

  _buildHistoryRow(){
    const timing=this.timing||{};
    const lapMs=Number(timing.lastLap);
    if(!finitePositive(lapMs))return null;

    const s1=Number(timing.s1);
    const s2=Number(timing.s2);
    let s3=Number(timing.s3);
    if(!finitePositive(s3)&&finitePositive(s1)&&finitePositive(s2)){
      const remainder=lapMs-s1-s2;
      if(finitePositive(remainder))s3=remainder;
    }

    return {
      lapMs,
      s1:finitePositive(s1)?s1:null,
      s2:finitePositive(s2)?s2:null,
      s3:finitePositive(s3)?s3:null,
      valid:true,
      invalid:false,
      recovered:true,
      recoveredAt:Date.now()
    };
  }

  _flushMissingHistoryRows(delta){
    const queue=this._tdrLapBridgePending;
    if(!Array.isArray(queue)||!queue.length)return;

    const d=Math.max(0,Number(delta)||0);
    const pending=queue[0];
    pending.waitMs+=d;
    if(pending.waitMs<180)return;

    if(!Array.isArray(this.ttHistory))this.ttHistory=[];

    // If the normal timing path appended a row after the lap-counter transition,
    // it wins. This is the Android/common path and prevents duplicate laps.
    if(this.ttHistory.length>pending.historyLength){
      queue.shift();
      return;
    }

    const row=this._buildHistoryRow();
    if(!row)return; // timing.lastLap is not stable yet; retry next frame.

    this.ttHistory.push(row);
    queue.shift();
    try{console.warn('[race-lap-bridge] recovered completed lap',pending.lapNumber,row.lapMs);}catch{}
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(this._tdrPauseMenuOpen)return result;
    this._queueMissingHistoryRows();
    this._flushMissingHistoryRows(delta);
    return result;
  }
}
