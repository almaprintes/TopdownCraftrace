import { RaceScene as CurrentRaceScene } from './RaceTransientTireMarksScene.js';

const TRAIL_MIN_SPEED = 520;
const TRAIL_SAMPLE_MS = 85;
const TRAIL_LIFE_MS = 145;
const MAX_TRAIL_GHOSTS = 5;

// Estas skins muestran el morro en el extremo que visualmente queda hacia atrás
// en la composición del asset. En ellas no fingimos pilotos traseros: mostramos
// dos ópticas delanteras blancas en ese extremo visible.
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
    return Number(t.brake||0)>0.5 || !!k.down?.isDown || !!k.down2?.isDown || this._brakeWasPressed===true;
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

    // Las luces son HIJAS del mismo carRig que la carrocería. Por tanto reciben
    // exactamente la misma posición, pivote visual, rotación, lag y zoom de cámara:
    // no pueden flotar ni ondular respecto al coche.
    const w=Math.max(14,Number(sprite.displayWidth||sprite.width||28));
    const h=Math.max(28,Number(sprite.displayHeight||sprite.height||56));
    const frontFacing=FRONT_LIGHT_CARS.has(String(this.carId||''));
    const braking=!frontFacing && this._brakePressed() && !!this._raceStarted;

    const layoutKey=`${Math.round(w*10)}:${Math.round(h*10)}:${frontFacing?1:0}`;
    const stateKey=frontFacing?'front':(braking?'brake':'tail');
    if(!force && layoutKey===this._vehicleLightsLayoutKey && stateKey===this._vehicleLightsStateKey)return;
    this._vehicleLightsLayoutKey=layoutKey;
    this._vehicleLightsStateKey=stateKey;

    gfx.clear();

    // Los sprites de carrera están orientados longitudinalmente sobre el eje Y
    // local del rig. Pegamos las ópticas al borde visible, no a una coordenada
    // mundial inventada.
    const edgeY=h*0.405;
    const halfSpread=Math.max(4.5,w*0.255);
    const triW=Math.max(3.0,Math.min(5.2,w*0.19));
    const triH=Math.max(2.8,Math.min(5.0,h*0.085));

    let color;
    let alpha;
    if(frontFacing){
      color=0xffffff;
      alpha=0.82;
    }else if(braking){
      color=0xff0000;
      alpha=1.0;
    }else{
      color=0x7b0808;
      alpha=0.52;
    }

    gfx.fillStyle(color,alpha);

    const drawTri=(cx,mirror)=>{
      // Triángulos achatados, con la punta hacia el centro del coche.
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

    // Un halo mínimo SOLO al frenar. La geometría principal sigue siendo el
    // triángulo rojo puro; esto evita volver a los círculos flotantes anteriores.
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
