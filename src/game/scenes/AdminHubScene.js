import '../ui/adminImageLabV2.css';
import { mountAdminPaddock } from '../ui/adminPaddockView.js';
import { BaseScene } from './BaseScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, saveGarage } from '../garage/garageStore.js';
import { devFullCarAccessEnabled, toggleDevFullCarAccess } from '../cars/carUnlocks.js';
import { masteryWheelDataUri, CAR_MASTERY_THRESHOLDS_KM } from '../stats/carMastery.js';

const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');
const MASTERY_META=[
  {material:'BRONCE',spokes:5},{material:'BRONCE',spokes:8},{material:'BRONCE',spokes:12},
  {material:'PLATA',spokes:5},{material:'PLATA',spokes:8},{material:'PLATA',spokes:12},
  {material:'ORO',spokes:5},{material:'ORO',spokes:8},{material:'ORO',spokes:12}
];

export class AdminHubScene extends BaseScene {
  constructor(){
    super('admin-hub');
  }

  create(){
    super.create();
    this.cameras.main.setBackgroundColor('#0b1020');
    this._installAdminDom();
    this.events.once('shutdown',()=>this._removeAdminDom());
  }

  _resetPhaserPointers(){
    try{
      const manager=this.input?.manager;
      const pointers=Array.isArray(manager?.pointers)?manager.pointers:[];
      for(const pointer of pointers) pointer?.reset?.();
      if(manager){
        manager.enabled=true;
        if(manager.touch) manager.touch.enabled=true;
        if(manager.mouse) manager.mouse.enabled=true;
      }
    }catch{}
  }

  _navigate(key,data){
    try{sessionStorage.setItem('tdr2:adminInputProbe','1');}catch{}
    this._resetPhaserPointers();
    const root=this._adminDomRoot;
    if(root){
      root.style.pointerEvents='none';
      root.style.visibility='hidden';
    }
    requestAnimationFrame(()=>{
      this._removeAdminDom();
      setTimeout(()=>{
        if(this.sys?.isActive?.())this.scene.start(key,data);
      },0);
    });
  }

  _installAdminDom(){
    this._removeAdminDom();
    const host=this.game?.canvas?.parentElement||document.getElementById('app')||document.body;
    try{if(getComputedStyle(host).position==='static')host.style.position='relative';}catch{}
    // Only the lazy DEV Admin Hub imports this screen. No race-loop overhead.
    const view=mountAdminPaddock(host,{
      track:()=>this._navigate('TrackStudioScene'),
      environment:()=>this._navigate('EnvironmentBuilderScene'),
      cars:()=>this._navigate('GarageScene',{mode:'admin'}),
      images:async()=>{
        try{
          const {mountAdminWebpTool}=await import('../ui/adminImageWebpTool.js');
          if(!this._adminDomRoot?.isConnected)return;
          try{this._webpToolDispose?.();}catch{}
          this._webpToolDispose=mountAdminWebpTool(this._adminDomRoot);
        }catch(err){
          console.warn('[admin-images] Cannot open image converter',err);
          this._showToast('CONVERSOR DE IMÁGENES NO DISPONIBLE');
        }
      },
      diagnostics:()=>this._showLastRuntimeError(),
      garage:()=>this._navigate('GarageScene'),
      isFullCars:()=>devFullCarAccessEnabled(),
      toggleCars:()=>this._toggleFullCarAccess(),
      kit:()=>this._grantHomologationKit(),
      mastery:()=>this._showMasteryPreview(),
      legacy:()=>this._navigate('TrackEditorScene'),
      exit:()=>this._navigate('menu',{forcePlayer:true})
    });
    this._adminDomRoot=view.root;
    this._adminDomToast=view.toast;
  }

  async _showLastRuntimeError(){
    if(!this._adminDomRoot?.isConnected)return;
    let report='';
    try{
      const {formatStoredRuntimeErrors}=await import('../dev/runtimeSupportReport.js');
      report=formatStoredRuntimeErrors(localStorage);
    }catch(err){
      report='No se pudo leer el diagnóstico local: '+String(err?.message||err);
    }
    if(!this._adminDomRoot?.isConnected)return;
    try{this._errorPreview?.remove?.();}catch{}
    const overlay=document.createElement('div');
    overlay.dataset.tdrErrorReport='1';
    overlay.style.cssText='position:fixed;inset:0;z-index:250001;display:flex;flex-direction:column;box-sizing:border-box;padding:calc(env(safe-area-inset-top,0px) + 12px) calc(env(safe-area-inset-right,0px) + 15px) calc(env(safe-area-inset-bottom,0px) + 12px) calc(env(safe-area-inset-left,0px) + 15px);background:#08111d;color:#edf7ff;font:12px system-ui;touch-action:pan-y;';
    const bar=document.createElement('div');
    bar.style.cssText='display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px;max-width:900px;width:100%;margin:0 auto 12px;';
    const title=document.createElement('strong');
    title.textContent='DIAGNÓSTICO LOCAL · ÚLTIMO ERROR';
    title.style.cssText='font-size:clamp(12px,2.3vw,18px);color:#ffcf91;';
    const controls=document.createElement('div');
    controls.style.cssText='display:flex;gap:8px;';
    const button=(label)=>{const el=document.createElement('button');el.type='button';el.textContent=label;el.style.cssText='padding:9px 12px;background:#12223a;color:#fff;border:1px solid #4a6680;border-radius:8px;font:900 11px system-ui;touch-action:manipulation;cursor:pointer;';return el;};
    const copy=button('COPIAR INFORME'),close=button('CERRAR');
    controls.append(copy,close);bar.append(title,controls);
    const text=document.createElement('textarea');
    text.readOnly=true;text.value=report;
    text.setAttribute('aria-label','Contenido del diagnóstico local');
    text.style.cssText='box-sizing:border-box;display:block;width:100%;max-width:900px;flex:1 1 auto;min-height:0;margin:0 auto;padding:12px;border-radius:9px;background:#0d1d30;color:#dfefff;border:1px solid #355273;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap;overflow:auto;resize:none;user-select:text;-webkit-user-select:text;';
    copy.addEventListener('click',async()=>{
      try{
        if(!navigator.clipboard?.writeText)throw Error('Clipboard API no disponible');
        await navigator.clipboard.writeText(text.value);
        copy.textContent='COPIADO';
      }catch{
        text.focus();text.select();
        try{if(document.execCommand?.('copy'))copy.textContent='COPIADO';
        else copy.textContent='SELECCIONA Y COPIA';}
        catch{copy.textContent='SELECCIONA Y COPIA';}
      }
    });
    close.addEventListener('click',()=>{
      overlay.remove();
      if(this._errorPreview===overlay)this._errorPreview=null;
    });
    overlay.append(bar,text);document.body.appendChild(overlay);
    this._errorPreview=overlay;
  }

  _showMasteryPreview(){
    const root=this._adminDomRoot;if(!root)return;
    this._masteryPreview?.remove?.();
    const overlay=document.createElement('div');
    overlay.style.cssText='position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;box-sizing:border-box;padding:clamp(12px,2.2vh,22px);background:radial-gradient(circle at 50% 5%,#17243a 0,#0b1020 48%,#060b13 100%);color:#fff;overflow:auto;-webkit-overflow-scrolling:touch;';

    const top=document.createElement('div');
    top.style.cssText='flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;width:min(1000px,100%);margin:0 auto clamp(10px,1.8vh,18px);';
    top.innerHTML='<div><div style="font-size:clamp(18px,3.3vh,30px);font-weight:950;color:#fff">INSIGNIAS DE MAESTRÍA · QA</div><div style="margin-top:3px;color:#7f93a8;font-size:clamp(8px,1.35vh,11px);font-weight:800;letter-spacing:.05em">RENDER EXACTO DEL JUEGO · MISMA FUNCIÓN masteryWheelDataUri()</div></div>';
    const close=document.createElement('button');close.type='button';close.textContent='CERRAR';close.style.cssText='flex:0 0 auto;border:1px solid #5c718e;background:#0d1725;color:#dce7f2;padding:9px 14px;font:900 11px system-ui;cursor:pointer;';
    close.onclick=()=>{overlay.remove();this._masteryPreview=null;};top.appendChild(close);overlay.appendChild(top);

    const grid=document.createElement('div');
    grid.style.cssText='flex:1 0 auto;width:min(1000px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,1.5vw,16px);align-content:start;';

    for(let level=1;level<=9;level++){
      const meta=MASTERY_META[level-1];const km=CAR_MASTERY_THRESHOLDS_KM[level-1];
      const card=document.createElement('div');
      card.style.cssText='min-width:0;border:1px solid #25364d;background:linear-gradient(180deg,rgba(20,30,48,.96),rgba(8,14,24,.98));padding:clamp(9px,1.7vh,15px);display:grid;grid-template-columns:minmax(70px,.8fr) minmax(0,1.25fr);align-items:center;gap:clamp(8px,1.4vw,16px);box-shadow:0 10px 28px rgba(0,0,0,.28);';
      const image=document.createElement('img');image.src=masteryWheelDataUri(level,{size:160,blackBackground:true});image.alt=`Maestría nivel ${level}`;image.draggable=false;image.style.cssText='display:block;width:min(100%,150px);aspect-ratio:1/1;object-fit:contain;margin:auto;filter:drop-shadow(0 5px 8px rgba(0,0,0,.5));';
      const info=document.createElement('div');
      info.innerHTML=`<div style="font-size:clamp(15px,2.5vh,22px);font-weight:950;color:#fff">NIVEL ${level}</div><div style="margin-top:4px;font-size:clamp(10px,1.6vh,13px);font-weight:900;color:${meta.material==='ORO'?'#ffe082':meta.material==='PLATA'?'#d9e0e6':'#e3a15f'}">${meta.material} · ${meta.spokes} RADIOS</div><div style="margin-top:5px;font-size:clamp(9px,1.45vh,12px);font-weight:800;color:#8fa5b9">${km.toLocaleString('es-ES')} KM</div>`;
      card.append(image,info);grid.appendChild(card);
    }
    overlay.appendChild(grid);
    root.appendChild(overlay);this._masteryPreview=overlay;
  }

  _removeAdminDom(){
    clearTimeout(this._adminToastTimer);
    // Revoke any generated object URLs on navigation/shutdown.
    try{this._webpToolDispose?.();}catch{}
    this._webpToolDispose=null;
    try{
      this._errorPreview?.remove?.();
      this._errorPreview=null;
      this._masteryPreview?.remove?.();
      if(this._adminDomRoot){
        this._adminDomRoot.style.pointerEvents='none';
        this._adminDomRoot.replaceChildren();
        this._adminDomRoot.remove();
      }
    }catch{}
    this._masteryPreview=null;
    this._adminDomRoot=null;
    this._adminDomToast=null;
  }

  _grantHomologationKit(){
    const garage=loadGarage();
    if(!garage.inventory||typeof garage.inventory!=='object')garage.inventory={};
    let added=0;
    for(const id of PART_IDS){
      if(Number(garage.inventory[id]||0)<1){garage.inventory[id]=1;added++;}
    }
    saveGarage(garage);
    this._showToast(added>0
      ?`KIT HOMOLOGACIÓN · ${added} PIEZAS AÑADIDAS`
      :`KIT HOMOLOGACIÓN · ${PART_IDS.length}/${PART_IDS.length} YA DISPONIBLES`
    );
  }

  _toggleFullCarAccess(){
    const enabled=toggleDevFullCarAccess();
    this._showToast(enabled
      ?'COCHES DEV · ACCESO COMPLETO ACTIVADO'
      :'COCHES DEV · PROGRESIÓN REAL ACTIVADA'
    );
  }

  _showToast(message){
    const t=this._adminDomToast;
    if(!t)return;
    t.textContent=message;
    t.style.display='block';
    clearTimeout(this._adminToastTimer);
    this._adminToastTimer=setTimeout(()=>{if(t.isConnected)t.style.display='none';},1800);
  }
}
