import { StatsScene as BroadcastStatsScene } from './StatsBroadcastScene.js';

export class StatsScene extends BroadcastStatsScene{
  _installBroadcastStyles(){
    super._installBroadcastStyles();
    if(this._root?.querySelector('[data-broadcast-compact-style]'))return;
    const style=document.createElement('style');style.dataset.broadcastCompactStyle='1';style.textContent=`
/* DEV 1.0.40 — horizontal fit only. Preserve the original vertical broadcast composition. */
.tdr-stats-hub:has(.br-shell) .sh-body{overflow-y:auto;overflow-x:hidden;padding-left:clamp(4px,.65vw,9px);padding-right:clamp(4px,.65vw,9px)}
.br-shell{width:100%;max-width:100%;overflow-x:hidden}
.br-grid{width:100%;max-width:100%;grid-template-columns:minmax(190px,.64fr) minmax(320px,1.24fr) minmax(205px,.72fr);gap:6px}
.br-circuits{padding-left:8px;padding-right:8px}.br-circuit{grid-template-columns:24px minmax(0,1fr) auto;gap:6px;padding-left:5px;padding-right:5px}.br-circuit strong,.br-circuit small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.br-pos{font-size:15px}.br-circuit time{font-size:12px}
.br-main{min-width:0;gap:6px}.br-hero{padding-left:11px;padding-right:11px}.br-hero-head{gap:8px}.br-hero h3{font-size:clamp(20px,2.55vw,34px)}.br-pb strong{font-size:clamp(27px,3.6vw,46px)}
.br-car-strip{grid-template-columns:minmax(0,1fr) minmax(105px,.5fr)}.br-car-meta{padding-left:9px}.br-car-meta strong{font-size:13px}
.br-chart{padding-left:9px;padding-right:9px}.br-side{min-width:0;gap:6px}.br-top10,.br-sync{padding-left:8px;padding-right:8px}.br-lap{grid-template-columns:22px minmax(0,1fr) auto;gap:5px}.br-lap span{min-width:0}.br-lap strong,.br-lap small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.br-lap time{font-size:10px}.br-cloud-tabs{gap:3px}.br-cloud-tabs button{font-size:6px;padding-left:1px;padding-right:1px}
.br-foot{width:100%;max-width:100%;gap:5px}.br-kpi{min-width:0;padding-left:8px;padding-right:8px}.br-kpi strong{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:1180px){.br-grid{grid-template-columns:minmax(178px,.60fr) minmax(300px,1.18fr) minmax(195px,.68fr)}.br-circuit{grid-template-columns:22px minmax(0,1fr) auto}.br-circuit small{font-size:6px}.br-circuit time{font-size:11px}.br-hero{padding-left:9px;padding-right:9px}.br-pb strong{font-size:clamp(25px,3.35vw,42px)}.br-car-strip{grid-template-columns:minmax(0,1fr) minmax(95px,.46fr)}.br-top10,.br-sync{padding-left:7px;padding-right:7px}}
@media(max-width:1000px){.br-grid{grid-template-columns:minmax(165px,.58fr) minmax(280px,1.13fr) minmax(182px,.65fr);gap:5px}.br-topline{gap:7px}.br-topline h2{font-size:clamp(16px,2vw,23px)}.br-topline p{font-size:7px}.br-circuit{padding-left:4px;padding-right:4px}.br-circuit strong{font-size:10px}.br-circuit time{font-size:10px}.br-hero h3{font-size:clamp(19px,2.4vw,30px)}.br-car-meta{padding-left:7px}.br-car-meta strong{font-size:12px}.br-sync-row{font-size:7px}.br-kpi{padding-left:6px;padding-right:6px}.br-kpi strong{font-size:13px}}
`;this._root.appendChild(style);
  }
}
