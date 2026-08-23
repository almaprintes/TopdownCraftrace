import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopCoinAssetScene.js';
import { GARAGE_ITEMS, findStripRecipe, statDeltaForPart } from '../garage/partsCatalog.js';
import { getEquippedForCar } from '../garage/garageStore.js';

const STATS=[['speed','VELOCIDAD'],['accel','ACELERACIÓN'],['grip','AGARRE'],['control','CONTROL']];
const FAMILY_ORDER=['engine','transmission','tires','suspension','brakes'];
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};

const clamp99=n=>Math.max(1,Math.min(99,Math.round(Number(n)||0)));
function baseStats(spec){
  if(spec?.designStats){
    const d=spec.designStats;
    return{
      speed:clamp99(d.VEL??55),
      accel:clamp99(d.ACC??55),
      grip:clamp99(((d.EST??55)+(d.GIR??55))/2),
      control:clamp99(((d.GIR??55)+(d.FRN??55))/2)
    };
  }
  return{
    speed:clamp99(((Number(spec?.maxFwd)||520)-400)/3.2+45),
    accel:clamp99(((Number(spec?.accel)||650)-500)/5+45),
    grip:clamp99(((Number(spec?.gripCoast)||.23)-.16)*260+50),
    control:clamp99(((Number(spec?.turnRate)||3.4)-2.7)*28+50)
  };
}

export class UpgradeShopScene extends PreviousWorkshop {
  _miniStats(A,spec,r,compact){
    const base=baseStats(spec);
    const equipped={...(getEquippedForCar(this.state,this.car)||{})};
    const recipe=findStripRecipe(this.slots);
    const preview=recipe?GARAGE_ITEMS[recipe.out]:null;
    const active={...equipped};
    if(preview?.kind==='part'&&preview.family)active[preview.family]=preview.id;

    A(this.add.text(r.x,r.y,'RENDIMIENTO',{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'12px',fontStyle:'900',color:'#fff'}));
    const start=r.y+(compact?17:22);
    const row=Math.max(compact?24:31,(r.h-(compact?18:24))/4);

    STATS.forEach(([key,label],i)=>{
      const y=start+i*row;
      const parts=[];
      let total=base[key];
      for(const family of FAMILY_ORDER){
        const id=active[family];
        const item=GARAGE_ITEMS[id];
        if(!item?.kind||item.kind!=='part')continue;
        const raw=Math.max(0,Number(statDeltaForPart(item)?.[key]||0));
        const room=Math.max(0,99-total);
        const value=Math.min(raw,room);
        if(value>0){
          parts.push({item,value,preview:preview?.id===id&&equipped[family]!==id});
          total+=value;
        }
      }

      A(this.add.text(r.x,y,label,{fontFamily:'system-ui',fontSize:compact?'7px':'9px',fontStyle:'800',color:'#d8e4e9'}));
      A(this.add.text(r.x+r.w,y,String(clamp99(total)),{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'9px':'11px',fontStyle:'900',color:'#fff'}).setOrigin(1,0));

      const by=y+(compact?11:14),bh=compact?5:7;
      const g=A(this.add.graphics());
      g.fillStyle(0x14232a,1);g.fillRoundedRect(r.x,by,r.w,bh,bh/2);

      const unit=r.w/99;
      let cursor=0;
      const baseWidth=Math.min(r.w,base[key]*unit);
      g.fillStyle(0xffffff,.96);g.fillRoundedRect(r.x,by,baseWidth,bh,bh/2);
      cursor=base[key];

      for(const seg of parts){
        const width=seg.value*unit;
        if(width<=0)continue;
        const color=TIER_COLOR[Number(seg.item.tier)||1]||0xffffff;
        g.fillStyle(color,seg.preview?.45:.98);
        g.fillRect(r.x+cursor*unit,by,width,bh);
        if(seg.preview){
          g.lineStyle(1,color,1);
          g.strokeRect(r.x+cursor*unit,by,width,bh);
        }
        cursor+=seg.value;
      }
    });
  }
}
