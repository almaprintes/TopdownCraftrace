import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopInventorySizingScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { qty, saveGarage } from '../garage/garageStore.js';

const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';
const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');

function isAdminMode(){
  try{return localStorage.getItem('tdr2:admin')==='1';}catch{return false;}
}

export class UpgradeShopScene extends PreviousWorkshop {
  _header(A,w,compact){
    super._header(A,w,compact);
    if(!isAdminMode())return;

    const bw=compact?128:176;
    const bh=compact?28:34;
    const inventoryX=w-(compact?210:270);
    const bx=inventoryX-(compact?126:168);
    const by=(compact?50:62)/2;

    const b=A(this.add.rectangle(bx,by,bw,bh,0x5b3410,.98)
      .setStrokeStyle(2,0xffa63c,.95)
      .setInteractive({useHandCursor:true}));
    A(this.add.text(bx,by,'KIT HOMOLOGACIÓN',{
      fontFamily:UI,fontSize:compact?'7px':'10px',fontStyle:'800',color:'#ffffff'
    }).setOrigin(.5));

    b.on('pointerup',()=>{
      if(this.busy)return;
      this._grantHomologationKit();
    });
  }

  _grantHomologationKit(){
    if(!isAdminMode())return false;
    if(!this.state.inventory||typeof this.state.inventory!=='object')this.state.inventory={};
    let added=0;
    for(const id of PART_IDS){
      if(qty(this.state,id)<1){
        this.state.inventory[id]=1;
        added++;
      }
    }
    saveGarage(this.state);
    this.render();
    const total=PART_IDS.length;
    if(added>0)this._toast?.(`KIT HOMOLOGACIÓN · ${added} PIEZAS AÑADIDAS · ${total}/${total} DISPONIBLES`);
    else this._toast?.(`KIT HOMOLOGACIÓN · ${total}/${total} PIEZAS YA DISPONIBLES`);
    return true;
  }
}
