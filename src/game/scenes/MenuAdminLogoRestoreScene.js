import { MenuScene as CurrentMenuScene } from './MenuTrackNameFitScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, getEquippedForCar } from '../garage/garageStore.js';

const EVENT_MATERIAL_ASSETS={
  scrap:'chatarra.webp',
  alloy:'aleacion.webp',
  rubber:'goma.webp',
  compound:'compuesto.webp',
  disc:'disco_metalico.webp',
  spring:'muelle.webp',
  gear:'engranaje.webp',
  ecu:'electronica.webp'
};
const INVENTORY_PART_ASSETS={
  engine_street:'parts/engine/engine_street.webp',engine_sport:'parts/engine/engine_sport.webp',engine_racing:'parts/engine/engine_racing.webp',engine_prototype:'parts/engine/engine_prototype.webp',
  brakes_street:'parts/brakes/brakes_street.webp',brakes_sport:'parts/brakes/brakes_sport.webp',brakes_racing:'parts/brakes/brakes_racing.webp',brakes_prototype:'parts/brakes/brakes_prototype.webp',
  tires_street:'parts/tires/tires_street.webp',tires_sport:'parts/tires/tires_sport.webp',tires_racing:'parts/tires/tires_racing_t3.webp',tires_prototype:'parts/tires/tires_prototype_t4.webp',
  suspension_street:'parts/suspension/suspension_street_t1.webp',suspension_sport:'parts/suspension/suspension_sport_t2.webp',suspension_racing:'parts/suspension/suspension_racing_t3.webp',suspension_prototype:'parts/suspension/suspension_prototype_t4.webp',
  transmission_street:'parts/transmission/transmission_street_t1.webp',transmission_sport:'parts/transmission/transmission_sport_t2.webp',transmission_racing:'parts/transmission/transmission_racing_t3.webp',transmission_prototype:'parts/transmission/transmission_prototype_t4.webp'
};
const MATERIAL_IDS=Object.keys(EVENT_MATERIAL_ASSETS);
const TIER_COLOR={street:0x66c6ff,sport:0x4ee1a0,racing:0xbf7cff,prototype:0xffc64d};

export class MenuScene extends CurrentMenuScene {
  preload(){
    super.preload?.();
    const base=import.meta.env.BASE_URL||'/';
    for(const [id,file] of Object.entries(EVENT_MATERIAL_ASSETS)){
      const key=`event-material:${id}`;
      if(!this.textures?.exists?.(key))this.load.image(key,`${base}assets/crafting/materials/${file}`);
    }
    for(const [id,file] of Object.entries(INVENTORY_PART_ASSETS)){
      const key=`inventory-part:${id}`;
      if(!this.textures?.exists?.(key))this.load.image(key,`${base}assets/crafting/${file}`);
    }
  }

  renderUI(){
    super.renderUI();
    this._restoreAdminLogoAccess();
  }

  _openLobbyInventoryModal(tab='materials',page=0){
    try{this._lobbyInventoryModal?.destroy?.(true);}catch{}
    this._lobbyInventoryModal=null;

    const {width,height}=this.scale;
    const garage=loadGarage();
    const carId=(()=>{try{return localStorage.getItem('tdr2:carId')||'stock';}catch{return 'stock';}})();
    const equipped=getEquippedForCar(garage,carId)||{};
    const compact=height<520;
    const panelW=Math.min(width-28,compact?1000:980),panelH=Math.min(height-20,compact?440:520),cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(15000);
    this._ui?.add(root);
    this._lobbyInventoryModal=root;
    const A=o=>{root.add(o);return o;};

    const veil=A(this.add.rectangle(0,0,width,height,0x02070d,.86).setOrigin(0).setInteractive());
    A(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.995).setStrokeStyle(2,0x45dfff,.78));
    A(this.add.text(cx,cy-panelH/2+(compact?12:18),'INVENTARIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'23px':'28px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    A(this.add.text(cx,cy-panelH/2+(compact?42:55),`◈ ${Math.max(0,Math.floor(Number(garage.coins)||0))} MONEDAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'11px':'14px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));

    const tabY=cy-panelH/2+(compact?66:86),tabW=compact?145:170,tabH=compact?29:34,gap=10;
    const makeTab=(x,label,key)=>{
      const active=tab===key;
      const b=A(this.add.rectangle(x,tabY,tabW,tabH,active?0x17405a:0x0d1a24,.98).setStrokeStyle(active?2:1,active?0x45dfff:0x355064,active?1:.7).setInteractive({useHandCursor:true}));
      A(this.add.text(x,tabY,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'9px':'11px',fontStyle:'bold',color:active?'#ffffff':'#91a6b8'}).setOrigin(.5));
      b.on('pointerup',()=>this._openLobbyInventoryModal(key,0));
    };
    makeTab(cx-tabW/2-gap/2,'MATERIALES','materials');
    makeTab(cx+tabW/2+gap/2,'PIEZAS','parts');

    const cols=4,cardGap=compact?8:10,pad=22,gridW=panelW-pad*2,cardW=(gridW-cardGap*(cols-1))/cols;
    const gridY=tabY+tabH/2+(compact?12:18),bottomReserve=compact?56:70;
    const availableH=cy+panelH/2-bottomReserve-gridY;
    const rows=2,cardH=(availableH-cardGap)/rows;
    let ids=[];
    if(tab==='materials')ids=MATERIAL_IDS;
    else ids=Object.keys(INVENTORY_PART_ASSETS).filter(id=>Number(garage.inventory?.[id]||0)>0||Object.values(equipped).includes(id));
    const perPage=cols*rows,pages=Math.max(1,Math.ceil(ids.length/perPage));
    page=Math.max(0,Math.min(page,pages-1));
    const pageIds=ids.slice(page*perPage,page*perPage+perPage);

    if(tab==='parts'&&ids.length===0){
      A(this.add.text(cx,gridY+availableH/2,'AÚN NO TIENES PIEZAS\n\nFabrícalas en FACTORY y aparecerán aquí.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'13px':'16px',fontStyle:'bold',color:'#71879b',align:'center',lineSpacing:6}).setOrigin(.5));
    }

    pageIds.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id]||{},q=Math.max(0,Number(garage.inventory?.[id])||0),installed=Object.values(equipped).includes(id);
      const col=i%cols,row=Math.floor(i/cols),x=cx-gridW/2+col*(cardW+cardGap),y=gridY+row*(cardH+cardGap);
      const tier=String(item.tier?['','street','sport','racing','prototype'][item.tier]:'');
      const accent=installed?0x62ffb2:(TIER_COLOR[tier]||0x355064);
      A(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.98).setOrigin(0).setStrokeStyle(installed?2:1,accent,installed?1:.85));
      const key=tab==='materials'?`event-material:${id}`:`inventory-part:${id}`;
      if(this.textures?.exists?.(key)){
        const img=A(this.add.image(x+cardW/2,y+cardH*.42,key).setOrigin(.5));
        const maxW=cardW*(tab==='materials'?.72:.88),maxH=cardH*(tab==='materials'?.52:.64);
        const scale=Math.min(maxW/Math.max(1,img.width),maxH/Math.max(1,img.height));img.setScale(scale);
      }
      A(this.add.text(x+cardW/2,y+cardH*.72,String(item.name||id).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'7px':'9px',fontStyle:'bold',color:'#b8c8d7',align:'center',wordWrap:{width:cardW-12}}).setOrigin(.5,0));
      if(tab==='materials'){
        A(this.add.text(x+cardW/2,y+cardH-compact?18:24,`×${q}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'15px':'19px',fontStyle:'bold',color:'#62ffb2'}).setOrigin(.5,1));
      }else{
        A(this.add.text(x+cardW/2,y+cardH-(compact?20:25),installed?'INSTALADA':`EN INVENTARIO ×${q}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'7px':'9px',fontStyle:'bold',color:installed?'#62ffb2':'#9fd2ff'}).setOrigin(.5,1));
      }
    });

    const btnY=cy+panelH/2-(compact?24:30);
    if(pages>1){
      const pageText=A(this.add.text(cx,btnY,`${page+1}/${pages}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:compact?'9px':'11px',fontStyle:'bold',color:'#8fa4b6'}).setOrigin(.5));
      const prev=A(this.add.rectangle(cx-120,btnY,54,30,0x132a3b,.98).setStrokeStyle(1,0x45dfff,.55).setInteractive({useHandCursor:true}));
      const next=A(this.add.rectangle(cx+120,btnY,54,30,0x132a3b,.98).setStrokeStyle(1,0x45dfff,.55).setInteractive({useHandCursor:true}));
      A(this.add.text(cx-120,btnY,'‹',{fontFamily:'system-ui',fontSize:'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
      A(this.add.text(cx+120,btnY,'›',{fontFamily:'system-ui',fontSize:'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
      prev.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page-1+pages)%pages));
      next.on('pointerup',()=>this._openLobbyInventoryModal(tab,(page+1)%pages));
    }

    const closeX=cx+panelW/2-(compact?23:28),closeY=cy-panelH/2+(compact?22:27);
    const closeBg=A(this.add.circle(closeX,closeY,compact?17:20,0x132a3b,.98).setStrokeStyle(1,0x45dfff,.55).setInteractive({useHandCursor:true}));
    A(this.add.text(closeX,closeY,'×',{fontFamily:'system-ui',fontSize:compact?'18px':'22px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5));
    const close=()=>{try{root.destroy(true);}catch{}if(this._lobbyInventoryModal===root)this._lobbyInventoryModal=null;};
    closeBg.on('pointerup',close);
    veil.on('pointerup',()=>{});
  }

  _showEventRewardModal(event){
    if(!event||this._eventRewardModal?.scene)return;
    const {width,height}=this.scale;
    const items=Object.entries(event.reward?.items||{}).filter(([,n])=>Number(n)>0);
    const cols=Math.min(4,Math.max(1,items.length));
    const rows=Math.ceil(items.length/cols);
    const panelW=Math.min(width-36,Math.max(520,Math.min(780,190*cols+44)));
    const panelH=Math.min(height-20,Math.max(280,184+rows*94));
    const cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(12000);
    this._ui?.add(root);
    this._eventRewardModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.84).setOrigin(0).setInteractive();
    root.add(veil);
    root.add(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.995).setStrokeStyle(2,0x62ffb2,.78));
    root.add(this.add.text(cx,cy-panelH/2+16,'EVENTO COMPLETADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#62ffb2',letterSpacing:2}).setOrigin(.5,0));
    root.add(this.add.text(cx,cy-panelH/2+42,event.title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,cy-panelH/2+76,'PREMIO CONSEGUIDO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#aebdca',letterSpacing:1}).setOrigin(.5,0));

    const coins=Math.max(0,Number(event.reward?.coins)||0);
    if(coins)root.add(this.add.text(cx,cy-panelH/2+98,`◈ +${coins} MONEDAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));

    if(items.length){
      const gap=8,gridW=panelW-34,cardW=(gridW-gap*(cols-1))/cols,cardH=80,startX=cx-gridW/2,startY=cy-panelH/2+126;
      items.forEach(([id,n],i)=>{
        const item=GARAGE_ITEMS[id]||{};
        const col=i%cols,row=Math.floor(i/cols),x=startX+col*(cardW+gap),y=startY+row*(cardH+gap);
        root.add(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.98).setOrigin(0).setStrokeStyle(1,0x355064,.9));
        const key=`event-material:${id}`;
        if(this.textures?.exists?.(key)){
          const img=this.add.image(x+cardW/2,y+31,key).setOrigin(.5);
          const maxW=Math.max(44,cardW-28),maxH=48;
          const scale=Math.min(maxW/Math.max(1,img.width),maxH/Math.max(1,img.height));
          img.setScale(scale);
          root.add(img);
        }
        root.add(this.add.text(x+cardW/2,y+56,String(item.name||id),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#aebdca',align:'center',wordWrap:{width:cardW-10}}).setOrigin(.5,0));
        root.add(this.add.text(x+cardW/2,y+68,`+${Number(n)}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#62ffb2'}).setOrigin(.5,0));
      });
    }

    const btnY=cy+panelH/2-27;
    const btn=this.add.rectangle(cx,btnY,210,36,0x174b37,.98).setStrokeStyle(1,0x62ffb2,.85).setInteractive({useHandCursor:true});
    const label=this.add.text(cx,btnY,'CONTINUAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
    root.add([btn,label]);
    root.add(this.add.text(cx,btnY-24,'El premio ya está guardado en tu inventario',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#8295a8'}).setOrigin(.5,1));

    const close=()=>{try{root.destroy(true);}catch{}if(this._eventRewardModal===root)this._eventRewardModal=null;this.scene.restart();};
    btn.on('pointerup',close);
  }

  _restoreAdminLogoAccess(){
    const ui=this._ui;
    if(!ui)return;

    try{this._adminLogoHit?.destroy?.();}catch{}
    this._adminLogoHit=null;

    const barH=48;
    const hit=this.add.rectangle(8,4,80,barH-8,0x000000,0.001)
      .setOrigin(0)
      .setDepth(1000)
      .setInteractive({useHandCursor:true});
    ui.add(hit);
    this._adminLogoHit=hit;

    let pressTimer=null;
    const clearPress=()=>{
      if(pressTimer){
        try{this.time.removeEvent(pressTimer);}catch{}
        pressTimer=null;
      }
    };

    hit.on('pointerdown',()=>{
      clearPress();
      pressTimer=this.time.delayedCall(700,()=>{
        pressTimer=null;
        let nowAdmin='1';
        try{
          nowAdmin=localStorage.getItem('tdr2:admin')==='1'?'0':'1';
          localStorage.setItem('tdr2:admin',nowAdmin);
        }catch{}

        try{this._toast?.(nowAdmin==='1'?'ADMIN ON':'ADMIN OFF');}catch{}

        if(nowAdmin==='1'){
          this.scene.start('admin-hub');
        }else{
          this.renderUI();
        }
      });
    });

    hit.on('pointerup',clearPress);
    hit.on('pointerout',clearPress);
    hit.on('pointerupoutside',clearPress);
  }
}
