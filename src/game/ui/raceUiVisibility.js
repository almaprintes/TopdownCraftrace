export function hideRaceUi(scene){
  const state={raceHud:null,dom:[],phaser:[],uiCameraVisible:null};
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
  return state;
}

export function restoreRaceUi(scene,state){
  if(!state)return;
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
