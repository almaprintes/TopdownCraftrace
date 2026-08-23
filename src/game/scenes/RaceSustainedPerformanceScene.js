import { RaceScene as CurrentRaceScene } from './RaceCullAheadScene.js';

function videoPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return {
      quality:String(s?.video?.quality||'high'),
      showFPS:!!s?.video?.showFPS
    };
  }catch{return {quality:'high',showFPS:false};}
}

// Optimización de carga sostenida, especialmente para iOS y dispositivos antiguos.
// No modifica física, IA, cronometraje ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    try {
      const prefs=videoPrefs();
      const quality=prefs.quality;

      this._installMapExportButtons = () => {};

      if (typeof this._discoverFixedHud === 'function') {
        const discover = this._discoverFixedHud.bind(this);
        let lastDiscover = -Infinity;
        discover();
        this._discoverFixedHud = () => {
          const now = performance.now();
          if (now - lastDiscover < 1000) return;
          lastDiscover = now;
          discover();
        };
      }

      if (this.minimapUnifiedPanel?.scene) {
        this._pinMinimapMarker = () => {};
        this._pinMinimapSportFrame = () => {};
      }

      if(typeof this._hideRaceDebugOnly==='function'){
        this._hideRaceDebugOnly();
        this._hideRaceDebugOnly=()=>{};
      }

      // =========================================================
      // HUD inferior simplificado: VELOCIDAD + TIEMPO.
      // Marcha y superficie salen del HUD. El cronómetro superior se elimina
      // también de la ruta de actualización para evitar regenerar texto oculto.
      // =========================================================
      const info=this.raceInfoHud;
      if(info?.scene){
        const children=Array.isArray(info.list)?info.list:[];

        for(const obj of children){
          const txt=String(obj?.text||'');
          if(txt==='MARCHA' || txt==='SUPERFICIE') obj.setVisible?.(false);

          // Ocultamos los dos separadores verticales del diseño antiguo.
          const w=Number(obj?.displayWidth??obj?.width??0);
          const h=Number(obj?.displayHeight??obj?.height??0);
          if(w<=2 && h>=35 && h<=60) obj.setVisible?.(false);
        }

        info._gearText?.setVisible?.(false);
        info._surfaceText?.setVisible?.(false);
        info._speedText?.setPosition?.(-58,-52);

        const unit=children.find(o=>String(o?.text||'')==='km/h');
        unit?.setPosition?.(-8,-38);

        const timerLabel=this.add.text(44,-66,'TIEMPO',{
          fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
          fontSize:'9px',fontStyle:'700',color:'#7E8C99'
        }).setOrigin(0,0.5);

        const timerText=this.add.text(44,-52,'0:00.00',{
          fontFamily:'Orbitron,system-ui,sans-serif',
          fontSize:'25px',fontStyle:'900',color:'#F5FAFF'
        }).setOrigin(0,0.5);

        info.add([timerLabel,timerText]);
        info._timerText=timerText;
      }

      // El reloj superior antiguo queda fuera tanto de render como de redibujado.
      if(this.ttHud?.timeText?.scene){
        this.ttHud.timeText.setVisible(false);
        this.ttHud.timeText.setText=()=>this.ttHud.timeText;
      }
      // VUELTA antigua también está sustituida por competitionHud.
      if(this.ttHud?.lapText?.scene){
        this.ttHud.lapText.setVisible(false);
        this.ttHud.lapText.setText=()=>this.ttHud.lapText;
      }

      if (typeof this._updateRaceInfoHud === 'function') {
        let lastInfo = -Infinity;
        const cache={speed:null,time:null};
        this._updateRaceInfoHud = () => {
          const now = performance.now();
          if (now - lastInfo < 50) return;
          lastInfo = now;

          const c=this.raceInfoHud;
          const body=this.carBody;
          if(!c?.scene || !body?.body?.velocity)return;

          const vx=Number(body.body.velocity.x||0);
          const vy=Number(body.body.velocity.y||0);
          const kmh=Math.max(0,Math.hypot(vx,vy)*0.185);
          const speedTxt=String(Math.round(kmh)).padStart(3,'0');
          if(speedTxt!==cache.speed){
            cache.speed=speedTxt;
            c._speedText?.setText(speedTxt);
          }

          const started=!!this.timing?.started && this.timing?.lapStart!=null;
          const elapsed=started?Math.max(0,now-Number(this.timing.lapStart)):0;
          const m=Math.floor(elapsed/60000);
          const s=Math.floor((elapsed%60000)/1000);
          const cs=Math.floor((elapsed%1000)/10);
          const timeTxt=`${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
          if(timeTxt!==cache.time){
            cache.time=timeTxt;
            c._timerText?.setText(timeTxt);
          }
        };
        this._updateRaceInfoHud();
      }

      if(typeof this._syncCompetitionHud==='function'){
        const syncCompetition=this._syncCompetitionHud.bind(this);
        let lastCompetitionCheck=-Infinity;
        let lastCompetitionSig='';
        const sigNum=(v)=>Number.isFinite(Number(v))?Math.round(Number(v)/10):'x';
        syncCompetition();
        this._syncCompetitionHud=()=>{
          const now=performance.now();
          if(now-lastCompetitionCheck<250)return;
          lastCompetitionCheck=now;

          const cp=Number(this._cpState||0);
          const lap=Number(this.lapCount||0)+1;
          const s1=(Number.isFinite(this.timing?.s1)&&Number.isFinite(this.ttBest?.s1))?this.timing.s1-this.ttBest.s1:NaN;
          const s2=(Number.isFinite(this.timing?.s2)&&Number.isFinite(this.ttBest?.s2))?this.timing.s2-this.ttBest.s2:NaN;
          const finalActive=now<=Number(this._competitionFinalDeltaUntil||0)?1:0;
          const sig=[lap,cp,sigNum(s1),sigNum(s2),sigNum(this.timing?.lastLap),sigNum(this.ttBest?.lapMs),finalActive].join('|');
          if(sig===lastCompetitionSig)return;
          lastCompetitionSig=sig;
          syncCompetition();
        };
      }

      if(quality==='low'){
        for(const key of ['_environmentEdgeWear','_semiSimBrakeMarks']){
          const obj=this[key];
          if(obj?.scene){try{obj.destroy?.();}catch{}}
          this[key]=null;
        }

        if(this.track?.gfxByCell instanceof Map){
          const map=this.track.gfxByCell;
          const stripOverlay=(cell)=>{
            if(!cell?.overlay)return cell;
            try{cell.overlay.destroy?.();}catch{}
            cell.overlay=null;
            return cell;
          };
          for(const cell of map.values())stripOverlay(cell);
          const nativeSet=map.set.bind(map);
          map.set=(key,cell)=>nativeSet(key,stripOverlay(cell));
        }
      }

      this._perfDiagEnabled=!!prefs.showFPS;
      this._perfUpdateAccum=0;
      this._perfUpdateMax=0;
      this._perfSamples=0;
      this._perfFrameMax=0;
      this._perfDiagAt=performance.now();
      this._perfHotName='--';
      this._perfHotMs=0;

      if(this._perfDiagEnabled){
        const wrapHot=(method,label)=>{
          const original=this[method];
          if(typeof original!=='function' || original.__tdrPerfWrapped)return;
          const bound=original.bind(this);
          const wrapped=(...args)=>{
            const t0=performance.now();
            const out=bound(...args);
            const ms=performance.now()-t0;
            if(ms>this._perfHotMs){
              this._perfHotMs=ms;
              this._perfHotName=label;
            }
            return out;
          };
          wrapped.__tdrPerfWrapped=true;
          this[method]=wrapped;
        };

        for(const [method,label] of [
          ['_computeLapProgress01','lapProg'],
          ['_computeCenterlineProjection','projection'],
          ['_getNearestTrackPoint','nearest'],
          ['_isOnTrack','onTrack'],
          ['_isInBand','band'],
          ['_updateProceduralAudio','audio'],
          ['_discoverFixedHud','hudDiscover'],
          ['_pinHudToScreen','hudPin'],
          ['_updateRaceInfoHud','hudInfo'],
          ['_syncCompetitionHud','hudComp']
        ]) wrapHot(method,label);

        this._perfDiagText=this.add.text(10,42,'PERF --',{
          fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
          fontSize:'10px',fontStyle:'bold',color:'#d8e8ff',
          backgroundColor:'rgba(0,0,0,.58)',padding:{x:6,y:4},lineSpacing:2
        }).setScrollFactor(0).setDepth(5001);
        try{this.cameras.main.ignore(this._perfDiagText);}catch{}
      }

      // El debug amarillo legado puede crearse de forma diferida en algunas capas.
      // Lo ocultamos después del arranque sin mantener ningún trabajo por frame.
      this.time?.delayedCall?.(1200,()=>{
        try{if(this._dbgText?.scene)this._dbgText.setVisible(false);}catch{}
        try{this._dbgSet=()=>{};}catch{}
      });
    } catch (err) {
      console.warn('[TDR2] sustained performance setup failed', err);
    }

    return result;
  }

  update(time,delta){
    const t0=performance.now();
    const result=super.update(time,delta);
    const updateMs=performance.now()-t0;

    if(this._perfDiagEnabled){
      this._perfUpdateAccum+=updateMs;
      this._perfUpdateMax=Math.max(this._perfUpdateMax,updateMs);
      this._perfSamples++;
      this._perfFrameMax=Math.max(this._perfFrameMax,Number(delta||0));

      const now=performance.now();
      if(now-this._perfDiagAt>=500){
        const avg=this._perfSamples?this._perfUpdateAccum/this._perfSamples:0;
        const objs=Array.isArray(this.children?.list)?this.children.list.length:0;
        const made=this.track?.gfxByCell instanceof Map?this.track.gfxByCell.size:0;
        const active=this.track?.activeCells instanceof Set?this.track.activeCells.size:0;
        const lap=Number(this.lapCount||0)+1;
        this._perfDiagText?.setText(
          `L${lap} UP ${avg.toFixed(1)} ms  MAX ${this._perfUpdateMax.toFixed(1)}\n`+
          `FRAME MAX ${this._perfFrameMax.toFixed(1)} ms\n`+
          `HOT ${this._perfHotName} ${this._perfHotMs.toFixed(1)} ms\n`+
          `OBJ ${objs}  CHUNK ${active}/${made}`
        );
        this._perfUpdateAccum=0;
        this._perfUpdateMax=0;
        this._perfSamples=0;
        this._perfFrameMax=0;
        this._perfHotName='--';
        this._perfHotMs=0;
        this._perfDiagAt=now;
      }
    }

    return result;
  }
}
