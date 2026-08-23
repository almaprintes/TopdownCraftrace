import { RaceScene as CurrentRaceScene } from './RaceDeferredChestScene.js';

const SETTINGS_KEY='tdr2:settings';
function prefs(){
  try{
    const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return {targetFps:Number(s?.video?.targetFps||60),showFPS:!!s?.video?.showFPS,particles:s?.video?.particles!==false,shadows:s?.video?.shadows!==false};
  }catch{return {targetFps:60,showFPS:false,particles:true,shadows:true};}
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._tdrVideoPrefs=prefs();
    try{this.game.loop.targetFps=this._tdrVideoPrefs.targetFps;}catch{}

    if(this._tdrVideoPrefs.showFPS){
      this._tdrFpsText=this.add.text(10,10,'FPS --',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#7dffc1',backgroundColor:'rgba(0,0,0,.45)',padding:{x:6,y:4}}).setScrollFactor(0).setDepth(5000);
      try{this.cameras.main.ignore(this._tdrFpsText);}catch{}
    }
    this._tdrFpsAccum=0;
    this._tdrFpsFrames=0;

    // Aplicar una sola vez. Antes se recorría toda la Display List en cada frame;
    // como la carrera conserva chunks/objetos para reutilizarlos, ese barrido se
    // hacía progresivamente más caro con el tiempo y provocaba calor/stutter.
    this._applyParticlePreference();
    return result;
  }

  _applyParticlePreference(){
    if(this._tdrVideoPrefs?.particles!==false)return;
    for(const o of this.children?.list||[]){
      const name=String(o?.constructor?.name||'').toLowerCase();
      if(name.includes('particle')){
        try{o.setVisible?.(false);}catch{}
        try{o.stop?.();}catch{}
      }
    }
  }

  update(time,delta){
    super.update(time,delta);
    if(this._tdrFpsText){
      this._tdrFpsAccum+=Number(delta||0);this._tdrFpsFrames++;
      if(this._tdrFpsAccum>=400){
        const fps=Math.round(this._tdrFpsFrames*1000/this._tdrFpsAccum);
        this._tdrFpsText.setText(`FPS ${fps}`);
        this._tdrFpsAccum=0;this._tdrFpsFrames=0;
      }
    }
  }
}
