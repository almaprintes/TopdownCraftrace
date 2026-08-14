import { SettingsScene as CurrentSettingsScene } from './SettingsControlOptionsScene.js';

const STORAGE_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class SettingsScene extends CurrentSettingsScene {
  _ensureAVDefaults(){
    const s=this.settings||(this.settings={});
    s.audio={master:1,engine:1,effects:.45,impacts:.8,profile:'per_car',mute:false,...(s.audio||{})};
    s.video={quality:'high',targetFps:60,showFPS:false,particles:true,shadows:true,renderScale:'normal',...(s.video||{})};
  }

  _saveAV(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.settings));}catch{}
  }

  _pill(x,y,w,h,label,selected,onTap){
    const box=this.add.rectangle(x,y,w,h,selected?0x123b34:0x141b33,selected?.92:.62)
      .setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.8:.18).setInteractive({useHandCursor:true});
    this.add.text(x+w/2,y+h/2,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:selected?'#7dffc1':'#ffffff'}).setOrigin(.5);
    box.on('pointerdown',()=>box.setScale(.985));
    box.on('pointerout',()=>box.setScale(1));
    box.on('pointerup',()=>{box.setScale(1);onTap?.();});
    return box;
  }

  _slider(label,key,x,y,w,onChange){
    const value=clamp(Number(key()),0,1);
    this.add.text(x,y,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'});
    const valueTxt=this.add.text(x+w,y,`${Math.round(value*100)}%`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#2bff88'}).setOrigin(1,0);
    const ty=y+24, th=12;
    this.add.rectangle(x,ty,w,th,0x111a2c,.95).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.16);
    const fill=this.add.rectangle(x,ty,w*value,th,0x2bff88,.82).setOrigin(0);
    const knob=this.add.circle(x+w*value,ty+th/2,9,0xffffff,1).setStrokeStyle(2,0x2bff88,.8);
    const hit=this.add.rectangle(x,ty-10,w,th+20,0x000000,.001).setOrigin(0).setInteractive();
    let dragging=false;
    const setFrom=(px)=>{
      const v=clamp((px-x)/w,0,1);
      fill.width=w*v; knob.x=x+w*v; valueTxt.setText(`${Math.round(v*100)}%`);
      onChange(v); this._saveAV();
    };
    hit.on('pointerdown',p=>{dragging=true;setFrom(p.x);});
    this.input.on('pointermove',p=>{if(dragging)setFrom(p.x);});
    this.input.on('pointerup',()=>{dragging=false;});
  }

  _renderTabContent(panelX,panelY,panelW,panelH){
    this._ensureAVDefaults();
    super._renderTabContent(panelX,panelY,panelW,panelH);
    if(this.activeTab==='controls') return;

    const x=panelX+16;
    const top=panelY+(this._panel?.headH||56)+98;
    const maxW=Math.min(720,panelW-32);

    if(this.activeTab==='audio'){
      const a=this.settings.audio;
      this._slider('VOLUMEN GENERAL',()=>a.master,x,top,maxW*.58,v=>a.master=v);
      this._slider('MOTOR',()=>a.engine,x,top+58,maxW*.58,v=>a.engine=v);
      this._slider('EFECTOS',()=>a.effects,x,top+116,maxW*.58,v=>a.effects=v);
      this._slider('IMPACTOS',()=>a.impacts,x,top+174,maxW*.58,v=>a.impacts=v);

      const px=x+maxW*.62;
      this.add.text(px,top,'PERFIL DE MOTOR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'});
      const choices=[['per_car','POR COCHE'],['forge','FORGE'],['avenir','AVENIR'],['crown','CROWN']];
      choices.forEach((c,i)=>this._pill(px,top+24+i*43,maxW*.34,34,c[1],a.profile===c[0],()=>{a.profile=c[0];this._saveAV();this.scene.restart();}));
      this.add.text(px,top+202,'Los tres perfiles base proceden de\nHammer, Apex y Axis.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#9eaad0',lineSpacing:4});
    }

    if(this.activeTab==='video'){
      const v=this.settings.video;
      this.add.text(x,top,'CALIDAD GRÁFICA',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'});
      const gap=8, cw=120;
      ['low','medium','high'].forEach((q,i)=>this._pill(x+i*(cw+gap),top+24,cw,34,{low:'BAJA',medium:'MEDIA',high:'ALTA'}[q],v.quality===q,()=>{v.quality=q;this._saveAV();this.scene.restart();}));

      this.add.text(x,top+76,'FPS OBJETIVO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'});
      [30,60].forEach((fps,i)=>this._pill(x+i*(cw+gap),top+100,cw,34,`${fps} FPS`,Number(v.targetFps)===fps,()=>{v.targetFps=fps;this._saveAV();try{this.game.loop.targetFps=fps;}catch{}this.scene.restart();}));

      const makeToggle=(label,key,y)=>{
        this.add.text(x,y,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'});
        this._pill(x+190,y-8,92,30,v[key]?'ON':'OFF',!!v[key],()=>{v[key]=!v[key];this._saveAV();this.scene.restart();});
      };
      makeToggle('PARTÍCULAS','particles',top+158);
      makeToggle('SOMBRAS / EFECTOS','shadows',top+202);

      const rx=x+360;
      this.add.text(rx,top+76,'ESCALA DE RENDER',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'});
      const rs=[['eco','AHORRO'],['normal','NORMAL'],['sharp','NÍTIDA']];
      rs.forEach((r,i)=>this._pill(rx,top+100+i*43,150,34,r[1],v.renderScale===r[0],()=>{v.renderScale=r[0];this._saveAV();this.scene.restart();}));
      this.add.text(rx,top+236,'La escala de render se aplica\nal volver a cargar el juego.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#9eaad0',lineSpacing:4});
    }
  }
}
