import { RaceScene as CurrentRaceScene } from './RaceTransientTireMarksScene.js';

const TRAIL_MIN_SPEED = 520;
const TRAIL_SAMPLE_MS = 85;
const TRAIL_LIFE_MS = 145;
const MAX_TRAIL_GHOSTS = 5;

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result = super.create(data);
    this._brakeLights = [];
    this._speedTrailGhosts = [];
    this._nextSpeedTrailAt = 0;
    if(window.__tdrIosSafeMode !== true) this._buildBrakeLights();
    this.events.once('shutdown',()=>{
      for(const obj of this._brakeLights || []){ try{obj?.destroy?.();}catch{} }
      for(const obj of this._speedTrailGhosts || []){ try{obj?.destroy?.();}catch{} }
      this._brakeLights=[]; this._speedTrailGhosts=[];
    });
    return result;
  }
  update(time,delta){
    const result = super.update?.(time,delta);
    if(window.__tdrIosSafeMode === true) return result;
    this._updateBrakeLights(); this._updateSpeedTrail(Number(time||0)); return result;
  }
  _visualCar(){ return this.carBody?.scene ? this.carBody : this.car; }
  _buildBrakeLights(){
    const car=this._visualCar(); if(!car?.scene)return;
    const make=()=>this.add.circle(0,0,3.4,0x8f0000,1)
      .setDepth(Number(car.depth||20)+2).setScrollFactor(1).setBlendMode('NORMAL');
    this._brakeLights=[make(),make()];
    try{ for(const l of this._brakeLights)this.uiCam?.ignore?.(l); }catch{}
  }
  _brakePressed(){
    const t=this.touch||{}, k=this.keys||{};
    return Number(t.brake||0)>0.5 || !!k.down?.isDown || !!k.down2?.isDown || this._brakeWasPressed===true;
  }
  _updateBrakeLights(){
    const car=this._visualCar(); if(!car?.scene || this._brakeLights.length!==2)return;
    const rot=Number(car.rotation||0), fx=Math.cos(rot), fy=Math.sin(rot), lx=-fy, ly=fx;
    const rear=24, half=12.5, cx=Number(car.x||0)-fx*rear, cy=Number(car.y||0)-fy*rear;
    const braking=this._brakePressed() && !!this._raceStarted;
    const left=this._brakeLights[0], right=this._brakeLights[1];
    for(const light of [left,right]){
      light.setFillStyle(braking?0xff0000:0x8f0000,1);
      light.setRadius(braking?4.4:3.4);
      light.setAlpha(braking?1:0.72);
      light.setBlendMode(braking?'ADD':'NORMAL');
    }
    left.setPosition(cx+lx*half,cy+ly*half);
    right.setPosition(cx-lx*half,cy-ly*half);
  }
  _updateSpeedTrail(now){
    if(!this._raceStarted || now < Number(this._nextSpeedTrailAt||0))return;
    const car=this._visualCar(), body=car?.body; if(!car?.scene || !body?.velocity)return;
    const speed=Math.hypot(Number(body.velocity.x||0),Number(body.velocity.y||0)); if(speed<TRAIL_MIN_SPEED)return;
    this._nextSpeedTrailAt=now+TRAIL_SAMPLE_MS;
    const key=car.texture?.key; if(!key || !this.textures.exists(key))return;
    const ghost=this.add.image(car.x,car.y,key).setRotation(car.rotation).setOrigin(car.originX??0.5,car.originY??0.5)
      .setScale(car.scaleX||1,car.scaleY||1).setDepth(Number(car.depth||20)-0.2).setAlpha(0.10).setTint(0xdcecff).setScrollFactor(1);
    try{this.uiCam?.ignore?.(ghost);}catch{}
    this._speedTrailGhosts.push(ghost);
    while(this._speedTrailGhosts.length>MAX_TRAIL_GHOSTS){ const old=this._speedTrailGhosts.shift(); try{old?.destroy?.();}catch{} }
    this.tweens.add({targets:ghost,alpha:0,scaleX:(car.scaleX||1)*1.015,scaleY:(car.scaleY||1)*1.015,duration:TRAIL_LIFE_MS,ease:'Sine.easeOut',onComplete:()=>{const i=this._speedTrailGhosts.indexOf(ghost);if(i>=0)this._speedTrailGhosts.splice(i,1);try{ghost.destroy();}catch{}}});
  }
}
