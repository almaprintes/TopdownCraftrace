import { RaceScene as CurrentRaceScene } from './RaceDuelLapReplayScene.js';

function videoQuality(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return String(s?.video?.quality||'high');
  }catch{return 'high';}
}

function currentTrackKey(scene){
  let stored='';
  try{stored=localStorage.getItem('tdr2:trackKey')||'';}catch{}
  return String(scene?.trackKey || scene?.track?.meta?.id || stored || '').trim().toLowerCase();
}

// Capa final de rendimiento para la pista.
// No modifica física, cronometraje, IA ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create() {
    super.create();

    try {
      if (!this.track) return;

      const raven=currentTrackKey(this)==='offroad-raven-hollow';
      // Raven Hollow es compacto y entrelazado: con radio 4 muchas celdas de pista
      // caen simultáneamente dentro del cuadrado de culling y disparan el frame-time.
      // 2 celdas de 400 px siguen cubriendo holgadamente el viewport móvil.
      this.track.cullRadiusCells = raven ? 2 : (videoQuality()==='low' ? 2 : 4);

      if(raven){
        // El lookahead extra no aporta nada aquí porque el propio trazado vuelve a
        // entrar repetidamente en el radio visible. Evitamos ese trabajo por frame.
        this._applyDirectionalLookahead=()=>{};
        this._centerlineLookaheadCells=()=>new Set();
        this._aheadVisible=new Set();
      }
    } catch (_) {}
  }
}
