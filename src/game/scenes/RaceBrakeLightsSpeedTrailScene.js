import { RaceScene as CurrentRaceScene } from './RaceTransientTireMarksScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import {getEquippedCarSkin} from '../skins/carSkins.js';
import {IS_PROD_BUILD} from '../buildTarget.js';
import {vehicleLightsForCar,lightCoordinates} from '../skins/vehicleLightsCalibration.js';

const TRAIL_MIN_SPEED = 520;
const TRAIL_SAMPLE_MS = 85;
const TRAIL_LIFE_MS = 145;
const MAX_TRAIL_GHOSTS = 5;

const FRONT_LIGHT_CARS = new Set([
  'helix_comet',
  'helix_pulse',
  'helix_vortex'
]);

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result = super.create(data);
    this._vehicleLightsGfx = null;
    this._vehicleLightsLayoutKey = '';
    this._vehicleLightsStateKey = '';
    this._speedTrailGhosts = [];
    this._nextSpeedTrailAt = 0;
    const id=String(this.carId||data?.carId||'');
    const equipped=getEquippedCarSkin(id,{spec:CAR_SPECS[id],dev:!IS_PROD_BUILD});
    this._vehicleLightsSkinId=equipped.id;
    this._vehicleLightCalibration=vehicleLightsForCar(id,equipped.id);
    if(window.__tdrIosSafeMode !== true) this._buildVehicleLights();

    this.events.once('shutdown',()=>{
      try{ this._vehicleLightsGfx?.destroy?.(); }catch{}
      for(const obj of this._speedTrailGhosts || []){ try{obj?.destroy?.();}catch{} }
      this._vehicleLightsGfx=null;
      this._speedTrailGhosts=[];
    });
    return result;
  }

  update(time,delta){
    const result = super.update?.(time,delta);
    if(window.__tdrIosSafeMode === true) return result;
    this._updateVehicleLights();
    this._updateSpeedTrail(Number(time||0));
    return result;
  }

  _visualSprite(){
    return this.carRig?.list?.find?.((o)=>o?.texture?.key && o?.setTexture) || null;
  }

  _buildVehicleLights(){
    const rig=this.carRig;
    if(!rig?.scene)return;

    const gfx=this.add.graphics();
    gfx.setPosition(0,0);
    rig.add(gfx);
    this._vehicleLightsGfx=gfx;
    this._vehicleLightsLayoutKey='';
    this._vehicleLightsStateKey='';
    try{ this.uiCam?.ignore?.(gfx); }catch{}
    this._redrawVehicleLights(true);
  }

  _brakePressed(){
    const t=this.touch||{};
    const k=this.keys||{};
    return Number(t.brake||0)>0.5 || !!k.down?.isDown || !!k.down2?.isDown || this._brakeWasPressed===true || this._tdrHandbrake===true;
  }

  _updateVehicleLights(){
    if(!this._vehicleLightsGfx?.scene || !this.carRig?.scene){
      if(this.carRig?.scene) this._buildVehicleLights();
      return;
    }
    this._redrawVehicleLights(false);
  }

  _redrawVehicleLights(force=false){
    const gfx=this._vehicleLightsGfx;
    const sprite=this._visualSprite();
    if(!gfx?.scene || !sprite?.scene)return;

    const w=Math.max(14,Number(sprite.displayWidth||sprite.width||28));
    const h=Math.max(28,Number(sprite.displayHeight||sprite.height||56));
    const frontFacing=FRONT_LIGHT_CARS.has(String(this.carId||''));
    const braking=!frontFacing && this._brakePressed() && !!this._raceStarted;

    const layoutKey=`${Math.round(w*10)}:${Math.round(h*10)}:${frontFacing?1:0}`;
    const cal=this._vehicleLightCalibration;
    const stateKey=cal?(this._brakePressed()&&!!this._raceStarted?'custom-brake':'custom-tail'):(frontFacing?'front-none':(braking?'brake':'tail'));

    if(!force && layoutKey===this._vehicleLightsLayoutKey && stateKey===this._vehicleLightsStateKey)return;
    this._vehicleLightsLayoutKey=layoutKey;
    this._vehicleLightsStateKey=stateKey;

    gfx.clear();
    if(cal){
      const brakingNow=this._brakePressed()&&!!this._raceStarted;
      const drawGroup=(group,name)=>{
        if(!group?.enabled)return;
        // Position and brake LEDs have different real-world brightness/hues.
        // Previously the same #ff0000 was drawn at all times on Crown Cuper.
        const litColor=name==='rear'&&!brakingNow?(group.tailColor||group.color):group.color;
        const color=Number.parseInt(String(litColor||'#ffffff').slice(1),16);
        const alpha=name==='rear'?(brakingNow?group.intensity:group.tailIntensity):group.intensity;
        for(const side of ['left','right']){
          const p=lightCoordinates(group[side],w,h);
          const size=Math.max(.5,p.size);
          if(name==='front'){
            // Two small bright cores with soft concentric halos: no full-screen light object.
            gfx.fillStyle(color,alpha*group.halo*.10);gfx.fillCircle(p.x,p.y,size*2.8);
            gfx.fillStyle(color,alpha*group.halo*.24);gfx.fillCircle(p.x,p.y,size*1.6);
            gfx.fillStyle(color,alpha);gfx.fillCircle(p.x,p.y,size*.55);
          }else{
            gfx.fillStyle(color,alpha);
            gfx.fillTriangle(p.x-size*.52,p.y-size*.42,p.x+size*.52,p.y-size*.42,p.x,p.y+size*.55);
            if(brakingNow && group.halo>0){
              gfx.fillStyle(color,alpha*group.halo*.25);
              gfx.fillTriangle(p.x-size*.9,p.y-size*.63,p.x+size*.9,p.y-size*.63,p.x,p.y+size*.95);
            }
          }
        }
      };
      drawGroup(cal.front,'front');
      drawGroup(cal.rear,'rear');
      return;
    }

    // Unconfigured cars use the previous approved lights exactly as before.
    // En las tres skins que muestran el frontal no dibujamos ninguna luz añadida.
    // Se conserva únicamente el arte propio del sprite.
    if(frontFacing) return;

    // Pilotos traseros: posición y apertura aprobadas.
    const edgeY=h*0.385;
    const halfSpread=Math.max(4.8,w*0.285);
    const triW=Math.max(3.0,Math.min(5.2,w*0.19));
    const triH=Math.max(2.8,Math.min(5.0,h*0.085));

    const color=braking?0xff0000:0x7b0808;
    const alpha=braking?1.0:0.52;
    gfx.fillStyle(color,alpha);

    const drawTri=(cx,mirror)=>{
      const innerX=cx + (mirror?-1:1)*triW*0.52;
      const outerX=cx - (mirror?-1:1)*triW*0.52;
      gfx.fillTriangle(
        innerX, edgeY-triH*0.52,
        outerX, edgeY-triH*0.52,
        cx, edgeY+triH*0.58
      );
    };

    drawTri(-halfSpread,false);
    drawTri( halfSpread,true);

    if(braking){
      gfx.fillStyle(0xff1a12,0.18);
      gfx.fillTriangle(-halfSpread-triW*0.68,edgeY-triH*0.68,-halfSpread+triW*0.68,edgeY-triH*0.68,-halfSpread,edgeY+triH*0.78);
      gfx.fillTriangle( halfSpread-triW*0.68,edgeY-triH*0.68, halfSpread+triW*0.68,edgeY-triH*0.68, halfSpread,edgeY+triH*0.78);
    }
  }

  _updateSpeedTrail(now){
    if(!this._raceStarted || now < Number(this._nextSpeedTrailAt||0))return;
    const sprite=this._visualSprite();
    const rig=this.carRig;
    const body=this.carBody?.body;
    if(!sprite?.scene || !rig?.scene || !body?.velocity)return;

    const speed=Math.hypot(Number(body.velocity.x||0),Number(body.velocity.y||0));
    if(speed<TRAIL_MIN_SPEED)return;
    this._nextSpeedTrailAt=now+TRAIL_SAMPLE_MS;

    const key=sprite.texture?.key;
    if(!key || !this.textures.exists(key))return;
    const ghost=this.add.image(rig.x,rig.y,key)
      .setRotation(rig.rotation)
      .setOrigin(sprite.originX??0.5,sprite.originY??0.5)
      .setScale(sprite.scaleX||1,sprite.scaleY||1)
      .setDepth(Number(rig.depth||30)-0.2)
      .setAlpha(0.10)
      .setTint(0xdcecff)
      .setScrollFactor(1);
    try{this.uiCam?.ignore?.(ghost);}catch{}
    this._speedTrailGhosts.push(ghost);
    while(this._speedTrailGhosts.length>MAX_TRAIL_GHOSTS){
      const old=this._speedTrailGhosts.shift();
      try{old?.destroy?.();}catch{}
    }
    this.tweens.add({
      targets:ghost,
      alpha:0,
      scaleX:(sprite.scaleX||1)*1.015,
      scaleY:(sprite.scaleY||1)*1.015,
      duration:TRAIL_LIFE_MS,
      ease:'Sine.easeOut',
      onComplete:()=>{
        const i=this._speedTrailGhosts.indexOf(ghost);
        if(i>=0)this._speedTrailGhosts.splice(i,1);
        try{ghost.destroy();}catch{}
      }
    });
  }
}
