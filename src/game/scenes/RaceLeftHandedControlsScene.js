import { RaceScene as CurrentRaceScene } from './RaceBrakeLightsSpeedTrailScene.js';

const SETTINGS_KEY='tdr2:settings';
function leftHanded(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')?.controls?.leftHanded===true;}catch{return false;}}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._tdrLeftHanded=leftHanded();
    this._installLeftHandedVisuals();
    const result=super.create(data);
    this._syncLeftHandedVisuals();
    return result;
  }

  _installLeftHandedVisuals(){
    if(document.getElementById('tdr-left-handed-style'))return;
    const style=document.createElement('style');
    style.id='tdr-left-handed-style';
    style.textContent=`
      #tdr-race-controls.tdr-left-handed .tdr-pedal{right:auto;left:max(18px,1.8vw);}
      #tdr-race-controls.tdr-left-handed .tdr-stick{left:auto;right:max(22px,2vw);}
    `;
    document.head.appendChild(style);
  }

  _syncLeftHandedVisuals(){
    const root=document.getElementById('tdr-race-controls');
    root?.classList?.toggle('tdr-left-handed',!!this._tdrLeftHanded);
  }

  createTouchControls(){
    if(!this._tdrLeftHanded)return super.createTouchControls();

    const buttonMode=this._tdrSteeringMode==='buttons';
    const state={steer:0,throttle:0,brake:0,stickX:0,stickY:0,buttonSteer:0,leftId:null,rightId:null,leftActive:false,rightThrottle:false,rightBrake:false,btnW:0,btnH:0,rightX:0,throttleY:0,brakeY:0,_draw:()=>{}};
    this.touchUI=this.add.container(0,0).setScrollFactor(0).setDepth(1000);
    // Preserve the legacy six-object shape expected by HUD cleanup code, but invisible.
    for(let i=0;i<6;i++)this.touchUI.add(this.add.rectangle(0,0,1,1,0x000000,0).setVisible(false));
    try{this.cameras.main.ignore(this.touchUI);}catch{}

    let pedalX=0,pedalW=0,pedalH=0,gasY=0,brakeY=0,stickCX=0,stickCY=0,stickRadius=60;
    const layout=()=>{
      const w=Number(this.scale?.width||0),h=Number(this.scale?.height||0);
      const pad=Math.max(14,Math.min(28,Math.floor(Math.min(w,h)*0.04)));
      pedalW=Math.max(150,Math.min(260,Math.floor(w*0.22)));
      pedalH=Math.max(78,Math.min(140,Math.floor(h*0.16)));
      pedalX=pad;
      brakeY=h-pad-pedalH;
      gasY=brakeY-Math.floor(pedalH*1.08);
      const stickSize=Math.max(142,Math.min(190,w*0.17));
      const stickPad=Math.max(22,w*0.02);
      stickCX=w-stickPad-stickSize/2;
      stickCY=h-Math.max(22,h*0.03)-stickSize/2;
      stickRadius=stickSize*0.34;
      state.btnW=pedalW;state.btnH=pedalH;state.rightX=pedalX;state.throttleY=gasY;state.brakeY=brakeY;
      this._layoutButtonSteeringUi?.();
    };
    const inRect=(x,y,rx,ry,rw,rh)=>x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh;
    const setPedal=(p)=>{state.throttle=inRect(p.x,p.y,pedalX,gasY,pedalW,pedalH)?1:0;state.brake=inRect(p.x,p.y,pedalX,brakeY,pedalW,pedalH)?1:0;};
    const setStick=(p)=>{const dx=p.x-stickCX,dy=p.y-stickCY,d=Math.hypot(dx,dy),m=d>stickRadius?stickRadius/d:1;state.stickX=(dx*m)/stickRadius;state.stickY=(dy*m)/stickRadius;state.steer=state.stickX;};
    const down=p=>{
      if(p.x<this.scale.width*.5){state.leftId=p.id;setPedal(p);return;}
      if(buttonMode)return;
      state.rightId=p.id;state.leftActive=true;setStick(p);
    };
    const move=p=>{
      if(!p.isDown)return;
      if(state.leftId===p.id)setPedal(p);
      if(!buttonMode&&state.rightId===p.id)setStick(p);
    };
    const up=p=>{
      if(state.leftId===p.id){state.leftId=null;state.throttle=0;state.brake=0;}
      if(state.rightId===p.id){state.rightId=null;state.leftActive=false;state.stickX=0;state.stickY=0;state.steer=0;}
    };
    this.input.on('pointerdown',down);this.input.on('pointermove',move);this.input.on('pointerup',up);
    this.scale.on('resize',layout);layout();
    this.events.once('shutdown',()=>{this.input.off('pointerdown',down);this.input.off('pointermove',move);this.input.off('pointerup',up);this.scale.off('resize',layout);document.getElementById('tdr-race-controls')?.classList?.remove('tdr-left-handed');});
    return state;
  }

  _layoutButtonSteeringUi(){
    if(!this._tdrLeftHanded)return super._layoutButtonSteeringUi?.();
    if(this._tdrSteeringMode!=='buttons'||!this._tdrSteerButtons?.scene)return;
    const w=Number(this.scale?.width||0),h=Number(this.scale?.height||0);
    const pad=Math.max(14,Math.min(28,Math.floor(Math.min(w,h)*0.04)));
    const btnH=Math.max(76,Math.min(118,Math.floor(h*0.22)));
    const btnW=Math.max(92,Math.min(150,Math.floor(w*0.14)));
    const gap=14,y=h-pad-btnH;
    const start=w-pad-(btnW*2+gap);
    const place=(parts,x)=>{if(!parts)return;parts.bg.setPosition(x,y).setSize(btnW,btnH).setDisplaySize(btnW,btnH);parts.arrow.setPosition(x+btnW/2,y+btnH*.42).setFontSize(Math.floor(btnH*.42));parts.tx.setPosition(x+btnW/2,y+btnH-13);};
    place(this._tdrLeftButton,start);place(this._tdrRightButton,start+btnW+gap);
  }
}
