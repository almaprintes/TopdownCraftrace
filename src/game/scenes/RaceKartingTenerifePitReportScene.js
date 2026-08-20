import { RaceScene as CurrentRaceScene } from './RaceReplayCameraFrameScene.js';

function trackId(scene){return String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'');}

const MATERIAL_ASSETS=[
  'chatarra.webp',
  'aleacion.webp',
  'goma.webp',
  'compuesto.webp',
  'disco_metalico.webp',
  'muelle.webp',
  'engranaje.webp',
  'electronica.webp'
];

export class RaceScene extends CurrentRaceScene {
  update(time,delta){
    const gate=this._paddockFinishGate;
    const car=this.carBody||this.car;
    const history=Array.isArray(this.ttHistory)?this.ttHistory:null;
    const beforeLen=history?.length||0;
    const inPitGate=!!(trackId(this)==='karting-tenerife'&&gate&&car&&Math.hypot(Number(car.x)-gate.center.x,Number(car.y)-gate.center.y)<=gate.activationRadius);

    super.update(time,delta);

    if(inPitGate&&history&&history.length>beforeLen){
      const rec=history[history.length-1];
      if(rec&&typeof rec==='object')rec.pit=true;
    }
  }

  _sessionLaps(){
    const laps=super._sessionLaps?.()||[];
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const base=Math.max(0,Number(this._sessionLapBaseline)||0);
    return laps.map((lap,i)=>({...lap,pit:!!history[base+i]?.pit}));
  }

  _f1LapTable(r){
    let html=super._f1LapTable?.(r)||'';
    for(const lap of r?.laps||[]){
      if(!lap?.pit)continue;
      const n=Number(lap.n);
      if(!Number.isFinite(n))continue;
      const re=new RegExp(`(<div class="f1row[^>]*"><b>V${n}<\\/b>[\\s\\S]*?<i class="[^"]*">)([^<]*)(<\\/i><\\/div>)`);
      html=html.replace(re,(_m,a,note,c)=>{
        const parts=String(note||'').split(' · ').map(s=>s.trim()).filter(Boolean);
        if(!parts.includes('PITS'))parts.push('PITS');
        return `${a}${parts.join(' · ')}${c}`;
      });
    }
    return html;
  }

  _showSessionRewards(resultRoot=null,onDone=null){
    const result=super._showSessionRewards?.(resultRoot,onDone);
    const root=this._sessionRewardsDom;
    if(!root)return result;

    const base=import.meta.env.BASE_URL||'/';
    const items=[...root.querySelectorAll?.('.tdrfp-item')||[]];
    items.forEach((node,i)=>{
      const icon=node.querySelector?.('.tdrfp-ico');
      const file=MATERIAL_ASSETS[i];
      if(!icon||!file)return;
      icon.innerHTML=`<img src="${base}assets/crafting/materials/${file}" alt="" draggable="false" style="display:block;width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35));">`;
      icon.style.width='38px';
      icon.style.minWidth='38px';
      icon.style.display='grid';
      icon.style.placeItems='center';
    });
    return result;
  }

  _showSurvivalResults(){
    const result=super._showSurvivalResults?.();
    const root=this._survivalResultDom;
    if(!root)return result;

    const style=document.createElement('style');
    style.textContent=`
      .tdrsurv-veil{padding:7px !important;overflow:hidden !important;align-items:center !important;}
      .tdrsurv-card{width:min(94vw,980px) !important;max-height:calc(100dvh - 14px) !important;overflow-y:auto !important;overscroll-behavior:contain !important;-webkit-overflow-scrolling:touch !important;padding:14px 18px 10px !important;box-sizing:border-box !important;}
      .tdrsurv-title{margin-bottom:10px !important;font-size:24px !important;}
      .tdrsurv-stats{margin-bottom:10px !important;gap:7px !important;}
      .tdrsurv-stat{padding:8px 7px !important;}
      .tdrsurv-loot{margin:0 0 9px !important;padding:9px !important;}
      .tdrsurv-loot-head{margin-bottom:7px !important;}
      .tdrsurv-loot-grid{gap:5px !important;}
      .tdrsurv-loot-item{min-height:50px !important;padding:4px 3px !important;}
      .tdrsurv-loot-meta{margin-top:6px !important;}
      .tdrsurv-actions{position:sticky !important;bottom:0 !important;z-index:5 !important;background:linear-gradient(180deg,rgba(7,16,25,.35),#071019 28%) !important;padding-top:7px !important;margin-top:0 !important;}
      .tdrsurv-btn{height:42px !important;}
      @media (orientation:landscape) and (max-height:520px){
        .tdrsurv-card{padding:8px 14px 7px !important;}
        .tdrsurv-kicker{font-size:8px !important;margin-bottom:2px !important;}
        .tdrsurv-title{font-size:20px !important;margin-bottom:6px !important;}
        .tdrsurv-stats{margin-bottom:7px !important;}
        .tdrsurv-stat{padding:6px 5px !important;}
        .tdrsurv-stat small{margin-bottom:2px !important;}
        .tdrsurv-stat b{font-size:14px !important;}
        .tdrsurv-loot{padding:7px !important;margin-bottom:6px !important;}
        .tdrsurv-loot-item{min-height:44px !important;}
        .tdrsurv-loot-meta{margin-top:4px !important;}
        .tdrsurv-btn{height:38px !important;}
      }
    `;
    root.appendChild(style);
    const card=root.querySelector?.('.tdrsurv-card');
    if(card)card.scrollTop=0;
    return result;
  }

  _openFinalSessionReport(){
    const result=super._openFinalSessionReport?.();
    const root=this._sessionReportModal;
    if(!root)return result;

    const style=document.createElement('style');
    style.textContent=`
      .veil{padding:8px !important;align-items:center !important;overflow:hidden !important;}
      .modal{width:min(94vw,1100px) !important;max-width:94vw !important;max-height:calc(100dvh - 16px) !important;overflow-y:auto !important;overscroll-behavior:contain !important;-webkit-overflow-scrolling:touch !important;}
      @media (orientation:landscape) and (max-height:850px){
        .modal{max-height:calc(100dvh - 12px) !important;padding:14px 18px 12px !important;}
        .modal .hero h2{font-size:20px !important;}
        .modal .headline{margin:10px 0 7px !important;}
        .modal .headline>div,.modal .grid>div{padding:9px 11px !important;}
        .modal h3{margin:12px 0 6px !important;}
        .modal .lap{padding:7px 3px !important;}
        .modal .actions{margin-top:10px !important;}
      }
    `;
    root.appendChild(style);

    const modal=root.querySelector?.('.modal');
    if(modal){
      modal.scrollTop=0;
      modal.style.boxSizing='border-box';
    }
    return result;
  }
}
