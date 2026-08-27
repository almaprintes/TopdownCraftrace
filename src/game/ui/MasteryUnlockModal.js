import { getLanguage } from '../i18n/index.js';
import { acknowledgeMasteryLevel, masteryInfoForMeters, masteryMaterialLabel, masteryWheelDataUri } from '../stats/carMastery.js';

function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

export function showMasteryUnlockModal({scene=null,carId='',carName='',meters=0,level=null,onClose=null}={}){
  const mastery=masteryInfoForMeters(meters);
  const lv=Math.max(1,Math.min(9,Number(level)||mastery.level||1));
  const lang=getLanguage()==='en'?'en':'es';
  const host=scene?.game?.canvas?.parentElement||document.getElementById('app')||document.body;
  host.querySelector?.('[data-mastery-unlock-modal]')?.remove?.();
  const root=document.createElement('div');root.dataset.masteryUnlockModal='1';root.className='tdr-mastery-unlock';
  const material=masteryMaterialLabel(masteryInfoForMeters((lv===mastery.level?meters:0)).material||(['bronze','bronze','bronze','silver','silver','silver','gold','gold','gold'][lv-1]),lang);
  const title=lang==='en'?'MASTERY UNLOCKED':'MAESTRÍA DESBLOQUEADA';
  const intro=lv===1
    ?(lang==='en'?`You have driven enough distance with this car. This badge represents your experience and mastery of it.`:`Has recorrido suficiente distancia con este coche. Esta insignia representa tu experiencia y dominio sobre él.`)
    :(lang==='en'?`Your mastery of this car has increased. Keep driving it to unlock the next badge.`:`Tu dominio con este coche ha aumentado. Sigue conduciéndolo para desbloquear la siguiente insignia.`);
  const displayNote=lang==='en'?'The badge is shown on the car by default. You can hide it at any time in Settings without losing progress.':'La insignia se muestra sobre el coche por defecto. Puedes ocultarla en Configuración cuando quieras sin perder progreso.';
  root.innerHTML=`<style>
.tdr-mastery-unlock{position:absolute;inset:0;z-index:42000;display:grid;place-items:center;background:radial-gradient(circle at 50% 44%,rgba(216,165,47,.18),transparent 38%),rgba(1,7,12,.88);backdrop-filter:blur(6px);font-family:Inter,system-ui,-apple-system,sans-serif;color:#fff}.tdr-mastery-unlock *{box-sizing:border-box}.mu-card{width:min(760px,88vw);min-height:min(470px,82vh);padding:clamp(22px,4vh,40px);display:grid;grid-template-columns:minmax(150px,.65fr) minmax(0,1.35fr);gap:clamp(20px,4vw,42px);align-items:center;border:1px solid rgba(240,184,75,.75);background:linear-gradient(145deg,#0b1c29,#061019);box-shadow:0 24px 80px rgba(0,0,0,.72),0 0 45px rgba(216,165,47,.14);clip-path:polygon(18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%,0 18px)}.mu-badge-wrap{display:grid;place-items:center;gap:14px}.mu-badge{width:clamp(126px,20vw,210px);height:clamp(126px,20vw,210px);filter:drop-shadow(0 0 24px rgba(227,161,95,.36));animation:mu-pop .55s cubic-bezier(.2,.9,.25,1.2)}.mu-level{font-size:clamp(14px,2vw,22px);font-weight:1000;letter-spacing:.12em;color:#f1bd64}.mu-kicker{font-size:clamp(10px,1.2vw,14px);font-weight:1000;letter-spacing:.16em;color:#62eaff}.mu-copy h2{margin:7px 0 8px;font-size:clamp(28px,4vw,52px);line-height:.95}.mu-car{font-size:clamp(15px,2vw,24px);font-weight:900;color:#f1bd64}.mu-copy p{margin:16px 0 0;color:#d5e2ea;font-size:clamp(13px,1.6vw,19px);line-height:1.45}.mu-note{padding:11px 13px;border-left:3px solid #62eaff;background:rgba(98,234,255,.07);color:#9db4c3!important}.mu-continue{margin-top:22px;width:100%;min-height:52px;border:1px solid #62ffb2;background:#176f46;color:#fff;font-size:clamp(14px,1.8vw,20px);font-weight:1000;letter-spacing:.08em;cursor:pointer}.mu-continue:active{transform:translateY(1px);filter:brightness(1.12)}@keyframes mu-pop{0%{transform:scale(.35) rotate(-16deg);opacity:0}70%{transform:scale(1.08) rotate(3deg)}100%{transform:scale(1);opacity:1}}@media(max-width:700px){.mu-card{grid-template-columns:1fr;text-align:center;min-height:0}.mu-badge{width:120px;height:120px}.mu-copy p{text-align:left}}
</style><section class="mu-card"><div class="mu-badge-wrap"><img class="mu-badge" src="${masteryWheelDataUri(lv,{size:256,blackBackground:true})}" alt=""><div class="mu-level">${material} · ${lang==='en'?'LEVEL':'NIVEL'} ${lv}/9</div></div><div class="mu-copy"><div class="mu-kicker">${title}</div><h2>${lang==='en'?'CAR MASTERY':'MAESTRÍA DEL COCHE'}</h2>${carName?`<div class="mu-car">${esc(carName)}</div>`:''}<p>${intro}</p><p class="mu-note">${displayNote}</p><button class="mu-continue" type="button">${lang==='en'?'CONTINUE':'CONTINUAR'}</button></div></section>`;
  host.appendChild(root);
  try{navigator.vibrate?.([80,45,130]);}catch{}
  const finish=()=>{acknowledgeMasteryLevel(carId,lv);try{root.remove();}catch{}try{onClose?.();}catch{}};
  root.querySelector('.mu-continue')?.addEventListener('click',finish,{once:true});
  return{root,close:finish};
}
