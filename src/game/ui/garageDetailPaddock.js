import './vehicleLabPaddockShared.css';
import './garageDetailPaddock.css';
import {createAppWallet,disposeAppWallets} from './TdrAppHeader.js';
import {carPreviewCandidates,attachCarPreviewFallback} from './carPreviewAssets.js';
import {carCardUrl} from '../cars/carCardArt.js';
import {CAR_SPECS} from '../cars/carSpecs.js';

const safe=value=>String(value??'').replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textValue=value=>Number.isFinite(Number(value))?String(Math.round(Number(value))):'—';

// Vehicle dossier: a DOM renderer over the same GarageDetailScene and actual
// physics-derived data. It is a visual adapter, not a second Garage scene.
export function mountGarageDetailPaddock(scene,{spec,carId,mode,rows,techInfo,onBack,onTune,onTest}={}){
  if(!scene?.add?.dom||!spec||!Array.isArray(rows))return null;
  let dom=null;
  try{
    const name=safe(spec.name||carId),brand=safe(spec.brand||'TDR'),
      category=safe(spec.category||'CIRCUITO'),
      rarity=safe(spec.rarity||'—'),
      officialArtSpec=CAR_SPECS?.[carId]||spec,
      base=import.meta.env.BASE_URL||'/',
      // The published collection card is the same proven asset as the admin Garage.
      // Use the source-of-truth factory metadata (not potentially edited fields).
      imageCandidates=[...new Set([
        carCardUrl(carId,officialArtSpec,base),
        ...carPreviewCandidates(carId,officialArtSpec,base)
      ])];
    const html=`<section class="vl-ficha" aria-label="Ficha técnica del vehículo">
      <header class="vl-ficha-header">
        <div class="vl-ficha-brand"><span class="vl-ficha-logo">TD<em>R</em></span>
          <div><small>GARAJE / VEHICLE LAB</small><strong>FICHA DEL VEHÍCULO</strong></div></div>
        <div class="vl-ficha-header-right"><span data-ficha-wallet></span><button type="button" data-ficha-action="back">← VOLVER AL GARAJE</button></div>
      </header>
      <div class="vl-ficha-body">
        <div class="vl-ficha-preview">
          <div class="vl-ficha-kicker">COLECCIÓN TDR <span>#${safe(spec.collectionNo||'—')}</span></div>
          <div class="vl-ficha-car"><img data-ficha-image src="${safe(imageCandidates[0]||'')}" alt="${name}" draggable="false">
            <span class="vl-ficha-fallback">TDR</span></div>
          <div class="vl-ficha-name">${name}</div>
          <div class="vl-ficha-details"><span>${brand} · ${category}</span><span>${rarity}</span></div>
        </div>
        <div class="vl-ficha-dossier">
          <div class="vl-ficha-dossier-title">PRESTACIONES <small>DATOS DEL COCHE SELECCIONADO</small></div>
          <div class="vl-ficha-stats">
            ${rows.map(row=>`<div class="vl-ficha-stat">
              <span>${safe(row.label)}</span>
              <strong ${row.metric==='speed'?'data-ficha-speed':''}>${textValue(row.value)}${row.unit?' '+safe(row.unit):''}</strong>
            </div>`).join('')}
          </div>
          ${mode==='admin'&&techInfo?.length?`<details class="vl-ficha-technical">
            <summary>DIAGNÓSTICO DE FÍSICAS</summary><div>${techInfo.map(x=>`<p>${safe(x)}</p>`).join('')}</div></details>`:''}
          <div class="vl-ficha-info">${mode==='admin'?'MODO ADMIN · FÍSICAS GUARDADAS':'ESTADÍSTICAS DEL VEHÍCULO'}</div>
        </div>
      </div>
      <footer class="vl-ficha-footer"><span data-ficha-status role="status" aria-live="polite">VEHÍCULO SELECCIONADO</span>
        <div class="vl-ficha-actions">
          <button type="button" data-ficha-action="tune">TUNEAR</button>
          <button type="button" data-ficha-action="test">▶ PROBAR</button>
        </div>
      </footer>
    </section>`;
    dom=scene.add.dom(0,0).createFromHTML(html).setOrigin(0,0).setDepth(1000000);
    const node=dom.node,root=node?.matches?.('.vl-ficha')?node:node?.querySelector?.('.vl-ficha');
    if(!root)throw new Error('Ficha DOM not mounted');
    const fit=()=>{
      if(!dom?.node)return;
      dom.x=0;dom.y=0;
      node.style.width=scene.scale.width+'px';
      node.style.height=scene.scale.height+'px';
    };
    fit();
    scene.scale.on('resize',fit);
    let closed=false;
    let removePreviewHandlers=()=>{};
    const cleanup=()=>{
      if(closed)return;
      closed=true;removePreviewHandlers();scene.scale.off('resize',fit);
      disposeAppWallets(root);
      dom?.destroy?.();dom=null;
      if(scene._garageDetailPaddock?.root===root)scene._garageDetailPaddock=null;
    };
    scene.events.once('shutdown',cleanup);
    scene.events.once('destroy',cleanup);
    const wallet=createAppWallet({className:'vl-ficha-wallet'});
    root.querySelector('[data-ficha-wallet]')?.appendChild(wallet);
    const imageEl=root.querySelector('[data-ficha-image]');
    removePreviewHandlers=attachCarPreviewFallback(imageEl,imageCandidates,{
      onLoad:()=>{
        root.querySelector('.vl-ficha-car')?.classList.add('has-image');
        root.querySelector('[data-ficha-status]')?.removeAttribute('data-image-error');
      },
      onExhausted:()=>{
        root.querySelector('.vl-ficha-car')?.classList.remove('has-image');
        const status=root.querySelector('[data-ficha-status]');
        if(status){status.dataset.imageError='1';status.textContent='NO SE PUDO CARGAR LA FOTO · REVISAR RECURSOS';}
      }
    });
    scene.events.once('shutdown',removePreviewHandlers);
    scene.events.once('destroy',removePreviewHandlers);
    const status=root.querySelector('[data-ficha-status]');
    let toastTimer=null;
    root.addEventListener('click',event=>{
      const action=event.target?.closest?.('[data-ficha-action]')?.dataset.fichaAction;
      if(!action)return;
      event.preventDefault();event.stopPropagation();
      if(action==='back')onBack?.();
      if(action==='test')onTest?.();
      if(action==='tune'){
        onTune?.();
        if(status){
          status.textContent='TUNEAR · PRÓXIMAMENTE';
          toastTimer?.remove?.(false);
          toastTimer=scene.time.delayedCall(2400,()=>{
            if(status.isConnected)status.textContent='VEHÍCULO SELECCIONADO';
          });
        }
      }
    });
    scene.events.once('shutdown',()=>toastTimer?.remove?.(false));
    return {
      root,
      updateTopSpeed(kmh){
        const el=root.querySelector('[data-ficha-speed]');
        if(el&&Number.isFinite(kmh))el.textContent=`${Math.round(kmh)} km/h`;
      },
      destroy:cleanup
    };
  }catch(error){
    try{dom?.destroy?.();}catch{}
    console.warn('[TDR] fallback to classic GarageDetailScene',error);
    return null;
  }
}
