import { SettingsScene as CurrentSettingsScene } from './SettingsControlOptionsScene.js';

const STORAGE_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function connectedPad(){
  try{return Array.from(navigator.getGamepads?.()||[]).find(Boolean)||null;}catch{return null;}
}

export class SettingsScene extends CurrentSettingsScene {
  _ensureDefaults(){
    const s=this.settings||(this.settings={});
    s.controls={scheme:'touch',steeringMode:'stick',sensitivity:1,deadZone:.1,invertSteer:false,...(s.controls||{})};
    s.audio={master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false,...(s.audio||{})};
    s.video={quality:'high',targetFps:60,showFPS:false,particles:true,renderScale:'normal',...(s.video||{})};
  }

  _saveAll(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.settings));}catch{}}

  _label(x,y,text,size=12,color='#ffffff'){
    return this.add.text(x,y,text,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:`${size}px`,fontStyle:'bold',color});
  }

  _pill(x,y,w,h,label,selected,onTap){
    const box=this.add.rectangle(x,y,w,h,selected?0x123b34:0x141b33,selected?.94:.62)
      .setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.88:.18).setInteractive({useHandCursor:true});
    this.add.text(x+w/2,y+h/2,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:selected?'#7dffc1':'#ffffff'}).setOrigin(.5);
    box.on('pointerdown',()=>box.setScale(.985));
    box.on('pointerout',()=>box.setScale(1));
    box.on('pointerup',()=>{box.setScale(1);onTap?.();});
    return box;
  }

  _switch(x,y,value,onTap){
    const w=78,h=30;
    const bg=this.add.rectangle(x,y,w,h,value?0x2bff88:0x141b33,value?.9:.9).setOrigin(0).setStrokeStyle(1,value?0x2bff88:0xb7c0ff,.35).setInteractive();
    this.add.circle(x+(value?w-15:15),y+h/2,12,0xffffff,1);
    this.add.text(x+w+10,y+h/2,value?'ON':'OFF',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:value?'#2bff88':'#b7c0ff'}).setOrigin(0,.5);
    bg.on('pointerup',()=>onTap?.());
  }

  _slider(label,getValue,x,y,w,onChange){
    const value=clamp(Number(getValue()),0,1);
    if(label)this._label(x,y,label,11);
    const valueTxt=this.add.text(x+w,y,`${Math.round(value*100)}%`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#2bff88'}).setOrigin(1,0);
    const ty=y+21,th=8;
    this.add.rectangle(x,ty,w,th,0x111a2c,.95).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.13);
    const fill=this.add.rectangle(x,ty,w*value,th,0x2bff88,.82).setOrigin(0);
    const knob=this.add.circle(x+w*value,ty+th/2,7,0xffffff,1).setStrokeStyle(2,0x2bff88,.75);
    const hit=this.add.rectangle(x,ty-8,w,th+16,0x000000,.001).setOrigin(0).setInteractive();
    let dragging=false;
    const setFrom=px=>{
      const v=clamp((px-x)/w,0,1);
      fill.width=w*v;knob.x=x+w*v;valueTxt.setText(`${Math.round(v*100)}%`);
      onChange(v);this._saveAll();
    };
    hit.on('pointerdown',p=>{dragging=true;setFrom(p.x);});
    this.input.on('pointermove',p=>{if(dragging)setFrom(p.x);});
    this.input.on('pointerup',()=>{dragging=false;});
  }

  _footer(panelX,panelY,panelW,panelH){
    const footerH=54,fy=panelY+panelH-footerH;
    // Opaque footer band: content can never visually bleed into the actions.
    this.add.rectangle(panelX,fy,panelW,footerH,0x0b1020,.96).setOrigin(0);
    this.add.rectangle(panelX+10,fy,panelW-20,1,0xffffff,.10).setOrigin(0);
    const reset=this.add.rectangle(panelX+16,fy+10,140,34,0x141b33,.78).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.22).setInteractive();
    this.add.text(panelX+86,fy+27,'RESTABLECER',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
    reset.on('pointerup',()=>{
      this.settings={controls:{scheme:'touch',steeringMode:'stick',sensitivity:1,deadZone:.1,invertSteer:false},video:{quality:'high',targetFps:60,showFPS:false,particles:true,renderScale:'normal'},audio:{master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false}};
      this._saveAll();this.scene.restart();
    });
    this.add.text(panelX+panelW-16,fy+27,'Guardado ✓',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#2bff88'}).setOrigin(1,.5);
  }

  _renderTabContent(panelX,panelY,panelW,panelH){
    this._ensureDefaults();
    const headH=this._panel?.headH||56;
    const x=panelX+22,top=panelY+headH+20,usableW=panelW-44;
    const footerH=54;
    const contentBottom=panelY+panelH-footerH-14;

    if(this.activeTab==='controls'){
      const c=this.settings.controls;
      this._label(x,top,'MODO DE DIRECCIÓN',13);
      this.add.text(x,top+22,'Elige cómo quieres controlar el coche durante la carrera.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',color:'#aeb9d8'});
      const gap=12,cardW=Math.floor((usableW-gap*2)/3),cardY=top+46,cardH=82,pad=connectedPad();
      const choices=[['stick','◉  PALANCA','Dirección analógica táctil'],['buttons','◀ ▶  BOTONES','Dirección digital izquierda / derecha'],['gamepad','🎮  MANDO',pad?`Conectado: ${String(pad.id||'Gamepad').slice(0,21)}`:'DualSense / DualShock']];
      choices.forEach((ch,i)=>{
        const selected=c.steeringMode===ch[0],bx=x+i*(cardW+gap);
        const box=this.add.rectangle(bx,cardY,cardW,cardH,selected?0x123b34:0x141b33,selected?.94:.62).setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.88:.18).setInteractive();
        this._label(bx+14,cardY+13,ch[1],12,selected?'#7dffc1':'#ffffff');
        this.add.text(bx+14,cardY+42,ch[2],{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:selected?'#79ffc0':'#aeb9d8',wordWrap:{width:cardW-28}});
        box.on('pointerup',()=>{c.steeringMode=ch[0];c.scheme=ch[0]==='gamepad'?'gamepad':'touch';this._saveAll();this.scene.restart();});
      });
      const sy=Math.min(cardY+cardH+24,contentBottom-74);
      this._label(x,sy,'INVERTIR DIRECCIÓN',11);
      this._switch(x,sy+20,!!c.invertSteer,()=>{c.invertSteer=!c.invertSteer;this._saveAll();this.scene.restart();});
      this._label(x+240,sy,'SENSIBILIDAD',11);
      this._slider('',()=>c.sensitivity,x+240,sy+17,Math.min(360,usableW-260),v=>c.sensitivity=v);
    }

    if(this.activeTab==='video'){
      const v=this.settings.video,leftW=Math.min(470,usableW*.52),rightX=x+leftW+46;
      this._label(x,top,'CALIDAD GRÁFICA',12);
      const bw=Math.floor((leftW-16)/3);
      [['low','BAJA'],['medium','MEDIA'],['high','ALTA']].forEach((q,i)=>this._pill(x+i*(bw+8),top+23,bw,36,q[1],v.quality===q[0],()=>{v.quality=q[0];this._saveAll();this.scene.restart();}));
      this._label(x,top+76,'FPS OBJETIVO',12);
      this._pill(x,top+99,120,36,'30 FPS',Number(v.targetFps)===30,()=>{v.targetFps=30;this._saveAll();this.scene.restart();});
      this._pill(x+128,top+99,120,36,'60 FPS',Number(v.targetFps)===60,()=>{v.targetFps=60;this._saveAll();this.scene.restart();});
      const togglesY=Math.min(top+156,contentBottom-56);
      this._label(x,togglesY,'MOSTRAR FPS',11);
      this._switch(x,togglesY+20,!!v.showFPS,()=>{v.showFPS=!v.showFPS;this._saveAll();this.scene.restart();});
      this._label(x+210,togglesY,'PARTÍCULAS',11);
      this._switch(x+210,togglesY+20,!!v.particles,()=>{v.particles=!v.particles;this._saveAll();this.scene.restart();});
      this._label(rightX,top,'ESCALA DE RENDER',12);
      const rw=Math.min(240,usableW-leftW-46),rgap=Math.min(48,Math.max(40,(contentBottom-(top+23)-36)/2));
      [['eco','AHORRO'],['normal','NORMAL'],['sharp','NÍTIDA']].forEach((r,i)=>this._pill(rightX,top+23+i*rgap,rw,36,r[1],v.renderScale===r[0],()=>{v.renderScale=r[0];this._saveAll();this.scene.restart();}));
      const noteY=Math.min(top+23+rgap*3+8,contentBottom-34);
      this.add.text(rightX,noteY,'Calidad y escala de render se aplican\nal recargar el juego.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#9eaad0',lineSpacing:3});
    }

    if(this.activeTab==='audio'){
      const a=this.settings.audio,leftW=Math.min(520,usableW*.55),rightX=x+leftW+46;
      this._label(x,top,'MODO SILENCIO',11);
      this._switch(x,top+18,!!a.mute,()=>{a.mute=!a.mute;this._saveAll();this.scene.restart();});

      // Distribute the four sliders inside the actual available height so the
      // IMPACTOS row never reaches the footer, even on short iPhone landscape.
      const firstSliderY=top+58;
      const sliderEndPadding=34;
      const rowGap=clamp((contentBottom-firstSliderY-sliderEndPadding)/3,38,48);
      this._slider('VOLUMEN GENERAL',()=>a.master,x,firstSliderY,leftW,v=>a.master=v);
      this._slider('MOTOR',()=>a.engine,x,firstSliderY+rowGap,leftW,v=>a.engine=v);
      this._slider('EFECTOS',()=>a.effects,x,firstSliderY+rowGap*2,leftW,v=>a.effects=v);
      this._slider('IMPACTOS',()=>a.impacts,x,firstSliderY+rowGap*3,leftW,v=>a.impacts=v);

      this._label(rightX,top,'PERFIL DE MOTOR',12);
      const ww=Math.min(280,usableW-leftW-46);
      const profileGap=clamp((contentBottom-(top+22)-36)/3,40,46);
      [['per_car','POR COCHE'],['forge','FORGE'],['avenir','AVENIR'],['crown','CROWN']].forEach((p,i)=>this._pill(rightX,top+22+i*profileGap,ww,34,p[1],a.profile===p[0],()=>{a.profile=p[0];this._saveAll();this.scene.restart();}));
      const noteY=Math.min(top+22+profileGap*4+4,contentBottom-32);
      this.add.text(rightX,noteY,'FORGE · AVENIR · CROWN son los tres\nperfiles sonoros de referencia.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#9eaad0',lineSpacing:3});
    }

    // Draw last so the footer is always a clean, protected action area.
    this._footer(panelX,panelY,panelW,panelH);
  }
}
