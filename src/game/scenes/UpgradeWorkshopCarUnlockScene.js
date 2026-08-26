import { UpgradeShopScene as CurrentWorkshop } from './UpgradeWorkshopInventorySizingScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { devFullCarAccessEnabled, isCarUnlocked, STARTER_CAR_ID } from '../cars/carUnlocks.js';

const LEGACY_CAR_IDS=new Set(['stock','touring','power']);
const ALL_CAR_IDS=Object.keys(CAR_SPECS).filter(id=>!LEGACY_CAR_IDS.has(id)&&CAR_SPECS[id]);

export class UpgradeShopScene extends CurrentWorkshop {
  _allowedWorkshopCars(){
    if(this._mode==='admin'||devFullCarAccessEnabled())return ALL_CAR_IDS;
    const unlocked=ALL_CAR_IDS.filter(id=>isCarUnlocked(id));
    return unlocked.length?unlocked:[STARTER_CAR_ID].filter(id=>CAR_SPECS[id]);
  }

  create(...args){
    super.create(...args);
    const allowed=this._allowedWorkshopCars();
    if(!allowed.includes(this.car)&&allowed.length){
      this.car=allowed[0];
      try{localStorage.setItem('tdr2:carId',this.car);}catch{}
      this.render?.();
    }
  }

  _browseWorkshopCar(delta){
    if(this.busy)return;
    const allowed=this._allowedWorkshopCars();
    if(!allowed.length)return;
    let index=allowed.indexOf(this.car);
    if(index<0)index=0;
    const next=index+Math.sign(Number(delta)||0);
    if(next<0||next>=allowed.length)return;
    this.car=allowed[next];
    try{localStorage.setItem('tdr2:carId',this.car);}catch{}
    this.render?.();
  }

  _compactCarPanel(A,r,compact){
    super._compactCarPanel(A,r,compact);

    if(this._mode==='admin'||devFullCarAccessEnabled())return;
    const allowed=this._allowedWorkshopCars();
    const index=allowed.indexOf(this.car);
    if(index<0)return;

    const geo=this._workshopNavGeometry;
    if(!geo)return;
    const cover=(x,glyph)=>{
      A(this.add.rectangle(x,geo.rowY,geo.buttonW,geo.buttonH,0x081525,1)
        .setStrokeStyle(1,0x405262,.35));
      A(this.add.text(x,geo.rowY,glyph,{
        fontFamily:'system-ui',fontSize:compact?'18px':'22px',fontStyle:'900',color:'#536777'
      }).setOrigin(.5));
    };
    if(index<=0)cover(geo.leftX,'‹');
    if(index>=allowed.length-1)cover(geo.rightX,'›');
  }
}
