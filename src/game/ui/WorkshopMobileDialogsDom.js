import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { qty, getEquippedForCar } from '../garage/garageStore.js';

const MODAL_ID='tdr-workshop-mobile-dialog';
const TOAST_ID='tdr-workshop-mobile-toast';
const STYLE_ID='tdr-workshop-mobile-dialog-style';
const TIER_COLOR={1:'#66c6ff',2:'#4ee1a0',3:'#bf7cff',4:'#ffc64d'};
const FAMILIES={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const BASE=()=>String(import.meta.env.BASE_URL||'./');
const PART_FILES={engine_street:'engine/engine_street.webp',engine_sport:'engine/engine_sport.webp',engine_racing:'engine/engine_racing.webp',engine_prototype:'engine/engine_prototype.webp',brakes_street:'brakes/brakes_street.webp',brakes_sport:'brakes/brakes_sport.webp',brakes_racing:'brakes/brakes_racing.webp',brakes_prototype:'brakes/brakes_prototype.webp',tires_street:'tires/tires_street.webp',tires_sport:'tires/tires_sport.webp',tires_racing:'tires/tires_racing_t3.webp',tires_prototype:'tires/tires_prototype_t4.webp',suspension_street:'suspension/suspension_street_t1.webp',suspension_sport:'suspension/suspension_sport_t2.webp',suspension_racing:'suspension/suspension_racing_t3.webp',suspension_prototype:'suspension/suspension_prototype_t4.webp',transmission_street:'transmission/transmission_street_t1.webp',transmission_sport:'transmission/transmission_sport_t2.webp',transmission_racing:'transmission/transmission_racing_t3.webp',transmission_prototype:'transmission/transmission_prototype_t4.webp'};
const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=String(txt);return n;};
const partAsset=id=>{const f=PART_FILES[id];return f?`${BASE()}assets/crafting/parts/${f}`:'';};
function ensureStyle(){if(document.getElementById(STYLE_ID))return;const s=el('style');s.id=STYLE_ID;s.textContent=`
#${MODAL_ID}{position:absolute;inset:0;z-index:26000;background:#02070dea;display:flex;align-items:center;justify-content:center;padding:10px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
#${MODAL_ID} *{box-sizing:border-box}#${MODAL_ID} button{font:inherit;color:inherit}
#${MODAL_ID} .box{width:min(94%,840px);max-height:94%;background:#08131dfc;border:2px solid #45dfff;border-radius:14px;padding:10px;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:8px;box-shadow:0 18px 50px #000b}
#${MODAL_ID} .top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.cap{font-size:10px;font-weight:950;color:#8da8bd;letter-spacing:.1em}.ttl{font-size:19px;font-weight:950;text-align:center}.close{justify-self:end;width:36px;height:36px;border-radius:50%;border:2px solid #45dfff;background:#132a3b;font-size:23px;font-weight:950}
#${MODAL_ID} .sub{text-align:center;font-size:9px;font-weight:850;color:#8da8bd}.grid{min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.card{min-width:0;min-height:0;background:#0d1a24;border:2px solid var(--tone,#355064);border-radius:10px;padding:6px;display:grid;grid-template-rows:minmax(0,1fr) auto auto auto;gap:3px;text-align:center}.card.installed{opacity:.72}.art{min-height:76px;display:flex;align-items:center;justify-content:center;background:#0a141e;border-radius:7px}.art img{max-width:96%;max-height:110px;object-fit:contain}.name{font-size:9px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tier{font-size:8px;font-weight:900;color:var(--tone)}.action{font-size:8px;font-weight:950;color:#7ddcff}.installed .action{color:#ffcf63}.empty{grid-column:1/-1;align-self:center;text-align:center;color:#71879b;font-size:13px;font-weight:900;padding:28px}
#${TOAST_ID}{position:absolute;left:50%;top:54px;transform:translateX(-50%);z-index:27000;padding:8px 14px;border:1px solid #55f29b;border-radius:9px;background:#07131deb;color:#fff;font:900 10px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 8px 26px #000a;pointer-events:none;text-align:center}
@media(max-height:390px){#${MODAL_ID} .box{padding:7px;gap:5px}.ttl{font-size:16px}.close{width:30px;height:30px;font-size:19px}.grid{gap:5px}.art{min-height:60px}.art img{max-height:82px}.name,.sub{font-size:7px}.tier,.action{font-size:7px}}
`;document.head.appendChild(s);}
export function closeWorkshopMobileDialog(){document.getElementById(MODAL_ID)?.remove();}
export function openWorkshopQuickInstallDom(scene,family){
 if(typeof document==='undefined'||!scene)return false;ensureStyle();closeWorkshopMobileDialog();
 try{scene._quickFamilyModal?.destroy?.(true);}catch{}scene._quickFamilyModal=null;
 const host=scene.game?.canvas?.parentElement||document.getElementById('app')||document.body;if(getComputedStyle(host).position==='static')host.style.position='relative';
 const root=el('div');root.id=MODAL_ID;host.append(root);const box=el('div','box');root.append(box);
 const top=el('div','top');top.append(el('div','cap','PIEZAS'),el('div','ttl',FAMILIES[family]||String(family||'').toUpperCase()));const close=el('button','close','×');close.type='button';close.onclick=()=>{closeWorkshopMobileDialog();scene.render?.();};top.append(close);box.append(top,el('div','sub','INSTALA O DESINSTALA CON UN TOQUE'));
 const grid=el('div','grid');box.append(grid);const eq=getEquippedForCar(scene.state,scene.car)||{},equippedId=eq[family]||null;
 const ids=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part'&&GARAGE_ITEMS[id]?.family===family).filter(id=>qty(scene.state,id)>0||id===equippedId).sort((a,b)=>Number(GARAGE_ITEMS[a]?.tier||0)-Number(GARAGE_ITEMS[b]?.tier||0));
 if(!ids.length){grid.append(el('div','empty','NO TIENES PIEZAS DE ESTA FAMILIA EN EL INVENTARIO'));return true;}
 ids.forEach(id=>{const item=GARAGE_ITEMS[id],installed=id===equippedId,tier=Number(item?.tier||1),card=el('button',`card ${installed?'installed':''}`);card.type='button';card.style.setProperty('--tone',TIER_COLOR[tier]||'#45dfff');const art=el('div','art');const src=partAsset(id);if(src){const img=el('img');img.src=src;img.alt='';art.append(img);}card.append(art,el('div','name',String(item?.name||id).toUpperCase()),el('div','tier',`NIVEL ${tier}`),el('div','action',installed?'DESINSTALAR':`INSTALAR · ×${qty(scene.state,id)}`));card.onclick=()=>{let ok=false;if(installed)ok=!!scene._unequipFromInventory?.(id);else if(qty(scene.state,id)>0)ok=!!scene._installFromInventory?.(id);if(ok){closeWorkshopMobileDialog();scene.render?.();openWorkshopQuickInstallDom(scene,family);}};grid.append(card);});
 return true;
}
export function showWorkshopMobileToast(message,duration=1800){if(typeof document==='undefined')return false;ensureStyle();document.getElementById(TOAST_ID)?.remove();const host=document.getElementById('tdr-workshop-mobile-dom')?.parentElement||document.getElementById('app')||document.body;const n=el('div');n.id=TOAST_ID;n.textContent=String(message||'');host.append(n);setTimeout(()=>n.remove(),Math.max(600,Number(duration)||1800));return true;}
