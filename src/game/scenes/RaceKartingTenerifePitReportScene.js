import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifePaddockFinishScene.js';

function trackId(scene){return String(scene?.trackKey||scene?.track?.id||scene?.track?.key||'');}

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
}
