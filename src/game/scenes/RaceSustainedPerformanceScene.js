import { RaceScene as CurrentRaceScene } from './RaceCullAheadScene.js';

function videoPrefs(){
  try {
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return { quality:String(s?.video?.quality||'high') };
  } catch { return {quality:'high'}; }
}

function inertTextRef(){
  return {
    scene:null,
    setText(){return this;},
    setColor(){return this;},
    setVisible(){return this;},
    setShadow(){return this;},
    setAlpha(){return this;},
    setPosition(){return this;},
    destroy(){return this;}
  };
}

// Optimización de carga sostenida, especialmente para iOS y dispositivos antiguos.
// No modifica física, IA, cronometraje ni geometría de pista.
// IMPORTANTE: esta capa ya NO instala wrappers ni toma performance.now() por frame.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    try {
      const prefs=videoPrefs();
      const quality=prefs.quality;

      this._installMapExportButtons = () => {};

      if (typeof this._discoverFixedHud === 'function') {
        const discover = this._discoverFixedHud.bind(this);
        let discoverAccum = 1000;
        discover();
        this._discoverFixedHud = (delta=0) => {
          discoverAccum += Math.max(0, Number(delta)||0);
          if (discoverAccum < 1000) return;
          discoverAccum = 0;
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

      // HUD inferior NUEVO: solo VELOCIDAD + TIEMPO.
      const oldInfo=this.raceInfoHud;
      if(oldInfo){
        try{this._fixedUiRoots?.delete?.(oldInfo);}catch{}
        try{this._fixedUiState?.delete?.(oldInfo);}catch{}
        try{oldInfo.destroy?.(true);}catch{}
      }
      this.raceInfoHud=null;
      this._buildRaceInfoHud=()=>{};

      const info=this.add.container(0,0).setDepth(2150);
      this.raceInfoHud=info;

      const panelW=300;
      const panelH=70;
      const bg=this.add.rectangle(0,0,panelW,panelH,0x07101b,0.78)
        .setOrigin(0.5,1)
        .setStrokeStyle(1,0x63bfff,0.42);
      const accent=this.add.rectangle(0,-panelH+4,panelW-10,2,0x38a9ff,0.82)
        .setOrigin(0.5,0);
      const divider=this.add.rectangle(0,-35,1,42,0xffffff,0.12);

      const speedLabel=this.add.text(-124,-58,'VELOCIDAD',{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
        fontSize:'9px',fontStyle:'700',color:'#7E8C99'
      }).setOrigin(0,0.5);
      const speedText=this.add.text(-72,-34,'000',{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
        fontSize:'36px',fontStyle:'bold',color:'#F5FAFF'
      }).setOrigin(0.5,0.5);
      const unit=this.add.text(-21,-27,'km/h',{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
        fontSize:'11px',fontStyle:'700',color:'#7EC8FF'
      }).setOrigin(0,0.5);

      const timerLabel=this.add.text(24,-58,'TIEMPO',{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
        fontSize:'9px',fontStyle:'700',color:'#7E8C99'
      }).setOrigin(0,0.5);
      const timerText=this.add.text(24,-34,'0:00.00',{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
        fontSize:'27px',fontStyle:'bold',color:'#F5FAFF'
      }).setOrigin(0,0.5);

      info.add([bg,accent,divider,speedLabel,speedText,unit,timerLabel,timerText]);
      info._speedText=speedText;
      info._timerLabel=timerLabel;
      info._timerText=timerText;
      info._panelW=panelW;
      info._panelH=panelH;
      info.setScrollFactor(1,1);

      const vw=Math.max(1,Number(this.scale?.width||1));
      const vh=Math.max(1,Number(this.scale?.height||1));
      this._raceInfoHudState={
        screenX:vw*0.5,
        screenY:vh-14,
        scale:Math.min(1,Math.max(0.82,vw/900))
      };
      this._pinRaceInfoHud?.();

      // TT HUD antiguo: destrucción real.
      if(this.ttHud){
        for(const key of ['timeText','lapText','bestLapText','barBase','barSlider','ticksGfx']){
          const obj=this.ttHud[key];
          if(obj?.scene){try{obj.destroy?.();}catch{}}
          this.ttHud[key]=inertTextRef();
        }
      }

      // Telemetría ligera controlada por delta, sin reloj de alta resolución.
      let infoAccum=50;
      const infoCache={speed:null,time:null,paused:null};
      let elapsedMs=0;
      this._updateRaceInfoHud=(delta=0)=>{
        const d=Math.max(0,Number(delta)||0);
        const paused=!!this.physics?.world?.isPaused;
        infoAccum+=d;
        if(this.timing?.started&&!paused)elapsedMs+=d;
        if(infoAccum<50)return;
        infoAccum=0;

        const c=this.raceInfoHud;
        const body=this.carBody;
        if(!c?.scene || !body?.body?.velocity)return;

        if(paused!==infoCache.paused){
          infoCache.paused=paused;
          c._timerLabel?.setVisible(!paused);
          c._timerText?.setVisible(!paused);
        }

        const vx=Number(body.body.velocity.x||0);
        const vy=Number(body.body.velocity.y||0);
        const kmh=Math.max(0,Math.hypot(vx,vy)*0.185);
        const speedTxt=String(Math.round(kmh)).padStart(3,'0');
        if(speedTxt!==infoCache.speed){
          infoCache.speed=speedTxt;
          c._speedText?.setText(speedTxt);
        }

        if(!this.timing?.started&&elapsedMs<=0)elapsedMs=0;
        const m=Math.floor(elapsedMs/60000);
        const s=Math.floor((elapsedMs%60000)/1000);
        const cs=Math.floor((elapsedMs%1000)/10);
        const timeTxt=`${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
        if(timeTxt!==infoCache.time){
          infoCache.time=timeTxt;
          c._timerText?.setText(timeTxt);
        }
      };
      this._updateRaceInfoHud(50);

      if(typeof this._syncCompetitionHud==='function'){
        const syncCompetition=this._syncCompetitionHud.bind(this);
        let competitionAccum=250;
        let lastCompetitionSig='';
        const sigNum=(v)=>Number.isFinite(Number(v))?Math.round(Number(v)/10):'x';
        syncCompetition();
        this._syncCompetitionHud=(delta=0)=>{
          competitionAccum+=Math.max(0,Number(delta)||0);
          if(competitionAccum<250)return;
          competitionAccum=0;

          const cp=Number(this._cpState||0);
          const lap=Number(this.lapCount||0)+1;
          const s1=(Number.isFinite(this.timing?.s1)&&Number.isFinite(this.ttBest?.s1))?this.timing.s1-this.ttBest.s1:NaN;
          const s2=(Number.isFinite(this.timing?.s2)&&Number.isFinite(this.ttBest?.s2))?this.timing.s2-this.ttBest.s2:NaN;
          const sig=[lap,cp,sigNum(s1),sigNum(s2),sigNum(this.timing?.lastLap),sigNum(this.ttBest?.lapMs)].join('|');
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

      // Profiler invasivo eliminado definitivamente.
      this._perfDiagEnabled=false;
      this._perfStats=null;
      try{this._perfDiagText?.destroy?.();}catch{}
      this._perfDiagText=null;

      this.time?.delayedCall?.(1200,()=>{
        try{
          if(this._dbgText?.scene)this._dbgText.destroy();
          this._dbgText=null;
          this._dbgSet=()=>{};
        }catch{}
      });
    } catch (err) {
      console.warn('[TDR2] sustained performance setup failed', err);
    }

    return result;
  }

  update(time,delta){
    return super.update(time,delta);
  }
}