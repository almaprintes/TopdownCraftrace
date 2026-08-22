import { RaceScene as CurrentRaceScene } from './RaceDuelStandaloneScene.js';

export class RaceScene extends CurrentRaceScene {
  _showStandaloneDuelResult(){
    super._showStandaloneDuelResult?.();

    const root=this._duelResultDom;
    if(!root||typeof document==='undefined')return;

    const card=root.querySelector?.('.duel-c');
    const actions=root.querySelector?.('.duel-a');
    if(!card||!actions||card.querySelector?.('[data-duel-sector-table="1"]'))return;

    const report=this._buildReport?.();
    const tableHtml=report&&typeof this._f1LapTable==='function'
      ? this._f1LapTable(report)
      : '';
    if(!tableHtml)return;

    const section=document.createElement('section');
    section.dataset.duelSectorTable='1';
    section.innerHTML=`<div class="duel-sector-title">VUELTAS · SECTORES</div>${tableHtml}`;

    const style=document.createElement('style');
    style.textContent=`
      .duel-c{width:min(94vw,1000px)!important;max-height:92vh!important;overflow-y:auto!important;box-sizing:border-box!important}
      .duel-sector-title{margin:14px 0 7px;color:#9eabc0;font-size:9px;font-weight:900;letter-spacing:.11em}
      [data-duel-sector-table="1"] .f1laps{border:1px solid #1e2b3d;border-radius:8px;overflow:hidden;background:#0b1320;font-variant-numeric:tabular-nums}
      [data-duel-sector-table="1"] .f1head,[data-duel-sector-table="1"] .f1row{display:grid;grid-template-columns:50px repeat(3,minmax(54px,.8fr)) minmax(84px,1.1fr) minmax(70px,.85fr);align-items:center;column-gap:4px;padding:0 9px}
      [data-duel-sector-table="1"] .f1head{height:27px;background:#121e2d;color:#79899f;font-size:8px;letter-spacing:.08em}
      [data-duel-sector-table="1"] .f1head b:not(:first-child){text-align:right}
      [data-duel-sector-table="1"] .f1row{min-height:34px;border-top:1px solid #172334;font-size:10px}
      [data-duel-sector-table="1"] .f1row>b{color:#94a4b9}
      [data-duel-sector-table="1"] .f1row.bestlap{background:rgba(72,220,180,.035)}
      [data-duel-sector-table="1"] .f1row .sector,[data-duel-sector-table="1"] .f1row strong{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#e8edf4}
      [data-duel-sector-table="1"] .f1row strong{font-size:11px;color:#fff}
      [data-duel-sector-table="1"] .f1row .sector.green{color:#42ee9b}
      [data-duel-sector-table="1"] .f1row .sector.purple{color:#d363ff}
      [data-duel-sector-table="1"] .f1row i{text-align:right;font-size:7px;font-style:normal;font-weight:900;color:#62dcb6}
      [data-duel-sector-table="1"] .f1row i.penalty{color:#ff8f74}
      [data-duel-sector-table="1"] .f1legend{display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;padding:6px 2px 0;color:#7f8da2;font-size:7px;font-weight:850}
      [data-duel-sector-table="1"] .f1legend span{display:flex;align-items:center;gap:4px}
      [data-duel-sector-table="1"] .f1legend u{width:7px;height:7px;border-radius:2px;text-decoration:none}
      [data-duel-sector-table="1"] .f1legend u.green{background:#42ee9b}
      [data-duel-sector-table="1"] .f1legend u.purple{background:#d363ff}
      @media (orientation:landscape) and (max-height:520px){
        .duel-c{padding:12px 16px!important;max-height:calc(100dvh - 12px)!important}
        .duel-t{font-size:22px!important;margin-bottom:9px!important}
        .duel-g{gap:7px!important}.duel-s{padding:8px!important}.duel-s b{font-size:15px!important}
        .duel-sector-title{margin:9px 0 5px}
        [data-duel-sector-table="1"] .f1head,[data-duel-sector-table="1"] .f1row{min-height:29px;padding:0 7px}
        .duel-a{margin-top:9px!important}
      }
    `;

    root.appendChild(style);
    card.insertBefore(section,actions);
    card.scrollTop=0;
  }
}
