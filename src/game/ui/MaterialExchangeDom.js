import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, qty } from '../garage/garageStore.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { EXCHANGE_MATERIALS, MATERIAL_EXCHANGE_VALUE, MATERIAL_EXCHANGE_EFFICIENCY, materialExchangeStatus, quoteMaterialExchange, executeMaterialExchange } from '../store/materialExchange.js';
import { getLanguage } from '../i18n/index.js';

const ROOT_ID='tdr-material-exchange-dom';
const STYLE_ID='tdr-material-exchange-dom-style';

const copy=()=>getLanguage()==='en'?{
  title:'MATERIAL RECYCLER',desc:'Convert surplus materials to complete your parts',give:'GIVE',receive:'RECEIVE',have:'YOU HAVE',value:'VALUE',amount:'AMOUNT',fee:'RECYCLING FEE',feeCopy:'protects material value',daily:'3 exchanges/day · no coin cost',watch:'▶ WATCH VIDEO AND EXCHANGE',limit:'DAILY LIMIT REACHED',adjust:'ADJUST AMOUNT'
}:{
  title:'RECICLADORA DE MATERIALES',desc:'Convierte excedentes para completar tus piezas',give:'ENTREGAS',receive:'RECIBES',have:'TIENES',value:'VALOR',amount:'CANTIDAD',fee:'COMISIÓN DE RECICLAJE',feeCopy:'protege el valor de los materiales',daily:'3 intercambios/día · sin coste en monedas',watch:'▶ VER VÍDEO E INTERCAMBIAR',limit:'LÍMITE DIARIO ALCANZADO',adjust:'AJUSTA LA CANTIDAD'
};

function ensureStyle(){if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
#${ROOT_ID}{position:fixed;inset:0;z-index:60000;background:#02070d;display:grid;place-items:center;padding:12px;pointer-events:auto;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
#${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID} button,#${ROOT_ID} select{font:inherit;color:inherit}
.tdr-recycler-panel{width:min(780px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:#081522;border:2px solid #5df0b0;border-radius:10px;padding:18px 22px;box-shadow:0 18px 70px rgba(0,0,0,.65)}
.tdr-recycler-head{display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:start}.tdr-recycler-head h2{margin:0;font-size:24px}.tdr-recycler-head p{grid-column:1/2;margin:5px 0 0;color:#a9bfd0;font-size:12px}.tdr-recycler-status{font-weight:900;color:#71f0b2;padding-top:3px}.tdr-recycler-close{border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer}
.tdr-recycler-selectors{display:grid;grid-template-columns:1fr 52px 1fr;gap:10px;align-items:end;margin-top:18px}.tdr-recycler-block label,.tdr-recycler-amount label{display:block;font-size:11px;font-weight:900;margin-bottom:6px}.tdr-recycler-block:first-child label{color:#ffbe68}.tdr-recycler-block:last-child label{color:#72efb4}.tdr-recycler-select{width:100%;min-height:68px;background:#102434;border:2px solid #50dca2;border-radius:4px;padding:10px 12px;font-weight:900}.tdr-recycler-arrow{text-align:center;font-size:30px;padding-bottom:16px}
.tdr-recycler-meta{display:block;margin-top:5px;color:#9fc0d4;font-size:10px;font-weight:700}.tdr-recycler-amount{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:18px}.tdr-recycler-amount label{margin:0 18px 0 0;color:#aebfd0}.tdr-recycler-amount button{min-width:66px;height:34px;background:#112538;border:1px solid #496477;border-radius:3px;font-weight:900;cursor:pointer}.tdr-recycler-amount button.active{background:#1b4d3d;border:2px solid #5df0b0}
.tdr-recycler-summary{margin-top:18px;border:1px solid #5df0b0;background:#0b1b27;padding:14px 18px}.tdr-recycler-summary strong{font-size:18px}.tdr-recycler-summary p{margin:7px 0 0;color:#ffcf7b;font-size:11px;font-weight:800}.tdr-recycler-foot{display:grid;grid-template-columns:1fr minmax(250px,300px);gap:18px;align-items:center;margin-top:18px}.tdr-recycler-note{color:#8fa6b7;font-size:10px;font-weight:800}.tdr-recycler-submit{height:42px;border:2px solid #5df0b0;background:#17683f;font-weight:900;cursor:pointer}.tdr-recycler-submit:disabled{background:#293342;border-color:#526171;color:#aab6c1;cursor:default}
@media(max-height:520px){.tdr-recycler-panel{padding:12px 16px}.tdr-recycler-head h2{font-size:20px}.tdr-recycler-head p{font-size:10px}.tdr-recycler-selectors{margin-top:10px}.tdr-recycler-select{min-height:54px;padding:7px 10px}.tdr-recycler-amount{margin-top:11px}.tdr-recycler-summary{margin-top:11px;padding:10px 14px}.tdr-recycler-foot{margin-top:11px}.tdr-recycler-submit{height:36px}}
`;document.head.appendChild(s)}

function materialName(id){return String(GARAGE_ITEMS[id]?.name||id).toUpperCase();}
function hostFor(scene){return scene?.game?.canvas?.parentElement||document.getElementById('app')||document.body;}

export function closeMaterialExchangeDom(scene){
  try{scene?._materialExchangeDom?.remove();}catch{}
  if(scene)scene._materialExchangeDom=null;
  try{if(scene?._storeModal?.scene)scene._storeModal.setVisible(true);}catch{}
}

export function openMaterialExchangeDom(scene,fromId='scrap',toId='compound',amount=100){
  closeMaterialExchangeDom(scene);ensureStyle();
  const garage=loadGarage();
  if(!EXCHANGE_MATERIALS.includes(fromId))fromId='scrap';
  if(!EXCHANGE_MATERIALS.includes(toId)||toId===fromId)toId=fromId==='compound'?'ecu':'compound';
  amount=Math.max(1,Math.min(qty(garage,fromId),Math.floor(Number(amount)||1)));
  scene._exchangeFrom=fromId;scene._exchangeTo=toId;scene._exchangeAmount=amount;
  try{if(scene._storeModal?.scene)scene._storeModal.setVisible(false);}catch{}
  const C=copy(),status=materialExchangeStatus(),quote=quoteMaterialExchange(fromId,toId,amount),receive=quote.ok?quote.receive:0,currentHave=qty(garage,fromId),enabled=status.available&&quote.ok&&currentHave>=amount;
  const root=document.createElement('div');root.id=ROOT_ID;scene._materialExchangeDom=root;hostFor(scene).appendChild(root);
  const opts=id=>EXCHANGE_MATERIALS.map(x=>`<option value="${x}" ${x===id?'selected':''}>${materialName(x)}</option>`).join('');
  root.innerHTML=`<section class="tdr-recycler-panel" role="dialog" aria-modal="true" aria-label="${C.title}"><header class="tdr-recycler-head"><div><h2>${C.title}</h2><p>${C.desc}</p></div><div class="tdr-recycler-status">${status.remaining}/3 ${getLanguage()==='en'?'TODAY':'HOY'}</div><button class="tdr-recycler-close" type="button" aria-label="Cerrar">×</button></header><div class="tdr-recycler-selectors"><div class="tdr-recycler-block"><label>${C.give}</label><select class="tdr-recycler-select" data-from>${opts(fromId)}</select><span class="tdr-recycler-meta">${C.have} ${qty(garage,fromId)} · ${C.value} ${MATERIAL_EXCHANGE_VALUE[fromId]}</span></div><div class="tdr-recycler-arrow">→</div><div class="tdr-recycler-block"><label>${C.receive}</label><select class="tdr-recycler-select" data-to>${opts(toId)}</select><span class="tdr-recycler-meta">${C.have} ${qty(garage,toId)} · ${C.value} ${MATERIAL_EXCHANGE_VALUE[toId]}</span></div></div><div class="tdr-recycler-amount"><label>${C.amount}</label>${[25,100,250,'MAX'].map(p=>{const v=p==='MAX'?currentHave:Math.min(currentHave,p),active=(p==='MAX'&&amount===currentHave)||(p!=='MAX'&&amount===v);return `<button type="button" data-amount="${p}" class="${active?'active':''}" ${v<=0?'disabled':''}>${p}</button>`}).join('')}</div><div class="tdr-recycler-summary"><strong>${amount} ${materialName(fromId)} → ${receive} ${materialName(toId)}</strong><p>${C.fee}: ${Math.round((1-MATERIAL_EXCHANGE_EFFICIENCY)*100)}% · ${C.feeCopy}</p></div><footer class="tdr-recycler-foot"><div class="tdr-recycler-note">${C.daily}</div><button class="tdr-recycler-submit" type="button" ${enabled?'':'disabled'}>${!status.available?C.limit:quote.ok?C.watch:C.adjust}</button></footer></section>`;
  const reopen=(f=fromId,t=toId,a=amount)=>openMaterialExchangeDom(scene,f,t,a);
  root.querySelector('.tdr-recycler-close')?.addEventListener('click',()=>closeMaterialExchangeDom(scene));
  root.querySelector('[data-from]')?.addEventListener('change',e=>{const f=e.target.value;reopen(f,f===toId?(f==='compound'?'ecu':'compound'):toId,Math.min(Math.max(1,amount),Math.max(1,qty(loadGarage(),f))));});
  root.querySelector('[data-to]')?.addEventListener('change',e=>{let t=e.target.value;if(t===fromId)t=fromId==='compound'?'ecu':'compound';reopen(fromId,t,amount);});
  root.querySelectorAll('[data-amount]').forEach(btn=>btn.addEventListener('click',()=>{const raw=btn.dataset.amount,val=raw==='MAX'?currentHave:Math.min(currentHave,Number(raw)||1);if(val>0)reopen(fromId,toId,val);}));
  root.querySelector('.tdr-recycler-submit')?.addEventListener('click',async()=>{if(!enabled)return;const ok=await showRewardedAd(scene,{title:getLanguage()==='en'?'MATERIAL RECYCLING':'RECICLAJE DE MATERIALES'});if(!ok)return;const result=executeMaterialExchange(fromId,toId,amount);scene._toastStore?.(result.ok?`${result.spend} ${materialName(fromId)} → ${result.receive} ${materialName(toId)}`:result.reason,result.ok);if(result.ok)scene._exchangeAmount=Math.min(amount,Math.max(1,qty(loadGarage(),fromId)));reopen(fromId,toId,scene._exchangeAmount);});
  scene.events?.once?.('shutdown',()=>closeMaterialExchangeDom(scene));
  return root;
}
