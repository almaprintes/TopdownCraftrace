import { RaceScene as CurrentRaceScene } from './RaceHandbrakeScene.js';

const PRACTICE_KEY='practice-area';
const MODE_KEY='tdr2:gameMode';

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

    // Reuse the proven vehicle × surface dynamics, but feed it the large
    // authored practice zones instead of a ribbon/grass-band circuit.
    this._practiceZones=Array.isArray(this.track?.meta?.practiceZones)?this.track.meta.practiceZones:[];
    try{this._captureSurfaceBaseline?.();this._buildSurfaceInteractions?.();}catch{}
    this._tdrSurfaceProfile='dirt-asphalt-grass';

    this._disablePracticeRaceRules();
    this._buildPracticeWorld();
    this.time?.delayedCall?.(0,()=>this._placePracticeCar());
    this.time?.delayedCall?.(250,()=>{this._disablePracticeRaceRules();this._placePracticeCar();});
    return result;
  }

  _materialAt(x,y){
    if(!this._practiceAreaMode)return super._materialAt(x,y);
    let found='GRASS';
    // Later zones override earlier zones; this lets the asphalt gymkhana pad
    // sit inside the large off-road field.
    for(const z of this._practiceZones){if(inRect(x,y,z))found=String(z.id||'GRASS').toUpperCase();}
    return found;
  }

  _applySurfaceProfileVisuals(){
    if(this._practiceAreaMode)return;
    return super._applySurfaceProfileVisuals();
  }

  _pruneEnvironmentFromAsphalt(){
    if(this._practiceAreaMode)return;
    return super._pruneEnvironmentFromAsphalt();
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

    // Only four huge surfaces + one graphics object: intentionally cheap.
    this._worldRect(0,0,7000,2200,0x3d4245);          // asphalt / speed + drift
    this._worldRect(0,2200,3500,2800,0x76563c);       // dirt
    this._worldRect(3500,2200,3500,2800,0x42583d);    // off-road / grass
    this._worldRect(5000,3250,1650,1250,0x383d40);    // gymkhana asphalt pad

    const g=this.add.graphics().setDepth(4);
    this._practiceWorldObjects.push(g);
    try{this.uiCam?.ignore?.(g);}catch{}

    // Zone boundaries.
    g.lineStyle(6,0xffffff,.20);
    g.lineBetween(0,2200,7000,2200);
    g.lineBetween(3500,2200,3500,5000);

    // Speed runway: long asphalt lane with pool-style progressively denser
    // transverse warning marks before a deliberately huge braking escape area.
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
    // Last 520 px remain as a large run-off after the densest warning zone.
    g.fillStyle(0xffc857,.12);g.fillRect(end-520,ry+16,500,rh-32);

    // Asphalt drift circles.
    g.lineStyle(8,0xffffff,.17);
    g.strokeCircle(1500,1650,360);g.strokeCircle(1500,1650,180);
    g.strokeCircle(2650,1650,480);

    // Gymkhana: small and cheap, made from primitives rather than sprites.
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
    super.update(time,delta);
    if(this._practiceAreaMode)this._disablePracticeRaceRules();
  }
}
