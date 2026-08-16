import { SettingsScene as CurrentSettingsScene } from './SettingsAVOptionsScene.js';

const TUTORIAL_KEYS = [1,2,3,4,5].map(i => `dropTutorial${i}`);
const TUTORIAL_PATHS = [1,2,3,4,5].map(i => `assets/tutorials/dropping/dropping_0${i}_717x330.png`);

export class SettingsScene extends CurrentSettingsScene {
  preload(){
    super.preload?.();
    TUTORIAL_KEYS.forEach((key,i)=>{
      if(!this.textures.exists(key)) this.load.image(key,TUTORIAL_PATHS[i]);
    });
  }

  _buildTabs(panelX,panelY,panelW){
    const { headH } = this._panel;
    const tabs=['controls','video','audio','help'];
    const labels={controls:'CONTROLES',video:'VÍDEO',audio:'AUDIO',help:'❓ AYUDA'};
    const pad=14,pillH=36,gap=10;
    let x=panelX+pad;
    const y=panelY+Math.floor((headH-pillH)/2);

    tabs.forEach(tab=>{
      const isActive=tab===this.activeTab;
      const measure=this.add.text(0,0,labels[tab],{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold'});
      const pw=Math.max(tab==='help'?110:118,measure.width+32); measure.destroy();
      const g=this.add.graphics();
      const draw=(selected,pressed=false)=>{
        g.clear();
        g.fillStyle(0x141b33,selected?.85:.45); g.fillRoundedRect(0,0,pw,pillH,16);
        g.lineStyle(1,selected?0x2bff88:0xb7c0ff,selected?.55:.22); g.strokeRoundedRect(0,0,pw,pillH,16);
        if(pressed){g.fillStyle(0x000000,.10);g.fillRoundedRect(0,0,pw,pillH,16);}
      };
      draw(isActive);
      const t=this.add.text(pw/2,pillH/2,labels[tab],{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      const hit=this.add.rectangle(0,0,pw,pillH,0x000000,.001).setOrigin(0).setInteractive({useHandCursor:true});
      const c=this.add.container(x,y,[g,t,hit]);
      hit.on('pointerdown',()=>{draw(tab===this.activeTab,true);c.setScale(.98);});
      hit.on('pointerout',()=>{draw(tab===this.activeTab,false);c.setScale(1);});
      hit.on('pointerup',()=>{
        draw(tab===this.activeTab,false);c.setScale(1);
        if(this.activeTab===tab)return;
        this.activeTab=tab;
        this.cameras.main.fadeOut(70,11,16,32);
        this.time.delayedCall(75,()=>this.scene.restart());
      });
      x+=pw+gap;
    });
  }

  _renderTabContent(panelX,panelY,panelW,panelH){
    if(this.activeTab!=='help') return super._renderTabContent(panelX,panelY,panelW,panelH);

    const headH=this._panel?.headH||56;
    const x=panelX+24, y=panelY+headH+22;
    const cardW=Math.min(620,panelW-48), cardH=Math.min(180,panelH-headH-90);

    this.add.text(x,y,'AYUDA Y TUTORIALES',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#fff'});
    this.add.text(x,y+26,'Consulta las reglas y sistemas del juego cuando quieras.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',color:'#aeb9d8'});

    const cy=y+58;
    const card=this.add.rectangle(x,cy,cardW,cardH,0x09131f,.88).setOrigin(0).setStrokeStyle(2,0x2bff88,.45).setInteractive({useHandCursor:true});
    this.add.text(x+20,cy+18,'🎁  SISTEMA DE DROP',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#7dffc1'});
    this.add.text(x+20,cy+50,'Cómo conseguir materiales, bonus por tiempo, ECU y cofres de sesión.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',color:'#d9e4f5',wordWrap:{width:cardW-190}});
    const bw=150,bh=42,bx=x+cardW-bw-18,by=cy+cardH/2-bh/2;
    const btn=this.add.rectangle(bx,by,bw,bh,0x2bff88,.9).setOrigin(0).setStrokeStyle(1,0x9dffd0,.85).setInteractive({useHandCursor:true});
    this.add.text(bx+bw/2,by+bh/2,'VER TUTORIAL  ›',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#06120d'}).setOrigin(.5);
    const open=()=>this._openDroppingTutorial(0);
    card.on('pointerup',open); btn.on('pointerup',open);

    this._footer(panelX,panelY,panelW,panelH);
  }

  _openDroppingTutorial(startIndex=0){
    if(this._dropTutorialOverlay?.scene) return;
    let index=Math.max(0,Math.min(4,startIndex|0));
    const w=this.scale.width,h=this.scale.height;
    const overlay=this.add.container(0,0).setDepth(10000);
    this._dropTutorialOverlay=overlay;

    const shade=this.add.rectangle(0,0,w,h,0x000000,.93).setOrigin(0).setInteractive();
    const frame=this.add.rectangle(w/2,h/2,Math.min(w-26,740),Math.min(h-22,360),0x050a0f,.98).setStrokeStyle(2,0x2bff88,.55);
    const img=this.add.image(w/2,h/2,TUTORIAL_KEYS[index]).setOrigin(.5);
    const close=this.add.circle(w-28,26,18,0x111827,.95).setStrokeStyle(1,0xffffff,.25).setInteractive({useHandCursor:true});
    const closeTxt=this.add.text(w-28,26,'×',{fontFamily:'system-ui',fontSize:'22px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
    const prev=this.add.text(24,h-24,'‹  ANTERIOR',{fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',color:'#fff',backgroundColor:'#111827cc',padding:{x:12,y:8}}).setOrigin(0,1).setInteractive({useHandCursor:true});
    const next=this.add.text(w-24,h-24,'SIGUIENTE  ›',{fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',color:'#06120d',backgroundColor:'#2bff88',padding:{x:14,y:8}}).setOrigin(1,1).setInteractive({useHandCursor:true});
    const dots=[];
    for(let i=0;i<5;i++) dots.push(this.add.circle(w/2+(i-2)*18,h-22,4,i===index?0x2bff88:0x596273,1));
    overlay.add([shade,frame,img,close,closeTxt,prev,next,...dots]);

    const fit=()=>{
      const maxW=Math.min(w-42,717), maxH=Math.min(h-72,330);
      const s=Math.min(maxW/717,maxH/330);
      img.setScale(s);
      frame.setSize(717*s+12,330*s+12);
    };
    fit();

    const refresh=()=>{
      const key=TUTORIAL_KEYS[index];
      if(this.textures.exists(key)){
        img.setTexture(key).setVisible(true);
      }else{
        img.setVisible(false);
      }
      dots.forEach((d,i)=>d.setFillStyle(i===index?0x2bff88:0x596273,1));
      prev.setAlpha(index===0?.35:1);
      next.setText(index===4?'ENTENDIDO ✓':'SIGUIENTE  ›');
    };
    const destroy=()=>{overlay.destroy(true);this._dropTutorialOverlay=null;};
    close.on('pointerup',destroy); closeTxt.setInteractive({useHandCursor:true}).on('pointerup',destroy);
    prev.on('pointerup',()=>{if(index>0){index--;refresh();}});
    next.on('pointerup',()=>{if(index<4){index++;refresh();}else destroy();});

    let downX=null;
    shade.on('pointerdown',p=>{downX=p.x;});
    shade.on('pointerup',p=>{
      if(downX==null)return;
      const dx=p.x-downX; downX=null;
      if(Math.abs(dx)<45)return;
      if(dx<0&&index<4){index++;refresh();}
      if(dx>0&&index>0){index--;refresh();}
    });
    refresh();
  }
}
