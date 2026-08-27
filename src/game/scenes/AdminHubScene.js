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

    const root=document.createElement('div');
    root.className='tdr-admin-hub-dom';
    root.style.cssText='position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;box-sizing:border-box;padding:clamp(12px,2.5vh,22px) clamp(18px,4vw,54px);background:linear-gradient(180deg,#0b1020,#08111d);color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;user-select:none;-webkit-user-select:none;touch-action:manipulation;';

    const header=document.createElement('div');
    header.style.cssText='flex:0 0 auto;text-align:center;margin-bottom:clamp(8px,1.5vh,14px);';
    header.innerHTML='<div style="font-size:clamp(21px,4.2vh,34px);font-weight:900;color:#2bff88;letter-spacing:.02em">ADMIN HUB</div><div style="margin-top:3px;font-size:clamp(8px,1.5vh,11px);font-weight:800;color:#71879b;letter-spacing:.16em">HERRAMIENTAS INTERNAS</div>';

    const masteryPreview=document.createElement('button');
    masteryPreview.type='button';
    masteryPreview.textContent='VER 9 INSIGNIAS DE MAESTRÍA';
    masteryPreview.style.cssText='margin:clamp(7px,1.1vh,11px) auto 0;padding:clamp(7px,1.2vh,11px) clamp(14px,2.2vw,24px);border:1px solid #d8a52f;background:rgba(216,165,47,.08);color:#ffe082;font:900 clamp(9px,1.5vh,12px) system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.08em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
    masteryPreview.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this._showMasteryPreview();},{passive:false});
    header.appendChild(masteryPreview);
    root.appendChild(header);

    const grid=document.createElement('div');
    grid.style.cssText='flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:clamp(6px,1.3vh,11px) clamp(10px,1.4vw,18px);width:min(980px,100%);margin:0 auto;';
    root.appendChild(grid);

    const actions=[
      {label:'EDITAR COCHES',sub:'Garage · fichas y datos',accent:'#2bff88',run:()=>this._navigate('GarageScene',{mode:'admin'})},
      {label:'EDITAR PISTAS',sub:'Editor Bézier',accent:'#2bff88',run:()=>this._navigate('TrackEditorScene')},
      {label:'TRACK STUDIO',sub:'Diseño avanzado de trazado',accent:'#2bff88',run:()=>this._navigate('TrackStudioScene')},
      {label:'ENVIRONMENT BUILDER',sub:'Decoración y entorno',accent:'#e1b33b',run:()=>this._navigate('EnvironmentBuilderScene')},
      {label:'KIT HOMOLOGACIÓN',sub:'Garantiza 1 de cada pieza',accent:'#ffa63c',run:()=>this._grantHomologationKit()},
      {label:()=>`COCHES DEV · ${devFullCarAccessEnabled()?'ON':'OFF'}`,sub:()=>devFullCarAccessEnabled()?'Jugador ve toda la flota':'Jugador respeta desbloqueos',accent:'#35cfff',run:()=>this._toggleFullCarAccess()},
      {label:'GARAGE JUGADOR',sub:'Probar progresión / homologar',accent:'#35cfff',run:()=>this._navigate('GarageScene')},
      {label:'SALIR ADMIN',sub:'Volver al juego',accent:'#5c718e',run:()=>this._navigate('menu',{forcePlayer:true})}
    ];

    for(const action of actions){
      const b=document.createElement('button');
      b.type='button';
      const render=()=>{
        const label=typeof action.label==='function'?action.label():action.label;
        const sub=typeof action.sub==='function'?action.sub():action.sub;
        b.style.cssText=`min-width:0;min-height:0;border:2px solid ${action.accent};background:linear-gradient(180deg,rgba(20,27,51,.98),rgba(9,16,31,.98));color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(2px,.6vh,6px);padding:clamp(6px,1.2vh,12px);font:inherit;font-weight:900;letter-spacing:.02em;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;`;
        b.innerHTML=`<span style="font-size:clamp(12px,2.1vh,17px)">${label}</span><small style="font-size:clamp(7px,1.25vh,10px);font-weight:750;color:#93a6b7">${sub}</small>`;
      };
      render();
      b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action.run();render();},{passive:false});
      grid.appendChild(b);
    }

    const toast=document.createElement('div');
    toast.style.cssText='position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:2;display:none;padding:7px 12px;background:#071018;border:1px solid #ffa63c;color:#ffcf63;font-size:10px;font-weight:900;white-space:nowrap;';
    root.appendChild(toast);
    this._adminDomToast=toast;

    host.appendChild(root);
    this._adminDomRoot=root;
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
    try{
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
