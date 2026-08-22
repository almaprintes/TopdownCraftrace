import { RaceScene as CurrentRaceScene } from './RaceSurvivalModeScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene {
  _hideLegacyGridCars(){
    if(!this._survivalMode||!Array.isArray(this.gridCars))return;
    for(const gc of this.gridCars){
      if(!gc)continue;
      gc.active=false;
      try{gc.body?.setVelocity?.(0,0);}catch{}
      try{gc.body?.setVisible?.(false);}catch{}
      try{gc.rig?.setVisible?.(false);}catch{}
      try{gc.sprite?.setVisible?.(false);}catch{}
    }
  }

  _initSurvival(){
    super._initSurvival();
    if(!this._survivalMode||!this._survivalBots?.length)return;

    this._hideLegacyGridCars();

    // Parrilla escalonada tipo monoplazas, usando todo el ancho útil sin apelotonar.
    const sample=this._survivalBots[0];
    const trackW=Math.max(80,Number(sample?.trackW||this.track?.meta?.trackWidth||this.track?.trackWidth||140));
    const carW=Math.max(14,Number(sample?.sprite?.displayWidth||sample?.sprite?.width||28));
    const carL=Math.max(24,Number(sample?.sprite?.displayHeight||sample?.sprite?.height||48));
    const lane=clamp(trackW*.30,carW*.95,trackW*.42);
    const rowGap=clamp(carL*1.55,42,90);
    const stagger=clamp(carL*.55,16,34);
    const lenPx=Math.max(100,(()=>{
      const cl=this._survivalCenterline();let total=0;
      for(let i=0;i<cl.length;i++){
        const a=cl[i],b=cl[(i+1)%cl.length];
        total+=Math.hypot(Number(b?.x??b?.[0])-Number(a?.x??a?.[0]),Number(b?.y??b?.[1])-Number(a?.y??a?.[1]));
      }
      return total;
    })());

    const slots=[
      {lane:+lane,back:rowGap*.55+stagger},
      {lane:-lane,back:rowGap*1.35},
      {lane:+lane,back:rowGap*1.35+stagger},
      {lane:-lane,back:rowGap*2.15},
      {lane:+lane,back:rowGap*2.15+stagger}
    ];

    this._survivalBots.forEach((b,i)=>{
      const s=slots[i]||slots[slots.length-1];
      b.baseLane=s.lane;
      b.lane=s.lane;
      b.absProgress=-s.back/lenPx;
      b.lapRate=0;
      b.distanceSinceFinish=0;
      b.armed=false;
      b.completedLaps=0;
      const p=this._survivalPathPoint(b.absProgress,b.baseLane);
      if(p){
        b.prevX=p.x;b.prevY=p.y;
        b.sprite?.setPosition?.(p.x,p.y);
        if(b.sprite)b.sprite.rotation=p.r+Number(this._carVisualRotOffset||0);
      }
    });
  }

  update(time,delta){
    // La salida real del juego es la autoridad. No usamos física de CPU ni colliders
    // para decidir si pueden empezar a avanzar.
    if(this._survivalMode&&!this._raceStarted){
      const body=this.car?.body||this.carBody?.body||this.carBody;
      const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
      if(this._startState==='RACING'||this._startState==='GO'||Math.hypot(vx,vy)>4){
        this._raceStarted=true;
      }
    }

    const result=super.update(time,delta);
    this._hideLegacyGridCars();
    return result;
  }
}
