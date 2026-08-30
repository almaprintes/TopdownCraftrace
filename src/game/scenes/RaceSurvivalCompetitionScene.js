import { RaceScene as CurrentRaceScene } from './RaceSurvivalModeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams, resolveCarParamsWithTuning } from '../cars/resolveCarParams.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';
import { loadGarage, garageTuning } from '../garage/garageStore.js';
import { buildSurvivalRoster } from '../modes/survival/survivalRoster.js';
import { buildClosedCenterline, buildSurvivalGrid } from '../modes/survival/survivalGrid.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const textureKey=id=>`survival-car-${id}`;
const skinUrl=spec=>spec?.skin?`${BASE}assets/skins/${spec.skin}`:null;

function readSelectedCarId(){
  try{return String(localStorage.getItem('tdr2:carId')||'helix_spark');}catch{return'helix_spark';}
}

function visualCarSprite(scene){
  const list=scene?.carRig?.list;
  if(!Array.isArray(list))return null;
  return list.find(o=>o?.visible!==false&&o?.texture?.key&&o.texture.key!=='__BODY__'&&scene.textures?.exists?.(o.texture.key))||null;
}

/**
 * Clean Survival competition builder.
 * RaceSurvivalModeScene keeps the proven lap/elimination contract while this
 * scene is the sole authority for roster, starting grid and race release.
 * CPU visuals use the same /assets/skins source as the normal race loader.
 * CPU physics use each rival's own base car with the player's Workshop tuning
 * applied exactly once.
 */
export class RaceScene extends CurrentRaceScene {
  preload(){
    super.preload?.();
    if(!this.load)return;
    const roster=buildSurvivalRoster(readSelectedCarId());
    for(const entry of roster){
      if(entry.type!=='cpu'||!entry.spec?.skin)continue;
      const key=textureKey(entry.carId),url=skinUrl(entry.spec);
      if(url&&!this.textures?.exists?.(key))this.load.image(key,url);
    }
  }

  _survivalStartPoint(){
    const gate=this._survivalFinishGate?.();
    if(gate)return{x:gate.mx,y:gate.my};
    const cl=this._survivalCenterline?.()||[];
    const p=cl[0],x=Number(p?.x??p?.[0]),y=Number(p?.y??p?.[1]);
    return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
  }

  _survivalGridSpacing(visual){
    const carLength=Math.max(24,Number(visual?.displayHeight||visual?.height||48));
    // Leave two complete car lengths of empty road between consecutive cars.
    // Since each car occupies roughly one car length, center-to-center spacing
    // is therefore ~3 car lengths. This keeps the single-file grid stretched
    // cleanly along the centerline and avoids launch contact.
    return clamp(carLength*3,84,156);
  }

  _initSurvival(){
    if(!this._survivalMode||this._survivalBots?.length)return;
    const visual=visualCarSprite(this),centerline=this._survivalCenterline?.()||[];
    const line=buildClosedCenterline(centerline);
    if(!visual||!line)return;

    const playerId=String(this.carId||this.selectedCarId||readSelectedCarId());
    const playerBaseSpec=CAR_SPECS[playerId]||CAR_SPECS.helix_spark;
    const playerSpec=resolveCarParams(playerBaseSpec);
    let playerUpgradeTuning={};
    try{playerUpgradeTuning=garageTuning(loadGarage(),playerBaseSpec.id)||{};}catch{}
    const roster=buildSurvivalRoster(playerBaseSpec.id,5);
    if(roster.length!==6)return;

    this._survivalRoster=roster;
    this._survivalPathOffset=this._survivalFindFinishOffset?.()||0;

    const spacing=this._survivalGridSpacing(visual);
    const frontOffset=Math.min(24,spacing*.36);
    const grid=buildSurvivalGrid({
      centerline,
      roster,
      startPoint:this._survivalStartPoint(),
      frontOffset,
      spacing
    });
    if(grid.length!==6)return;
    this._survivalGrid=grid;

    const playerSlot=grid.find(slot=>slot.type==='player');
    if(playerSlot){
      try{
        const body=this.carBody||this.car;
        body?.setPosition?.(playerSlot.x,playerSlot.y);
        if(body)body.rotation=playerSlot.rotation;
        if(body?.body){
          body.body.rotation=playerSlot.rotation;
          body.body.velocity.x=0;body.body.velocity.y=0;
          if(Number.isFinite(body.body.angularVelocity))body.body.angularVelocity=0;
        }
        if(this.carRig){
          this.carRig.setPosition?.(playerSlot.x,playerSlot.y);
          this.carRig.rotation=playerSlot.rotation+Number(this._carVisualRotOffset||0);
        }
      }catch(err){console.warn('[survival-grid] player placement failed',err);}
    }

    const surfaceId=this._survivalSurfaceId?.()||'ASPHALT';
    const surface=resolveVehicleSurface(playerSpec,surfaceId);
    const playerMax=Math.max(120,Number(this.maxFwd||this.carParams?.maxFwd||playerSpec.maxFwd||420));
    const bestMs=this._survivalPlayerBestLapMs?.();
    let baseLapSec;
    if(Number.isFinite(bestMs))baseLapSec=clamp(bestMs/1000,12,180);
    else{
      const surfacePace=clamp((surface.speedCapacity||1)*(surface.movingDriveCapacity||1),.42,1.02);
      baseLapSec=clamp(line.totalLength/Math.max(55,playerMax*surfacePace*.42),28,120);
    }

    const playerScale=Math.max(.5,Number(playerBaseSpec.visualScale||1));
    const visualScaleX=Number(visual.scaleX||1),visualScaleY=Number(visual.scaleY||1);
    const trackW=Math.max(80,Number(this.track?.meta?.trackWidth||this.track?.trackWidth||this.trackWidth||140));

    for(const slot of grid){
      if(slot.type!=='cpu')continue;
      const key=textureKey(slot.carId);
      if(!this.textures?.exists?.(key)){
        console.error(`[survival-grid] CPU skin was not loaded: ${slot.carId} -> ${skinUrl(slot.spec)}`);
        continue;
      }
      const sprite=this.add.image(slot.x,slot.y,key)
        .setOrigin(visual.originX??.5,visual.originY??.5)
        .setDepth(Math.max(29,Number(this.carRig?.depth||30)-1));
      const scaleRatio=clamp(Number(slot.spec?.visualScale||1)/playerScale,.72,1.32);
      sprite.setScale(visualScaleX*scaleRatio,visualScaleY*scaleRatio);
      sprite.clearTint?.();sprite.setAlpha(1).setBlendMode('NORMAL');
      sprite.rotation=slot.rotation+Number(this._carVisualRotOffset||0);
      try{this.uiCam?.ignore?.(sprite);}catch{}

      const backDistance=spacing*slot.gridIndex+frontOffset;
      const startProgress=-backDistance/line.totalLength;
      const targetRate=(1/baseLapSec)*Number(slot.targetPace||1);
      const carWidth=Math.max(12,Number(sprite.displayWidth||sprite.width||28));
      const cpuSpec=resolveCarParamsWithTuning(slot.spec,playerUpgradeTuning);
      this._survivalBots.push({
        id:slot.label||`CPU ${slot.gridIndex}`,carId:slot.carId,carSpec:cpuSpec,
        gridIndex:slot.gridIndex,carScore:slot.carScore,targetPace:slot.targetPace,
        sprite,absProgress:startProgress,lapRate:0,targetRate,lane:0,baseLane:0,
        active:true,launchDelay:0,armed:false,completedLaps:0,distanceSinceFinish:0,
        prevX:slot.x,prevY:slot.y,
        paceFactor:rand(.985,1.015),paceTarget:rand(.985,1.015),nextPaceChange:rand(3.5,6.5),
        lapFactor:1,linePhase:rand(0,Math.PI*2),lineFreq:rand(.65,1.15),lineAmp:rand(carWidth*.10,carWidth*.28),
        trackW,mistakeUntil:0,mistakeLane:0,mistakeSlow:1,nextMistakeCheck:rand(1.2,2.8),lastLapSeen:0
      });
    }

    if(this._survivalBots.length!==5)console.error(`[survival-grid] expected 5 CPU cars, created ${this._survivalBots.length}`);
    this._createSurvivalHud?.();
  }

  update(time,delta){
    if(this._survivalMode&&!this._raceStarted){
      const body=this.car?.body||this.carBody?.body||this.carBody;
      const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
      if(this._startState==='RACING'||this._startState==='GO'||Math.hypot(vx,vy)>4)this._raceStarted=true;
    }
    return super.update?.(time,delta);
  }
}
