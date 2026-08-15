import { RaceScene as CurrentRaceScene } from './RaceVideoPreferencesScene.js';

const MODE_KEY='tdr2:gameMode';
const GHOST_PREFIX='tdr2:ghost:';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function readMode(data){
  if(data?.gameMode==='ghost'||data?.gameMode==='timeattack')return data.gameMode;
  try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return 'timeattack';}
}

function keyFor(trackKey,carId){return `${GHOST_PREFIX}${trackKey||'track01'}:${carId||'car'}`;}

function readGhost(key){
  try{
    const g=JSON.parse(localStorage.getItem(key)||'null');
    if(!g||!Array.isArray(g.samples)||g.samples.length<2||!Number.isFinite(Number(g.lapMs)))return null;
    return g;
  }catch{return null;}
}

function writeGhost(key,g){
  try{localStorage.setItem(key,JSON.stringify(g));return true;}catch{return false;}
}

function lerpAngle(a,b,t){
  let d=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;
  return a+d*t;
}

function visualCarSprite(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>{
    const key=o?.texture?.key;
    return o?.visible!==false && key && key!=='__BODY__' && scene.textures?.exists?.(key);
  })||null;
}

export class RaceScene extends CurrentRaceScene{
  create(data){
    this._tdrGameMode=readMode(data);
    const result=super.create(data);
    this._ghostTrackKey=data?.trackKey||this.trackKey||(()=>{try{return localStorage.getItem('tdr2:trackKey')||'track01';}catch{return 'track01';}})();
    this._ghostCarId=data?.carId||this.carId||(()=>{try{return localStorage.getItem('tdr2:carId')||'car';}catch{return 'car';}})();
    this._ghostStorageKey=keyFor(this._ghostTrackKey,this._ghostCarId);
    this._ghostData=readGhost(this._ghostStorageKey);
    this._ghostSamples=[];
    this._ghostLapStartPerf=null;
    this._ghostLastSamplePerf=0;
    this._ghostHistoryLen=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._ghostSprite=null;
    this._ghostHud=null;

    this.time.delayedCall(0,()=>{
      if(this._tdrGameMode==='ghost'){
        this._createGhostSprite();
        this._createGhostHud();
      }
    });

    if(this._tdrGameMode==='ghost'&&this._ghostData){
      this.time.delayedCall(180,()=>this._syncGhostVisual());
      this.time.delayedCall(500,()=>this._syncGhostVisual());
      this.time.delayedCall(1000,()=>this._syncGhostVisual());
    }

    this.events.once('shutdown',()=>{
      try{this._ghostSprite?.destroy?.();}catch{}
      try{this._ghostHud?.destroy?.();}catch{}
      this._ghostSprite=null;this._ghostHud=null;
    });
    return result;
  }

  _runtimeGhostTextureKey(){
    const runtimeKey=`car_${this._ghostCarId}`;
    if(this.textures?.exists?.(runtimeKey))return runtimeKey;
    const visual=visualCarSprite(this);
    const current=visual?.texture?.key;
    return current&&current!=='__BODY__'&&this.textures?.exists?.(current)?current:null;
  }

  _createGhostSprite(){
    if(this._tdrGameMode!=='ghost'||!this._ghostData||this._ghostSprite?.scene)return;
    const body=this.carBody;
    const visual=visualCarSprite(this);
    const tex=this._runtimeGhostTextureKey();
    if(!body||!visual||!tex)return;

    const g=this.add.image(Number(body.x||0),Number(body.y||0),tex)
      .setOrigin(visual.originX??.5,visual.originY??.5)
      .setAlpha(.48)
      .setTint(0x79eaff)
      .setBlendMode('ADD');

    g.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));
    g.setDepth(Math.max(31,Number(this.carRig?.depth||30)+1));
    this._ghostSprite=g;
    this._ghostTextureKey=tex;

    try{this.uiCam?.ignore?.(g);}catch{}
  }

  _syncGhostVisual(){
    if(this._tdrGameMode!=='ghost'||!this._ghostData)return;
    if(!this._ghostSprite?.scene){
      this._createGhostSprite();
      return;
    }

    // The selected car's real runtime skin always has this deterministic key.
    // Prefer it over whatever temporary/procedural texture the visual rig had
    // during the first frame while the asynchronous skin loader was still busy.
    const desired=this._runtimeGhostTextureKey();
    if(desired&&this._ghostSprite.texture?.key!==desired){
      try{this._ghostSprite.setTexture(desired);this._ghostTextureKey=desired;}catch{}
    }

    const visual=visualCarSprite(this);
    if(visual){
      try{this._ghostSprite.setOrigin(visual.originX??.5,visual.originY??.5);}catch{}
      try{this._ghostSprite.setScale(Number(visual.scaleX||1),Number(visual.scaleY||1));}catch{}
    }
  }

  _createGhostHud(){
    if(this._ghostHud?.scene)return;
    const label=this._ghostData?'👻 FANTASMA · RÉCORD CARGADO':'👻 FANTASMA · CREA TU PRIMERA VUELTA';
    this._ghostHud=this.add.text(this.scale.width/2,12,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#9beeff',backgroundColor:'rgba(3,13,22,.72)',padding:{x:9,y:5}})
      .setOrigin(.5,0).setScrollFactor(0).setDepth(5005);
  }

  _recordGhostSample(now){
    if(!this._raceStarted||!this.carBody)return;
    if(this._ghostLapStartPerf==null)this._ghostLapStartPerf=now;
    if(now-this._ghostLastSamplePerf<45)return;
    this._ghostLastSamplePerf=now;
    this._ghostSamples.push({
      t:Math.max(0,Math.round(now-this._ghostLapStartPerf)),
      x:Number(this.carBody.x||0),
      y:Number(this.carBody.y||0),
      r:Number(this.carBody.rotation||0)
    });
    if(this._ghostSamples.length>5000)this._ghostSamples.shift();
  }

  _completedLapCheck(now){
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    if(hist.length<=this._ghostHistoryLen)return;
    const last=hist[hist.length-1]||{};
    const lapMs=Number(last.lapMs ?? this.timing?.lastLap);
    const valid=last.valid!==false&&last.invalid!==true&&Number.isFinite(lapMs)&&lapMs>1000;
    if(valid&&this._ghostSamples.length>4){
      const previous=this._ghostData;
      if(!previous||lapMs<Number(previous.lapMs)){
        const saved={version:3,trackKey:this._ghostTrackKey,carId:this._ghostCarId,lapMs:Math.round(lapMs),samples:this._ghostSamples.slice()};
        if(writeGhost(this._ghostStorageKey,saved)){
          this._ghostData=saved;
          if(this._tdrGameMode==='ghost'){
            try{this._ghostSprite?.destroy?.();}catch{}
            this._ghostSprite=null;
            this._createGhostSprite();
            this._syncGhostVisual();
            if(this._ghostHud?.scene)this._ghostHud.setText(previous?'👻 NUEVO FANTASMA · RÉCORD MEJORADO':'👻 FANTASMA CREADO · SIGUIENTE VUELTA');
          }
        }
      }
    }
    this._ghostHistoryLen=hist.length;
    this._ghostSamples=[];
    this._ghostLapStartPerf=now;
    this._ghostLastSamplePerf=0;
  }

  _playGhost(now){
    const g=this._ghostSprite,data=this._ghostData;
    if(this._tdrGameMode!=='ghost'||!g?.scene||!data?.samples?.length||this._ghostLapStartPerf==null)return;
    const t=now-this._ghostLapStartPerf;
    const samples=data.samples;
    if(t<0||t>Number(data.lapMs)+250){g.setVisible(false);return;}
    g.setVisible(true);
    let lo=0,hi=samples.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(Number(samples[mid].t)<t)lo=mid+1;else hi=mid;}
    const i=Math.max(1,lo);
    const a=samples[i-1],b=samples[i]||a;
    const den=Math.max(1,Number(b.t)-Number(a.t));
    const k=clamp((t-Number(a.t))/den,0,1);
    g.setPosition(Number(a.x)+(Number(b.x)-Number(a.x))*k,Number(a.y)+(Number(b.y)-Number(a.y))*k);
    const bodyRot=lerpAngle(Number(a.r||0),Number(b.r||0),k);
    g.rotation=bodyRot+Number(this._carVisualRotOffset||0);
  }

  update(time,delta){
    super.update(time,delta);
    const now=performance.now();
    if(this._raceStarted&&this._ghostLapStartPerf==null)this._ghostLapStartPerf=now;
    this._syncGhostVisual();
    this._recordGhostSample(now);
    this._completedLapCheck(now);
    this._playGhost(now);
  }
}
