import { RaceScene as GhostRaceScene } from './RaceGhostModeScene.js';

function textAdapter(el){
  return {
    scene: true,
    setText(value){ if(el) el.textContent=String(value); return this; },
    setVisible(value){ if(el) el.style.display=value?'':'none'; return this; }
  };
}

export class RaceScene extends GhostRaceScene {
  create(data){
    const result=super.create(data);
    this.events.once('shutdown',()=>this._destroyReplayDom());
    return result;
  }

  _destroyReplayDom(){
    try{this._replayDom?.remove?.();}catch{}
    this._replayDom=null;
    this._replayUi=null;
    this._replayTimeText=null;
    this._replayPlayText=null;
    this._replayCamText=null;
    this._replayExportBtn=null;
  }

  _createReplayUi(){
    if(this._replayDom?.isConnected)return;

    const root=document.createElement('div');
    root.id='tdr-replay-controls';
    Object.assign(root.style,{
      position:'fixed',inset:'0',zIndex:'2147483000',pointerEvents:'none',
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial,sans-serif',color:'#fff'
    });

    const top=document.createElement('div');
    Object.assign(top.style,{position:'absolute',left:'12px',right:'12px',top:'10px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'});

    const title=document.createElement('div');
    title.textContent=`REPETICIÓN · ${this._ghostData?.lapMs?this._fmtReplayMs(this._ghostData.lapMs):''}`;
    Object.assign(title.style,{background:'rgba(2,9,15,.68)',border:'1px solid rgba(100,232,255,.25)',borderRadius:'8px',padding:'7px 10px',fontSize:'13px',fontWeight:'800',letterSpacing:'.03em'});

    const timer=document.createElement('div');
    timer.textContent='0:00.00';
    Object.assign(timer.style,{background:'rgba(2,9,15,.68)',border:'1px solid rgba(100,232,255,.25)',borderRadius:'8px',padding:'7px 10px',fontSize:'13px',fontWeight:'800',color:'#8ff2ff',fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace'});
    top.append(title,timer);

    const bar=document.createElement('div');
    Object.assign(bar.style,{position:'absolute',left:'10px',right:'10px',bottom:'calc(10px + env(safe-area-inset-bottom, 0px))',display:'flex',justifyContent:'center',alignItems:'center',gap:'8px',flexWrap:'nowrap',pointerEvents:'auto'});

    const makeBtn=(label,fn,wide=false)=>{
      const b=document.createElement('button');
      b.type='button';b.textContent=label;
      Object.assign(b.style,{appearance:'none',WebkitAppearance:'none',border:'1px solid rgba(100,232,255,.62)',background:'rgba(7,19,29,.94)',color:'#e9fbff',borderRadius:'9px',height:'38px',padding:wide?'0 16px':'0 13px',fontSize:'11px',fontWeight:'800',whiteSpace:'nowrap',touchAction:'manipulation',WebkitTapHighlightColor:'transparent'});
      const fire=(ev)=>{ev.preventDefault();ev.stopPropagation();fn?.();};
      b.addEventListener('pointerup',fire,{passive:false});
      b.addEventListener('touchend',fire,{passive:false});
      b.addEventListener('click',fire,{passive:false});
      return b;
    };

    const back=makeBtn('← VOLVER',()=>this._exitReplay());
    const restart=makeBtn('↺ INICIO',()=>this._restartReplay());
    const play=makeBtn('⏸ PAUSA',()=>this._toggleReplayPause());
    const cam=makeBtn('🎥 SEGUIMIENTO',()=>this._setReplayCamera(this._replayCameraMode==='follow'?'wide':'follow'),true);
    const exp=makeBtn('⬆ EXPORTAR VÍDEO',()=>this._startReplayExport(),true);
    bar.append(back,restart,play,cam,exp);

    root.append(top,bar);
    document.body.appendChild(root);

    this._replayDom=root;
    // Keep the parent replay code happy: it expects a Phaser-like object with .scene.
    this._replayUi={scene:true,setVisible:(v)=>{root.style.display=v?'':'none';return this._replayUi;},destroy:()=>this._destroyReplayDom()};
    this._replayTimeText=textAdapter(timer);
    this._replayPlayText=textAdapter(play);
    this._replayCamText=textAdapter(cam);
    this._replayExportBtn={scene:true,setVisible:(v)=>{exp.style.display=v?'':'none';return this._replayExportBtn;}};
  }

  _fmtReplayMs(ms){
    const t=Math.max(0,Number(ms)||0);
    const m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);
    return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  _setReplayUiVisible(visible){
    if(this._replayDom)this._replayDom.style.display=visible?'':'none';
  }

  _exitReplay(){
    super._exitReplay();
    this._destroyReplayDom();
  }
}
