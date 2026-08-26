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

    // The previous layer draws arrows for the whole homologation fleet. Cover
    // unavailable directions so player mode visually matches the unlock rules.
    if(this._mode==='admin'||devFullCarAccessEnabled())return;
    const allowed=this._allowedWorkshopCars();
    const index=allowed.indexOf(this.car);
    if(index<0)return;

    const spec=CAR_SPECS[this.car];
    const rowY=r.y+(compact?23:31);
    const stripX=r.x+8;
    const stripW=Math.max(120,r.w-(compact?75:92));
    const centerX=stripX+stripW/2;
    const arrowGap=Math.min(compact?92:132,stripW*.38);
    const approxNameWidth=Math.min(String(spec?.name||this.car).length*(compact?8:10),arrowGap*2-48);
    const halfName=Math.min(approxNameWidth/2,arrowGap-24);
    const leftX=Math.max(stripX+15,centerX-halfName-(compact?22:27));
    const rightX=Math.min(stripX+stripW-15,centerX+halfName+(compact?22:27));

    const cover=(x,glyph)=>{
      A(this.add.rectangle(x,rowY,compact?30:36,compact?26:30,0x081525,1)
        .setStrokeStyle(1,0x405262,.35));
      A(this.add.text(x,rowY,glyph,{fontFamily:'system-ui',fontSize:compact?'18px':'22px',fontStyle:'900',color:'#536777'}).setOrigin(.5));
    };
    if(index<=0)cover(leftX,'‹');
    if(index>=allowed.length-1)cover(rightX,'›');
  }
}
