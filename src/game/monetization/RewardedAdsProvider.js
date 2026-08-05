// DEV provider. Cambiar VIDEO_SRC por el anuncio local de CRAF TERRA cuando esté disponible.
// Más adelante este módulo será el único punto a sustituir por AdMob/otra red.
const VIDEO_SRC='assets/intro/intro.mp4';

export function showRewardedAd(scene,{title='RECOMPENSA PATROCINADA'}={}){
  return new Promise((resolve)=>{
    const wasPaused=scene.scene.isPaused?.();
    scene.scene.pause();
    const root=document.createElement('div');
    Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'99999',background:'rgba(4,8,15,.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,-apple-system,sans-serif',color:'#fff',padding:'20px'});
    const lab=document.createElement('div'); lab.textContent=title; Object.assign(lab.style,{fontWeight:'900',letterSpacing:'1.5px',fontSize:'13px',marginBottom:'12px',color:'#67e8f9'});
    const video=document.createElement('video'); video.src=VIDEO_SRC; video.muted=false; video.playsInline=true; video.controls=false; video.autoplay=true;
    Object.assign(video.style,{width:'min(92vw,520px)',maxHeight:'70vh',objectFit:'contain',borderRadius:'18px',background:'#000',boxShadow:'0 20px 80px rgba(0,0,0,.55)'});
    const hint=document.createElement('div'); hint.textContent='Vídeo de prueba · la recompensa se entrega al terminar'; Object.assign(hint.style,{opacity:'.7',fontSize:'12px',marginTop:'10px'});
    root.append(lab,video,hint); document.body.appendChild(root);
    let done=false;
    const finish=(ok)=>{ if(done)return; done=true; try{video.pause();}catch{} root.remove(); if(!wasPaused) scene.scene.resume(); resolve(ok); };
    video.onended=()=>finish(true);
    video.onerror=()=>{ setTimeout(()=>finish(true),1800); };
    const p=video.play(); if(p?.catch) p.catch(()=>{ video.muted=true; video.play().catch(()=>setTimeout(()=>finish(true),1800)); });
  });
}
