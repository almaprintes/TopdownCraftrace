import { SettingsScene as CurrentSettingsScene } from './SettingsAVOptionsScene.js';

const TUTORIAL_KEYS = [1,2,3,4,5].map(i => `dropTutorial${i}`);

export class SettingsScene extends CurrentSettingsScene {
  preload(){
    super.preload?.();
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
    const x=panelX+24, y=panelY+headH+18;
    const cardW=Math.min(520,panelW-48);
    const cardH=72;

    this.add.text(x,y,'AYUDA Y TUTORIALES',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#fff'});
    this.add.text(x,y+24,'Reglas y sistemas del juego.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',color:'#aeb9d8'});

    const cy=y+48;
    const card=this.add.rectangle(x,cy,cardW,cardH,0x09131f,.88).setOrigin(0).setStrokeStyle(1,0x2bff88,.52).setInteractive({useHandCursor:true});
    this.add.text(x+16,cy+12,'🎁  SISTEMA DE DROP',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'14px',fontStyle:'bold',color:'#7dffc1'});
    this.add.text(x+16,cy+36,'Materiales · bonus · ECU · cofres',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#d9e4f5'});

    const bw=132,bh=32,bx=x+cardW-bw-12,by=cy+(cardH-bh)/2;
    const btn=this.add.rectangle(bx,by,bw,bh,0x2bff88,.9).setOrigin(0).setStrokeStyle(1,0x9dffd0,.85).setInteractive({useHandCursor:true});
    this.add.text(bx+bw/2,by+bh/2,'VER TUTORIAL  ›',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#06120d'}).setOrigin(.5);
    const open=()=>this._openDroppingTutorial(0);
    card.on('pointerup',open); btn.on('pointerup',open);
  }

  _openDroppingTutorial(startIndex=0){
    if(this._dropTutorialOverlay?.scene) return;
    let index=Math.max(0,Math.min(4,startIndex|0));
    const w=this.scale.width,h=this.scale.height;
    const overlay=this.add.container(0,0).setDepth(10000);
    this._dropTutorialOverlay=overlay;

    const shade=this.add.rectangle(0,0,w,h,0x000000,.95).setOrigin(0).setInteractive();
    const img=this.add.image(w/2,h/2,TUTORIAL_KEYS[index]).setOrigin(.5);
    const status=this.add.text(w/2,h/2,'',{fontFamily:'system-ui',fontSize:'13px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setVisible(false);

    // Las propias diapositivas ya incluyen botones y puntos de progreso.
    // Estas dos zonas son invisibles y se colocan exactamente encima de ellos.
    const prevHit=this.add.rectangle(0,0,1,1,0x000000,0.001).setOrigin(0).setInteractive({useHandCursor:true});
    const nextHit=this.add.rectangle(0,0,1,1,0x000000,0.001).setOrigin(0).setInteractive({useHandCursor:true});

    const close=this.add.circle(w-28,26,18,0x111827,.95).setStrokeStyle(1,0xffffff,.25).setInteractive({useHandCursor:true});
    const closeTxt=this.add.text(w-28,26,'×',{fontFamily:'system-ui',fontSize:'22px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setInteractive({useHandCursor:true});

    overlay.add([shade,img,status,prevHit,nextHit,close,closeTxt]);

    const fitAndPlaceHits=()=>{
      const src=img.texture?.getSourceImage?.();
      const iw=Number(src?.width)||717, ih=Number(src?.height)||330;
      const maxW=Math.max(120,w-36), maxH=Math.max(80,h-18);
      const s=Math.min(maxW/iw,maxH/ih);
      img.setScale(s);

      const left=img.x-(iw*s)/2;
      const top=img.y-(ih*s)/2;

      // Coordenadas relativas sobre el diseño 717x330.
      // Cubren los botones dibujados sin invadir el contenido central.
      const prevBox={x:20,y:278,w:142,h:48};
      const nextBox={x:565,y:278,w:146,h:48};

      prevHit.setPosition(left+prevBox.x*s,top+prevBox.y*s).setSize(prevBox.w*s,prevBox.h*s);
      nextHit.setPosition(left+nextBox.x*s,top+nextBox.y*s).setSize(nextBox.w*s,nextBox.h*s);
    };

    const refresh=()=>{
      const key=TUTORIAL_KEYS[index];
      if(this.textures.exists(key)){
        img.setTexture(key).setVisible(true);
        status.setVisible(false);
        fitAndPlaceHits();
      }else{
        img.setVisible(false);
        status.setText('TUTORIAL NO PRECARGADO · RECARGA LA APP').setVisible(true);
      }
      // En la primera pantalla la zona ANTERIOR queda desactivada.
      prevHit.input.enabled=index>0;
    };

    const destroy=()=>{overlay.destroy(true);this._dropTutorialOverlay=null;};
    close.on('pointerup',destroy); closeTxt.on('pointerup',destroy);

    prevHit.on('pointerup',()=>{
      if(index>0){index--;refresh();}
    });
    nextHit.on('pointerup',()=>{
      if(index<4){index++;refresh();}
      else destroy();
    });

    // Conservamos también el gesto lateral como atajo natural en móvil.
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
