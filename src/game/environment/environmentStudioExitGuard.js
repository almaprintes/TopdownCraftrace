// Dedicated browser/iPhone exit protection for Environment Studio.
// The editor's saved project, any unfinished pen and freehand areas are
// kept together in a separate recovery snapshot. Never overwrite the
// user's confirmed GUARDAR project with an incomplete drawing.
export function installEnvironmentStudioExitGuard(scene) {
  const marker='environment-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  let leaving=false,guarded=false;
  const backup=reason=>{
    try {
      const payload={
        version:1,
        trackId:scene._trackId,
        savedAt:Date.now(),
        reason,
        project:scene._project?.()||{},
        penDraft:scene._penDraft?JSON.parse(JSON.stringify(scene._penDraft)):null,
        zoneDraft:Array.isArray(scene._zoneDraft)?JSON.parse(JSON.stringify(scene._zoneDraft)):null,
        zoneStrokeStarts:Array.isArray(scene._zoneStrokeStarts)?[...scene._zoneStrokeStarts]:[]
      };
      localStorage.setItem(`tdr2:environment-exit-recovery:${scene._trackId}`,JSON.stringify(payload));
      return true;
    } catch(err) {
      console.warn('[Environment Studio] no se pudo guardar la copia de salida',err);
      return false;
    }
  };
  const hasChanges=()=>{
    try{return !!scene._hasUnsavedChanges?.()||
      !!scene._penDraft?.nodes?.length||
      !!scene._zoneDraft?.length;}catch{return true;}
  };
  const leave=()=>{
    if(leaving)return;
    leaving=true;
    // Unwind only the history entry installed by this editor.
    if(guarded&&window.history?.state?.tdrEnvironmentExit===marker){
      try{window.history.back();}catch{}
    }
    scene.scene.start('admin-hub');
  };
  const confirmExit=()=>{
    if(leaving)return false;
    const safe=backup('exit-request');
    const dirty=hasChanges();
    const message=dirty
      ?'¿Salir de Environment Studio?\n\nHay cambios o trazos sin guardar. Se ha intentado crear una copia de recuperación.\n\nCancelar = seguir editando.'
      :'¿Salir de Environment Studio?\n\nCancelar = seguir editando.';
    if(!safe&&dirty){
      scene._builderToast?.('NO SE PUDO CREAR UNA COPIA DE SEGURIDAD');
      return false;
    }
    if(window.confirm?.(message)!==true)return false;
    leave();return true;
  };
  scene._requestExitEnvironmentStudio=confirmExit;
  const onPopState=()=>{
    if(leaving||!guarded)return;
    if(!confirmExit()){
      try{window.history.pushState({tdrEnvironmentExit:marker},'',window.location.href);}
      catch(err){console.warn('[Environment Studio] Back guard unavailable',err);}
    }
  };
  const onBeforeUnload=event=>{
    if(leaving)return;
    backup('beforeunload');
    event.preventDefault();
    event.returnValue='';
  };
  const onPageHide=()=>{if(!leaving)backup('pagehide');};
  window.addEventListener('beforeunload',onBeforeUnload);
  window.addEventListener('pagehide',onPageHide);
  try{
    window.history.pushState({tdrEnvironmentExit:marker},'',window.location.href);
    window.addEventListener('popstate',onPopState);
    guarded=true;
  }catch(err){console.warn('[Environment Studio] no se pudo activar protección Atrás',err);}
  scene.events.once('shutdown',()=>{
    window.removeEventListener('beforeunload',onBeforeUnload);
    window.removeEventListener('pagehide',onPageHide);
    window.removeEventListener('popstate',onPopState);
    delete scene._requestExitEnvironmentStudio;
  });
  return {backup,hasChanges};
}
