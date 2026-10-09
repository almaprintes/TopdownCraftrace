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
