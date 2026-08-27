import { UpgradeShopScene as CurrentWorkshop } from './UpgradeWorkshopCompactRecipeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { devFullCarAccessEnabled, isCarUnlocked, STARTER_CAR_ID } from '../cars/carUnlocks.js';

const LEGACY_CAR_IDS=new Set(['stock','touring','power']);
const ALL_CAR_IDS=Object.keys(CAR_SPECS).filter(id=>!LEGACY_CAR_IDS.has(id)&&CAR_SPECS[id]);
const UI_FONT='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

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

  _header(A,w,compact){
    const h=compact?50:62;
    const top=6;
    const side=Math.max(10,Math.min(24,w*.014));
    const g=A(this.add.graphics());
    g.fillStyle(0x071226,.95);g.fillRoundedRect(side,top,w-side*2,h-8,12);
    g.lineStyle(1,0x46ddff,.32);g.strokeRoundedRect(side,top,w-side*2,h-8,12);
    g.lineStyle(2,0xe6b84e,.82);g.lineBetween(side+15,top+1,side+Math.min(260,w*.22),top+1);
    const cy=top+(h-8)/2;

    const back=A(this.add.text(side+15,cy,'←',{fontFamily:UI_FONT,fontSize:compact?'23px':'28px',fontStyle:'700',color:'#ffffff'}).setOrigin(0,.5).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>{if(!this.busy)this.scene.start('menu');});
    A(this.add.text(side+(compact?50:58),cy,'GARAJE',{fontFamily:UI_FONT,fontSize:compact?'15px':'19px',fontStyle:'700',color:'#ffffff'}).setOrigin(0,.5));
    A(this.add.text(w*.57,cy,'FABRICACIÓN',{fontFamily:UI_FONT,fontSize:compact?'20px':'26px',fontStyle:'700',color:'#ffffff'}).setOrigin(.5));
    A(this.add.text(w-side-14,cy,`●  ${Number(this.state?.coins||0).toLocaleString('es-ES')}`,{fontFamily:UI_FONT,fontSize:compact?'13px':'17px',fontStyle:'700',color:'#ffd45a'}).setOrigin(1,.5));
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
