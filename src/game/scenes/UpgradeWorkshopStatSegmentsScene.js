import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopCoinAssetScene.js';
import { GARAGE_ITEMS, findStripRecipe, statDeltaForPart } from '../garage/partsCatalog.js';
import { getEquippedForCar, garageDisplayStats } from '../garage/garageStore.js';
import { getBaseInternalStats, displayStat } from '../cars/performanceRating.js';

const STATS=[['speed','VELOCIDAD'],['accel','ACELERACIÓN'],['grip','AGARRE'],['control','CONTROL']];
const FAMILY_ORDER=['engine','transmission','tires','suspension','brakes'];
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};

const clamp200=n=>Math.max(0,Math.min(200,Math.round(Number(n)||0)));
function baseStats(spec){return getBaseInternalStats(spec);}


export class UpgradeShopScene extends PreviousWorkshop {
  _miniStats(A,spec,r,compact){
    const base=garageDisplayStats(spec,this.state,this.car);
    const equipped={...(getEquippedForCar(this.state,this.car)||{})};
    const recipe=findStripRecipe(this.slots);
    const preview=recipe?GARAGE_ITEMS[recipe.out]:null;
    const active={...equipped};
    if(preview?.kind==='part'&&preview.family)active[preview.family]=preview.id;

    const ultraShort=compact&&Number(this.scale?.height||0)<=390;
    const titleSize=ultraShort?'8px':compact?'9px':'12px';
    const labelSize=ultraShort?'6px':compact?'7px':'9px';
    const valueSize=ultraShort?'8px':compact?'9px':'11px';
    const startOffset=ultraShort?14:compact?17:22;
    const barOffset=ultraShort?9:compact?11:14;
    const barH=ultraShort?4:compact?5:7;

    A(this.add.text(r.x,r.y,'RENDIMIENTO',{fontFamily:'Arial Narrow,system-ui',fontSize:titleSize,fontStyle:'900',color:'#fff'}));
    const start=r.y+startOffset;
    // On very short landscape screens, fit the four rows to the real panel
    // height instead of enforcing the old 24 px minimum that pushed CONTROL out.
    const fittedRow=(r.h-startOffset-barOffset-barH)/Math.max(1,STATS.length-1);
    const row=ultraShort?Math.max(8,fittedRow):Math.max(compact?24:31,(r.h-(compact?18:24))/4);

    STATS.forEach(([key,label],i)=>{
      const y=start+i*row;
      const parts=[];
      let total=base[key];
      for(const family of FAMILY_ORDER){
        const id=active[family];
        const item=GARAGE_ITEMS[id];
        if(!item?.kind||item.kind!=='part')continue;
        const raw=Math.max(0,Number(statDeltaForPart(item)?.[key]||0));
        const room=Math.max(0,200-total);
        const value=Math.min(raw,room);
        if(value>0){
          parts.push({item,value,preview:preview?.id===id&&equipped[family]!==id});
          total+=value;
        }
      }

      A(this.add.text(r.x,y,label,{fontFamily:'system-ui',fontSize:labelSize,fontStyle:'800',color:'#d8e4e9'}));
      A(this.add.text(r.x+r.w,y,String(displayStat(clamp200(total))),{fontFamily:'Arial Narrow,system-ui',fontSize:valueSize,fontStyle:'900',color:'#fff'}).setOrigin(1,0));

      const by=y+barOffset,bh=barH;
      const g=A(this.add.graphics());
      g.fillStyle(0x14232a,1);g.fillRoundedRect(r.x,by,r.w,bh,bh/2);

      const unit=r.w/200;
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
