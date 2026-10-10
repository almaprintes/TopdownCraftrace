// Presentation only: storeEconomy awards and persists the coins BEFORE this effect.
// A missing animation, an interrupted WebView or a muted device cannot lose currency.
const COIN_SRC=(import.meta.env?.BASE_URL||'/')+'assets/ui/moneda-tdr.webp';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let fallbackAudio=null;

export function rewardAmountLabel(amount,english=false){
  return '+'+Math.max(0,Math.floor(Number(amount)||0)).toLocaleString(english?'en-US':'es-ES')+
    (english?' COINS':' MONEDAS');
}
export function stageToClient(scene,x,y){
  const rect=scene?.game?.canvas?.getBoundingClientRect?.();
  const w=Number(scene?.scale?.width)||1,h=Number(scene?.scale?.height)||1;
  return rect?.width>0&&rect?.height>0
    ?{x:rect.left+x/w*rect.width,y:rect.top+y/h*rect.height}:null;
}
export function rewardFlightFrames(from,to,index,count){
  const dx=to.x-from.x,dy=to.y-from.y,spread=index-(count-1)/2;
  const lift=clamp(Math.abs(dy)*.2+26,24,80);
  return [
    {offset:0,opacity:0,transform:'translate(0px,0px) scale(.45)'},
    {offset:.18,opacity:1,transform:'translate('+(spread*6).toFixed(1)+'px,'+(-16-Math.abs(spread)*3).toFixed(1)+'px) scale(1.08)'},
    {offset:.57,opacity:1,transform:'translate('+(dx*.52+spread*7).toFixed(1)+'px,'+(dy*.52-lift).toFixed(1)+'px) scale(1)'},
    {offset:1,opacity:0,transform:'translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) scale(.34)'}
  ];
}
function fxVolume(){
  try{
    const a=JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.audio||{};
    return a.mute?0:clamp(Number(a.master??1),0,1)*clamp(Number(a.effects??.45),0,1);
  }catch{return .45;}
}
function contextFor(scene,canCreate=false){
  const game=scene?.sound?.context;
  if(game?.state&&game.state!=='closed')return game;
  if(!canCreate||typeof window==='undefined')return fallbackAudio;
  if(!fallbackAudio||fallbackAudio.state==='closed'){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC)try{fallbackAudio=new AC();}catch{}
  }
  return fallbackAudio;
}
// Invoke synchronously from the original tap before starting the rewarded ad.
export function primeCoinRewardSound(scene){
  if(!fxVolume())return;
  const ctx=contextFor(scene,true);
  if(ctx?.state==='suspended')try{ctx.resume()?.catch?.(()=>{});}catch{}
}
export function playCoinRewardSound(scene){
  const vol=fxVolume();
  if(!vol||(typeof document!=='undefined'&&document.hidden))return;
  const ctx=contextFor(scene);
  if(!ctx||ctx.state==='closed')return;
  if(ctx.state==='suspended')try{ctx.resume()?.catch?.(()=>{});}catch{}
  if(ctx.state!=='running')return; // Browser blocked sound? Currency is unaffected.
  try{
    const now=ctx.currentTime;
    [880,1175,1568].forEach((frequency,i)=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain(),start=now+i*.075;
      osc.type='sine';
      osc.frequency.setValueAtTime(frequency,start);
      osc.frequency.exponentialRampToValueAtTime(frequency*1.18,start+.09);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.085*vol,start+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.18);
      osc.connect(gain);gain.connect(ctx.destination);
      osc.onended=()=>{try{osc.disconnect();gain.disconnect();}catch{}};
      osc.start(start);osc.stop(start+.2);
    });
  }catch{}
}
function fromCard(scene,card,width,height){
  try{
    const p=card?.getWorldTransformMatrix?.()?.transformPoint?.(width*.5,height*.39);
    if(Number.isFinite(p?.x)&&Number.isFinite(p?.y)){
      const pos=stageToClient(scene,p.x,p.y);
      if(pos)return pos;
    }
  }catch{}
  const r=scene?.game?.canvas?.getBoundingClientRect?.();
  return {x:r?r.left+r.width*.5:window.innerWidth*.5,y:r?r.top+r.height*.5:window.innerHeight*.5};
}
function walletTarget(scene){
  // The lobby wallet is hidden while the store is open: aim for the actual
  // visible store-header coin (store modal draws it at stage X = width-176).
  if(scene?._storeModal?.scene){
    const p=stageToClient(scene,(Number(scene?.scale?.width)||0)-176,29);
    if(p)return p;
  }
  const coin=document.querySelector('.tdr-lobby-wallet > img');
  if(coin){
    const r=coin.getBoundingClientRect();
    if(r.width&&r.height)return {x:r.left+r.width*.5,y:r.top+r.height*.5};
  }
  return {x:window.innerWidth-75,y:35};
}
export async function playCoinRewardFlight(scene,{amount,card,width=200,height=210,english=false}={}){
  if(typeof document==='undefined'||typeof window==='undefined'||!document.body)return false;
  if(document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||
    !scene?.scene?.isActive?.()||!scene?._storeModal?.scene){
    playCoinRewardSound(scene);return false;
  }
  const from=fromCard(scene,card,width,height),to=walletTarget(scene);
  if(![from.x,from.y,to.x,to.y].every(Number.isFinite))return false;
  const layer=document.createElement('div');
  layer.id='tdr-coin-reward-flight';
  layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'fixed',inset:'0',zIndex:'2147481000',
    pointerEvents:'none',overflow:'hidden'});
  const label=document.createElement('div');
  label.textContent=rewardAmountLabel(amount,english);
  Object.assign(label.style,{position:'fixed',left:from.x+'px',top:(from.y-30)+'px',
    transform:'translate(-50%,-50%)',font:'900 22px system-ui,-apple-system,sans-serif',
    color:'#ffdb6a',whiteSpace:'nowrap',textShadow:'0 2px 3px #000,0 0 15px #ffc240',
    willChange:'transform,opacity'});
  layer.appendChild(label);document.body.appendChild(layer);
  if(typeof label.animate!=='function'){
    layer.remove();playCoinRewardSound(scene);return false;
  }
  const animations=[];
  try{
    animations.push(label.animate([
      {opacity:0,transform:'translate(-50%,-50%) scale(.4)',offset:0},
      {opacity:1,transform:'translate(-50%,-50%) scale(1.14)',offset:.25},
      {opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.63},
      {opacity:0,transform:'translate(-50%,-75%) scale(.7)',offset:1}
    ],{duration:580,fill:'forwards',easing:'ease-out'}));
    const count=amount>=250?10:7,size=clamp(window.innerHeight*.075,22,33);
    for(let i=0;i<count;i++){
      const img=document.createElement('img');
      img.src=COIN_SRC;img.alt='';img.setAttribute('aria-hidden','true');
      Object.assign(img.style,{position:'fixed',left:(from.x-size/2)+'px',top:(from.y-size/2)+'px',
        width:size+'px',height:size+'px',objectFit:'contain',pointerEvents:'none',
        willChange:'transform,opacity',filter:'drop-shadow(0 2px 4px #0008)'});
      layer.appendChild(img);
      animations.push(img.animate(rewardFlightFrames(from,to,i,count),{
        duration:760,delay:140+i*40,fill:'forwards',easing:'cubic-bezier(.17,.6,.27,1)'
      }));
    }
    let timer;
    await Promise.race([
      Promise.allSettled(animations.map(a=>a.finished)),
      new Promise(resolve=>{timer=setTimeout(resolve,1700);})
    ]);
    clearTimeout(timer);
    playCoinRewardSound(scene);
    return true;
  }catch{
    playCoinRewardSound(scene);
    return false;
  }finally{
    for(const animation of animations)try{animation.cancel();}catch{}
    layer.remove();
  }
}

const centerOf=node=>{
  if(!node?.isConnected)return null;
  const r=node.getBoundingClientRect?.();
  if(!r||r.width<=0||r.height<=0)return null;
  return {x:r.left+r.width/2,y:r.top+r.height/2};
};

// The shipping store is DOM (StoreDomUi), not the legacy Phaser store modal.
// This animation NEVER grants currency and is always disposable.
export async function playDomCoinRewardFlight(scene,{amount,root,card,english=false,closeEvent='tdr:store-closed'}={}){
  if(typeof document==='undefined'||typeof window==='undefined'||!root?.isConnected||document.hidden||
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return false;
  const from=centerOf(card?.querySelector?.('.tdr-store-reward-art')||card);
  const to=centerOf(root.querySelector('.tdr-app-wallet-icon'));
  if(!from||!to)return false;
  const layer=document.createElement('div');
  layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'fixed',inset:'0',zIndex:'70',
    overflow:'hidden',pointerEvents:'none'});
  const label=document.createElement('div');
  label.textContent=rewardAmountLabel(amount,english);
  Object.assign(label.style,{position:'fixed',left:from.x+'px',top:(from.y-30)+'px',
    color:'#ffdb6a',font:'900 20px system-ui,-apple-system,sans-serif',
    textShadow:'0 2px 4px #000,0 0 12px #ffc240',whiteSpace:'nowrap',
    willChange:'transform,opacity'});
  layer.appendChild(label);
  if(typeof label.animate!=='function')return false;
  const anim=[];
  let timer=null,interrupt;
  const aborted=new Promise(resolve=>{interrupt=resolve;});
  const onClose=()=>interrupt();
  const onHidden=()=>{if(document.hidden)interrupt();};
  root.addEventListener(closeEvent,onClose,{once:true});
  window.addEventListener('pagehide',onClose,{once:true});
  document.addEventListener('visibilitychange',onHidden);
  // Compose ABOVE the actual store shell, within the same stacking context.
  root.appendChild(layer);
  try{
    anim.push(label.animate([
      {opacity:0,transform:'translate(-50%,-50%) scale(.5)'},
      {opacity:1,transform:'translate(-50%,-80%) scale(1.08)',offset:.4},
      {opacity:0,transform:'translate(-50%,-105%) scale(.8)'}
    ],{duration:650,easing:'ease-out',fill:'forwards'}));
    const count=Number(amount)>=250?10:7,size=clamp(window.innerHeight*.075,22,33);
    for(let i=0;i<count;i++){
      const coin=document.createElement('img');
      coin.src=COIN_SRC;coin.alt='';
      Object.assign(coin.style,{position:'fixed',left:(from.x-size/2)+'px',top:(from.y-size/2)+'px',
        width:size+'px',height:size+'px',objectFit:'contain',
        filter:'drop-shadow(0 2px 4px #0008)',willChange:'transform,opacity'});
      layer.appendChild(coin);
      anim.push(coin.animate(rewardFlightFrames(from,to,i,count),{
        duration:760,delay:140+i*40,fill:'forwards',easing:'cubic-bezier(.17,.6,.27,1)'
      }));
    }
    await Promise.race([
      Promise.allSettled(anim.map(a=>a.finished)),
      aborted,
      new Promise(resolve=>{timer=setTimeout(resolve,1700);})
    ]);
    if(root.isConnected&&!document.hidden){
      playCoinRewardSound(scene);
      return true;
    }
    return false;
  }finally{
    clearTimeout(timer);
    root.removeEventListener(closeEvent,onClose);
    window.removeEventListener('pagehide',onClose);
    document.removeEventListener('visibilitychange',onHidden);
    for(const a of anim)try{a.cancel();}catch{}
    layer.remove();
  }
}

// Animate the ACTUAL DOM wallet only after flight. All balances were saved
// before the animation; closing the store or suspending the app cannot undo them.
export async function animateDomCoinBalance(root,{from,to,english=false,closeEvent='tdr:store-closed'}={}){
  if(typeof document==='undefined'||typeof window==='undefined'||!root?.isConnected)return false;
  const number=root.querySelector('[data-store-balance]'),coin=root.querySelector('.tdr-store-coin');
  if(!number)return false;
  const fmt=n=>Math.floor(Math.max(0,n)).toLocaleString(english?'en-US':'es-ES');
  const first=Math.max(0,Number(from)||0),last=Math.max(0,Number(to)||0);
  if(document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||last<=first){
    number.textContent=fmt(last);return false;
  }
  number.textContent=fmt(first);
  const pulses=[];
  for(const node of [coin,number]){
    if(typeof node?.animate==='function')pulses.push(node.animate([
      {transform:'scale(1)',filter:'brightness(1)'},
      {transform:'scale(1.16)',filter:'brightness(1.4)',offset:.4},
      {transform:'scale(1)',filter:'brightness(1)'}
    ],{duration:460,easing:'ease-out'}));
  }
  let raf=0,timer=0,resolveAbort;
  const aborted=new Promise(resolve=>{resolveAbort=resolve;});
  const onClose=()=>resolveAbort(false);
  const onHidden=()=>{if(document.hidden)resolveAbort(false);};
  root.addEventListener(closeEvent,onClose,{once:true});
  window.addEventListener('pagehide',onClose,{once:true});
  document.addEventListener('visibilitychange',onHidden);
  const started=performance.now();
  const countUp=new Promise(resolve=>{
    const tick=now=>{
      if(!root.isConnected||document.hidden){resolve(false);return;}
      const t=clamp((now-started)/480,0,1);
      const eased=1-Math.pow(1-t,3);
      number.textContent=fmt(first+(last-first)*eased);
      if(t>=1)resolve(true);
      else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  });
  try{
    return await Promise.race([countUp,aborted,new Promise(resolve=>{timer=setTimeout(()=>resolve(false),850);})]);
  }finally{
    cancelAnimationFrame(raf);clearTimeout(timer);
    root.removeEventListener(closeEvent,onClose);
    window.removeEventListener('pagehide',onClose);
    document.removeEventListener('visibilitychange',onHidden);
    for(const a of pulses)try{a.cancel();}catch{}
    if(root.isConnected)number.textContent=fmt(last);
  }
}
