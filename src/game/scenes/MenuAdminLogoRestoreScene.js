import { MenuScene as CurrentMenuScene } from './MenuTrackNameFitScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

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

export class MenuScene extends CurrentMenuScene {
  preload(){
    super.preload?.();
    const base=import.meta.env.BASE_URL||'/';
    for(const [id,file] of Object.entries(EVENT_MATERIAL_ASSETS)){
      const key=`event-material:${id}`;
      if(!this.textures?.exists?.(key))this.load.image(key,`${base}assets/crafting/materials/${file}`);
    }
  }

  renderUI(){
    super.renderUI();
    this._restoreAdminLogoAccess();
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
        }else{
          root.add(this.add.text(x+cardW/2,y+12,item.icon||'◆',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px'}).setOrigin(.5,0));
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
