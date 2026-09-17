const SETTINGS_KEY='tdr2:settings';
const CONTROL_EVENT='tdr2:control-settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function persistSensitivity(value){try{const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');settings.controls={...(settings.controls||{}),sensitivity:value};localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));window.dispatchEvent(new CustomEvent(CONTROL_EVENT,{detail:{...settings.controls}}));}catch{}}
function stampVersion(){document.querySelectorAll('.rot-beta-title').forEach(el=>{const spans=el.querySelectorAll('span');if(spans.length>1)spans[spans.length-1].textContent='149';});}
function enhance(){
  stampVersion();
  const root=document.querySelector('#tdr-settings2');if(!root)return;
  root.querySelectorAll('input.s2range[type="range"]').forEach(range=>{
    const card=range.closest('.s2card');const label=card?.querySelector('.s2label')?.textContent?.trim()||'';
    const legacyRange=range.getAttribute('min')==='0.4'&&range.getAttribute('max')==='1.4';
    if(!legacyRange&&!/SENSIBILIDAD|SENSITIVITY/i.test(label))return;
    range.min='0.5';range.max='1.5';range.step='0.05';
    const safe=clamp(Number(range.value)||1,.5,1.5);range.value=String(safe);
    const val=card?.querySelector('.s2val');if(val)val.textContent=`${Math.round(safe*100)}%`;
    if(range.dataset.tdrSensitivityEnhanced!=='1'){
      range.dataset.tdrSensitivityEnhanced='1';
      range.addEventListener('input',()=>{const v=clamp(Number(range.value)||1,.5,1.5);if(val)val.textContent=`${Math.round(v*100)}%`;persistSensitivity(v);});
    }
  });
}
function run(){enhance();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enhance();});}).observe(document.documentElement,{childList:true,subtree:true});
