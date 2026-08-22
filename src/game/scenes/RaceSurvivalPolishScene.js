import { RaceScene as TrafficRaceScene } from './RaceSurvivalTrafficScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrapPi=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

export class RaceScene extends TrafficRaceScene {
  create(data){
    this._survivalPlayerLapTimes=[];
    this._survivalPlayerLapStartPerf=null;
    // Cronómetro provisional de QA. Vive solo durante esta sesión y nunca se
    // mezcla con ttHistory, récords, recompensas ni estadísticas del jugador.
    this._survivalCpu1LapTimes=[];
    this._survivalCpu1LapStartPerf=null;
    return super.create(data);
  }

  _initSurvival(){
    super._initSurvival();
    for(const b of this._survivalBots||[]){
      const s=b?.sprite;
      if(!s)continue;
      b._renderX=Number(s.x);
      b._renderY=Number(s.y);
      b._renderRot=Number(s.rotation||0);
      b._miniMarker=null;
    }
  }

  _registerFinishCross(racer){
    const isPlayer=racer===this._survivalPlayer;
    const isCpu1=this._survivalAiRuntime?.effective==='planner_v1'&&
      racer===this._survivalPlannerBot;
    const wasArmed=Boolean(racer?.armed);
    const completed=super._registerFinishCross(racer);
    const now=performance.now();
    if(isPlayer){
      if(!wasArmed&&racer?.armed){
        // First crossing only arms the survival lap counter. Timing starts here.
        this._survivalPlayerLapStartPerf=now;
      }else if(completed){
        const start=Number(this._survivalPlayerLapStartPerf);
        const lapMs=now-start;
        if(Number.isFinite(start)&&Number.isFinite(lapMs)&&lapMs>1000){
          this._survivalPlayerLapTimes.push(lapMs);
          // Survival has five elimination rounds, therefore at most five player laps
          // belong to its session report.
          if(this._survivalPlayerLapTimes.length>5)this._survivalPlayerLapTimes=this._survivalPlayerLapTimes.slice(-5);
        }
        this._survivalPlayerLapStartPerf=now;
      }
    }
    if(isCpu1){
      if(!wasArmed&&racer?.armed){
        this._survivalCpu1LapStartPerf=now;
      }else if(completed){
        const start=Number(this._survivalCpu1LapStartPerf);
        const lapMs=now-start;
        if(Number.isFinite(start)&&Number.isFinite(lapMs)&&lapMs>1000){
          this._survivalCpu1LapTimes.push(lapMs);
          if(this._survivalCpu1LapTimes.length>5)this._survivalCpu1LapTimes=this._survivalCpu1LapTimes.slice(-5);
          this._survivalAiTelemetry?.pushEvent?.({
            timeMs:Math.round(Number(this.time?.now||0)),
            type:'cpu1_lap',lap:this._survivalCpu1LapTimes.length,
            lapMs:Math.round(lapMs)
          });
        }
        this._survivalCpu1LapStartPerf=now;
      }
    }
    return completed;
  }

  _survivalSessionBestLapMs(){
    const laps=Array.isArray(this._survivalPlayerLapTimes)?this._survivalPlayerLapTimes:[];
    return laps.length?Math.min(...laps):null;
  }

  _showSurvivalSessionInfo(resultRoot){
    // The inherited report expects ttHistory. Feed it only the player's real
    // survival laps, never Time Attack history or CPU/internal crossings.
    const original=this.ttHistory;
    this.ttHistory=(Array.isArray(this._survivalPlayerLapTimes)?this._survivalPlayerLapTimes:[])
      .slice(0,5)
      .map(lapMs=>({lapMs}));
    try{super._showSurvivalSessionInfo(resultRoot);}
    finally{this.ttHistory=original;}

    if(this._survivalAiRuntime?.effective!=='planner_v1'||typeof document==='undefined')return;
    const laps=(Array.isArray(this._survivalCpu1LapTimes)?this._survivalCpu1LapTimes:[])
      .filter(ms=>Number.isFinite(ms)&&ms>1000);
    const cards=[...document.querySelectorAll('.tdrsi-card')];
    const card=cards[cards.length-1],back=card?.querySelector?.('.tdrsi-back');
    if(!card||!back)return;
    const fmt=(ms)=>{
      if(!Number.isFinite(ms)||ms<=0)return '—';
      const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),x=Math.floor(ms%1000);
      return `${m}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;
    };
    const playerLaps=Array.isArray(this._survivalPlayerLapTimes)?this._survivalPlayerLapTimes:[];
    const playerBest=playerLaps.length?Math.min(...playerLaps):null;
    const best=laps.length?Math.min(...laps):null;
    const avg=laps.length?laps.reduce((sum,ms)=>sum+ms,0)/laps.length:null;
    const delta=Number.isFinite(best)&&Number.isFinite(playerBest)?best-playerBest:null;
    const signedDelta=Number.isFinite(delta)?`${delta>=0?'+':'−'}${(Math.abs(delta)/1000).toFixed(3)} s`:'—';
    const rows=laps.length?laps.map((ms,i)=>
      `<div class="tdrsi-cpu-lap"><b>V${i+1}</b><span>${fmt(ms)}</span><i>${ms===best?'MEJOR':''}</i></div>`
    ).join(''):'<div class="tdrsi-empty">CPU1 no completó ninguna vuelta cronometrada.</div>';
    const panel=document.createElement('section');
    panel.className='tdrsi-cpu';
    panel.innerHTML=`
      <style>
        .tdrsi-cpu{margin-top:17px;padding:12px;border:1px solid #d89b31;background:rgba(216,155,49,.055)}
        .tdrsi-cpu-title{font-size:9px;font-weight:950;letter-spacing:.14em;color:#ffc45f;margin-bottom:9px}
        .tdrsi-cpu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:7px}
        .tdrsi-cpu-grid div{background:#151d27;border:1px solid #39424e;padding:8px;text-align:center}
        .tdrsi-cpu-grid small{display:block;color:#8e9bac;font-size:7px;font-weight:900;letter-spacing:.08em;margin-bottom:4px}
        .tdrsi-cpu-grid b{font-size:13px}.tdrsi-cpu-lap{display:grid;grid-template-columns:42px 1fr 48px;gap:8px;padding:7px 2px;border-bottom:1px solid #26303b;font-size:11px}
        .tdrsi-cpu-lap span{text-align:right}.tdrsi-cpu-lap i{text-align:right;color:#ffc45f;font-size:8px;font-style:normal;font-weight:900}
        .tdrsi-cpu-note{margin-top:8px;color:#79889a;font-size:7px;line-height:1.35}
      </style>
      <div class="tdrsi-cpu-title">CPU1 · CRONOMETRAJE PROVISIONAL</div>
      <div class="tdrsi-cpu-grid">
        <div><small>MEJOR</small><b>${fmt(best)}</b></div>
        <div><small>MEDIA</small><b>${fmt(avg)}</b></div>
        <div><small>DIF. CONTIGO</small><b>${signedDelta}</b></div>
      </div>
      <div>${rows}</div>
      <div class="tdrsi-cpu-note">Solo diagnóstico planner_v1 · no guarda récords ni altera resultados.</div>`;
    card.insertBefore(panel,back);
  }

  _ensureSurvivalMiniMarkers(){
    if(!this._survivalMode)return;
    const unified=this.minimapUnifiedPanel;
    for(const b of this._survivalBots||[]){
      if(b._miniMarker?.scene){
        if(unified?.scene&&!b._miniInUnified){
          unified.add(b._miniMarker);
          b._miniInUnified=true;
        }
        continue;
      }
      const m=this.add.circle(0,0,3.2,0xffb347,1)
        .setStrokeStyle(1,0x271400,.95)
        .setDepth(2305);
      if(unified?.scene){
        unified.add(m);
        b._miniInUnified=true;
      }else{
        m.setScrollFactor(1);
        try{if(typeof m.cameraFilter==='number'&&this.cameras?.main)m.cameraFilter&=~this.cameras.main.id;}catch{}
      }
      try{this.uiCam?.ignore?.(m);}catch{}
      b._miniMarker=m;
    }
  }

  _smoothSurvivalSprites(deltaMs){
    if(!this._survivalMode)return;
    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    const posK=1-Math.exp(-14*dt);
    // La carrocería tiene inercia direccional: filtra microcorrecciones de la
    // tangente sin retrasar la posición lógica del rival.
    const rotK=1-Math.exp(-6.2*dt);
    const maxAngularStep=2.35*dt;
    for(const b of this._survivalBots||[]){
      const s=b?.sprite;if(!s?.scene)continue;
      if(!b.active){s.setVisible(false);continue;}
      const tx=Number(s.x),ty=Number(s.y),tr=Number(s.rotation||0);
      if(!Number.isFinite(b._renderX)||!Number.isFinite(b._renderY)){
        b._renderX=tx;b._renderY=ty;b._renderRot=tr;
      }else{
        const jump=Math.hypot(tx-b._renderX,ty-b._renderY);
        if(jump<260){
          b._renderX+=(tx-b._renderX)*posK;
          b._renderY+=(ty-b._renderY)*posK;
          const dr=wrapPi(tr-Number(b._renderRot||0));
          const angularStep=clamp(dr*rotK,-maxAngularStep,maxAngularStep);
          b._renderRot=Number(b._renderRot||0)+angularStep;
        }else{
          b._renderX=tx;b._renderY=ty;b._renderRot=tr;
        }
      }
      s.setPosition(b._renderX,b._renderY);
      s.rotation=b._renderRot;
    }
  }

  _pinSurvivalMiniMarkers(){
    if(!this._survivalMode)return;
    this._ensureSurvivalMiniMarkers();

    const panel=this.minimapUnifiedPanel;
    const tr=this._minimapUnifiedTransform;
    const useUnified=Boolean(panel?.scene&&tr);
    const cam=this.cameras?.main;
    const pts=this.minimap?.points;
    if(!useUnified&&(!cam||!Array.isArray(pts)||pts.length<2))return;
    const zoom=Math.max(.001,Number(cam?.zoom||1));

    for(const b of this._survivalBots||[]){
      const m=b?._miniMarker;
      if(!m?.scene)continue;
      if(!b.active||!b.sprite?.scene){m.setVisible(false);continue;}
      m.setVisible(true);

      const proj=this._computeCenterlineProjection?.(Number(b.sprite.x),Number(b.sprite.y));
      if(!proj)continue;

      if(useUnified){
        if(!b._miniInUnified){
          panel.add(m);
          b._miniInUnified=true;
        }
        const px=Number.isFinite(proj.x)?Number(proj.x):Number(b.sprite.x);
        const py=Number.isFinite(proj.y)?Number(proj.y):Number(b.sprite.y);
        m.setPosition(tr.ox+px*tr.fitScale,tr.oy+py*tr.fitScale);
        m.setScale(1);
        continue;
      }

      const i=Math.max(0,Math.min(pts.length-2,Number(proj.segIndex||0)));
      const t=clamp(Number(proj.segT||0),0,1);
      const a=pts[i],c=pts[i+1]||a;if(!a||!c)continue;
      const sx=Number(a.x)+(Number(c.x)-Number(a.x))*t;
      const sy=Number(a.y)+(Number(c.y)-Number(a.y))*t;
      const world=cam.getWorldPoint(sx,sy);
      m.setPosition(world.x,world.y);
      m.setScale(1/zoom);
    }
  }

  _destroySurvival(){
    for(const b of this._survivalBots||[]){try{b._miniMarker?.destroy?.();}catch{}}
    return super._destroySurvival();
  }

  update(time,delta){
    const result=super.update(time,delta);
    this._smoothSurvivalSprites(delta);
    this._pinSurvivalMiniMarkers();
    return result;
  }
}
