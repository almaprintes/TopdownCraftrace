import { RaceScene as CurrentRaceScene } from './RaceMileageStatsScene.js';
import { loadPlayerStatsPersisted } from '../stats/playerStats.js';
import { masteryInfoForMeters, masteryRoofVisible, masteryVisualSpec } from '../stats/carMastery.js';
import { raceMasteryPlacement } from '../stats/masteryBadgePlacement.js';

function visibleCarSprite(scene){
  const list=scene?.carRig?.list;if(!Array.isArray(list))return null;
  return list.find(o=>o?.texture?.key&&o.visible!==false&&o.texture.key!=='__BODY__')||null;
}
function hexToInt(value,fallback){const n=parseInt(String(value||'').replace('#',''),16);return Number.isFinite(n)?n:fallback;}

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this.time?.delayedCall?.(80,()=>this._installMasteryRoofWheel());
    // Car skins can finish loading AFTER create(). Refresh once after the
    // async fit-to-box completes, rather than anchoring to fallback art.
    this.time?.delayedCall?.(900,()=>{if(this.carRig?.scene)this._installMasteryRoofWheel();});
    return result;
  }
  _installMasteryRoofWheel(){
    try{this._masteryRoofWheel?.destroy?.();}catch{}this._masteryRoofWheel=null;
    if(!masteryRoofVisible())return;
    const rig=this.carRig;if(!rig?.add)return;
    const carId=String(this.carId||this.selectedCarId||(()=>{try{return localStorage.getItem('tdr2:carId')||'';}catch{return'';}})());
    const meters=Number(loadPlayerStatsPersisted()?.cars?.[carId]?.meters)||0;
    const mastery=masteryInfoForMeters(meters);if(!mastery.level)return;
    const visual=masteryVisualSpec(mastery.level);
    const sprite=visibleCarSprite(this);
    const w=Math.max(18,Number(sprite?.displayWidth||sprite?.width||28));
    const h=Math.max(18,Number(sprite?.displayHeight||sprite?.height||48));
    const {x,y,radius:r}=raceMasteryPlacement(w,h);
    const g=this.add.graphics();
    const rim=hexToInt(visual.rim,0xc9ced3);
    const light=hexToInt(visual.light,0xffffff);
    const dark=hexToInt(visual.dark,0x53616c);
    // This is a small inset roof DECAL, not an opaque tyre sitting over
    // the windows. Each element is drawn once and rotates with carRig.
    g.fillStyle(0x06141f,.90);g.fillCircle(0,0,r*1.24);
    g.lineStyle(Math.max(.9,r*.22),light,.90);g.strokeCircle(0,0,r*1.14);
    g.fillStyle(dark,1);g.fillCircle(0,0,r*1.02);
    g.lineStyle(Math.max(.9,r*.29),rim,1);g.strokeCircle(0,0,r*.90);
    g.fillStyle(0x0c1f28,1);g.fillCircle(0,0,r*.70);
    const spokes=Math.max(3,Number(visual.spokes)||5);
    const spokeWidth=Math.max(.65,r*(spokes>=12?.115:spokes>=8?.15:.19));
    g.lineStyle(spokeWidth,light,1);
    for(let i=0;i<spokes;i++){
      const a=Math.PI*2*i/spokes-Math.PI/2;
      g.beginPath();
      g.moveTo(Math.cos(a)*r*.25,Math.sin(a)*r*.25);
      g.lineTo(Math.cos(a)*r*.65,Math.sin(a)*r*.65);
      g.strokePath();
    }
    g.fillStyle(rim,1);g.fillCircle(0,0,r*.25);
    g.fillStyle(0x06121b,1);g.fillCircle(0,0,r*.12);
    g.fillStyle(light,1);g.fillCircle(0,0,Math.max(.5,r*.045));
    if(mastery.level===9){
      g.lineStyle(.8,0xffe39b,.95);g.strokeCircle(0,0,r*1.28);
    }
    g.setPosition(x,y);
    g.setDepth?.(999);rig.add(g);this._masteryRoofWheel=g;
  }
}
