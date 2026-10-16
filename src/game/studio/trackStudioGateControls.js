// Track Studio — always reachable SALIDA / META actions for touch devices.
// These are DOM controls anchored to the editor VIEWPORT, not the overflowing
// Phaser top bar. The actual gate tools and .tdrtrack format are unchanged.
export function installTrackStudioGateControls(scene){
  if(typeof document==='undefined')return null;
  const root=document.createElement('div');
  root.className='tdr-trackstudio-gate-actions';
  root.setAttribute('role','group');
  root.setAttribute('aria-label','Colocar salida y meta');
  root.style.cssText='position:fixed;z-index:24010;display:flex;align-items:center;gap:7px;box-sizing:border-box;padding:6px 8px;background:rgba(8,17,30,.94);border:1px solid rgba(115,167,205,.72);border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.4);pointer-events:auto;touch-action:manipulation;';
  const make=(type,label)=>{
    const btn=document.createElement('button');
    btn.type='button';btn.dataset.gate=type;
    btn.textContent=label;
    btn.style.cssText='flex:0 0 auto;min-width:83px;min-height:44px;box-sizing:border-box;padding:6px 8px;border:2px solid #48627c;border-radius:8px;background:#16283a;color:#fff;font:900 12px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
    btn.addEventListener('pointerdown',e=>e.stopPropagation());
    btn.addEventListener('pointerup',e=>e.stopPropagation());
    btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      scene._setTool(type);
      scene._flashMessage?.(type==='start'?'SALIDA · toca la carretera para colocar la línea verde':'META · toca la carretera para colocar la línea blanca');
      refresh();
    });
    root.appendChild(btn);
    return btn;
  };
  const start=make('start','SALIDA');
  const finish=make('finish','META');
  const status=document.createElement('span');
  status.className='tdr-trackstudio-gate-status';
  status.style.cssText='flex:1;min-width:0;color:#b4cce0;font:700 11px/1.25 system-ui,-apple-system,Segoe UI,sans-serif;overflow-wrap:anywhere;';
  root.appendChild(status);
  document.body.appendChild(root);
  function refresh(){
    const active=scene._tool;
    for(const [btn,type,color] of [[start,'start','#46efad'],[finish,'finish','#d8e9ff']]){
      const chosen=active===type;
      btn.setAttribute('aria-pressed',String(chosen));
      btn.style.borderColor=chosen?color:'#48627c';
      btn.style.background=chosen?(type==='start'?'#12523c':'#315273'):'#16283a';
    }
    if(active==='start')status.textContent='Toca la pista para situar SALIDA';
    else if(active==='finish')status.textContent='Toca la pista para situar META';
    else status.textContent='Salida '+(scene._startLine?'✓':'—')+'  ·  Meta '+(scene._finishLine?'✓':'—');
  }
  function position(){
    const rect=scene.game?.canvas?.getBoundingClientRect?.();
    if(!rect||rect.width<=0||rect.height<=0)return;
    const sx=rect.width/Math.max(1,scene.scale?.width||1);
    const sy=rect.height/Math.max(1,scene.scale?.height||1);
    const x=scene._viewX+12;
    const y=scene._viewY+scene._viewH-78;
    root.style.left=(rect.left+x*sx)+'px';
    root.style.top=(rect.top+y*sy)+'px';
    root.style.width=(Math.min(Math.max(250,scene._viewW-24),470)*sx)+'px';
    root.style.minHeight=Math.max(44,57*sy)+'px';
    const size=Math.max(10,Math.round(12*Math.min(sx,sy)));
    start.style.fontSize=finish.style.fontSize=size+'px';
  }
  const wrap=(key,after)=>{
    const before=scene[key];
    if(typeof before!=='function')return;
    scene[key]=function(...args){
      const result=before.apply(this,args);
      after?.();
      refresh();
      return result;
    };
  };
  wrap('_setTool');
  wrap('_placeStartLineAt',()=>{if(scene._startLine)scene._autosaveRecovery?.();});
  wrap('_placeFinishLineAt',()=>{if(scene._finishLine)scene._autosaveRecovery?.();});
  wrap('_applyProjectData');
  wrap('_newProject');
  wrap('_toggleClosed');
  window.addEventListener('resize',position);
  window.addEventListener('orientationchange',position);
  scene.events.once('shutdown',()=>{
    window.removeEventListener('resize',position);
    window.removeEventListener('orientationchange',position);
    root.remove();
  });
  refresh();position();
  return {root,start,finish,status,refresh,position};
}
