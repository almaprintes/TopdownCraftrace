const FLASH_ID='veloce_flash';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function assetUrl(path){try{const base=String(import.meta.env?.BASE_URL||'/');return `${base.replace(/\/$/,'')}/${String(path).replace(/^\//,'')}`;}catch{return `/TopdownCraftrace/${String(path).replace(/^\//,'')}`;}}
function carId(scene){return scene?.baseSpec?.id||scene?.carParams?.id||scene?.carId||scene?._carId||null;}
function safePlay(a){try{const p=a.play();if(p?.catch)p.catch(()=>{});}catch{}}
function mkAudio(){const a=new Audio();a.preload='metadata';a.playsInline=true;a.setAttribute('playsinline','');a.setAttribute('webkit-playsinline','');return a;}
function installState(scene){
  if(carId(scene)!==FLASH_ID||typeof Audio==='undefined')return null;
  const engine=mkAudio(),fx=mkAudio();engine.loop=true;engine.volume=0;fx.loop=false;
  const base='assets/audio/cars/veloce_flash';
  const loops=Array.from({length:6},(_,i)=>assetUrl(`${base}/engine/loop_${i}.wav`));
  const shift=assetUrl(`${base}/transmission/freesound_community-shifting-car-42962.mp3`);
  const flutter=assetUrl(`${base}/turbo/spinopel-turbo-flutter-336362.mp3`);
  let unlocked=false,destroyed=false,currentBand=-1,lastGear=1,prevThrottle=false,lastFxAt=-9999;
  const setEngineBand=(band)=>{
    if(destroyed||band===currentBand)return;
    currentBand=band;
    try{engine.pause();engine.src=loops[band];engine.currentTime=0;engine.load();if(unlocked)safePlay(engine);}catch{}
  };
  const unlock=()=>{if(destroyed||unlocked)return;unlocked=true;if(currentBand<0)setEngineBand(0);else safePlay(engine);};
  const opts={capture:true,passive:true};
  window.addEventListener('pointerup',unlock,opts);window.addEventListener('touchend',unlock,opts);window.addEventListener('click',unlock,opts);window.addEventListener('keydown',unlock,opts);
  const playFx=(src,vol)=>{if(!unlocked||destroyed)return;try{fx.pause();fx.src=src;fx.volume=clamp(vol,0,1);fx.currentTime=0;fx.load();safePlay(fx);}catch{}};
  const update=(deltaMs)=>{
    if(destroyed||!unlocked||carId(scene)!==FLASH_ID)return;
    const body=scene.car?.body;if(!body?.velocity)return;
    const rot=Number(scene.car?.rotation||0),fxd=Math.cos(rot),fyd=Math.sin(rot);
    const fwd=body.velocity.x*fxd+body.velocity.y*fyd;
    const maxFwd=Math.max(1,Number(scene.maxFwd||scene.baseSpec?.maxFwd||581.1));
    const speed01=clamp(Math.max(0,fwd)/maxFwd,0,1);
    const t=scene.touch||{},k=scene.keys||{};
    const throttle=!!scene._raceStarted&&!!(t.throttle>0.5||k.up?.isDown||k.up2?.isDown);
    const cuts=[0,.16,.31,.47,.64,.82,1.01];let gear=1;for(let i=1;i<cuts.length-1;i++)if(speed01>=cuts[i])gear=i+1;
    const lo=cuts[gear-1],hi=cuts[gear]||1;const inGear=clamp((speed01-lo)/Math.max(.001,hi-lo),0,1);
    const rpm01=clamp(.18+inGear*.82,0,1);const band=clamp(Math.round(rpm01*5),0,5);setEngineBand(band);
    engine.volume=scene._raceStarted?(throttle?.68:.42):.10;try{engine.playbackRate=.88+rpm01*.22;}catch{}
    const now=Number(scene.time?.now||performance.now());
    if(gear!==lastGear){if(now-lastFxAt>220){playFx(shift,.42);lastFxAt=now;}lastGear=gear;}
    if(prevThrottle&&!throttle&&speed01>.22&&now-lastFxAt>450){playFx(flutter,.28);lastFxAt=now;}
    prevThrottle=throttle;
  };
  const destroy=()=>{if(destroyed)return;destroyed=true;const ro={capture:true};window.removeEventListener('pointerup',unlock,ro);window.removeEventListener('touchend',unlock,ro);window.removeEventListener('click',unlock,ro);window.removeEventListener('keydown',unlock,ro);for(const a of [engine,fx]){try{a.pause();a.removeAttribute('src');a.load();}catch{}}};
  scene.events?.once?.('shutdown',destroy);scene.events?.once?.('destroy',destroy);
  return{update,destroy};
}
export function installRaceEngineAudioSafe(RaceScene){
  const p=RaceScene?.prototype;if(!p||p.__tdrRaceEngineAudioSafeInstalled)return;p.__tdrRaceEngineAudioSafeInstalled=true;
  const create=p.create;p.create=function(...args){const out=create?.apply(this,args);this.__tdrSafeEngineAudio=installState(this);return out;};
  const update=p.update;p.update=function(time,deltaMs){const out=update?.call(this,time,deltaMs);try{this.__tdrSafeEngineAudio?.update?.(deltaMs);}catch{}return out;};
}
