import './adminGaragePaddock.css';
import {createAppWallet,disposeAppWallets} from './TdrAppHeader.js';
import {carPreviewCandidates,attachCarPreviewFallback} from './carPreviewAssets.js';
import {carCardUrl} from '../cars/carCardArt.js';
import {getEffectiveCarSpec} from '../cars/getEffectiveCarSpec.js';
import {resolveCarParams} from '../cars/resolveCarParams.js';
import {attainableTopSpeedKmh} from '../cars/speedUnits.js';
import {t} from '../i18n/index.js';

const BASE=import.meta.env.BASE_URL||'/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountAdminGaragePaddock(scene){
  if(scene?._mode!=='admin'||!scene?._cars?.length)return null;
  const host=scene.game?.canvas?.parentElement||document.getElementById('app')||document.body;
  if(!host)return null;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  host.querySelector('[data-garage-admin-paddock]')?.remove();
  const root=document.createElement('section');
  root.dataset.garageAdminPaddock='1';
  root.className='tdr-garage-admin-paddock';
  root.setAttribute('aria-label','Garaje de administración PADDOCK');
  root.innerHTML=`
  <header class="agp-head">
    <div class="agp-brand"><span class="agp-logo">TD<em>R</em></span>
      <span class="agp-heading"><small>ADMIN HUB / PADDOCK</small><strong>GARAJE</strong></span></div>
    <div class="agp-head-actions"><span data-agp-wallet></span>
      <button type="button" data-agp-action="back">← PADDOCK</button></div>
  </header>
  <div class="agp-body">
    <aside class="agp-collection">
      <div class="agp-section-head"><span>COLECCIÓN</span><small data-agp-counter></small></div>
      <div class="agp-list" data-agp-list role="listbox" aria-label="Seleccionar coche"></div>
    </aside>
    <div class="agp-display">
      <div class="agp-section-head"><span>VEHÍCULO SELECCIONADO</span><small data-agp-collection-no></small></div>
      <div class="agp-display-body"><img data-agp-hero alt="" draggable="false">
        <span class="agp-placeholder" aria-hidden="true">TDR</span></div>
      <div class="agp-display-foot">COLECCIÓN CRAFTRACE · VEHICLE LAB</div>
    </div>
    <section class="agp-info" aria-label="Datos del coche">
      <div class="agp-section-head"><span>FICHA RÁPIDA</span><small>ADMINISTRACIÓN</small></div>
      <div class="agp-info-scroll">
        <h2 data-agp-name></h2>
        <strong class="agp-manufacturer" data-agp-brand></strong>
        <div class="agp-meta" data-agp-meta></div>
        <p class="agp-description" data-agp-personality></p>
        <div class="agp-stats" data-agp-stats></div>
      </div>
      <div class="agp-actions">
        <button class="agp-primary" type="button" data-agp-action="edit">EDITAR COCHE</button>
        <button type="button" data-agp-action="ficha">VER FICHA</button>
      </div>
    </section>
  </div>
  <div class="agp-status" role="status" aria-live="polite" data-agp-status></div>`;
  host.appendChild(root);
  root.querySelector('[data-agp-wallet]')?.appendChild(createAppWallet({className:'agp-wallet'}));
  const list=root.querySelector('[data-agp-list]');
  const imageCleanups=[];
  const idOf=car=>car?.id||car?.spec?.id;
  scene._cars.forEach((car,index)=>{
    const spec=car.spec||{},id=idOf(car);
    const option=document.createElement('button');
    option.type='button';option.className='agp-item';option.setAttribute('role','option');
    option.dataset.index=String(index);
    option.innerHTML=`<span class="agp-thumb"><img alt="" loading="lazy" draggable="false"><span class="agp-thumb-backup">TDR</span></span>
      <span class="agp-item-desc"><strong>${esc(spec.name||id)}</strong><small>${esc(spec.brand||'TDR')} · ${esc(spec.category||'—')}</small>
      <small>${esc(spec.rarity||'—')} · #${String(spec.collectionNo||0).padStart(3,'0')}</small></span>`;
    const thumb=option.querySelector('img');
    imageCleanups.push(attachCarPreviewFallback(thumb,
      [carCardUrl(id,spec,BASE),...carPreviewCandidates(id,spec,BASE)],{
       onLoad:()=>option.classList.add('has-art')
      }));
    option.addEventListener('click',()=>{
      scene._selectedIndex=index;
      render();
      const y=option.offsetTop-list.offsetTop;
      list.scrollTo?.({top:y-(list.clientHeight-option.offsetHeight)/2,behavior:'smooth'});
    });
    list.appendChild(option);
  });
  const hero=root.querySelector('[data-agp-hero]');
  let cleanHero=()=>{};
  function render(){
    const current=scene._cars?.[scene._selectedIndex];
    if(!current||!root.isConnected)return;
    const spec=current.spec||{},id=idOf(current);
    root.querySelectorAll('.agp-item').forEach((node,i)=>{
      const selected=i===scene._selectedIndex;
      node.classList.toggle('is-selected',selected);
      node.setAttribute('aria-selected',String(selected));
    });
    root.querySelector('[data-agp-name]').textContent=String(spec.name||id).toUpperCase();
    root.querySelector('[data-agp-brand]').textContent=String(spec.brand||'TDR').toUpperCase();
    root.querySelector('[data-agp-counter]').textContent=`${scene._selectedIndex+1} / ${scene._cars.length}`;
    root.querySelector('[data-agp-collection-no]').textContent=`#${String(spec.collectionNo||0).padStart(3,'0')}`;
    const meta=root.querySelector('[data-agp-meta]');
    meta.innerHTML=`<div><small>CATEGORÍA</small><strong>${esc(spec.category||'—')}</strong></div>
      <div><small>RAREZA</small><strong>${esc(spec.rarity||'—')}</strong></div>
      <div><small>COLECCIÓN</small><strong>#${String(spec.collectionNo||0).padStart(3,'0')}</strong></div>
      <div><small>ROL</small><strong>${esc(spec.role||'—')}</strong></div>`;
    let description='';
    try{description=t('garage.personality.'+id)||'';}catch{}
    root.querySelector('[data-agp-personality]').textContent=description;
    let actual={...spec};
    try{actual=getEffectiveCarSpec(id)||actual;}catch{}
    let stats=actual;
    try{stats=resolveCarParams(actual);}catch{}
    const top=Number(attainableTopSpeedKmh(stats)),accel=Number(stats.accel),brake=Number(stats.brakeForce);
    root.querySelector('[data-agp-stats]').innerHTML=`<div><span>VEL. PUNTA</span><strong>${Number.isFinite(top)?Math.round(top)+' km/h':'—'}</strong></div>
      <div><span>ACELERACIÓN</span><strong>${Number.isFinite(accel)?Math.round(accel):'—'}</strong></div>
      <div><span>FRENADA</span><strong>${Number.isFinite(brake)?Math.round(brake):'—'}</strong></div>`;
    cleanHero();
    root.querySelector('.agp-display-body')?.classList.remove('has-image');
    const urls=[carCardUrl(id,spec,BASE),...carPreviewCandidates(id,spec,BASE)];
    cleanHero=attachCarPreviewFallback(hero,urls,{onLoad:()=>{
      if(root.isConnected)root.querySelector('.agp-display-body')?.classList.add('has-image');
    }});
  }
  let closed=false;
  const cleanup=()=>{
    if(closed)return;closed=true;
    cleanHero();imageCleanups.forEach(fn=>fn());
    disposeAppWallets(root);root.remove();
    if(scene._tdrAppHeader?.isConnected)scene._tdrAppHeader.style.display='';
  };
  const navigate=action=>{
    if(action==='back'){scene.scene.start('admin-hub');return;}
    if(action==='edit')scene._activatePrimary();
    if(action==='ficha')scene._activateSecondary();
  };
  root.addEventListener('click',event=>{
    const action=event.target?.closest?.('[data-agp-action]')?.dataset.agpAction;
    if(action){event.preventDefault();navigate(action);}
  });
  const legacyHeader=scene._tdrAppHeader;
  if(legacyHeader)legacyHeader.style.display='none';
  scene._removeDomHeroCard?.();
  render();
  const selected=list.querySelector('[aria-selected="true"]');
  if(selected)requestAnimationFrame(()=>{if(root.isConnected)list.scrollTop=selected.offsetTop-list.offsetTop-(list.clientHeight-selected.offsetHeight)/2;});
  scene.events.once('shutdown',cleanup);
  scene.events.once('destroy',cleanup);
  return {root,render,cleanup};
}
