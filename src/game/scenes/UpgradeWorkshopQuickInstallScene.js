import { UpgradeShopScene as PreviousWorkshop } from './UpgradeWorkshopStatSegmentsScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { qty, getEquippedForCar } from '../garage/garageStore.js';

const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const TIER_COLOR={1:0x66c6ff,2:0x4ee1a0,3:0xbf7cff,4:0xffc64d};
const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';

export class UpgradeShopScene extends PreviousWorkshop {
  _familyDock(A,r,compact){
    const eq=getEquippedForCar(this.state,this.car)||{};
    const g=A(this.add.graphics());
    g.fillStyle(0x03080b,.99);g.fillRoundedRect(r.x,r.y,r.w,r.h,9);
    g.lineStyle(1,0x243c46,.9);g.strokeRoundedRect(r.x,r.y,r.w,r.h,9);
    const gap=5,cw=(r.w-gap*4)/5;

    FAMILIES.forEach((family,i)=>{
      const x=r.x+i*(cw+gap),equippedId=eq[family]||null,item=equippedId?GARAGE_ITEMS[equippedId]:null;
      const q=A(this.add.rectangle(x+2,r.y+2,cw-4,r.h-4,0x081116).setOrigin(0)
        .setStrokeStyle(1,item?.tone||0x2b424c,.78).setInteractive({useHandCursor:true}));
      A(this.add.text(x+cw/2,r.y+(compact?11:15),FAMILY_LABEL[family],{fontFamily:'Arial Narrow,system-ui',fontSize:compact?'8px':'10px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
      if(item){
        A(this.add.text(x+cw/2,r.y+r.h*.56,`${item.name} · T${item.tier}`,{fontFamily:UI,fontSize:compact?'6px':'7px',fontStyle:'800',color:'#65dfff'}).setOrigin(.5));
      }
      A(this.add.text(x+cw/2,r.y+r.h-(compact?9:12),item?'TOCA PARA CAMBIAR':'TOCA PARA INSTALAR',{fontFamily:UI,fontSize:compact?'6px':'8px',fontStyle:'800',color:item?'#ffcf63':'#78dfff'}).setOrigin(.5));
      q.on('pointerup',()=>{if(!this.busy)this._openQuickFamilyInstall(family);});
    });
  }

  _openQuickFamilyInstall(family){
    try{this._quickFamilyModal?.destroy?.(true);}catch{}
    const {width,height}=this.scale,compact=height<520,cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(36000);this._quickFamilyModal=root;
    const A=o=>{root.add(o);return o;};
    const eq=getEquippedForCar(this.state,this.car)||{};
    const equippedId=eq[family]||null;
    const ids=Object.keys(GARAGE_ITEMS)
      .filter(id=>GARAGE_ITEMS[id]?.kind==='part'&&GARAGE_ITEMS[id]?.family===family)
      .filter(id=>qty(this.state,id)>0||id===equippedId)
      .sort((a,b)=>Number(GARAGE_ITEMS[a]?.tier||0)-Number(GARAGE_ITEMS[b]?.tier||0));

    const veil=A(this.add.rectangle(0,0,width,height,0x02070d,.90).setOrigin(0).setInteractive());
    const pw=Math.min(width-28,compact?820:900),ph=Math.min(height-22,compact?310:390),x=cx-pw/2,y=cy-ph/2;
    A(this.add.rectangle(x,y,pw,ph,0x08131d,.998).setOrigin(0).setStrokeStyle(2,0x45dfff,.95));
    A(this.add.text(cx,y+(compact?15:21),`PIEZAS · ${FAMILY_LABEL[family]}`,{fontFamily:UI,fontSize:compact?'19px':'25px',fontStyle:'800',color:'#fff'}).setOrigin(.5,0));
    A(this.add.text(cx,y+(compact?42:55),'INSTALA O DESINSTALA CON UN TOQUE',{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:'#8da8bd'}).setOrigin(.5,0));

    const close=()=>{try{root.destroy(true);}catch{}if(this._quickFamilyModal===root)this._quickFamilyModal=null;this.render();};
    const closeX=x+pw-(compact?20:26),closeY=y+(compact?20:26);
    const closeBtn=A(this.add.circle(closeX,closeY,compact?16:20,0x132a3b,.99).setStrokeStyle(2,0x45dfff,.8).setInteractive({useHandCursor:true}));
    A(this.add.text(closeX,closeY,'×',{fontFamily:UI,fontSize:compact?'18px':'22px',fontStyle:'800',color:'#fff'}).setOrigin(.5));
    closeBtn.on('pointerup',close);

    if(!ids.length){
      A(this.add.text(cx,cy,'NO TIENES PIEZAS DE ESTA FAMILIA EN EL INVENTARIO',{fontFamily:UI,fontSize:compact?'13px':'16px',fontStyle:'800',color:'#71879b'}).setOrigin(.5));
      return;
    }

    const cols=Math.min(4,ids.length),gap=compact?9:12,pad=compact?18:24,gridW=pw-pad*2;
    const cardW=(gridW-gap*(cols-1))/cols,cardH=ph-(compact?100:126),gridY=y+(compact?72:91);
    const startX=cx-(cardW*cols+gap*(cols-1))/2;

    ids.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id],installed=id===equippedId,tier=Number(item?.tier||1),accent=TIER_COLOR[tier]||0x45dfff,q=qty(this.state,id);
      const bx=startX+i*(cardW+gap),by=gridY;
      const card=A(this.add.rectangle(bx,by,cardW,cardH,installed?0x101821:0x0d1a24,.99).setOrigin(0)
        .setStrokeStyle(installed?3:2,accent,installed?.72:1));
      A(this.add.rectangle(bx+3,by+3,cardW-6,compact?7:9,accent,installed?.35:.95).setOrigin(0));
      const art={x:bx+8,y:by+9,w:cardW-16,h:cardH*.58};
      const loaded=this._loadFullBleed?.(A,item,art,()=>this._openQuickFamilyInstall(family));
      if(!loaded)A(this.add.text(bx+cardW/2,by+cardH*.36,item?.icon||'◆',{fontFamily:UI,fontSize:compact?'38px':'52px',color:'#fff'}).setOrigin(.5));
      A(this.add.text(bx+cardW/2,by+cardH*.67,String(item?.name||id).toUpperCase(),{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:installed?'#9aa7b0':'#fff',align:'center',wordWrap:{width:cardW-14}}).setOrigin(.5,0));
      A(this.add.text(bx+cardW/2,by+cardH*.79,`NIVEL ${tier}`,{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'800',color:'#a9bbca'}).setOrigin(.5));
      const action=installed?'DESINSTALAR':`INSTALAR · ×${q}`;
      A(this.add.text(bx+cardW/2,by+cardH-(compact?10:13),action,{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:installed?'#ffcf63':'#7ddcff'}).setOrigin(.5,1));
      if(installed){
        card.setInteractive({useHandCursor:true});
        card.on('pointerup',()=>{if(this._unequipFromInventory?.(id))close();});
      }else if(q>0){
        card.setInteractive({useHandCursor:true});
        card.on('pointerup',()=>{if(this._installFromInventory?.(id))close();});
      }
    });
    veil.on('pointerup',()=>{});
  }
}
