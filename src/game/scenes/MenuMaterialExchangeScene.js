import { MenuScene as CurrentMenuScene } from './MenuDuelModeScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, qty } from '../garage/garageStore.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { EXCHANGE_MATERIALS, MATERIAL_EXCHANGE_VALUE, MATERIAL_EXCHANGE_EFFICIENCY, materialExchangeStatus, quoteMaterialExchange, executeMaterialExchange } from '../store/materialExchange.js';

const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';

export class MenuScene extends CurrentMenuScene {
  _openStoreModal(section='materials'){
    super._openStoreModal(section);
    const root=this._storeModal;
    if(section!=='materials'||!root?.scene)return;
    const {width:w}=this.scale;
    const bw=156,bh=32,x=w-24-bw,y=71;
    const b=this.add.rectangle(x,y,bw,bh,0x143b36,.98).setOrigin(0).setStrokeStyle(2,0x5df0b0,.85).setInteractive({useHandCursor:true});
    const t=this.add.text(x+bw/2,y+bh/2,'♻  RECICLADORA',{fontFamily:UI,fontSize:'9px',fontStyle:'900',color:'#d9ffef'}).setOrigin(.5);
    root.add([b,t]);
    b.on('pointerdown',()=>this._openMaterialExchange());
  }

  _closeMaterialExchange(){
    try{this._materialExchangeModal?.destroy?.(true);}catch{}
    this._materialExchangeModal=null;
  }

  _openMaterialExchange(fromId=this._exchangeFrom||'scrap',toId=this._exchangeTo||'compound',amount=this._exchangeAmount||100){
    this._closeMaterialExchange();
    const {width:w,height:h}=this.scale;
    const compact=h<520;
    const root=this.add.container(0,0).setDepth(22000);this._materialExchangeModal=root;
    const A=o=>{root.add(o);return o;};
    const garage=loadGarage();
    if(!EXCHANGE_MATERIALS.includes(fromId))fromId='scrap';
    if(!EXCHANGE_MATERIALS.includes(toId)||toId===fromId)toId=fromId==='compound'?'ecu':'compound';
    amount=Math.max(1,Math.min(qty(garage,fromId),Math.floor(Number(amount)||1)));
    this._exchangeFrom=fromId;this._exchangeTo=toId;this._exchangeAmount=amount;

    A(this.add.rectangle(0,0,w,h,0x02070d,.93).setOrigin(0).setInteractive());
    const pw=Math.min(w-24,1040),ph=Math.min(h-20,compact?390:500),x=(w-pw)/2,y=(h-ph)/2;
    A(this.add.rectangle(x,y,pw,ph,0x081522,.998).setOrigin(0).setStrokeStyle(2,0x5df0b0,.85));
    A(this.add.text(x+24,y+(compact?14:20),'RECICLADORA DE MATERIALES',{fontFamily:UI,fontSize:compact?'19px':'25px',fontStyle:'900',color:'#ffffff'}));
    A(this.add.text(x+24,y+(compact?39:52),'Convierte excedentes en el material que necesitas · cada intercambio requiere un vídeo recompensado',{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'700',color:'#9db2c5'}));
    const status=materialExchangeStatus();
    A(this.add.text(x+pw-64,y+(compact?19:27),`${status.remaining}/3 HOY`,{fontFamily:UI,fontSize:compact?'11px':'14px',fontStyle:'900',color:status.available?'#71f0b2':'#ff707a'}).setOrigin(1,0));
    const close=A(this.add.text(x+pw-24,y+16,'×',{fontFamily:UI,fontSize:compact?'22px':'28px',fontStyle:'900',color:'#fff'}).setOrigin(1,0).setInteractive({useHandCursor:true}));
    close.on('pointerdown',()=>this._closeMaterialExchange());

    const rowLabel=(yy,label,color)=>A(this.add.text(x+24,yy,label,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color}));
    const fromY=y+(compact?72:92),toY=y+(compact?148:190);
    rowLabel(fromY,'ENTREGAS','#ffbe68');
    rowLabel(toY,'RECIBES','#72efb4');

    const drawMaterialRow=(yy,selected,onPick,exclude=null)=>{
      const startX=x+112,gap=compact?5:7,availableW=pw-136,cw=(availableW-gap*7)/8,ch=compact?54:68;
      EXCHANGE_MATERIALS.forEach((id,i)=>{
        const item=GARAGE_ITEMS[id],disabled=id===exclude,on=id===selected,bx=startX+i*(cw+gap);
        const border=on?0x5df0b0:(disabled?0x283642:0x4b6678),bg=on?0x12352d:0x0d1b28;
        const hit=A(this.add.rectangle(bx,yy-5,cw,ch,bg,disabled?.42:.98).setOrigin(0).setStrokeStyle(on?2:1,border,on?1:.7));
        A(this.add.text(bx+cw/2,yy+(compact?8:10),String(item?.name||id).toUpperCase(),{fontFamily:UI,fontSize:compact?'6px':'8px',fontStyle:'900',color:disabled?'#5d6a74':'#fff',align:'center',wordWrap:{width:cw-5}}).setOrigin(.5,0));
        A(this.add.text(bx+cw/2,yy+(compact?31:40),`×${qty(garage,id)}`,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:disabled?'#58636d':'#77dfff'}).setOrigin(.5));
        A(this.add.text(bx+cw/2,yy+(compact?43:55),`V ${MATERIAL_EXCHANGE_VALUE[id]}`,{fontFamily:UI,fontSize:compact?'5px':'6px',fontStyle:'800',color:'#8197a8'}).setOrigin(.5));
        if(!disabled){hit.setInteractive({useHandCursor:true});hit.on('pointerdown',()=>onPick(id));}
      });
    };
    drawMaterialRow(fromY,fromId,id=>{this._exchangeFrom=id;const have=qty(loadGarage(),id);this._exchangeAmount=Math.min(Math.max(1,this._exchangeAmount||100),Math.max(1,have));this._openMaterialExchange(id,toId,this._exchangeAmount);},toId);
    drawMaterialRow(toY,toId,id=>{this._exchangeTo=id;this._openMaterialExchange(fromId,id,amount);},fromId);

    const controlsY=y+(compact?222:286);
    const currentHave=qty(garage,fromId);
    const presets=[25,100,250,'MAX'];
    A(this.add.text(x+24,controlsY,'CANTIDAD A ENTREGAR',{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'900',color:'#aebfd0'}));
    let bx=x+158;
    presets.forEach(p=>{
      const val=p==='MAX'?currentHave:Math.min(currentHave,p);
      const on=(p==='MAX'&&amount===currentHave)||(p!=='MAX'&&amount===val);
      const bw=compact?56:68,bh=compact?25:31;
      const hit=A(this.add.rectangle(bx,controlsY-7,bw,bh,on?0x1b4d3d:0x112538,.98).setOrigin(0).setStrokeStyle(on?2:1,on?0x5df0b0:0x496477,.8));
      A(this.add.text(bx+bw/2,controlsY-7+bh/2,String(p),{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'900',color:val>0?'#fff':'#53606a'}).setOrigin(.5));
      if(val>0){hit.setInteractive({useHandCursor:true});hit.on('pointerdown',()=>this._openMaterialExchange(fromId,toId,val));}
      bx+=bw+(compact?6:8);
    });

    const quote=quoteMaterialExchange(fromId,toId,amount);
    const summaryY=y+(compact?268:342);
    const fromName=GARAGE_ITEMS[fromId]?.name||fromId,toName=GARAGE_ITEMS[toId]?.name||toId;
    const receive=quote.ok?quote.receive:0;
    A(this.add.rectangle(x+24,summaryY,pw-48,compact?54:68,0x0b1b27,.98).setOrigin(0).setStrokeStyle(1,quote.ok?0x5df0b0:0xff6670,.55));
    A(this.add.text(x+42,summaryY+(compact?11:15),`${amount} ${fromName.toUpperCase()}  →  ${receive} ${toName.toUpperCase()}`,{fontFamily:UI,fontSize:compact?'13px':'17px',fontStyle:'900',color:quote.ok?'#ffffff':'#ff9aa1'}));
    A(this.add.text(x+42,summaryY+(compact?34:43),`EFICIENCIA ${Math.round(MATERIAL_EXCHANGE_EFFICIENCY*100)}% · el 25% de valor se pierde en reciclaje`,{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'700',color:'#8fa6b7'}));

    const btnY=y+ph-(compact?48:60),btnH=compact?34:42,btnW=Math.min(360,pw*.42),btnX=x+pw-btnW-24;
    const enabled=status.available&&quote.ok&&currentHave>=amount;
    const btn=A(this.add.rectangle(btnX,btnY,btnW,btnH,enabled?0x17683f:0x293342,.99).setOrigin(0).setStrokeStyle(2,enabled?0x5df0b0:0x526171,.9));
    const label=!status.available?'LÍMITE DIARIO ALCANZADO':quote.ok?'▶  INTERCAMBIAR':'AJUSTA LA CANTIDAD';
    A(this.add.text(btnX+btnW/2,btnY+btnH/2,label,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:enabled?'#fff':'#aab6c1'}).setOrigin(.5));
    A(this.add.text(x+24,btnY+btnH/2,'3 intercambios al día · sin coste en monedas',{fontFamily:UI,fontSize:compact?'7px':'9px',fontStyle:'800',color:'#7f94a6'}).setOrigin(0,.5));
    if(enabled){
      btn.setInteractive({useHandCursor:true});
      btn.on('pointerdown',async()=>{
        const ok=await showRewardedAd(this,{title:'RECICLAJE DE MATERIALES'});
        if(!ok)return;
        const result=executeMaterialExchange(fromId,toId,amount);
        this._toastStore?.(result.ok?`${result.spend} ${fromName} → ${result.receive} ${toName}`:result.reason,result.ok);
        if(result.ok){this._exchangeAmount=Math.min(amount,Math.max(1,qty(loadGarage(),fromId)));}
        this._openMaterialExchange(fromId,toId,this._exchangeAmount);
      });
    }
  }
}
