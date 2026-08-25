import { RaceScene as CurrentRaceScene } from './RaceHandbrakeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

const PRACTICE_KEY='practice-area';
const MODE_KEY='tdr2:gameMode';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;

function isPractice(data){
  if(data?.gameMode==='practice')return true;
  try{return localStorage.getItem(MODE_KEY)==='practice';}catch{return false;}
}

function inRect(x,y,z){
  return x>=Number(z.x)&&x<=Number(z.x)+Number(z.w)&&y>=Number(z.y)&&y<=Number(z.y)+Number(z.h);
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    this._practiceAreaMode=isPractice(data);
    const launch=this._practiceAreaMode?{...(data||{}),trackKey:PRACTICE_KEY,gameMode:'practice'}:data;
    const result=super.create(launch);
    if(!this._practiceAreaMode)return result;

    this._practiceZones=Array.isArray(this.track?.meta?.practiceZones)?this.track.meta.practiceZones:[];
    this._capturePracticeSurfaceBaseline();
    this._buildPracticeSurfaceInteractions();

    this._disablePracticeRaceRules();
    this._buildPracticeWorld();
    this.time?.delayedCall?.(0,()=>this._placePracticeCar());
    this.time?.delayedCall?.(250,()=>{this._disablePracticeRaceRules();this._placePracticeCar();});
    return result;
  }

  _capturePracticeSurfaceBaseline(){
    this._practiceSurfaceBase={
      accel:Number(this.accel),
      brakeForce:Number(this.brakeForce),
      maxFwd:Number(this.maxFwd),
      linearDrag:Number(this.linearDrag),
      lateralGrip:Number(this.lateralGrip),
      steeringLateralGrip:Number(this.carParams?.steering?.lateralGrip)
    };
  }

  _buildPracticeSurfaceInteractions(){
    const spec=CAR_SPECS?.[this.carId]||{};
    this._practiceSurfaceInteractions={
      ASPHALT:resolveVehicleSurface(spec,'ASPHALT'),
      DIRT:resolveVehicleSurface(spec,'DIRT'),
      GRASS:resolveVehicleSurface(spec,'GRASS')
    };
  }

  _materialAt(x,y){
    if(!this._practiceAreaMode)return 'ASPHALT';
    let found='GRASS';
    for(const z of this._practiceZones){if(inRect(x,y,z))found=String(z.id||'GRASS').toUpperCase();}
    return found;
  }

  _practiceControls(){
    const t=this.touch||{};
    return {
      steer:clamp(Number(t.steer??t.stickX??0),-1,1),
      throttle:clamp(Number(t.throttle??0),0,1),
      brake:clamp(Number(t.brake??0),0,1)
    };
  }

  _practiceForwardKinematics(body){
    const rot=Number(body?.rotation||0);
    const vx=Number(body?.body?.velocity?.x||0);
    const vy=Number(body?.body?.velocity?.y||0);
    const fx=Math.cos(rot),fy=Math.sin(rot),rx=-fy,ry=fx;
    const vF=vx*fx+vy*fy,vL=vx*rx+vy*ry;
    return {speed:Math.hypot(vx,vy),vF,vL,slipAngle:Math.atan2(vL,Math.max(18,Math.abs(vF)))};
  }

  _applyPracticeMaterial(material,body){
    const base=this._practiceSurfaceBase;
    const interaction=this._practiceSurfaceInteractions?.[material];
    if(!base||!interaction)return;

    const controls=this._practiceControls();
    const kin=this._practiceForwardKinematics(body);
    const baseMax=Math.max(1,Number(base.maxFwd||1));
    const speed01=clamp(kin.speed/baseMax,0,1);

    let driveCapacity=interaction.longCapacity;
    let latCapacity=interaction.latCapacity;
    let brakeCapacity=interaction.brakingCapacity;

    if(material==='DIRT'){
      const launchBlend=clamp(speed01/.35,0,1);
      const eased=launchBlend*launchBlend*(3-2*launchBlend);
      driveCapacity=lerp(interaction.launchCapacity,interaction.movingDriveCapacity,eased);
      const cornerLoad=clamp(Math.abs(controls.steer)*speed01*1.65,0,1);
      const brakeLoad=clamp(controls.brake*speed01*1.45,0,1);
      const throttleLoad=clamp(controls.throttle*Math.abs(controls.steer)*speed01,0,1);
      latCapacity*=1-interaction.cornerSlide*cornerLoad*.72;
      latCapacity*=1-interaction.brakeSlide*brakeLoad*.86;
      latCapacity*=1-interaction.cornerSlide*throttleLoad*.28;
      latCapacity=clamp(latCapacity,.07,1);
      brakeCapacity*=1-interaction.brakeSlide*brakeLoad*.42;
      brakeCapacity=clamp(brakeCapacity,.24,1);
    }

    if(Number.isFinite(base.accel))this.accel=base.accel*driveCapacity;
    if(Number.isFinite(base.brakeForce))this.brakeForce=base.brakeForce*brakeCapacity;
    if(Number.isFinite(base.maxFwd))this.maxFwd=base.maxFwd*interaction.speedCapacity;
    if(Number.isFinite(base.linearDrag))this.linearDrag=base.linearDrag*interaction.dragFactor;
    if(Number.isFinite(base.lateralGrip))this.lateralGrip=base.lateralGrip*latCapacity;
    if(this.carParams?.steering&&Number.isFinite(base.steeringLateralGrip)){
      this.carParams.steering.lateralGrip=Math.max(.18,base.steeringLateralGrip*latCapacity);
    }
  }

  _applyPracticeRollingResistance(material,body,delta){
    const interaction=this._practiceSurfaceInteractions?.[material];
    const vel=body?.body?.velocity;
    if(!interaction||!vel)return;
    const speed=Math.hypot(Number(vel.x||0),Number(vel.y||0));
    if(speed<.01)return;
    const dt=clamp(Number(delta||16.67)/1000,.001,.05);
    const decel=Math.max(0,Number(interaction.rollingDecel||0));
    if(decel<=0)return;
    const next=Math.max(0,speed-decel*dt),k=next/speed;
    vel.x*=k;vel.y*=k;
  }

  _disablePracticeRaceRules(){
    if(!this._practiceAreaMode)return;
    try{this.finishLine=null;}catch{}
    try{this.checkpoints=[];}catch{}
    try{if(this.track){this.track.finishLine=null;this.track.checkpoints=[];}}catch{}
    for(const key of ['finishLineGfx','finishGfx','checkpointGfx','checkpointGraphics','cpGraphics']){
      try{this[key]?.setVisible?.(false);}catch{}
      try{this[key]?.destroy?.();}catch{}
    }
    try{this.ttPanel?.c?.setVisible?.(false);}catch{}
    this._showTTPanel=()=>{};
    this._hideTTPanel=()=>{};
  }

  _hideLegacyPracticeTerrain(){
    for(const obj of [this.bgOff,this.bgGrass]){try{obj?.setVisible?.(false);}catch{}}
    const cells=this.track?.gfxByCell;
    if(cells?.values){
      for(const cell of cells.values()){
        try{cell?.tile?.setVisible?.(false);}catch{}
        try{cell?.overlay?.setVisible?.(false);}catch{}
      }
    }
    if(Array.isArray(this._circuitEnvironment)){
      for(const obj of this._circuitEnvironment){try{obj?.destroy?.();}catch{}}
      this._circuitEnvironment=[];
    }
  }

  _worldRect(x,y,w,h,color){
    const o=this.add.rectangle(x,y,w,h,color,1).setOrigin(0).setDepth(1);
    try{this.uiCam?.ignore?.(o);}catch{}
    this._practiceWorldObjects.push(o);
    return o;
  }

  _worldText(x,y,text,size=42,color='#ffffff'){
    const o=this.add.text(x,y,text,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:`${size}px`,fontStyle:'bold',color,stroke:'#000000',strokeThickness:2}).setOrigin(.5).setDepth(5).setAlpha(.62);
    try{this.uiCam?.ignore?.(o);}catch{}
    this._practiceWorldObjects.push(o);
    return o;
  }

  _buildPracticeWorld(){
    this._hideLegacyPracticeTerrain();
    this._practiceWorldObjects=[];

    this._worldRect(0,0,7000,2200,0x3d4245);
    this._worldRect(0,2200,3500,2800,0x76563c);
    this._worldRect(3500,2200,3500,2800,0x42583d);
    this._worldRect(5000,3250,1650,1250,0x383d40);

    const g=this.add.graphics().setDepth(4);
    this._practiceWorldObjects.push(g);
    try{this.uiCam?.ignore?.(g);}catch{}

    g.lineStyle(6,0xffffff,.20);
    g.lineBetween(0,2200,7000,2200);
    g.lineBetween(3500,2200,3500,5000);

    const rx=420,ry=560,rw=6100,rh=520;
    g.fillStyle(0x24282b,.68);g.fillRoundedRect(rx,ry,rw,rh,28);
    g.lineStyle(8,0xe5edf2,.62);g.strokeRoundedRect(rx,ry,rw,rh,28);
    const end=rx+rw;
    const warnings=[820,610,440,310,215,145,90];
    warnings.forEach((d,i)=>{
      const alpha=.28+i*.08;
      g.lineStyle(10+(i>4?4:0),0xffffff,alpha);
      g.lineBetween(end-d,ry+28,end-d,ry+rh-28);
    });
    g.fillStyle(0xffc857,.12);g.fillRect(end-520,ry+16,500,rh-32);

    g.lineStyle(8,0xffffff,.17);
    g.strokeCircle(1500,1650,360);g.strokeCircle(1500,1650,180);
    g.strokeCircle(2650,1650,480);

    g.lineStyle(5,0xffffff,.24);g.strokeRoundedRect(5050,3300,1550,1150,24);
    const coneXs=[5250,5480,5710,5940,6170,6400];
    coneXs.forEach((x,i)=>{g.fillStyle(0xff8a24,.95);g.fillTriangle(x,3520+(i%2)*170,x-24,3580+(i%2)*170,x+24,3580+(i%2)*170);});
    for(let i=0;i<7;i++){g.fillStyle(0x15191b,.95);g.fillCircle(5260+i*190,4140+(i%2)*90,34);g.lineStyle(5,0x767d80,.65);g.strokeCircle(5260+i*190,4140+(i%2)*90,34);}

    this._worldText(3500,300,'ZONA DE VELOCIDAD',48,'#eef7ff');
    this._worldText(1500,2350,'TIERRA · DRIFT LIBRE',44,'#ffe0b5');
    this._worldText(4550,2500,'OFF-ROAD',44,'#d9ffd2');
    this._worldText(5825,3380,'GYMKHANA',34,'#fff0ba');

    const badge=this.add.text(this.scale.width/2,12,'ÁREA DE PRUEBAS  ·  CONDUCCIÓN LIBRE',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#fff4c6',backgroundColor:'#07131bcc',padding:{x:12,y:7}}).setOrigin(.5,0).setScrollFactor(0).setDepth(7000);
    this._practiceBadge=badge;

    this.events.once('shutdown',()=>{
      for(const o of this._practiceWorldObjects||[]){try{o?.destroy?.();}catch{}}
      try{this._practiceBadge?.destroy?.();}catch{}
      this._practiceWorldObjects=[];this._practiceBadge=null;
    });
  }

  _placePracticeCar(){
    if(!this._practiceAreaMode)return;
    const p=this.track?.meta?.practiceSpawn||{x:700,y:900,r:0};
    const body=this.carBody||this.car;
    if(body?.scene){
      try{body.setPosition(Number(p.x)||700,Number(p.y)||900);}catch{}
      try{body.setRotation(Number(p.r)||0);}catch{}
      try{body.body?.setVelocity?.(0,0);}catch{}
      try{if(body.body?.velocity){body.body.velocity.x=0;body.body.velocity.y=0;}}catch{}
    }
    if(this.carRig?.scene){
      try{this.carRig.setPosition(Number(p.x)||700,Number(p.y)||900);this.carRig.rotation=(Number(p.r)||0)+(this._carVisualRotOffset||0);}catch{}
    }
    try{this.cameras?.main?.setBounds?.(0,0,7000,5000);}catch{}
  }

  update(time,delta){
    if(!this._practiceAreaMode){
      super.update(time,delta);
      return;
    }

    const bodyBefore=this.carBody||this.car;
    const materialBefore=this._materialAt(Number(bodyBefore?.x||0),Number(bodyBefore?.y||0));
    this._applyPracticeMaterial(materialBefore,bodyBefore);

    // Área de Pruebas no tiene una pista válida/ inválida: neutraliza SOLO aquí
    // la penalización genérica de salirse del ribbon técnico invisible.
    const originalOnTrack=this._isOnTrack;
    const originalInBand=this._isInBand;
    this._isOnTrack=()=>true;
    this._isInBand=()=>false;
    try{
      super.update(time,delta);
    }finally{
      this._isOnTrack=originalOnTrack;
      this._isInBand=originalInBand;
    }

    const bodyAfter=this.carBody||this.car;
    const materialAfter=this._materialAt(Number(bodyAfter?.x||0),Number(bodyAfter?.y||0));
    this._applyPracticeRollingResistance(materialAfter,bodyAfter,delta);
    this._surface=materialAfter;
    this._onTrack=true;
    this._applyPracticeMaterial(materialAfter,bodyAfter);
    this._disablePracticeRaceRules();
  }
}
