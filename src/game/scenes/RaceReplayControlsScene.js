import { RaceScene as GhostRaceScene } from './RaceGhostModeScene.js';

function textAdapter(el){
  return {
    scene: true,
    setText(value){ if(el) el.textContent=String(value); return this; },
    setVisible(value){ if(el) el.style.display=value?'':'none'; return this; }
  };
}

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends GhostRaceScene {
  create(data){
    const result=super.create(data);
    this.events.once('shutdown',()=>this._destroyReplayDom());
    return result;
  }

  _destroyReplayDom(){
    try{this._replayDom?.remove?.();}catch{}
    this._replayDom=null;this._replayUi=null;this._replayTimeText=null;this._replayPlayText=null;this._replayCamText=null;this._replayExportBtn=null;
    this._replayTelemetry=null;this._replayIntro=null;this._replayDelta=null;this._replaySectors=[];
  }

  _replayCarName(){
    return String(this.carDef?.name||this.carDef?.displayName||this._ghostData?.carName||this._ghostCarId||'COCHE').replace(/[_-]+/g,' ').toUpperCase();
  }
  _replayTrackName(){
    return String(this.track?.name||this.trackDef?.name||this._ghostData?.trackName||this._ghostTrackKey||'CIRCUITO').replace(/[_-]+/g,' ').toUpperCase();
  }
  _fmtReplayMs(ms){
    const t=Math.max(0,Number(ms)||0),m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);
    return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  _createReplayUi(){
    if(this._replayDom?.isConnected)return;
    const root=document.createElement('div'); root.id='tdr-replay-controls';
    Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'2147483000',pointerEvents:'none',fontFamily:'system-ui,-apple-system,Segoe UI,Arial,sans-serif',color:'#fff',textShadow:'0 1px 3px #000'});
    const glass={background:'linear-gradient(135deg,rgba(3,13,22,.86),rgba(5,29,38,.68))',border:'1px solid rgba(100,232,255,.34)',boxShadow:'0 0 18px rgba(43,211,255,.10),inset 0 0 16px rgba(36,195,229,.04)',borderRadius:'7px'};

    const ident=document.createElement('div'); Object.assign(ident.style,{position:'absolute',left:'14px',top:'12px',padding:'8px 11px',minWidth:'180px',...glass});
    ident.innerHTML=`<div style="font-size:10px;font-weight:900;letter-spacing:.16em;color:#7feaff">REPLAY · VUELTA RÁPIDA</div><div style="font-size:14px;font-weight:900;margin-top:2px">${this._replayCarName()}</div><div style="font-size:9px;opacity:.72;letter-spacing:.08em">${this._replayTrackName()}</div>`;

    const delta=document.createElement('div'); Object.assign(delta.style,{position:'absolute',left:'50%',top:'13px',transform:'translateX(-50%)',padding:'7px 14px',textAlign:'center',minWidth:'92px',opacity:'0',transition:'opacity .18s',...glass});
    delta.innerHTML='<div style="font-size:8px;letter-spacing:.14em;opacity:.65">DELTA</div><div data-v style="font:900 17px ui-monospace,SFMono-Regular,Menlo,monospace">±0.000</div>';

    const sectors=document.createElement('div'); Object.assign(sectors.style,{position:'absolute',right:'14px',top:'12px',width:'142px',padding:'7px 9px',...glass});
    sectors.innerHTML='<div style="font-size:8px;letter-spacing:.16em;color:#7feaff;font-weight:900;margin-bottom:4px">SECTORES</div>';
    this._replaySectors=[];
    for(let i=0;i<3;i++){const r=document.createElement('div');Object.assign(r.style,{display:'grid',gridTemplateColumns:'24px 1fr 45px',gap:'4px',font:'800 9px ui-monospace,SFMono-Regular,Menlo,monospace',padding:'2px 0',opacity:'.45'});r.innerHTML=`<span>S${i+1}</span><span data-t>--.--</span><span data-d>--</span>`;sectors.appendChild(r);this._replaySectors.push(r);}

    const telemetry=document.createElement('div'); Object.assign(telemetry.style,{position:'absolute',right:'14px',bottom:'62px',width:'178px',padding:'8px 10px',...glass});
    telemetry.innerHTML=`<div style="display:flex;align-items:baseline;justify-content:space-between"><span data-speed style="font:900 22px ui-monospace,SFMono-Regular,Menlo,monospace">000</span><span style="font-size:8px;opacity:.7">km/h</span><span data-gear style="font-size:14px;font-weight:900;color:#7feaff">1ª</span></div><div style="font-size:7px;letter-spacing:.12em;margin-top:5px">GAS</div><div style="height:3px;background:#17313a"><i data-gas style="display:block;height:100%;width:0%;background:#35f3a0"></i></div><div style="font-size:7px;letter-spacing:.12em;margin-top:4px">FRENO</div><div style="height:3px;background:#3a2025"><i data-brake style="display:block;height:100%;width:0%;background:#ff667d"></i></div><div style="display:flex;align-items:center;gap:6px;margin-top:6px"><span style="font-size:7px;opacity:.65">DIRECCIÓN</span><div style="position:relative;height:3px;flex:1;background:#18323a"><i data-steer style="position:absolute;top:-2px;left:50%;width:3px;height:7px;background:#8ff2ff"></i></div></div>`;

    const brand=document.createElement('div'); brand.textContent='TOPDOWN CRAFTRACE // REPLAY'; Object.assign(brand.style,{position:'absolute',left:'14px',bottom:'65px',fontSize:'8px',fontWeight:'900',letterSpacing:'.15em',color:'#a7f5ff',opacity:'.68'});

    const intro=document.createElement('div'); Object.assign(intro.style,{position:'absolute',left:'50%',top:'48%',transform:'translate(-50%,-50%)',textAlign:'center',padding:'16px 28px',transition:'opacity .35s',...glass});
    intro.innerHTML=`<div style="font-size:10px;font-weight:900;letter-spacing:.22em;color:#59f3b1">PERSONAL BEST</div><div style="font:900 34px ui-monospace,SFMono-Regular,Menlo,monospace;margin:2px 0">${this._fmtReplayMs(this._ghostData?.lapMs)}</div><div style="font-size:9px;letter-spacing:.12em;opacity:.8">${this._replayCarName()} · ${this._replayTrackName()}</div>`;

    const timer=document.createElement('div'); timer.textContent='0:00.00'; Object.assign(timer.style,{position:'absolute',left:'50%',bottom:'62px',transform:'translateX(-50%)',padding:'5px 9px',font:'800 10px ui-monospace,SFMono-Regular,Menlo,monospace',color:'#8ff2ff',...glass});

    const bar=document.createElement('div'); Object.assign(bar.style,{position:'absolute',left:'10px',right:'10px',bottom:'calc(10px + env(safe-area-inset-bottom, 0px))',display:'flex',justifyContent:'center',gap:'8px',pointerEvents:'auto'});
    const makeBtn=(label,fn,wide=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{appearance:'none',WebkitAppearance:'none',border:'1px solid rgba(100,232,255,.62)',background:'rgba(7,19,29,.94)',color:'#e9fbff',borderRadius:'8px',height:'38px',padding:wide?'0 16px':'0 13px',fontSize:'10px',fontWeight:'900',whiteSpace:'nowrap',touchAction:'manipulation'});let fired=0;const fire=ev=>{ev.preventDefault();ev.stopPropagation();const n=performance.now();if(n-fired<180)return;fired=n;fn?.();};b.addEventListener('pointerup',fire,{passive:false});b.addEventListener('click',fire,{passive:false});return b;};
    const back=makeBtn('← VOLVER',()=>this._exitReplay()),restart=makeBtn('↺ INICIO',()=>this._restartReplay()),play=makeBtn('⏸ PAUSA',()=>this._toggleReplayPause()),cam=makeBtn('🎥 SEGUIMIENTO',()=>this._setReplayCamera(this._replayCameraMode==='follow'?'wide':'follow'),true),exp=makeBtn('⬆ EXPORTAR VÍDEO',()=>this._startReplayExport(),true);bar.append(back,restart,play,cam,exp);

    root.append(ident,delta,sectors,telemetry,brand,intro,timer,bar);document.body.appendChild(root);
    this._replayDom=root;this._replayIntro=intro;this._replayDelta=delta;this._replayTelemetry=telemetry;
    this._replayUi={scene:true,setVisible:v=>{root.style.display=v?'':'none';return this._replayUi;},destroy:()=>this._destroyReplayDom()};
    this._replayTimeText=textAdapter(timer);this._replayPlayText=textAdapter(play);this._replayCamText=textAdapter(cam);this._replayExportBtn={scene:true,setVisible:v=>{exp.style.display=v?'':'none';return this._replayExportBtn;}};
  }

  _updateReplayIdentity(t){
    if(!this._replayDom)return;
    if(this._replayIntro)this._replayIntro.style.opacity=t<1500?'1':'0';
    const samples=this._ghostData?.samples||[],lap=Math.max(1,Number(this._ghostData?.lapMs)||1),p=this._sampleGhostAt?.(t);
    let speed=0,steer=0;
    if(samples.length>1){let i=1;while(i<samples.length&&Number(samples[i].t)<t)i++;i=clamp(i,1,samples.length-1);const a=samples[i-1],b=samples[i],dt=Math.max(1,Number(b.t)-Number(a.t));const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y);speed=Math.hypot(dx,dy)/(dt/1000);let dr=((Number(b.r||0)-Number(a.r||0)+Math.PI*3)%(Math.PI*2))-Math.PI;steer=clamp(dr*7,-1,1);}
    const kmh=Math.max(0,Math.round(speed*.1));
    if(this._replayTelemetry){this._replayTelemetry.querySelector('[data-speed]').textContent=String(kmh).padStart(3,'0');this._replayTelemetry.querySelector('[data-gear]').textContent=kmh<4?'N':(t/lap<.28?'1ª':'2ª');const throttle=kmh>3?clamp(.55+speed/900,0,1):0;this._replayTelemetry.querySelector('[data-gas]').style.width=`${Math.round(throttle*100)}%`;this._replayTelemetry.querySelector('[data-brake]').style.width='0%';this._replayTelemetry.querySelector('[data-steer]').style.left=`${50+steer*46}%`;}
    const sector=Math.min(2,Math.floor((t/lap)*3));
    this._replaySectors?.forEach((r,i)=>{if(i<sector){r.style.opacity='1';r.querySelector('[data-t]').textContent=this._fmtReplayMs(lap/3).replace('0:','');r.querySelector('[data-d]').textContent='✓';}else if(i===sector)r.style.opacity='.8';});
    if(this._replayDelta){const phase=t/lap,delta=Math.sin(phase*Math.PI*5)*.11*(1-phase);if(t>900&&t<lap-200&&Math.abs((phase*3)%1)<.18){this._replayDelta.style.opacity='1';const v=this._replayDelta.querySelector('[data-v]');v.textContent=`${delta<=0?'−':'+'}${Math.abs(delta).toFixed(3)}`;v.style.color=delta<=0?'#59f3b1':'#ff7188';}else this._replayDelta.style.opacity='0';}
  }

  _setReplayUiVisible(visible){if(this._replayDom)this._replayDom.style.display=visible?'':'none';}
  _restartReplay(){super._restartReplay();if(this._replayIntro)this._replayIntro.style.opacity='1';this._replaySectors?.forEach(r=>{r.style.opacity='.45';r.querySelector('[data-t]').textContent='--.--';r.querySelector('[data-d]').textContent='--';});}
  _exitReplay(){super._exitReplay();this._destroyReplayDom();}
  update(time,delta){const result=super.update(time,delta);if(this._replayActive)this._updateReplayIdentity(Number(this._replayElapsed)||Math.max(0,performance.now()-Number(this._replayStartedAt||performance.now())));return result;}
}
