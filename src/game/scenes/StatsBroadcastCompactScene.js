import { StatsScene as BroadcastStatsScene } from './StatsBroadcastScene.js';

export class StatsScene extends BroadcastStatsScene{
  _installBroadcastStyles(){
    super._installBroadcastStyles();
    if(this._root?.querySelector('[data-broadcast-compact-style]'))return;
    const style=document.createElement('style');style.dataset.broadcastCompactStyle='1';style.textContent=`
/* DEV 1.0.40 — broadcast suite: one-screen landscape composition */
.tdr-stats-hub:has(.br-shell) .sh-head{min-height:clamp(40px,7.2vh,58px)}
.tdr-stats-hub:has(.br-shell) .sh-body{overflow:hidden;padding-top:clamp(5px,.8vh,8px);padding-bottom:5px}
.br-shell{height:100%;min-height:0;padding-bottom:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:6px;overflow:hidden}
.br-topline{margin-bottom:0;min-height:26px}.br-live{padding:4px 8px}.br-topline h2{font-size:clamp(15px,1.75vw,23px)}
.br-grid{min-height:0;height:100%;grid-template-columns:minmax(220px,.68fr) minmax(380px,1.42fr) minmax(245px,.82fr);gap:7px;overflow:hidden}
.br-circuits{min-height:0;height:100%;padding:8px;overflow:auto}.br-circuit{padding:6px 7px}.br-pos{font-size:15px}.br-circuit strong{font-size:10px}.br-circuit time{font-size:12px}
.br-main{min-height:0;height:100%;grid-template-rows:minmax(118px,.78fr) minmax(128px,1.05fr);gap:7px}.br-hero{min-height:0;height:100%;padding:8px 12px}.br-hero h3{font-size:clamp(19px,2.4vw,31px)}.br-pb strong{font-size:clamp(25px,3.45vw,43px)}
.br-car-strip{height:58px;margin-top:4px}.br-car-strip img{height:54px}.br-car-meta strong{font-size:13px}
.br-chart{min-height:0;height:100%;padding:8px 10px}.br-chart svg{height:calc(100% - 35px);min-height:78px;margin-top:3px}.br-empty-chart{height:calc(100% - 32px);min-height:78px}
.br-side{min-height:0;height:100%;grid-template-rows:minmax(0,1.35fr) auto;gap:7px;overflow:hidden}.br-top10{min-height:0;padding:8px;overflow:auto}.br-top10 h4,.br-sync h4{margin:2px 0 5px;font-size:12px}.br-lap{padding:4px 3px}.br-lap strong{font-size:8px}.br-lap time{font-size:10px}
.br-sync{padding:8px}.br-sync-row{padding:4px 0;font-size:7px}.br-cloud-tabs{margin-top:5px}.br-cloud-tabs button{padding:5px 1px;font-size:6px}.br-cloud-note{margin-top:4px;font-size:6px}
.br-foot{margin-top:0;gap:6px}.br-kpi{padding:5px 8px;min-height:42px}.br-kpi strong{font-size:13px}.br-kpi small{font-size:6px}
@media(max-height:520px){.tdr-stats-hub:has(.br-shell) .sh-head{min-height:40px}.tdr-stats-hub:has(.br-shell) .sh-title{font-size:clamp(20px,3vw,31px)}.br-topline{min-height:22px}.br-topline h2{font-size:15px}.br-grid{grid-template-columns:minmax(190px,.65fr) minmax(360px,1.48fr) minmax(230px,.82fr)}.br-main{grid-template-rows:minmax(105px,.72fr) minmax(112px,1fr)}.br-hero{padding:7px 10px}.br-car-strip{height:48px}.br-car-strip img{height:45px}.br-chart svg,.br-empty-chart{min-height:66px}.br-circuit{padding:5px 6px}.br-lap{padding:3px}.br-sync-row{padding:3px 0}.br-kpi{min-height:36px;padding:4px 7px}}
`;this._root.appendChild(style);
  }
}
