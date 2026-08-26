import { getLanguage } from '../i18n/index.js';

const BASE=import.meta.env.BASE_URL||'/';
const MATERIAL_ART={scrap:'chatarra.webp',alloy:'aleacion.webp',rubber:'goma.webp',compound:'compuesto.webp',disc:'disco_metalico.webp',spring:'muelle.webp',gear:'engranaje.webp',ecu:'electronica.webp'};
const MATERIAL_NAMES={scrap:{es:'Chatarra',en:'Scrap'},alloy:{es:'Aleación',en:'Alloy'},rubber:{es:'Goma',en:'Rubber'},compound:{es:'Compuesto',en:'Compound'},disc:{es:'Disco metálico',en:'Metal Disc'},spring:{es:'Muelle',en:'Spring'},gear:{es:'Engranaje',en:'Gear'},ecu:{es:'Electrónica',en:'Electronics'}};

function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function rewardInfo(event){
  const reward=event?.reward||{};const lang=getLanguage()==='en'?'en':'es';
  if(reward?.car?.id){const car=reward.car;return{kind:'car',name:car.name?.[lang]||car.name?.es||car.id,qty:'',image:`${BASE}${String(car.image||'').replace(/^\//,'')}`};}
  const coins=Math.max(0,Number(reward.coins)||0);if(coins)return{kind:'coin',name:lang==='en'?'COINS':'MONEDAS',qty:String(coins),image:`${BASE}assets/store/coins_2500.webp`};
  const entry=Object.entries(reward.items||{}).find(([,n])=>Number(n)>0);if(entry){const[id,n]=entry;return{kind:'item',name:MATERIAL_NAMES[id]?.[lang]||id,qty:`×${Number(n)}`,image:`${BASE}assets/crafting/materials/${MATERIAL_ART[id]||''}`};}
  return{kind:'item',name:lang==='en'?'REWARD':'PREMIO',qty:'',image:''};
}

function ensureStyle(){
  if(document.getElementById('tdr-season-celebration-style'))return;
  const s=document.createElement('style');s.id='tdr-season-celebration-style';s.textContent=`
.tdr-season-celebration{position:fixed;left:var(--tdr-vv-left,0px);top:var(--tdr-vv-top,0px);width:var(--tdr-vv-width,100vw);height:var(--tdr-vv-height,100dvh);z-index:60000;display:grid;place-items:center;background:radial-gradient(circle at 50% 46%,rgba(53,207,255,.22),rgba(4,12,22,.88) 48%,rgba(1,5,10,.98) 100%);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;isolation:isolate;color:#fff}
.tdr-season-celebration.car{background:radial-gradient(circle at 50% 46%,rgba(240,198,90,.24),rgba(4,12,22,.88) 48%,rgba(1,5,10,.98) 100%)}
.tdr-season-celebration *{box-sizing:border-box}.tdr-season-celebration .burst{position:absolute;left:50%;top:48%;width:min(88vmin,760px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(53,207,255,.22) 0 4deg,transparent 4deg 12deg);animation:tdrBurst 8s linear infinite;opacity:.9}.tdr-season-celebration.car .burst{background:repeating-conic-gradient(from 0deg,rgba(240,198,90,.24) 0 4deg,transparent 4deg 12deg)}
.tdr-season-celebration .ring{position:absolute;left:50%;top:48%;width:120px;height:120px;border:4px solid rgba(98,255,178,.85);border-radius:50%;transform:translate(-50%,-50%);animation:tdrRing .9s ease-out forwards}.tdr-season-celebration.car .ring{border-color:rgba(240,198,90,.92)}
.tdr-season-celebration .stage{position:relative;z-index:3;width:100%;height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;align-items:center;justify-items:center;padding:clamp(14px,3vh,28px) clamp(18px,4vw,44px) clamp(16px,3.5vh,30px);text-align:center}
.tdr-season-celebration .top{align-self:start}.tdr-season-celebration .kicker{font-size:clamp(10px,1.5vw,15px);font-weight:1000;letter-spacing:.22em;color:#62ffb2;text-shadow:0 3px 12px #000}.tdr-season-celebration.car .kicker{color:#f0c65a}.tdr-season-celebration .title{margin-top:6px;font-size:clamp(24px,4.4vw,52px);font-weight:1000;line-height:.94;text-shadow:0 5px 22px #000}
.tdr-season-celebration .hero{align-self:center;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:0;max-height:100%;width:100%}.tdr-season-celebration .art-wrap{position:relative;width:min(56vw,420px);height:min(50vh,300px);display:grid;place-items:center}.tdr-season-celebration.car .art-wrap{width:min(76vw,760px);height:min(58vh,390px)}.tdr-season-celebration .art-wrap:before{content:'';position:absolute;inset:8%;border-radius:50%;background:radial-gradient(circle,rgba(98,255,178,.23),transparent 66%);filter:blur(12px)}.tdr-season-celebration.car .art-wrap:before{background:radial-gradient(circle,rgba(240,198,90,.34),transparent 68%)}.tdr-season-celebration .art{position:relative;z-index:2;max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 20px 18px rgba(0,0,0,.62));animation:tdrHeroIn .7s .08s cubic-bezier(.18,.9,.28,1.28) both}.tdr-season-celebration .qty{margin-top:-6px;font-size:clamp(34px,6vw,68px);font-weight:1000;line-height:.9;color:#ffe06a;text-shadow:0 5px 18px #000}.tdr-season-celebration .name{margin-top:6px;font-size:clamp(16px,2.4vw,28px);font-weight:1000;letter-spacing:.05em}.tdr-season-celebration .saved{margin-top:6px;font-size:clamp(8px,1.1vw,11px);font-weight:800;letter-spacing:.1em;color:#9ab0bf}
.tdr-season-celebration .bottom{align-self:end}.tdr-season-celebration .continue{min-width:min(62vw,360px);height:clamp(38px,7vh,54px);padding:0 30px;border:2px solid #7affc4;border-radius:7px;background:linear-gradient(180deg,#239268,#15563f);color:#fff;font:1000 clamp(10px,1.4vw,14px) system-ui,-apple-system,sans-serif;letter-spacing:.12em;box-shadow:0 10px 28px rgba(0,0,0,.4),0 0 24px rgba(98,255,178,.12);cursor:pointer}.tdr-season-celebration.car .continue{border-color:#f2ce6c;background:linear-gradient(180deg,#80601e,#50390d)}
.tdr-season-celebration .confetti{position:absolute;z-index:2;width:9px;height:18px;left:50%;top:48%;border-radius:2px;pointer-events:none;animation:tdrConfetti var(--dur) cubic-bezier(.13,.65,.24,1) forwards;animation-delay:var(--delay);background:var(--c);transform:translate(-50%,-50%) rotate(var(--rot))}.tdr-season-celebration .spark{position:absolute;z-index:1;width:5px;height:5px;border-radius:50%;left:50%;top:48%;background:#fff8b5;box-shadow:0 0 12px #fff2a2;animation:tdrSpark var(--dur) ease-out forwards;animation-delay:var(--delay)}
@keyframes tdrHeroIn{from{opacity:0;transform:scale(.38) rotate(-5deg)}65%{opacity:1;transform:scale(1.14) rotate(1deg)}to{opacity:1;transform:scale(1)}}@keyframes tdrRing{from{opacity:1;transform:translate(-50%,-50%) scale(.4)}to{opacity:0;transform:translate(-50%,-50%) scale(6)}}@keyframes tdrBurst{to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes tdrConfetti{0%{opacity:0;transform:translate(-50%,-50%) scale(.4) rotate(var(--rot))}8%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(calc(var(--rot) + 520deg))}}@keyframes tdrSpark{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}18%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) scale(1.2)}}
@media(max-height:520px){.tdr-season-celebration .stage{padding:10px 22px 10px}.tdr-season-celebration .title{font-size:clamp(22px,4vw,38px)}.tdr-season-celebration .art-wrap{height:min(44vh,220px);width:min(48vw,320px)}.tdr-season-celebration.car .art-wrap{height:min(50vh,270px);width:min(68vw,620px)}.tdr-season-celebration .qty{font-size:clamp(30px,5vw,50px)}.tdr-season-celebration .name{font-size:clamp(14px,2vw,22px)}.tdr-season-celebration .continue{height:38px}}
@media (prefers-reduced-motion:reduce){.tdr-season-celebration *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;
  document.head.appendChild(s);
}

function particle(root,cls,i,total){
  const p=document.createElement('i');p.className=cls;const a=(Math.PI*2*i/total)+(Math.random()-.5)*.24;const radius=(cls==='confetti'?300:230)*(0.72+Math.random()*.65);const x=Math.cos(a)*radius,y=Math.sin(a)*radius;const colors=['#62ffb2','#35cfff','#f0c65a','#ff5ccf','#ffffff','#ff784f'];p.style.setProperty('--x',`${x.toFixed(0)}px`);p.style.setProperty('--y',`${y.toFixed(0)}px`);p.style.setProperty('--dur',`${(cls==='confetti'?1.05:.75)+Math.random()*.75}s`);p.style.setProperty('--delay',`${Math.random()*.18}s`);p.style.setProperty('--rot',`${Math.round(Math.random()*260)}deg`);p.style.setProperty('--c',colors[i%colors.length]);root.appendChild(p);
}

export function showSeasonRewardCelebration(event){
  if(typeof document==='undefined'||!event)return;
  document.querySelector('.tdr-season-celebration')?.remove?.();ensureStyle();
  const lang=getLanguage()==='en'?'en':'es';const info=rewardInfo(event);const car=info.kind==='car';
  const root=document.createElement('div');root.className=`tdr-season-celebration ${car?'car':''}`;root.dataset.tdrRaceUi='1';
  root.innerHTML=`<div class="burst"></div><div class="ring"></div><section class="stage"><div class="top"><div class="kicker">${car?(lang==='en'?'NEW CAR UNLOCKED':'NUEVO COCHE DESBLOQUEADO'):(lang==='en'?'REWARD CLAIMED':'PREMIO CONSEGUIDO')}</div><div class="title">${esc(event.title||'')}</div></div><div class="hero"><div class="art-wrap">${info.image?`<img class="art" src="${esc(info.image)}" alt="">`:''}</div>${info.qty?`<div class="qty">${esc(info.qty)}</div>`:''}<div class="name">${esc(info.name)}</div><div class="saved">${lang==='en'?'ADDED TO YOUR ACCOUNT':'AÑADIDO A TU CUENTA'}</div></div><div class="bottom"><button class="continue" type="button">${lang==='en'?'CONTINUE':'CONTINUAR'}</button></div></section>`;
  for(let i=0;i<(car?78:52);i++)particle(root,'confetti',i,car?78:52);for(let i=0;i<(car?46:28);i++)particle(root,'spark',i,car?46:28);
  const close=()=>{root.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>root.remove());};
  root.querySelector('.continue')?.addEventListener('click',close);document.body.appendChild(root);
}

export function installSeasonRewardCelebrations(){
  if(typeof window==='undefined'||window.__tdrSeasonRewardCelebrationInstalled)return;
  window.__tdrSeasonRewardCelebrationInstalled=true;
  window.addEventListener('tdr:seasonRewardClaimed',ev=>showSeasonRewardCelebration(ev?.detail?.event));
}
