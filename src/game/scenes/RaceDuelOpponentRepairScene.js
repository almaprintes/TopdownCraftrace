import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceTuningScene.js';

function isVisualCarSprite(scene,obj){
  const key=obj?.texture?.key;
  return !!key&&key!=='__BODY__'&&scene?.textures?.exists?.(key);
}

function findNestedVisual(scene){
  const seen=new Set();
  let found=null;
  const visit=obj=>{
    if(!obj||found||seen.has(obj))return;
    seen.add(obj);
    if(obj!==scene?.carRig&&isVisualCarSprite(scene,obj)&&obj.visible!==false){found=obj;return;}
    if(Array.isArray(obj?.list))for(const child of obj.list)visit(child);
  };
  visit(scene?.carRig);
  if(!found&&isVisualCarSprite(scene,scene?.car)&&scene.car.visible!==false)found=scene.car;
  return found;
}

export class RaceScene extends CurrentRaceScene{
  create(data={}){
    this._tdrDuelOpponentInitAttempts=0;
    return super.create(data);
  }

  _initStandaloneDuel(){
    if(!this._duelStandalone||this._duelBot||this._duelFinished)return super._initStandaloneDuel?.();

    const rig=this.carRig;
    const originalList=Array.isArray(rig?.list)?rig.list:null;
    let patchedList=false;

    // The standalone Duel code historically searched only direct carRig children.
    // Modern car presentation can nest the visible sprite in containers, so expose
    // that already-existing sprite to the legacy lookup for this synchronous init.
    if(originalList&&!originalList.some(obj=>isVisualCarSprite(this,obj)&&obj.visible!==false)){
      const nested=findNestedVisual(this);
      if(nested){
        rig.list=[nested,...originalList];
        patchedList=true;
      }
    }

    try{super._initStandaloneDuel?.();}
    finally{if(patchedList&&rig)rig.list=originalList;}

    if(this._duelBot||this._duelFinished)return;

    this._tdrDuelOpponentInitAttempts=Number(this._tdrDuelOpponentInitAttempts||0)+1;
    if(this._tdrDuelOpponentInitAttempts<16){
      this.time?.delayedCall?.(150,()=>this._initStandaloneDuel());
      return;
    }

    this._showDuelInitError?.('CPU1 no pudo inicializarse');
  }
}
