const KEY='tdr2:settings';
function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}}
function enabled(){return read()?.controls?.gamepadGradualPedals!==false;}
function write(value){try{const s=read();s.controls={...(s.controls||{}),gamepadGradualPedals:!!value};localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
function gamepadSelected(root){const on=[...root.querySelectorAll('.s2choice.on')];return on.some(el=>/^(MANDO|GAMEPAD)$/i.test(el.textContent.trim())||el.dataset.v==='gamepad');}
function mount(){
 const root=document.getElementById('tdr-settings2'),body=root?.querySelector('.s2body');if(!root||!body)return;
 let card=root.querySelector('[data-tdr-gamepad-gradual]');
 if(!gamepadSelected(root)){card?.remove();return;}
 if(card)return;
 card=document.createElement('div');card.className='s2card wide';card.dataset.tdrGamepadGradual='1';
 card.innerHTML=`<div class="s2label">GAS Y FRENO GRADUALES</div><div class="s2desc">R2 y L2 responden a la presión del gatillo de 0 a 100 %. Desactívalo para usar gas y freno digitales.</div><div class="s2row"><span class="s2note">R2 GAS · L2 FRENO</span><button type="button" class="s2switch" aria-label="Gas y freno graduales"><i></i></button></div>`;
 body.appendChild(card);const sw=card.querySelector('.s2switch');const sync=()=>sw.classList.toggle('on',enabled());sync();sw.addEventListener('click',()=>{write(!enabled());sync();});
}
let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});};
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target?.closest?.('#tdr-settings2'))schedule();},true);schedule();
