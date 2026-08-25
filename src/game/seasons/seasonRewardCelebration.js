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
.tdr-season-celebration{position:fixed;inset:0;z-index:60000;display:grid;place-items:center;background:radial-gradient(circle at 50% 42%,rgba(36,147,112,.26),rgba(2,6,12,.90) 56%,rgba(1,4,8,.97));font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;isolation:isolate}
.tdr-season-celebration *{box-sizing:border-box}.tdr-season-celebration .burst{position:absolute;left:50%;top:48%;width:min(74vw,620px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(98,255,178,.24) 0 3deg,transparent 3deg 11deg);filter:blur(.2px);animation:tdrBurst 8s linear infinite;opacity:.8}.tdr-season-celebration .ring{position:absolute;left:50%;top:48%;width:120px;height:120px;border:3px solid rgba(98,255,178,.8);border-radius:50%;transform:translate(-50%,-50%);animation:tdrRing .9s ease-out forwards}.tdr-season-celebration .card{position:relative;z-index:3;width:min(78vw,620px);min-height:min(74vh,440px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 28px 22px;text-align:center;background:linear-gradient(180deg,rgba(10,28,39,.97),rgba(5,13,21,.985));border:2px solid #62ffb2;clip-path:polygon(20px 0,calc(100% - 20px) 0,100% 20px,100% calc(100% - 20px),calc(100% - 20px) 100%,20px 100%,0 calc(100% - 20px),0 20px);box-shadow:0 28px 100px rgba(0,0,0,.62),0 0 50px rgba(57,255,154,.12);animation:tdrCardIn .52s cubic-bezier(.2,.9,.2,1.2) both}.tdr-season-celebration.car .card{width:min(84vw,760px);border-color:#f0c65a;box-shadow:0 28px 110px rgba(0,0,0,.65),0 0 70px rgba(240,198,90,.18)}
.tdr-season-celebration .kicker{font-size:clamp(10px,1.7vw,15px);font-weight:1000;letter-spacing:.20em;color:#62ffb2}.tdr-season-celebration.car .kicker{color:#f0c65a}.tdr-season-celebration .title{margin-top:7px;font-size:clamp(27px,5vw,48px);font-weight:1000;line-height:.96;color:#fff;text-shadow:0 5px 20px rgba(0,0,0,.65)}.tdr-season-celebration .art-wrap{position:relative;width:min(46vw,290px);height:min(34vh,210px);margin:12px 0 2px;display:grid;place-items:center}.tdr-season-celebration.car .art-wrap{width:min(62vw,470px);height:min(39vh,255px)}.tdr-season-celebration .art-wrap:before{content:'';position:absolute;inset:14% 7%;border-radius:50%;background:radial-gradient(circle,rgba(98,255,178,.22),transparent 68%);filter:blur(8px)}.tdr-season-celebration.car .art-wrap:before{background:radial-gradient(circle,rgba(240,198,90,.30),transparent 69%)}.tdr-season-celebration .art{position:relative;z-index:2;max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 18px 17px rgba(0,0,0,.58));animation:tdrHeroIn .7s .12s cubic-bezier(.18,.9,.28,1.28) both}.tdr-season-celebration .qty{margin-top:-4px;font-size:clamp(31px,6vw,58px);font-weight:1000;line-height:1;color:#ffe06a;text-shadow:0 4px 18px rgba(0,0,0,.66)}.tdr-season-celebration .name{margin-top:7px;font-size:clamp(15px,2.6vw,24px);font-weight:1000;letter-spacing:.05em;color:#fff}.tdr-season-celebration .saved{margin-top:9px;font-size:9px;font-weight:800;letter-spacing:.08em;color:#91a6b6}.tdr-season-celebration .continue{margin-top:15px;min-width:210px;height:42px;padding:0 22px;border:1px solid #7affc4;border-radius:5px;background:linear-gradient(180deg,#1d7658,#12523f);color:#fff;font:1000 11px system-ui,-apple-system,sans-serif;letter-spacing:.10em;box-shadow:0 8px 25px rgba(0,0,0,.35);cursor:pointer}.tdr-season-celebration.car .continue{border-color:#f2ce6c;background:linear-gradient(180deg,#725416,#4e390c)}
.tdr-season-celebration .confetti{position:absolute;z-index:2;width:9px;height:18px;left:50%;top:43%;border-radius:2px;pointer-events:none;animation:tdrConfetti var(--dur) cubic-bezier(.13,.65,.24,1) forwards;animation-delay:var(--delay);background:var(--c);transform:translate(-50%,-50%) rotate(var(--rot))}.tdr-season-celebration .spark{position:absolute;z-index:1;width:5px;height:5px;border-radius:50%;left:50%;top:48%;background:#fff8b5;box-shadow:0 0 12px #fff2a2;animation:tdrSpark var(--dur) ease-out forwards;animation-delay:var(--delay)}
@keyframes tdrCardIn{from{opacity:0;transform:scale(.72) translateY(22px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes tdrHeroIn{from{opacity:0;transform:scale(.48) rotate(-4deg)}65%{opacity:1;transform:scale(1.12) rotate(1deg)}to{opacity:1;transform:scale(1) rotate(0)}}@keyframes tdrRing{from{opacity:1;transform:translate(-50%,-50%) scale(.4)}to{opacity:0;transform:translate(-50%,-50%) scale(5.5)}}@keyframes tdrBurst{to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes tdrConfetti{0%{opacity:0;transform:translate(-50%,-50%) scale(.4) rotate(var(--rot))}8%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(calc(var(--rot) + 520deg))}}@keyframes tdrSpark{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}18%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) scale(1.2)}}
@media (prefers-reduced-motion:reduce){.tdr-season-celebration *{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;
  document.head.appendChild(s);
}

function particle(root,cls,i,total){
  const p=document.createElement('i');p.className=cls;const a=(Math.PI*2*i/total)+(Math.random()-.5)*.24;const radius=(cls==='confetti'?260:210)*(0.72+Math.random()*.65);const x=Math.cos(a)*radius,y=Math.sin(a)*radius;const colors=['#62ffb2','#35cfff','#f0c65a','#ff5ccf','#ffffff','#ff784f'];p.style.setProperty('--x',`${x.toFixed(0)}px`);p.style.setProperty('--y',`${y.toFixed(0)}px`);p.style.setProperty('--dur',`${(cls==='confetti'?1.05:.75)+Math.random()*.75}s`);p.style.setProperty('--delay',`${Math.random()*.18}s`);p.style.setProperty('--rot',`${Math.round(Math.random()*260)}deg`);p.style.setProperty('--c',colors[i%colors.length]);root.appendChild(p);
}

export function showSeasonRewardCelebration(event){
  if(typeof document==='undefined'||!event)return;
  document.querySelector('.tdr-season-celebration')?.remove?.();ensureStyle();
  const lang=getLanguage()==='en'?'en':'es';const info=rewardInfo(event);const car=info.kind==='car';
  const root=document.createElement('div');root.className=`tdr-season-celebration ${car?'car':''}`;root.dataset.tdrRaceUi='1';
  root.innerHTML=`<div class="burst"></div><div class="ring"></div><section class="card"><div class="kicker">${car?(lang==='en'?'NEW CAR UNLOCKED':'NUEVO COCHE DESBLOQUEADO'):(lang==='en'?'REWARD CLAIMED':'PREMIO CONSEGUIDO')}</div><div class="title">${esc(event.title||'')}</div><div class="art-wrap">${info.image?`<img class="art" src="${esc(info.image)}" alt="">`:''}</div>${info.qty?`<div class="qty">${esc(info.qty)}</div>`:''}<div class="name">${esc(info.name)}</div><div class="saved">${lang==='en'?'Added to your account':'Añadido a tu cuenta'}</div><button class="continue" type="button">${lang==='en'?'CONTINUE':'CONTINUAR'}</button></section>`;
  for(let i=0;i<(car?70:46);i++)particle(root,'confetti',i,car?70:46);for(let i=0;i<(car?42:24);i++)particle(root,'spark',i,car?42:24);
  const close=()=>{root.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>root.remove());};
  root.querySelector('.continue')?.addEventListener('click',close);document.body.appendChild(root);
}

export function installSeasonRewardCelebrations(){
  if(typeof window==='undefined'||window.__tdrSeasonRewardCelebrationInstalled)return;
  window.__tdrSeasonRewardCelebrationInstalled=true;
  window.addEventListener('tdr:seasonRewardClaimed',ev=>showSeasonRewardCelebration(ev?.detail?.event));
}
