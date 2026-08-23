import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, saveGarage } from '../garage/garageStore.js';

const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');
const UI='system-ui, -apple-system, Segoe UI, Roboto, Arial';

export class AdminHubScene extends BaseScene {
  constructor(){
    super('admin-hub');
  }

  create(){
    super.create();
    const {width,height}=this.scale;
    this.cameras.main.setBackgroundColor('#0b1020');

    const compact=height<520;
    const padX=Math.max(18,Math.floor(width*.045));
    const topH=compact?62:82;
    const bottomPad=compact?18:26;
    const gapX=compact?14:18;
    const gapY=compact?12:16;
    const cols=2,rows=3;
    const gridW=Math.min(width-padX*2,compact?900:980);
    const gridX=(width-gridW)/2;
    const gridY=topH;
    const availableH=height-gridY-bottomPad;
    const cardW=(gridW-gapX)/cols;
    const cardH=(availableH-gapY*(rows-1))/rows;

    this.add.text(width/2,compact?18:24,'ADMIN HUB',{
      fontFamily:UI,fontSize:compact?'22px':'28px',fontStyle:'bold',color:'#2bff88'
    }).setOrigin(.5,0);
    this.add.text(width/2,compact?43:57,'HERRAMIENTAS INTERNAS',{
      fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:'#71879b',letterSpacing:1
    }).setOrigin(.5,0);

    const actions=[
      {label:'EDITAR COCHES',sub:'Garage · fichas y datos',accent:0x2bff88,run:()=>this.scene.start('GarageScene',{mode:'admin'})},
      {label:'EDITAR PISTAS',sub:'Editor Bézier',accent:0x2bff88,run:()=>this.scene.start('TrackEditorScene')},
      {label:'TRACK STUDIO',sub:'Diseño avanzado de trazado',accent:0x2bff88,run:()=>this.scene.start('TrackStudioScene')},
      {label:'ENVIRONMENT BUILDER',sub:'Decoración y entorno',accent:0xe1b33b,run:()=>this.scene.start('EnvironmentBuilderScene')},
      {label:'KIT HOMOLOGACIÓN',sub:'Garantiza 1 de cada pieza',accent:0xffa63c,run:()=>this._grantHomologationKit()},
      {label:'SALIR ADMIN',sub:'Volver al juego',accent:0x5c718e,run:()=>this.scene.start('menu',{forcePlayer:true})}
    ];

    actions.forEach((a,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      const x=gridX+col*(cardW+gapX),y=gridY+row*(cardH+gapY);
      const hit=this.add.rectangle(x,y,cardW,cardH,0x141b33,.94)
        .setOrigin(0)
        .setStrokeStyle(2,a.accent,.72)
        .setInteractive({useHandCursor:true});
      const label=this.add.text(x+cardW/2,y+cardH*.42,a.label,{
        fontFamily:UI,fontSize:compact?'14px':'17px',fontStyle:'bold',color:'#ffffff',align:'center'
      }).setOrigin(.5);
      const sub=this.add.text(x+cardW/2,y+cardH*.68,a.sub,{
        fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'bold',color:'#93a6b7',align:'center'
      }).setOrigin(.5);
      label.setInteractive({useHandCursor:true});
      sub.setInteractive({useHandCursor:true});
      const run=()=>{if(this.input?.enabled!==false)a.run?.();};
      hit.on('pointerup',run);
      label.on('pointerup',run);
      sub.on('pointerup',run);
      hit.on('pointerdown',()=>hit.setFillStyle(0x1d2a42,.98));
      hit.on('pointerout',()=>hit.setFillStyle(0x141b33,.94));
      hit.on('pointerup',()=>hit.setFillStyle(0x141b33,.94));
    });
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
    const {width,height}=this.scale;
    try{this._adminToast?.destroy?.();}catch{}
    const t=this.add.text(width/2,height-14,message,{
      fontFamily:UI,fontSize:height<520?'10px':'12px',fontStyle:'bold',color:'#ffcf63',
      backgroundColor:'#071018',padding:{x:12,y:7}
    }).setOrigin(.5,1).setDepth(1000);
    this._adminToast=t;
    this.time.delayedCall(1800,()=>{if(this._adminToast===t)this._adminToast=null;t?.destroy?.();});
  }
}
