import { RaceScene as CurrentRaceScene } from './RaceMileageStatsScene.js';
import { loadPlayerStatsPersisted } from '../stats/playerStats.js';
import { masteryInfoForMeters, masteryRoofVisible, masteryVisualSpec } from '../stats/carMastery.js';

function visibleCarSprite(scene){
  const list=scene?.carRig?.list;if(!Array.isArray(list))return null;
  return list.find(o=>o?.texture?.key&&o.visible!==false&&o.texture.key!=='__BODY__')||null;
}
function hexToInt(value,fallback){const n=parseInt(String(value||'').replace('#',''),16);return Number.isFinite(n)?n:fallback;}

export class RaceScene extends CurrentRaceScene{
  create(data){const result=super.create(data);this.time?.delayedCall?.(80,()=>this._installMasteryRoofWheel());return result;}
  _installMasteryRoofWheel(){
    try{this._masteryRoofWheel?.destroy?.();}catch{}this._masteryRoofWheel=null;
    if(!masteryRoofVisible())return;
    const rig=this.carRig;if(!rig?.add)return;
    const carId=String(this.carId||this.selectedCarId||(()=>{try{return localStorage.getItem('tdr2:carId')||'';}catch{return'';}})());
    const meters=Number(loadPlayerStatsPersisted()?.cars?.[carId]?.meters)||0;
    const mastery=masteryInfoForMeters(meters);if(!mastery.level)return;
    const visual=masteryVisualSpec(mastery.level);
    const sprite=visibleCarSprite(this),carW=Math.max(18,Number(sprite?.displayWidth||sprite?.width||28));
    const radius=Math.max(4.5,Math.min(8,carW*.19)),g=this.add.graphics();
    const rim=hexToInt(visual.rim,0xc9ced3),light=hexToInt(visual.light,0xffffff);
    g.fillStyle(0x020202,.98);g.fillCircle(0,0,radius+2.1);
    g.lineStyle(Math.max(1.3,radius*.18),rim,1);g.strokeCircle(0,0,radius);
    const spokes=Math.max(3,Number(visual.spokes)||5);
    g.lineStyle(Math.max(1.15,radius*(spokes>=12?.12:spokes>=8?.15:.19)),light,1);
    for(let i=0;i<spokes;i++){
      const a=(Math.PI*2*i/spokes)-Math.PI/2;
      g.beginPath();g.moveTo(Math.cos(a)*radius*.28,Math.sin(a)*radius*.28);g.lineTo(Math.cos(a)*radius*.82,Math.sin(a)*radius*.82);g.strokePath();
    }
    g.fillStyle(0x050505,1);g.fillCircle(0,0,radius*.3);g.lineStyle(Math.max(1,radius*.12),rim,1);g.strokeCircle(0,0,radius*.3);g.fillStyle(light,1);g.fillCircle(0,0,Math.max(1,radius*.09));
    g.setDepth?.(999);rig.add(g);this._masteryRoofWheel=g;
  }
}
