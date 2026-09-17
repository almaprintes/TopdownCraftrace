const SETTINGS_KEY='tdr2:settings';
const CONTROL_EVENT='tdr2:control-settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function persistSensitivity(value){try{const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');settings.controls={...(settings.controls||{}),sensitivity:value};localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));window.dispatchEvent(new CustomEvent(CONTROL_EVENT,{detail:{...settings.controls}}));}catch{}}
function enhance(){
  const root=document.querySelector('#tdr-settings2');if(!root)return;
  root.querySelectorAll('.s2card').forEach(card=>{
    const label=card.querySelector('.s2label')?.textContent?.trim()||'';
    if(!/SENSIBILIDAD|SENSITIVITY/i.test(label))return;
    const range=card.querySelector('input.s2range[type="range"]');if(!range)return;
    range.min='0.5';range.max='1.5';range.step='0.05';
    const safe=clamp(Number(range.value)||1,.5,1.5);range.value=String(safe);
    const val=card.querySelector('.s2val');if(val)val.textContent=`${Math.round(safe*100)}%`;
    if(range.dataset.tdrSensitivityEnhanced==='1')return;
    range.dataset.tdrSensitivityEnhanced='1';
    const wrap=document.createElement('div');wrap.className='tdr-sensitivity-wrap';range.parentNode.insertBefore(wrap,range);wrap.appendChild(range);
    const mark=document.createElement('i');mark.className='tdr-sensitivity-base';mark.setAttribute('aria-label','100% base');wrap.appendChild(mark);
    range.addEventListener('input',()=>{const v=clamp(Number(range.value)||1,.5,1.5);range.value=String(v);if(val)val.textContent=`${Math.round(v*100)}%`;persistSensitivity(v);});
  });
}
function installStyle(){if(document.getElementById('tdr-sensitivity-enhancer-style'))return;const s=document.createElement('style');s.id='tdr-sensitivity-enhancer-style';s.textContent=`.tdr-sensitivity-wrap{position:relative;width:min(420px,72vw);padding-top:14px}.tdr-sensitivity-wrap>.s2range{width:100%;margin:0}.tdr-sensitivity-base{position:absolute;left:50%;top:5px;width:2px;height:25px;background:#fff;border-radius:2px;opacity:.9;pointer-events:none;transform:translateX(-1px)}.tdr-sensitivity-base:before{content:'100%';position:absolute;left:50%;top:-10px;transform:translateX(-50%);font:900 8px system-ui;color:#fff;white-space:nowrap}`;document.head.appendChild(s);}
function run(){installStyle();enhance();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance();});}).observe(document.documentElement,{childList:true,subtree:true});
