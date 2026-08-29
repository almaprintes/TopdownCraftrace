import { openMaterialExchangeDom as openBase, closeMaterialExchangeDom } from './MaterialExchangeDom.js';
import { loadGarage, qty } from '../garage/garageStore.js';
import { getLanguage } from '../i18n/index.js';

function enhance(scene, fromId, toId, amount){
  const root=scene?._materialExchangeDom;
  const row=root?.querySelector?.('.tdr-recycler-amount');
  if(!root||!row)return root;
  const currentHave=Math.max(0,qty(loadGarage(),fromId));
  const label=getLanguage()==='en'?'EXACT':'EXACTA';
  const wrap=document.createElement('label');
  wrap.style.display='inline-flex';
  wrap.style.alignItems='center';
  wrap.style.gap='6px';
  wrap.style.margin='0';
  wrap.innerHTML=`<span style="font-size:10px;font-weight:900;color:#aebfd0">${label}</span><input type="number" inputmode="numeric" min="1" max="${currentHave}" step="1" value="${Math.max(1,Math.min(currentHave||1,Math.floor(Number(amount)||1)))}" aria-label="${label}" style="width:84px;height:34px;background:#112538;border:1px solid #5df0b0;border-radius:3px;color:#fff;font:900 14px system-ui;text-align:center;padding:0 6px">`;
  row.appendChild(wrap);
  const input=wrap.querySelector('input');
  const apply=()=>{
    let value=Math.floor(Number(input?.value)||0);
    if(currentHave<=0)return;
    value=Math.max(1,Math.min(currentHave,value));
    input.value=String(value);
    if(value!==Number(amount))openMaterialExchangeDom(scene,fromId,toId,value);
  };
  input?.addEventListener('change',apply);
  input?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();input.blur();apply();}});
  return root;
}

export function openMaterialExchangeDom(scene,fromId='scrap',toId='compound',amount=100){
  openBase(scene,fromId,toId,amount);
  return enhance(scene,fromId,toId,amount);
}

export { closeMaterialExchangeDom };
