export function hideRaceUi(scene){
  const state={raceHud:null,dom:[],phaser:[],uiCameraVisible:null,_restored:false};
  try{
    const hud=scene?._raceHudDom||document.querySelector('.tdr-race-hud');
    if(hud?.isConnected){
      state.raceHud={el:hud,display:hud.style.display,priority:hud.style.getPropertyPriority('display')};
      hud.style.setProperty('display','none','important');
    }
  }catch{}

  try{
    const cam=scene?.uiCam;
    if(cam){
      state.uiCameraVisible=cam.visible!==false;
      cam.setVisible?.(false);
      cam.visible=false;
    }
  }catch{}

  const seen=new Set();
  const hidePhaser=obj=>{
    if(!obj?.scene||obj.visible===false||seen.has(obj))return;
    seen.add(obj);state.phaser.push(obj);
    try{obj.setVisible?.(false);}catch{}
  };
  hidePhaser(scene?.raceInfoHud);
  try{for(const obj of scene?._fixedUiRoots||[])hidePhaser(obj);}catch{}
  try{for(const obj of scene?.children?.list||[])if(Number(obj?.depth||0)>=1000)hidePhaser(obj);}catch{}

  try{
    for(const el of document.querySelectorAll('[data-tdr-race-ui="1"]')){
      if(!el?.style)continue;
      state.dom.push({el,display:el.style.display,priority:el.style.getPropertyPriority('display')});
      el.style.setProperty('display','none','important');
    }
  }catch{}

  // A result/retry transition can shut the race scene down before the caller
  // explicitly restores the hidden controls. Make scene shutdown authoritative:
  // any DOM/Phaser controls hidden by this helper must be restored before the
  // next race instance starts, otherwise pedals/steering stay display:none while
  // independently-created controls such as the handbrake come back normally.
  const restoreOnExit=()=>restoreRaceUi(scene,state);
  try{scene?.events?.once?.('shutdown',restoreOnExit);}catch{}
  try{scene?.events?.once?.('destroy',restoreOnExit);}catch{}
  return state;
}

export function restoreRaceUi(scene,state){
  if(!state||state._restored)return;
  state._restored=true;
  try{
    const saved=state.raceHud;
    if(saved?.el?.style){
      saved.el.style.removeProperty('display');
      if(saved.display)saved.el.style.setProperty('display',saved.display,saved.priority||'');
    }
  }catch{}
  try{
    if(scene?.uiCam&&state.uiCameraVisible!==null){
      scene.uiCam.setVisible?.(state.uiCameraVisible);
      scene.uiCam.visible=state.uiCameraVisible;
    }
  }catch{}
  try{for(const obj of state.phaser||[])if(obj?.scene)obj.setVisible?.(true);}catch{}
  try{
    for(const saved of state.dom||[]){
      const el=saved?.el;if(!el?.style)continue;
      el.style.removeProperty('display');
      if(saved.display)el.style.setProperty('display',saved.display,saved.priority||'');
    }
  }catch{}
}
