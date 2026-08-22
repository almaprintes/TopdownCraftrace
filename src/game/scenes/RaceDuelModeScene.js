import { RaceScene as CurrentRaceScene } from './RaceKartingTenerifePitReportScene.js';

const MODE_KEY='tdr2:gameMode';
const DUEL_LAPS_KEY='tdr2:duelLaps';
const AI_MODE_KEY='tdr2:survivalAiMode';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function readRequestedMode(data){
  if(data?.gameMode)return String(data.gameMode);
  try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}
}
function readDuelLaps(){
  try{
    const n=Number(localStorage.getItem(DUEL_LAPS_KEY)||15);
    return [5,10,15].includes(n)?n:15;
  }catch{return 15;}
}
function fmtLap(ms){
  ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'--:--.--';
  const m=Math.floor(ms/60000),s=(ms-m*60000)/1000;
  return`${m}:${s.toFixed(2).padStart(5,'0')}`;
}

export class RaceScene extends CurrentRaceScene {
  create(data={}){
    const requested=readRequestedMode(data);
    this._duelMode=requested==='duel';
    this._duelLapTarget=this._duelMode?readDuelLaps():5;
    this._duelResultShown=false;
    this._duelWinner=null;
    if(this._duelMode){
      // Duelo always uses the physical planner. It is now a real game mode,
      // not an URL-only experiment.
      try{localStorage.setItem(AI_MODE_KEY,'planner_v1');}catch{}
      const result=super.create({...data,gameMode:'survival'});
      this._tdrGameMode='duel';
      return result;
    }
    return super.create(data);
  }

  _initSurvival(){
    super._initSurvival?.();
    if(!this._duelMode)return;
    const bots=Array.isArray(this._survivalBots)?this._survivalBots:[];
    const keep=this._survivalPlannerBot||bots.find(b=>b?.id==='CPU 1')||bots[0];
    if(!keep)return;
    for(const b of bots){
      if(b===keep)continue;
      b.active=false;
      try{b.sprite?.destroy?.();}catch{}
      try{b.plannerBody?.destroy?.();}catch{}
    }
    keep.id='CPU1';keep.active=true;keep.finished=false;
    this._survivalBots=[keep];
    this._survivalPlannerBot=keep;
    this._survivalRound=0;
    if(this._survivalHud?._title?.scene){
      this._survivalHud._title.setText('🏎️ DUELO · TÚ VS CPU1').setColor('#ffb45f');
    }
  }

  _createSurvivalHud(){
    const result=super._createSurvivalHud?.();
    if(this._duelMode&&this._survivalHud?._title?.scene){
      this._survivalHud._title.setText('🏎️ DUELO · TÚ VS CPU1').setColor('#ffb45f');
      this._survivalHud._state?.setText?.(`STINT · ${this._duelLapTarget} VUELTAS`);
      try{this._survivalHud._bg?.setStrokeStyle?.(1,0xff9f43,.75);}catch{}
    }
    return result;
  }

  _tryCloseSurvivalRound(){
    if(this._duelMode)return;
    return super._tryCloseSurvivalRound?.();
  }

  _eliminateSpecific(racer){
    if(this._duelMode)return;
    return super._eliminateSpecific?.(racer);
  }

  _survivalPlayerRaceDistance(){
    if(!this._duelMode)return super._survivalPlayerRaceDistance?.()||0;
    const s=this._survivalPlayer;
    const x=Number(this.carBody?.x),y=Number(this.carBody?.y);
    const frac=this._survivalNearestPathProgress?.(x,y)||0;
    if(!s?.armed)return frac>.5?frac-1:frac;
    return Number(s.completedLaps||0)+frac;
  }

  _survivalEntries(){
    if(!this._duelMode)return super._survivalEntries?.()||[];
    const arr=[{id:'TÚ',player:true,active:true,raceDistance:this._survivalPlayerRaceDistance()}];
    const b=this._survivalPlannerBot;
    if(b?.active)arr.push({...b,id:'CPU1',raceDistance:Number(b.absProgress||b.completedLaps||0)});
    return arr.sort((a,b)=>b.raceDistance-a.raceDistance);
  }

  _registerFinishCross(racer){
    if(!this._duelMode)return super._registerFinishCross?.(racer);
    if(!racer)return false;
    const beforeLaps=Number(racer.completedLaps||0);
    const wasArmed=Boolean(racer.armed);
    const vx=Number(racer===this._survivalPlayer?this.carBody?.body?.velocity?.x:racer?.plannerBody?.body?.velocity?.x)||0;
    const vy=Number(racer===this._survivalPlayer?this.carBody?.body?.velocity?.y:racer?.plannerBody?.body?.velocity?.y)||0;
    const completed=super._registerFinishCross?.(racer);
    if(!completed)return false;

    // The inherited Survival finish-state hard caps at five. Preserve its lap
    // timing work, then restore the true Duel count for 10/15-lap stints.
    const trueLaps=beforeLaps+1;
    racer.completedLaps=trueLaps;
    const target=this._duelLapTarget;

    if(trueLaps<target){
      racer.finished=false;
      if(racer===this._survivalPlayer){
        this._survivalPlayerFinished=false;
        this._survivalPlayerFinishLock=null;
        this._destroySurvivalFastFinishButton?.();
        try{this._survivalNotice?.destroy?.(true);}catch{}
        try{
          if(this.carBody?.body?.velocity){
            this.carBody.body.velocity.x=vx;
            this.carBody.body.velocity.y=vy;
          }
        }catch{}
      }else{
        racer._finishLock=null;
        racer.finished=false;
      }
      return true;
    }

    this._duelWinner=racer===this._survivalPlayer?'player':'cpu1';
    this._finishDuel(this._duelWinner==='player');
    return true;
  }

  _finishDuel(playerWon){
    if(this._survivalFinished)return;
    this._survivalFinished=true;
    this._survivalWon=Boolean(playerWon);
    this._survivalFinishAt=performance.now();
    try{this.physics?.world?.pause?.();}catch{}
    if(this._survivalHud?._title?.scene){
      this._survivalHud._title.setText(playerWon?'🏆 DUELO · VICTORIA':'🏎️ DUELO · CPU1 GANA');
      this._survivalHud._title.setColor(playerWon?'#62ffb2':'#ffb45f');
    }
    this._survivalHud?._state?.setText?.(`${this._duelLapTarget}/${this._duelLapTarget} VUELTAS · FIN DEL STINT`);
    this.time?.delayedCall?.(700,()=>this._showDuelResults());
  }

  _showDuelResults(){
    if(this._duelResultShown||typeof document==='undefined')return;
    this._duelResultShown=true;
    try{if(this._pauseButton)this._pauseButton.style.display='none';}catch{}
    const playerTimes=(Array.isArray(this._survivalPlayer?._survivalLapTimesMs)?this._survivalPlayer._survivalLapTimesMs:[]).map(Number).filter(Number.isFinite);
    const cpuTimes=(Array.isArray(this._survivalPlannerBot?._survivalLapTimesMs)?this._survivalPlannerBot._survivalLapTimesMs:[]).map(Number).filter(Number.isFinite);
    const pBest=playerTimes.length?Math.min(...playerTimes):null;
    const cBest=cpuTimes.length?Math.min(...cpuTimes):null;
    const replayReady=Boolean(this._survivalCpuReplay?.samples?.length>4);
    const won=this._duelWinner==='player';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    root.innerHTML=`<style>
      .tdrduel-v{position:fixed;inset:0;z-index:14500;background:rgba(2,6,12,.78);display:flex;align-items:center;justify-content:center;padding:18px;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .tdrduel-c{width:min(88vw,520px);background:#091722;border:2px solid #ff9f43;padding:22px;color:#fff;box-shadow:0 24px 80px #0009}
      .tdrduel-k{font-size:10px;font-weight:900;letter-spacing:.18em;color:#ffb45f}.tdrduel-t{font-size:28px;font-weight:950;margin:5px 0 16px}.tdrduel-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tdrduel-s{background:#101f2b;border:1px solid #2e4252;padding:12px}.tdrduel-s small{display:block;color:#8fa3b5;font-size:8px;font-weight:900;letter-spacing:.1em}.tdrduel-s b{display:block;font-size:19px;margin-top:5px}.tdrduel-a{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px}.tdrduel-a button{height:44px;border:1px solid #526b7d;background:#122536;color:#fff;font:900 10px system-ui}.tdrduel-a .p{border-color:#ff9f43;background:#4a2b10}.tdrduel-a button:disabled{opacity:.35}
    </style><div class="tdrduel-v"><div class="tdrduel-c">
      <div class="tdrduel-k">DUELO · ${this._duelLapTarget} VUELTAS</div>
      <div class="tdrduel-t">${won?'🏆 VICTORIA':'CPU1 GANA'}</div>
      <div class="tdrduel-g"><div class="tdrduel-s"><small>TU MEJOR VUELTA</small><b>${fmtLap(pBest)}</b></div><div class="tdrduel-s"><small>MEJOR CPU1</small><b>${fmtLap(cBest)}</b></div></div>
      <div class="tdrduel-a"><button data-a="replay" ${replayReady?'':'disabled'}>▶ CPU1</button><button class="p" data-a="again">OTRO DUELO</button><button data-a="menu">MENÚ</button></div>
    </div></div>`;
    document.body.appendChild(root);this._survivalResultDom=root;
    root.querySelector('[data-a="replay"]')?.addEventListener('click',()=>this._startSurvivalCpuReplay?.(root));
    root.querySelector('[data-a="again"]')?.addEventListener('click',()=>{
      try{root.remove();}catch{}
      this.scene.restart({carId:this.carId||this.selectedCarId,trackKey:this.trackKey,gameMode:'duel'});
    });
    root.querySelector('[data-a="menu"]')?.addEventListener('click',()=>{try{root.remove();}catch{}this.scene.start('menu');});
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(this._duelMode&&!this._survivalFinished&&this._survivalHud?._state?.scene){
      const p=Math.min(this._duelLapTarget,Number(this._survivalPlayer?.completedLaps||0));
      const c=Math.min(this._duelLapTarget,Number(this._survivalPlannerBot?.completedLaps||0));
      const entries=this._survivalEntries();
      const leader=entries[0]?.player?'TÚ':'CPU1';
      this._survivalHud._title?.setText?.('🏎️ DUELO · TÚ VS CPU1');
      this._survivalHud._state.setText(`VUELTAS · TÚ ${p}/${this._duelLapTarget} · CPU1 ${c}/${this._duelLapTarget} · LÍDER ${leader}`);
    }
    return result;
  }
}
