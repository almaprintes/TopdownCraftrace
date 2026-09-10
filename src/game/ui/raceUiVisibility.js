export function hideRaceUi(scene){
  const state={raceHud:null,dom:[],phaser:[],uiCameraVisible:null};
  try{
    const hud=scene?._raceHudDom||document.querySelector('.tdr-race-hud');
    if(hud?.isConnected){
      state.raceHud={
        el:hud,
        display:hud.style.display,
        displayPriority:hud.style.getPropertyPriority('display'),
        visibility:hud.style.visibility,
        visibilityPriority:hud.style.getPropertyPriority('visibility'),
        opacity:hud.style.opacity,
        opacityPriority:hud.style.getPropertyPriority('opacity')
      };
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
    if(!obj?.scene||seen.has(obj))return;
    seen.add(obj);
    state.phaser.push({obj,visible:obj.visible!==false});
    try{obj.setVisible?.(false);}catch{}
  };
  hidePhaser(scene?.raceInfoHud);
  try{for(const obj of scene?._fixedUiRoots||[])hidePhaser(obj);}catch{}
  try{for(const obj of scene?.children?.list||[])if(Number(obj?.depth||0)>=1000)hidePhaser(obj);}catch{}

  try{
    for(const el of document.querySelectorAll('[data-tdr-race-ui="1"]')){
      if(!el?.style)continue;
      state.dom.push({
        el,
        display:el.style.display,
        displayPriority:el.style.getPropertyPriority('display'),
        visibility:el.style.visibility,
        visibilityPriority:el.style.getPropertyPriority('visibility'),
        opacity:el.style.opacity,
        opacityPriority:el.style.getPropertyPriority('opacity')
      });
      el.style.setProperty('display','none','important');
    }
  }catch{}
  return state;
}

function restoreStyle(saved){
  const el=saved?.el;
  if(!el?.style||!el.isConnected)return;
  try{
    el.style.removeProperty('display');
    el.style.removeProperty('visibility');
    el.style.removeProperty('opacity');
    if(saved.display)el.style.setProperty('display',saved.display,saved.displayPriority||'');
    if(saved.visibility)el.style.setProperty('visibility',saved.visibility,saved.visibilityPriority||'');
    if(saved.opacity)el.style.setProperty('opacity',saved.opacity,saved.opacityPriority||'');
  }catch{}
}

function restoreSnapshot(scene,state){
  if(!state)return;
  try{restoreStyle(state.raceHud);}catch{}

  try{
    if(scene?.uiCam&&state.uiCameraVisible!==null){
      scene.uiCam.setVisible?.(state.uiCameraVisible);
      scene.uiCam.visible=state.uiCameraVisible;
    }
  }catch{}

  try{
    for(const saved of state.phaser||[]){
      const obj=saved?.obj;
      if(!obj?.scene)continue;
      const visible=saved.visible!==false;
      obj.setVisible?.(visible);
      obj.visible=visible;
    }
  }catch{}

  try{for(const saved of state.dom||[])restoreStyle(saved);}catch{}

  // The top timing HUD is Phaser-owned and some iOS resume paths repaint one
  // frame after the pause DOM closes. Reassert the canonical live HUD roots so
  // they cannot remain hidden after that late frame.
  try{
    if(scene?.raceInfoHud?.scene){
      scene.raceInfoHud.setVisible?.(true);
      scene.raceInfoHud.visible=true;
    }
    for(const obj of scene?._fixedUiRoots||[]){
      if(!obj?.scene)continue;
      obj.setVisible?.(true);
      obj.visible=true;
    }
  }catch{}
}

export function restoreRaceUi(scene,state){
  if(!state)return;
  restoreSnapshot(scene,state);

  const retry=()=>{
    try{
      if(scene?.scene?.isActive?.()===false)return;
      restoreSnapshot(scene,state);
      scene?._updateSimpleRaceHud?.(100);
    }catch{}
  };
  try{requestAnimationFrame(()=>requestAnimationFrame(retry));}catch{}
  try{setTimeout(retry,90);}catch{}
}
