import { StatsScene as ReplayStatsScene } from './StatsBroadcastReplayScene.js';

const SESSION_KEY='tdr2:statsNativeReplay';

export class StatsScene extends ReplayStatsScene{
  _showRaceControlReplay(record,ghost){
    this._stopRaceControlReplay();
    if(!ghost?.samples?.length)return;
    const trackId=String(ghost.trackKey||record?.trackId||'track01');
    const carId=String(ghost.carId||record?.selectedLap?.carId||'stock');
    try{
      sessionStorage.setItem(SESSION_KEY,JSON.stringify({
        version:1,
        source:'race-control',
        returnTrackId:trackId,
        trackId,
        carId,
        lapMs:Number(ghost.lapMs)||0,
        recordedAt:Number(ghost.recordedAt)||0,
        samples:ghost.samples,
        cameraSamples:Array.isArray(ghost.cameraSamples)?ghost.cameraSamples:[]
      }));
    }catch{return;}
    this.scene.start('race',{trackKey:trackId,carId,statsNativeReplay:true});
  }
}
