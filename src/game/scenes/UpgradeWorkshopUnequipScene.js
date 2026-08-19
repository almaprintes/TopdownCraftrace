import { UpgradeShopScene as UnifiedWorkshop } from './UpgradeWorkshopUnifiedStyleScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { getEquippedForCar, saveGarage } from '../garage/garageStore.js';

const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};

export class UpgradeShopScene extends UnifiedWorkshop {
  _familyDock(A,r,compact){
    const eq=getEquippedForCar(this.state,this.car)||{};
    const g=A(this.add.graphics());
    g.fillStyle(0x03080b,.99);
    g.fillRoundedRect(r.x,r.y,r.w,r.h,9);
    g.lineStyle(1,0x243c46,.9);
    g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);

    const gap=5,cw=(r.w-gap*4)/5;

    FAMILIES.forEach((f,i)=>{
      const x=r.x+i*(cw+gap);
      const item=eq[f]?GARAGE_ITEMS[eq[f]]:null;
      const on=this.filter==='parts'&&this.selectedFamily===f;
      const q=A(this.add.rectangle(x+2,r.y+2,cw-4,r.h-4,on?0x123142:0x081116)
        .setOrigin(0)
        .setStrokeStyle(on?2:1,on?0x36d7ff:(item?.tone||0x2b424c),on?1:.7)
        .setInteractive({useHandCursor:true}));

      A(this.add.text(x+cw/2,r.y+(compact?11:15),FAMILY_LABEL[f],{
        fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:on?'#8eeaff':'#fff'
      }).setOrigin(.5));

      A(this.add.text(x+cw/2,r.y+r.h-(compact?9:12),item?'TOCA PARA QUITAR':'SIN EQUIPAR',{
        fontFamily:'system-ui',fontSize:compact?'6px':'8px',fontStyle:'800',color:item?'#ffcf63':'#637780'
      }).setOrigin(.5));

      if(item){
        A(this.add.text(x+cw/2,r.y+r.h*.56,`${item.name} · T${item.tier}`,{
          fontFamily:'system-ui',fontSize:compact?'6px':'7px',fontStyle:'800',color:'#65dfff'
        }).setOrigin(.5));
      }

      q.on('pointerdown',()=>{
        if(this.busy)return;
        if(item){
          if(!this.state.equippedByCar||typeof this.state.equippedByCar!=='object')this.state.equippedByCar={};
          if(!this.state.equippedByCar[this.car])this.state.equippedByCar[this.car]={...(getEquippedForCar(this.state,this.car)||{})};
          delete this.state.equippedByCar[this.car][f];
          saveGarage(this.state);
          this.render();
          return;
        }
        this.selectedFamily=f;
        this.filter='parts';
        this.render();
      });
    });
  }
}
