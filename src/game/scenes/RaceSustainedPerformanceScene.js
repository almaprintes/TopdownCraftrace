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
      // HUD inferior NUEVO: solo VELOCIDAD + TIEMPO.
      // El HUD anterior se destruye completo, no se deja invisible.
      // =========================================================
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
      info._timerText=timerText;
      info._panelW=panelW;
      info._panelH=panelH;
      info.setScrollFactor(1,1);

      // Estado de anclaje del HUD nuevo. Reutiliza _pinRaceInfoHud heredado.
      const vw=Math.max(1,Number(this.scale?.width||1));
      const vh=Math.max(1,Number(this.scale?.height||1));
      this._raceInfoHudState={
        screenX:vw*0.5,
        screenY:vh-14,
        scale:Math.min(1,Math.max(0.82,vw/900))
      };
      this._pinRaceInfoHud?.();

      // =========================================================
      // TT HUD antiguo: destrucción real.
      // El update base aún llama a algunas referencias; se sustituyen por
      // objetos JS inertes que no son GameObjects ni generan render/texturas.
      // =========================================================
      if(this.ttHud){
        for(const key of ['timeText','lapText','bestLapText','barBase','barSlider','ticksGfx']){
          const obj=this.ttHud[key];
          if(obj?.scene){try{obj.destroy?.();}catch{}}
          this.ttHud[key]=inertTextRef();
        }
      }

      // Telemetría ligera: 20 Hz y solo regenera texto cuando cambia.
      let lastInfo=-Infinity;
      const infoCache={speed:null,time:null};
      this._updateRaceInfoHud=()=>{
        const now=performance.now();
        if(now-lastInfo<50)return;
        lastInfo=now;

        const c=this.raceInfoHud;
        const body=this.carBody;
        if(!c?.scene || !body?.body?.velocity)return;

        const vx=Number(body.body.velocity.x||0);
        const vy=Number(body.body.velocity.y||0);
        const kmh=Math.max(0,Math.hypot(vx,vy)*0.185);
        const speedTxt=String(Math.round(kmh)).padStart(3,'0');
        if(speedTxt!==infoCache.speed){
          infoCache.speed=speedTxt;
          c._speedText?.setText(speedTxt);
        }

        const started=!!this.timing?.started && this.timing?.lapStart!=null;
        const elapsed=started?Math.max(0,now-Number(this.timing.lapStart)):0;
        const m=Math.floor(elapsed/60000);
        const s=Math.floor((elapsed%60000)/1000);
        const cs=Math.floor((elapsed%1000)/10);
        const timeTxt=`${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
        if(timeTxt!==infoCache.time){
          infoCache.time=timeTxt;
          c._timerText?.setText(timeTxt);
        }
      };
      this._updateRaceInfoHud();

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
      this._perfStats=new Map();

      if(this._perfDiagEnabled){
        const wrapHot=(method,label)=>{
          const original=this[method];
          if(typeof original!=='function' || original.__tdrPerfWrapped)return;
          const bound=original.bind(this);
          const wrapped=(...args)=>{
            const t0=performance.now();
            const out=bound(...args);
            const ms=performance.now()-t0;
            const stat=this._perfStats.get(label)||{sum:0,max:0,calls:0};
            stat.sum+=ms;
            stat.max=Math.max(stat.max,ms);
            stat.calls++;
            this._perfStats.set(label,stat);
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
          ['_isOnKerb','kerb'],
          ['_isInBand','band'],
          ['_updateProceduralAudio','audio'],
          ['_updateKerbHaptics','kerbHaptics'],
          ['_discoverFixedHud','hudDiscover'],
          ['_pinHudToScreen','hudPin'],
          ['_pinRaceInfoHud','raceHudPin'],
          ['_updateRaceInfoHud','hudInfo'],
          ['_syncCompetitionHud','hudComp'],
          ['_updateMinimap','minimap'],
          ['_updateStandings','standings'],
          ['_updateCpuAi','cpuAI'],
          ['_updateAI','ai'],
          ['_updateParticles','particles'],
          ['_updateCamera','camera']
        ]) wrapHot(method,label);

        this._perfDiagText=this.add.text(10,42,'PERF --',{
          fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
          fontSize:'10px',fontStyle:'bold',color:'#d8e8ff',
          backgroundColor:'rgba(0,0,0,.62)',padding:{x:6,y:4},lineSpacing:2
        }).setScrollFactor(0).setDepth(5001);
        try{this.cameras.main.ignore(this._perfDiagText);}catch{}
      }

      // El debug amarillo legado puede crearse de forma diferida en algunas capas.
      // Destrucción real: no queda invisible ni participando en render.
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
    const t0=performance.now();
    const result=super.update(time,delta);
    const updateMs=performance.now()-t0;

    if(this._perfDiagEnabled){
      this._perfUpdateAccum+=updateMs;
      this._perfUpdateMax=Math.max(this._perfUpdateMax,updateMs);
      this._perfSamples++;
      this._perfFrameMax=Math.max(this._perfFrameMax,Number(delta||0));

      const now=performance.now();
      if(now-this._perfDiagAt>=650){
        const avg=this._perfSamples?this._perfUpdateAccum/this._perfSamples:0;
        const objs=Array.isArray(this.children?.list)?this.children.list.length:0;
        const made=this.track?.gfxByCell instanceof Map?this.track.gfxByCell.size:0;
        const active=this.track?.activeCells instanceof Set?this.track.activeCells.size:0;
        const lap=Number(this.lapCount||0)+1;
        const rows=[...this._perfStats.entries()]
          .map(([name,s])=>({name,avg:s.calls?s.sum/s.calls:0,max:s.max,calls:s.calls,total:s.sum}))
          .sort((a,b)=>b.total-a.total)
          .slice(0,6);
        const topLines=rows.length
          ? rows.map((r,i)=>`${i+1} ${r.name.padEnd(11).slice(0,11)} ${r.avg.toFixed(2)}/${r.max.toFixed(1)}ms x${r.calls}`).join('\n')
          : '— sin muestras —';

        this._perfDiagText?.setText(
          `L${lap} FPS ${Math.round(this.game?.loop?.actualFps||0)}  UP ${avg.toFixed(1)} ms MAX ${this._perfUpdateMax.toFixed(1)}\n`+
          `FRAME MAX ${this._perfFrameMax.toFixed(1)} ms  OBJ ${objs} CHUNK ${active}/${made}\n`+
          `TOP avg/max · llamadas\n${topLines}`
        );

        this._perfUpdateAccum=0;
        this._perfUpdateMax=0;
        this._perfSamples=0;
        this._perfFrameMax=0;
        this._perfStats.clear();
        this._perfDiagAt=now;
      }
    }

    return result;
  }
}
