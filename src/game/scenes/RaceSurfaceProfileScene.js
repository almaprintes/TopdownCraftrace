import { RaceScene as CurrentRaceScene } from './RaceDirectionScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveVehicleSurface } from '../cars/surfaceInteraction.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

// Surface physics only. Visual materials/environment belong to the authored circuit
// and must never be replaced by the legacy procedural dirt/asphalt/grass profile.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._tdrSurfaceProfile = String(this.track?.meta?.surfaceProfile || this.track?.meta?.meta?.surfaceProfile || '').toLowerCase();
    this._tdrOriginalIsOnTrack = this._isOnTrack;
    this._tdrOriginalIsInBand = this._isInBand;
    this._tdrSurfaceBase = null;
    this._tdrSurfaceInteractions = null;
    if (this._tdrSurfaceProfile === 'dirt-asphalt-grass') {
      this._captureSurfaceBaseline();
      this._buildSurfaceInteractions();
    }
    return result;
  }

  _captureSurfaceBaseline() {
    this._tdrSurfaceBase = {
      accel:Number(this.accel), brakeForce:Number(this.brakeForce), maxFwd:Number(this.maxFwd),
      linearDrag:Number(this.linearDrag), lateralGrip:Number(this.lateralGrip),
      steeringLateralGrip:Number(this.carParams?.steering?.lateralGrip)
    };
  }
  _buildSurfaceInteractions() {
    const spec=CAR_SPECS?.[this.carId]||{};
    this._tdrSurfaceInteractions={DIRT:resolveVehicleSurface(spec,'DIRT'),ASPHALT:resolveVehicleSurface(spec,'ASPHALT'),GRASS:resolveVehicleSurface(spec,'GRASS')};
  }
  _rawIsOnTrack(x,y){const fn=this._tdrOriginalIsOnTrack;return typeof fn==='function'?!!fn.call(this,x,y):true;}
  _rawIsInGrassBand(x,y){const fn=this._tdrOriginalIsInBand;return typeof fn==='function'?!!fn.call(this,this.track?.geom?.grass,x,y):false;}
  _materialAt(x,y){if(this._rawIsOnTrack(x,y))return'DIRT';if(this._rawIsInGrassBand(x,y))return'ASPHALT';return'GRASS';}
  _currentControls(){const t=this.touch||{};return{steer:clamp(Number(t.steer??t.stickX??0),-1,1),throttle:clamp(Number(t.throttle??0),0,1),brake:clamp(Number(t.brake??0),0,1)};}
  _forwardKinematics(body){const rot=Number(body?.rotation||0),vx=Number(body?.body?.velocity?.x||0),vy=Number(body?.body?.velocity?.y||0),fx=Math.cos(rot),fy=Math.sin(rot),rx=-fy,ry=fx,vF=vx*fx+vy*fy,vL=vx*rx+vy*ry;return{speed:Math.hypot(vx,vy),vF,vL,slipAngle:Math.atan2(vL,Math.max(18,Math.abs(vF)))};}

  _applyResolvedMaterial(material,body){
    const base=this._tdrSurfaceBase,interaction=this._tdrSurfaceInteractions?.[material];if(!base||!interaction)return;
    const controls=this._currentControls(),kin=this._forwardKinematics(body),baseMax=Math.max(1,Number(base.maxFwd||1)),speed01=clamp(kin.speed/baseMax,0,1);
    let driveCapacity=interaction.longCapacity,latCapacity=interaction.latCapacity,brakeCapacity=interaction.brakingCapacity;
    if(material==='DIRT'){
      const launchBlend=clamp(speed01/.35,0,1),eased=launchBlend*launchBlend*(3-2*launchBlend);
      driveCapacity=lerp(interaction.launchCapacity,interaction.movingDriveCapacity,eased);
      const cornerLoad=clamp(Math.abs(controls.steer)*speed01*1.65,0,1),brakeLoad=clamp(controls.brake*speed01*1.45,0,1),throttleLoad=clamp(controls.throttle*Math.abs(controls.steer)*speed01,0,1);
      latCapacity*=1-interaction.cornerSlide*cornerLoad*.72;latCapacity*=1-interaction.brakeSlide*brakeLoad*.86;latCapacity*=1-interaction.cornerSlide*throttleLoad*.28;latCapacity=clamp(latCapacity,.07,1);
      brakeCapacity*=1-interaction.brakeSlide*brakeLoad*.42;brakeCapacity=clamp(brakeCapacity,.24,1);
    }
    if(Number.isFinite(base.accel))this.accel=base.accel*driveCapacity;
    if(Number.isFinite(base.brakeForce))this.brakeForce=base.brakeForce*brakeCapacity;
    if(Number.isFinite(base.maxFwd))this.maxFwd=base.maxFwd*interaction.speedCapacity;
    if(Number.isFinite(base.linearDrag))this.linearDrag=base.linearDrag*interaction.dragFactor;
    if(Number.isFinite(base.lateralGrip))this.lateralGrip=base.lateralGrip*latCapacity;
    if(this.carParams?.steering&&Number.isFinite(base.steeringLateralGrip))this.carParams.steering.lateralGrip=Math.max(.18,base.steeringLateralGrip*latCapacity);
    this._tdrSurfaceInteraction=interaction;this._tdrDynamicLatCapacity=latCapacity;
  }
  _applyRollingResistance(material,body,delta){
    const interaction=this._tdrSurfaceInteractions?.[material],vel=body?.body?.velocity;if(!interaction||!vel)return;
    const speed=Math.hypot(Number(vel.x||0),Number(vel.y||0));if(speed<.01)return;
    const dt=clamp(Number(delta||16.67)/1000,.001,.05),decel=Math.max(0,Number(interaction.rollingDecel||0));if(decel<=0)return;
    const next=Math.max(0,speed-decel*dt),k=next/speed;vel.x*=k;vel.y*=k;
  }

  update(time,delta){
    if(this._tdrSurfaceProfile!=='dirt-asphalt-grass'){super.update(time,delta);return;}
    const before=this.carBody||this.car,x0=Number(before?.x||0),y0=Number(before?.y||0),materialBefore=this._materialAt(x0,y0);
    this._applyResolvedMaterial(materialBefore,before);
    const originalOnTrack=this._isOnTrack,originalInBand=this._isInBand;this._isOnTrack=()=>true;this._isInBand=()=>false;
    try{super.update(time,delta);}finally{this._isOnTrack=originalOnTrack;this._isInBand=originalInBand;}
    const after=this.carBody||this.car,x1=Number(after?.x||0),y1=Number(after?.y||0),materialAfter=this._materialAt(x1,y1);
    this._applyRollingResistance(materialAfter,after,delta);this._surface=materialAfter;this._onTrack=materialAfter==='DIRT';this._applyResolvedMaterial(materialAfter,after);
  }
}
