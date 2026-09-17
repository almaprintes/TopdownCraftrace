export function closeStoreDomConfirm(){
  const old=document.getElementById('tdr-store-confirm');
  if(old)old.remove();
}

export function showStoreDomConfirm({title='CONFIRMAR COMPRA',detail='',confirm='COMPRAR',onConfirm}={}){
  closeStoreDomConfirm();
  const overlay=document.createElement('div');
  overlay.id='tdr-store-confirm';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.innerHTML=`<div class="tdr-store-confirm-panel"><div class="tdr-store-confirm-title"></div><div class="tdr-store-confirm-copy">¿Seguro que quieres realizar esta operación?</div><div class="tdr-store-confirm-detail"></div><div class="tdr-store-confirm-actions"><button type="button" data-action="cancel">CANCELAR</button><button type="button" data-action="confirm"></button></div></div>`;
  Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483000',display:'flex',alignItems:'center',justifyContent:'center',padding:'max(18px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))',boxSizing:'border-box',background:'rgba(2,7,13,.86)',fontFamily:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',touchAction:'none'});
  const panel=overlay.querySelector('.tdr-store-confirm-panel');
  Object.assign(panel.style,{width:'min(560px,92vw)',maxHeight:'min(360px,86vh)',overflow:'auto',boxSizing:'border-box',padding:'22px',background:'#0a1726',border:'2px solid rgba(73,200,255,.9)',borderRadius:'14px',boxShadow:'0 18px 60px rgba(0,0,0,.55)',color:'#fff'});
  const titleEl=overlay.querySelector('.tdr-store-confirm-title');titleEl.textContent=title;Object.assign(titleEl.style,{fontSize:'clamp(18px,3vw,22px)',fontWeight:'900',marginBottom:'14px'});
  const copy=overlay.querySelector('.tdr-store-confirm-copy');Object.assign(copy.style,{fontSize:'clamp(11px,2vw,13px)',fontWeight:'700',color:'#c6d5e2',marginBottom:'12px'});
  const detailEl=overlay.querySelector('.tdr-store-confirm-detail');detailEl.textContent=detail;Object.assign(detailEl.style,{fontSize:'clamp(13px,2.4vw,16px)',fontWeight:'900',color:'#ffd85a',overflowWrap:'anywhere',marginBottom:'20px'});
  const actions=overlay.querySelector('.tdr-store-confirm-actions');Object.assign(actions.style,{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'});
  const buttons=[...overlay.querySelectorAll('button')];for(const b of buttons)Object.assign(b.style,{minHeight:'42px',borderRadius:'9px',fontWeight:'900',fontSize:'12px',color:'#fff',touchAction:'manipulation'});
  const cancel=overlay.querySelector('[data-action="cancel"]');Object.assign(cancel.style,{background:'#202b38',border:'1px solid #607286'});
  const accept=overlay.querySelector('[data-action="confirm"]');accept.textContent=confirm;Object.assign(accept.style,{background:'#17683f',border:'2px solid #5df0b0'});
  const close=()=>closeStoreDomConfirm();
  cancel.addEventListener('pointerup',close,{once:true});
  accept.addEventListener('pointerup',()=>{close();onConfirm?.();},{once:true});
  overlay.addEventListener('pointerup',e=>{if(e.target===overlay)close();});
  document.body.appendChild(overlay);
  return overlay;
}
