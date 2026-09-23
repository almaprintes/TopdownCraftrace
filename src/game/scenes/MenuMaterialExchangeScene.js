import { MenuScene as CurrentMenuScene } from './MenuDuelModeScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, qty } from '../garage/garageStore.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { recyclerRewardedClaimId, recyclerRewardedPlacement, verifiedReward } from '../monetization/rewardedActions.js';
import { EXCHANGE_MATERIALS, MATERIAL_EXCHANGE_VALUE, MATERIAL_EXCHANGE_EFFICIENCY, materialExchangeStatus, quoteMaterialExchange, executeMaterialExchange } from '../store/materialExchange.js';

const UI='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';

export class MenuScene extends CurrentMenuScene {
  _openStoreModal(section='materials'){
    super._openStoreModal(section);
    const root=this._storeModal;
    if(!root?.scene)return;
    const {width:w}=this.scale;
    const bw=156,bh=32,x=w-24-bw,y=71;
    const b=this.add.rectangle(x,y,bw,bh,0x143b36,.98).setOrigin(0).setStrokeStyle(2,0x5df0b0,.85).setInteractive({useHandCursor:true});
    const t=this.add.text(x+bw/2,y+bh/2,'♻  RECICLADORA',{fontFamily:UI,fontSize:'9px',fontStyle:'900',color:'#d9ffef'}).setOrigin(.5);
    root.add([b,t]);
    b.on('pointerdown',()=>this._openMaterialExchange());
  }

  _confirmStoreSpend({title='CONFIRMAR COMPRA',detail='',confirm='COMPRAR',onConfirm}={}){
    try{this._storeConfirmModal?.destroy?.(true);}catch{}
    const {width:w,height:h}=this.scale,compact=h<520;
    const root=this.add.container(0,0).setDepth(60000);this._storeConfirmModal=root;
    // Hide the store while the Phaser confirmation is open. The store text
    // otherwise remains visible through/over the modal on iOS WebGL.
    const store=this._storeModal,storeWasVisible=!!store?.visible;
    try{if(store?.scene)store.setVisible(false);}catch{}
    const A=o=>{root.add(o);return o;};
    A(this.add.rectangle(0,0,w,h,0x02070d,.82).setOrigin(0).setInteractive());
    const pw=Math.min(w-40,compact?500:560),ph=compact?190:220,x=(w-pw)/2,y=(h-ph)/2;
    A(this.add.rectangle(x,y,pw,ph,0x0a1726,1).setOrigin(0).setStrokeStyle(2,0x49c8ff,.9));
    A(this.add.text(x+24,y+22,title,{fontFamily:UI,fontSize:compact?'18px':'22px',fontStyle:'900',color:'#fff'}));
    A(this.add.text(x+24,y+(compact?57:66),'¿Seguro que quieres realizar esta compra?',{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'700',color:'#c6d5e2'}));
    A(this.add.text(x+24,y+(compact?83:98),detail,{fontFamily:UI,fontSize:compact?'13px':'16px',fontStyle:'900',color:'#ffd85a',wordWrap:{width:pw-48}}));
    const bh=compact?36:42,gap=12,bw=(pw-48-gap)/2,by=y+ph-bh-20;
    const cancel=A(this.add.rectangle(x+24,by,bw,bh,0x202b38,1).setOrigin(0).setStrokeStyle(1,0x607286,.9).setInteractive({useHandCursor:true}));
    A(this.add.text(x+24+bw/2,by+bh/2,'CANCELAR',{fontFamily:UI,fontSize:compact?'10px':'12px',fontStyle:'900',color:'#d7e0e8'}).setOrigin(.5));
    const accept=A(this.add.rectangle(x+24+bw+gap,by,bw,bh,0x17683f,1).setOrigin(0).setStrokeStyle(2,0x5df0b0,.9).setInteractive({useHandCursor:true}));
    A(this.add.text(x+24+bw+gap+bw/2,by+bh/2,confirm,{fontFamily:UI,fontSize:compact?'10px':'12px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
    const close=()=>{try{root.destroy(true);}catch{}this._storeConfirmModal=null;try{if(store?.scene&&storeWasVisible)store.setVisible(true);}catch{}};
    cancel.on('pointerdown',close);
    accept.on('pointerdown',()=>{close();onConfirm?.();});
  }

  _buyButton(card,w,h,label,fn,enabled=true,accent=0x48cf8b,showCoin=false){
    const needsConfirmation=enabled&&(showCoin||/€/.test(String(label||'')));
    const action=needsConfirmation?()=>this._confirmStoreSpend({detail:String(label||''),onConfirm:fn}):fn;
    return super._buyButton(card,w,h,label,action,enabled,accent,showCoin);
  }

  _closeMaterialExchange(){
    try{this._materialExchangeModal?.destroy?.(true);}catch{}
    this._materialExchangeModal=null;
    try{if(this._storeModal?.scene)this._storeModal.setVisible(true);}catch{}
  }

  _openMaterialExchange(fromId=this._exchangeFrom||'scrap',toId=this._exchangeTo||'compound',amount=this._exchangeAmount||100,openPicker=null){
    this._closeMaterialExchange();
    try{if(this._storeModal?.scene)this._storeModal.setVisible(false);}catch{}
    const {width:w,height:h}=this.scale;
    const compact=h<520;
    const root=this.add.container(0,0).setDepth(50000);this._materialExchangeModal=root;
    const A=o=>{root.add(o);return o;};
    const garage=loadGarage();
    if(!EXCHANGE_MATERIALS.includes(fromId))fromId='scrap';
    if(!EXCHANGE_MATERIALS.includes(toId)||toId===fromId)toId=fromId==='compound'?'ecu':'compound';
    amount=Math.max(1,Math.min(qty(garage,fromId),Math.floor(Number(amount)||1)));
    this._exchangeFrom=fromId;this._exchangeTo=toId;this._exchangeAmount=amount;

    A(this.add.rectangle(0,0,w,h,0x02070d,1).setOrigin(0).setInteractive());
    const pw=Math.min(w-30,compact?720:780),ph=Math.min(h-24,compact?320:370),x=(w-pw)/2,y=(h-ph)/2;
    A(this.add.rectangle(x,y,pw,ph,0x081522,1).setOrigin(0).setStrokeStyle(2,0x5df0b0,.9));
    A(this.add.text(x+24,y+(compact?14:18),'RECICLADORA DE MATERIALES',{fontFamily:UI,fontSize:compact?'18px':'23px',fontStyle:'900',color:'#ffffff'}));
    A(this.add.text(x+24,y+(compact?39:49),'Convierte excedentes para completar tus piezas',{fontFamily:UI,fontSize:compact?'10px':'12px',fontStyle:'700',color:'#a9bfd0'}));
    const status=materialExchangeStatus();
    const requiresVideo=status.used>=1;
    A(this.add.text(x+pw-58,y+(compact?18:23),`${status.remaining}/3 HOY`,{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'900',color:status.available?'#71f0b2':'#ff707a'}).setOrigin(1,0));
    const close=A(this.add.text(x+pw-20,y+10,'×',{fontFamily:UI,fontSize:compact?'25px':'30px',fontStyle:'900',color:'#fff'}).setOrigin(1,0).setInteractive({useHandCursor:true}));
    close.on('pointerdown',()=>this._closeMaterialExchange());

    const selectorY=y+(compact?74:92),selectorH=compact?58:68,selectorW=(pw-(compact?112:136))/2;
    const leftX=x+24,rightX=x+pw-24-selectorW;
    const materialName=id=>String(GARAGE_ITEMS[id]?.name||id).toUpperCase();
    const drawSelector=(sx,label,id,tone,picker)=>{
      A(this.add.text(sx,selectorY-(compact?18:21),label,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:tone}));
      const hit=A(this.add.rectangle(sx,selectorY,selectorW,selectorH,0x102434,.99).setOrigin(0).setStrokeStyle(2,tone==='#ffbe68'?0xd89548:0x50dca2,.9).setInteractive({useHandCursor:true}));
      A(this.add.text(sx+14,selectorY+selectorH*.36,materialName(id),{fontFamily:UI,fontSize:compact?'13px':'16px',fontStyle:'900',color:'#fff'}).setOrigin(0,.5));
      A(this.add.text(sx+14,selectorY+selectorH*.72,`TIENES ${qty(garage,id)}  ·  VALOR ${MATERIAL_EXCHANGE_VALUE[id]}`,{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:'#9fc0d4'}).setOrigin(0,.5));
      A(this.add.text(sx+selectorW-15,selectorY+selectorH/2,'▼',{fontFamily:UI,fontSize:compact?'11px':'13px',fontStyle:'900',color:'#d9f5ff'}).setOrigin(.5));
      hit.on('pointerdown',()=>this._openMaterialExchange(fromId,toId,amount,picker));
    };
    drawSelector(leftX,'ENTREGAS',fromId,'#ffbe68','from');
    drawSelector(rightX,'RECIBES',toId,'#72efb4','to');
    A(this.add.text(x+pw/2,selectorY+selectorH/2,'→',{fontFamily:UI,fontSize:compact?'24px':'30px',fontStyle:'900',color:'#ffffff'}).setOrigin(.5));

    const controlsY=selectorY+selectorH+(compact?29:36);
    A(this.add.text(x+24,controlsY,'CANTIDAD',{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:'#aebfd0'}).setOrigin(0,.5));
    const currentHave=qty(garage,fromId),presets=[25,100,250,'MAX'];
    let bx=x+(compact?105:122);
    presets.forEach(p=>{
      const val=p==='MAX'?currentHave:Math.min(currentHave,p);
      const on=(p==='MAX'&&amount===currentHave)||(p!=='MAX'&&amount===val);
      const bw=compact?57:66,bh=compact?27:31;
      const hit=A(this.add.rectangle(bx,controlsY-bh/2,bw,bh,on?0x1b4d3d:0x112538,.98).setOrigin(0).setStrokeStyle(on?2:1,on?0x5df0b0:0x496477,.85));
      A(this.add.text(bx+bw/2,controlsY,String(p),{fontFamily:UI,fontSize:compact?'9px':'10px',fontStyle:'900',color:val>0?'#fff':'#53606a'}).setOrigin(.5));
      if(val>0){hit.setInteractive({useHandCursor:true});hit.on('pointerdown',()=>this._openMaterialExchange(fromId,toId,val));}
      bx+=bw+(compact?6:8);
    });

    const quote=quoteMaterialExchange(fromId,toId,amount),receive=quote.ok?quote.receive:0;
    const summaryY=controlsY+(compact?31:38),summaryH=compact?54:64;
    A(this.add.rectangle(x+24,summaryY,pw-48,summaryH,0x0b1b27,.98).setOrigin(0).setStrokeStyle(1,quote.ok?0x5df0b0:0xff6670,.6));
    A(this.add.text(x+42,summaryY+(compact?11:13),`${amount} ${materialName(fromId)}  →  ${receive} ${materialName(toId)}`,{fontFamily:UI,fontSize:compact?'13px':'16px',fontStyle:'900',color:quote.ok?'#ffffff':'#ff9aa1'}));
    A(this.add.text(x+42,summaryY+(compact?34:39),`COMISIÓN DE RECICLAJE: ${Math.round((1-MATERIAL_EXCHANGE_EFFICIENCY)*100)}%  ·  protege el valor de los materiales`,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'800',color:'#ffcf7b'}));

    const btnH=compact?34:40,btnY=y+ph-btnH-(compact?14:18),btnW=compact?255:300,btnX=x+pw-btnW-24;
    const enabled=status.available&&quote.ok&&currentHave>=amount;
    const btn=A(this.add.rectangle(btnX,btnY,btnW,btnH,enabled?0x17683f:0x293342,.99).setOrigin(0).setStrokeStyle(2,enabled?0x5df0b0:0x526171,.9));
    const label=!status.available?'LÍMITE DIARIO ALCANZADO':quote.ok?(requiresVideo?'▶  VER VÍDEO E INTERCAMBIAR':'INTERCAMBIAR GRATIS'):'AJUSTA LA CANTIDAD';
    A(this.add.text(btnX+btnW/2,btnY+btnH/2,label,{fontFamily:UI,fontSize:compact?'9px':'11px',fontStyle:'900',color:enabled?'#fff':'#aab6c1'}).setOrigin(.5));
    A(this.add.text(x+24,btnY+btnH/2,'1.º gratis · 2.º y 3.º con vídeo',{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'800',color:'#8fa6b7'}).setOrigin(0,.5));
    if(enabled){btn.setInteractive({useHandCursor:true});btn.on('pointerdown',()=>{
      this._confirmStoreSpend({title:'CONFIRMAR INTERCAMBIO',detail:`${amount} ${materialName(fromId)}  →  ${receive} ${materialName(toId)}${requiresVideo?' · REQUIERE VÍDEO':' · PRIMER CAMBIO GRATIS'}`,confirm:'CONFIRMAR',onConfirm:async()=>{
        if(requiresVideo){const ordinal=status.nextOrdinal;const ad=await showRewardedAd(this,{title:'RECICLAJE DE MATERIALES',placement:recyclerRewardedPlacement(ordinal),claimId:recyclerRewardedClaimId(status.day,ordinal)});if(!verifiedReward(ad)){this._toastStore?.('VÍDEO NO COMPLETADO',false);return;}}
        const result=executeMaterialExchange(fromId,toId,amount);this._toastStore?.(result.ok?`${result.spend} ${materialName(fromId)} → ${result.receive} ${materialName(toId)}`:result.reason,result.ok);if(result.ok)this._exchangeAmount=Math.min(amount,Math.max(1,qty(loadGarage(),fromId)));this._openMaterialExchange(fromId,toId,this._exchangeAmount);
      }});
    });}

    if(openPicker==='from'||openPicker==='to'){
      const pickFrom=openPicker==='from',anchorX=pickFrom?leftX:rightX,py=selectorY+selectorH+4;
      const options=EXCHANGE_MATERIALS.filter(id=>id!==(pickFrom?toId:fromId));
      const oh=compact?27:31,boxH=options.length*oh;
      A(this.add.rectangle(anchorX,py,selectorW,boxH,0x07131f,1).setOrigin(0).setStrokeStyle(2,0x65d9c1,.95));
      options.forEach((id,i)=>{
        const yy=py+i*oh;
        const hit=A(this.add.rectangle(anchorX,yy,selectorW,oh,i%2?0x0c1d2b:0x102434,.99).setOrigin(0).setInteractive({useHandCursor:true}));
        A(this.add.text(anchorX+11,yy+oh/2,`${materialName(id)}   ×${qty(garage,id)}`,{fontFamily:UI,fontSize:compact?'8px':'10px',fontStyle:'900',color:'#ffffff'}).setOrigin(0,.5));
        hit.on('pointerdown',()=>{if(pickFrom){const have=qty(loadGarage(),id);this._openMaterialExchange(id,toId,Math.min(Math.max(1,amount),Math.max(1,have)));}else this._openMaterialExchange(fromId,id,amount);});
      });
    }
  }
}

// DEV 1.1.133 validation trigger: purchase confirmation visually isolates the underlying store; syntax corrected.
