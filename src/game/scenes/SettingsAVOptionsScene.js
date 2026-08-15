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
    s.ui={settingsSubtab:{controls:'mode',video:'performance',audio:'mix'},...(s.ui||{})};
    s.ui.settingsSubtab={controls:'mode',video:'performance',audio:'mix',...(s.ui.settingsSubtab||{})};
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
    const ty=y+22,th=8;
    this.add.rectangle(x,ty,w,th,0x111a2c,.95).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.13);
    const fill=this.add.rectangle(x,ty,w*value,th,0x2bff88,.82).setOrigin(0);
    const knob=this.add.circle(x+w*value,ty+th/2,7,0xffffff,1).setStrokeStyle(2,0x2bff88,.75);
    const hit=this.add.rectangle(x,ty-8,w,th+18,0x000000,.001).setOrigin(0).setInteractive();
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

  _subTabs(x,y,items,active,onSelect){
    const gap=8,w=138,h=32;
    items.forEach((it,i)=>this._pill(x+i*(w+gap),y,w,h,it[1],active===it[0],()=>onSelect(it[0])));
  }

  _footer(panelX,panelY,panelW,panelH){
    const footerH=54,fy=panelY+panelH-footerH;
    this.add.rectangle(panelX,fy,panelW,footerH,0x0b1020,.98).setOrigin(0);
    this.add.rectangle(panelX+10,fy,panelW-20,1,0xffffff,.10).setOrigin(0);
    const reset=this.add.rectangle(panelX+16,fy+10,140,34,0x141b33,.78).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.22).setInteractive();
    this.add.text(panelX+86,fy+27,'RESTABLECER',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
    reset.on('pointerup',()=>{
      this.settings={
        controls:{scheme:'touch',steeringMode:'stick',sensitivity:1,deadZone:.1,invertSteer:false},
        video:{quality:'high',targetFps:60,showFPS:false,particles:true,renderScale:'normal'},
        audio:{master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false},
        ui:{settingsSubtab:{controls:'mode',video:'performance',audio:'mix'}}
      };
      this._saveAll();this.scene.restart();
    });
    this.add.text(panelX+panelW-16,fy+27,'Guardado ✓',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#2bff88'}).setOrigin(1,.5);
  }

  _setSubtab(tab,value){
    this.settings.ui.settingsSubtab[tab]=value;
    this._saveAll();
    this.scene.restart();
  }

  _renderTabContent(panelX,panelY,panelW,panelH){
    this._ensureDefaults();
    const headH=this._panel?.headH||56;
    const x=panelX+24;
    const top=panelY+headH+16;
    const usableW=panelW-48;
    const footerH=54;
    const contentBottom=panelY+panelH-footerH-14;
    const subY=top;
    const bodyY=top+46;
    const bodyH=contentBottom-bodyY;

    if(this.activeTab==='controls'){
      const c=this.settings.controls;
      const sub=this.settings.ui.settingsSubtab.controls;
      this._subTabs(x,subY,[['mode','MODO'],['tuning','AJUSTES']],sub,v=>this._setSubtab('controls',v));

      if(sub==='mode'){
        this._label(x,bodyY,'MODO DE DIRECCIÓN',13);
        this.add.text(x,bodyY+22,'Elige cómo quieres controlar el coche durante la carrera.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',color:'#aeb9d8'});
        const gap=14,cardW=Math.floor((usableW-gap*2)/3),cardY=bodyY+48,cardH=Math.min(100,bodyH-58),pad=connectedPad();
        const choices=[
          ['stick','◉  PALANCA','Dirección analógica táctil'],
          ['buttons','◀ ▶  BOTONES','Dirección digital izquierda / derecha'],
          ['gamepad','🎮  MANDO',pad?`Conectado: ${String(pad.id||'Gamepad').slice(0,21)}`:'DualSense / DualShock']
        ];
        choices.forEach((ch,i)=>{
          const selected=c.steeringMode===ch[0],bx=x+i*(cardW+gap);
          const box=this.add.rectangle(bx,cardY,cardW,cardH,selected?0x123b34:0x141b33,selected?.94:.62).setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.88:.18).setInteractive();
          this._label(bx+14,cardY+15,ch[1],12,selected?'#7dffc1':'#ffffff');
          this.add.text(bx+14,cardY+48,ch[2],{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:selected?'#79ffc0':'#aeb9d8',wordWrap:{width:cardW-28}});
          box.on('pointerup',()=>{c.steeringMode=ch[0];c.scheme=ch[0]==='gamepad'?'gamepad':'touch';this._saveAll();this.scene.restart();});
        });
      } else {
        const colW=Math.min(560,usableW*.64);
        this._label(x,bodyY,'SENSIBILIDAD',12);
        this.add.text(x,bodyY+20,'Ajusta cuánto responde la dirección al movimiento del control.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aeb9d8'});
        this._slider('',()=>c.sensitivity,x,bodyY+48,colW,v=>c.sensitivity=v);
        this._label(x,bodyY+112,'INVERTIR DIRECCIÓN',12);
        this.add.text(x,bodyY+132,'Invierte izquierda y derecha.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aeb9d8'});
        this._switch(x,bodyY+154,!!c.invertSteer,()=>{c.invertSteer=!c.invertSteer;this._saveAll();this.scene.restart();});
      }
    }

    if(this.activeTab==='video'){
      const v=this.settings.video;
      const sub=this.settings.ui.settingsSubtab.video;
      this._subTabs(x,subY,[['performance','RENDIMIENTO'],['quality','CALIDAD']],sub,val=>this._setSubtab('video',val));

      if(sub==='performance'){
        this._label(x,bodyY,'FPS OBJETIVO',12);
        this._pill(x,bodyY+24,140,38,'30 FPS',Number(v.targetFps)===30,()=>{v.targetFps=30;this._saveAll();this.scene.restart();});
        this._pill(x+150,bodyY+24,140,38,'60 FPS',Number(v.targetFps)===60,()=>{v.targetFps=60;this._saveAll();this.scene.restart();});
        this._label(x,bodyY+92,'MOSTRAR FPS',11);
        this._switch(x,bodyY+114,!!v.showFPS,()=>{v.showFPS=!v.showFPS;this._saveAll();this.scene.restart();});
        this._label(x+280,bodyY+92,'PARTÍCULAS',11);
        this._switch(x+280,bodyY+114,!!v.particles,()=>{v.particles=!v.particles;this._saveAll();this.scene.restart();});
      } else {
        this._label(x,bodyY,'CALIDAD GRÁFICA',12);
        const bw=170;
        [['low','BAJA'],['medium','MEDIA'],['high','ALTA']].forEach((q,i)=>this._pill(x+i*(bw+10),bodyY+24,bw,38,q[1],v.quality===q[0],()=>{v.quality=q[0];this._saveAll();this.scene.restart();}));
        this._label(x,bodyY+94,'ESCALA DE RENDER',12);
        [['eco','AHORRO'],['normal','NORMAL'],['sharp','NÍTIDA']].forEach((r,i)=>this._pill(x+i*(bw+10),bodyY+118,bw,38,r[1],v.renderScale===r[0],()=>{v.renderScale=r[0];this._saveAll();this.scene.restart();}));
        this.add.text(x,bodyY+174,'Calidad y escala de render se aplican al recargar el juego.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#9eaad0'});
      }
    }

    if(this.activeTab==='audio'){
      const a=this.settings.audio;
      const sub=this.settings.ui.settingsSubtab.audio;
      this._subTabs(x,subY,[['mix','MEZCLA'],['engine','MOTOR']],sub,val=>this._setSubtab('audio',val));

      if(sub==='mix'){
        this._label(x,bodyY,'MODO SILENCIO',11);
        this._switch(x,bodyY+20,!!a.mute,()=>{a.mute=!a.mute;this._saveAll();this.scene.restart();});
        const sliderX=x,sliderW=Math.min(720,usableW*.72);
        this._slider('VOLUMEN GENERAL',()=>a.master,sliderX,bodyY+66,sliderW,v=>a.master=v);
        this._slider('MOTOR',()=>a.engine,sliderX,bodyY+116,sliderW,v=>a.engine=v);
        this._slider('EFECTOS',()=>a.effects,sliderX,bodyY+166,sliderW,v=>a.effects=v);
        this._slider('IMPACTOS',()=>a.impacts,sliderX,bodyY+216,sliderW,v=>a.impacts=v);
      } else {
        this._label(x,bodyY,'PERFIL DE MOTOR',12);
        this.add.text(x,bodyY+20,'Elige qué carácter sonoro quieres usar como base.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aeb9d8'});
        const bw=Math.min(260,(usableW-14)/2),bh=42,gap=14;
        const profiles=[['per_car','POR COCHE'],['forge','FORGE'],['avenir','AVENIR'],['crown','CROWN']];
        profiles.forEach((p,i)=>{
          const row=Math.floor(i/2),col=i%2;
          this._pill(x+col*(bw+gap),bodyY+48+row*(bh+12),bw,bh,p[1],a.profile===p[0],()=>{a.profile=p[0];this._saveAll();this.scene.restart();});
        });
        this.add.text(x,bodyY+166,'FORGE · AVENIR · CROWN son los tres perfiles sonoros de referencia.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#9eaad0'});
      }
    }

    this._footer(panelX,panelY,panelW,panelH);
  }
}
