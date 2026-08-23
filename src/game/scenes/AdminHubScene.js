import { BaseScene } from './BaseScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, saveGarage } from '../garage/garageStore.js';

const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');

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

  _navigate(key,data){
    const root=this._adminDomRoot;
    if(root){
      root.style.pointerEvents='none';
      root.style.visibility='hidden';
    }
    // Let the browser finish the DOM click/touch before destroying the element
    // that received it. This avoids iOS leaving the following Phaser scene with
    // a stale gesture/capture state.
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
    header.style.cssText='flex:0 0 auto;text-align:center;margin-bottom:clamp(10px,2vh,18px);';
    header.innerHTML='<div style="font-size:clamp(21px,4.2vh,34px);font-weight:900;color:#2bff88;letter-spacing:.02em">ADMIN HUB</div><div style="margin-top:3px;font-size:clamp(8px,1.5vh,11px);font-weight:800;color:#71879b;letter-spacing:.16em">HERRAMIENTAS INTERNAS</div>';
    root.appendChild(header);

    const grid=document.createElement('div');
    grid.style.cssText='flex:1 1 auto;min-height:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));gap:clamp(8px,1.8vh,15px) clamp(10px,1.4vw,18px);width:min(980px,100%);margin:0 auto;';
    root.appendChild(grid);

    const actions=[
      {label:'EDITAR COCHES',sub:'Garage · fichas y datos',accent:'#2bff88',run:()=>this._navigate('GarageScene',{mode:'admin'})},
      {label:'EDITAR PISTAS',sub:'Editor Bézier',accent:'#2bff88',run:()=>this._navigate('TrackEditorScene')},
      {label:'TRACK STUDIO',sub:'Diseño avanzado de trazado',accent:'#2bff88',run:()=>this._navigate('TrackStudioScene')},
      {label:'ENVIRONMENT BUILDER',sub:'Decoración y entorno',accent:'#e1b33b',run:()=>this._navigate('EnvironmentBuilderScene')},
      {label:'KIT HOMOLOGACIÓN',sub:'Garantiza 1 de cada pieza',accent:'#ffa63c',run:()=>this._grantHomologationKit()},
      {label:'SALIR ADMIN',sub:'Volver al juego',accent:'#5c718e',run:()=>this._navigate('menu',{forcePlayer:true})}
    ];

    for(const action of actions){
      const b=document.createElement('button');
      b.type='button';
      b.style.cssText=`min-width:0;min-height:0;border:2px solid ${action.accent};background:linear-gradient(180deg,rgba(20,27,51,.98),rgba(9,16,31,.98));color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(3px,.8vh,8px);padding:clamp(8px,1.6vh,16px);font:inherit;font-weight:900;letter-spacing:.02em;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;`;
      b.innerHTML=`<span style="font-size:clamp(13px,2.4vh,19px)">${action.label}</span><small style="font-size:clamp(8px,1.45vh,11px);font-weight:750;color:#93a6b7">${action.sub}</small>`;
      b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();action.run();},{passive:false});
      grid.appendChild(b);
    }

    const toast=document.createElement('div');
    toast.style.cssText='position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:2;display:none;padding:7px 12px;background:#071018;border:1px solid #ffa63c;color:#ffcf63;font-size:10px;font-weight:900;white-space:nowrap;';
    root.appendChild(toast);
    this._adminDomToast=toast;

    host.appendChild(root);
    this._adminDomRoot=root;
  }

  _removeAdminDom(){
    clearTimeout(this._adminToastTimer);
    try{
      if(this._adminDomRoot){
        this._adminDomRoot.style.pointerEvents='none';
        this._adminDomRoot.replaceChildren();
        this._adminDomRoot.remove();
      }
    }catch{}
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

  _showToast(message){
    const t=this._adminDomToast;
    if(!t)return;
    t.textContent=message;
    t.style.display='block';
    clearTimeout(this._adminToastTimer);
    this._adminToastTimer=setTimeout(()=>{if(t.isConnected)t.style.display='none';},1800);
  }
}
