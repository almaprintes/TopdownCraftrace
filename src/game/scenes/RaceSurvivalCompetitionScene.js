import { RaceScene as CurrentRaceScene } from './RaceSurvivalModeScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';
import { buildSurvivalRoster } from '../modes/survival/survivalRoster.js';
import { buildClosedCenterline, buildSurvivalGrid } from '../modes/survival/survivalGrid.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const textureKey=id=>`survival-car-${id}`;

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
 *
 * Upgrade fairness rule: resolveCarParams() always reads the currently selected
 * player's equipped Workshop parts. Every CPU base car is resolved through the
 * same function, so engine/brakes/transmission/tires/etc. are identical in tier
 * to the player's loadout. Only the base car and CPU driving pace differ.
 */
export class RaceScene extends CurrentRaceScene {
  preload(){
    super.preload?.();
    if(!this.load)return;
    const roster=buildSurvivalRoster(readSelectedCarId());
    for(const entry of roster){
      if(entry.type!=='cpu'||!entry.spec?.skin)continue;
      const key=textureKey(entry.carId);
      if(!this.textures?.exists?.(key))this.load.image(key,`${BASE}assets/cars/runtime/${entry.spec.skin}`);
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
    return clamp(carLength*1.55,52,82);
  }

  _initSurvival(){
    if(!this._survivalMode||this._survivalBots?.length)return;
    const visual=visualCarSprite(this),centerline=this._survivalCenterline?.()||[];
    const line=buildClosedCenterline(centerline);
    if(!visual||!line)return;

    const playerId=String(this.carId||this.selectedCarId||readSelectedCarId());
    const playerBaseSpec=CAR_SPECS[playerId]||CAR_SPECS.helix_spark;
    const playerSpec=resolveCarParams(playerBaseSpec);
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
        console.warn(`[survival-grid] missing CPU texture ${key}; skipping ${slot.carId}`);
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
      // Critical fairness invariant: resolve the CPU's own base car using the
      // player's currently equipped upgrades. resolveCarParams() reads the
      // selected car's Workshop tuning, so every rival receives the exact same
      // upgrade package without mutating ownership/equipment in the garage.
      const cpuSpec=resolveCarParams(slot.spec);
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
    // The common countdown remains authoritative. CPU release is inferred from
    // the same state/movement as the player, with no independent start timer.
    if(this._survivalMode&&!this._raceStarted){
      const body=this.car?.body||this.carBody?.body||this.carBody;
      const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
      if(this._startState==='RACING'||this._startState==='GO'||Math.hypot(vx,vy)>4)this._raceStarted=true;
    }
    return super.update?.(time,delta);
  }
}
