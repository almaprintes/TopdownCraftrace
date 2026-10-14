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
    const starBright=hexToInt(visual.starLight,0xf8e2ad);
    const starEdge=hexToInt(visual.starHighlight,0xffffff);
    // Full-roof championship SHIELD, painted in the rig's local space so it
    // scales/rotates with the chassis. No tyre hub, disc or circular spokes.
    const shell=[
      {x:0,y:-r*1.17},{x:r*.98,y:-r*.73},{x:r*.89,y:r*.47},
      {x:0,y:r*1.17},{x:-r*.89,y:r*.47},{x:-r*.98,y:-r*.73}
    ];
    const inner=[
      {x:0,y:-r*.94},{x:r*.76,y:-r*.55},{x:r*.67,y:r*.36},
      {x:0,y:r*.91},{x:-r*.67,y:r*.36},{x:-r*.76,y:-r*.55}
    ];
    g.fillStyle(0x06141f,.96);g.fillPoints(shell,true);
    g.lineStyle(Math.max(.65,r*.16),light,.95);g.strokePoints(shell,true);
    g.fillStyle(rim,.97);g.fillPoints(inner,true);
    g.lineStyle(Math.max(.6,r*.12),dark,.95);g.strokePoints(inner,true);
    // Contrasting enamel insert. One, two or three stars make the grades
    // distinguishable even when the crest is only a few phone pixels wide.
    const enamel=inner.map(p=>({x:p.x*.82,y:p.y*.77}));
    // Same near-black enamel and bright metallic star treatment as the SVG
    // used in lobby, medals QA and the unlock modal.
    g.fillStyle(0x07151e,1);g.fillPoints(enamel,true);
    g.lineStyle(Math.max(.65,r*.085),0x02080d,.95);g.strokePoints(enamel,true);
    const rank=(mastery.level-1)%3+1;
    if(rank>=2){
      g.fillStyle(rim,.98);
      for(const side of [-1,1])g.fillPoints([
        {x:side*r*.68,y:-r*.24},{x:side*r*.84,y:-r*.13},
        {x:side*r*.8,y:r*.25},{x:side*r*.65,y:r*.13}
      ],true);
    }
    if(rank===3){
      g.lineStyle(Math.max(.65,r*.11),light,1);
      g.strokePoints([
        {x:-r*.38,y:-r*.59},{x:-r*.30,y:-r*.79},{x:-r*.12,y:-r*.64},
        {x:0,y:-r*.87},{x:r*.12,y:-r*.64},{x:r*.30,y:-r*.79},
        {x:r*.38,y:-r*.59}
      ],false);
    }
    const starLayout=rank===1?[{x:0,y:-r*.04,scale:.44}]:
      rank===2?[{x:-r*.25,y:-r*.04,scale:.275},{x:r*.25,y:-r*.04,scale:.275}]:
      [{x:0,y:-r*.32,scale:.24},{x:-r*.235,y:r*.25,scale:.225},{x:r*.235,y:r*.25,scale:.225}];
    for(const item of starLayout){
      const star=[];
      for(let i=0;i<10;i++){
        const a=-Math.PI/2+Math.PI*i/5;
        const rad=i%2?r*item.scale*.42:r*item.scale;
        star.push({x:item.x+Math.cos(a)*rad,y:item.y+Math.sin(a)*rad});
      }
      // Dark larger silhouette separates the points from metal frame/rays;
      // the actual star is the bright, reflective foreground.
      const outline=star.map(p=>({
        x:item.x+(p.x-item.x)*1.13,
        y:item.y+(p.y-item.y)*1.13
      }));
      g.fillStyle(0x02080d,1);g.fillPoints(outline,true);
      g.fillStyle(starBright,1);g.fillPoints(star,true);
      g.lineStyle(Math.max(.45,r*.065),starEdge,.95);g.strokePoints(star,true);
    }
    // Canonical five/eight/twelve small honor strokes, no rotating spokes.
    const marks=Math.max(3,Number(visual.spokes)||5);
    g.lineStyle(Math.max(.45,r*.05),light,.9);
    for(let i=0;i<marks;i++){
      const xx=-r*.51+(i+.5)*r*1.02/marks;
      g.lineBetween(xx,-r*.52,xx,-r*.64);
    }
    // Three rank-grade chevrons beneath the large star group.
    g.lineStyle(Math.max(.55,r*.085),light,1);
    for(let i=0;i<rank;i++){
      const yy=r*(.56+i*.105);
      g.lineBetween(-r*.23,yy,0,yy+r*.07);
      g.lineBetween(0,yy+r*.07,r*.23,yy);
    }
    if(mastery.level===9){
      g.lineStyle(Math.max(.7,r*.075),0xffe39b,.95);g.strokePoints(shell,true);
    }
    g.setPosition(x,y);
    g.setDepth?.(999);rig.add(g);this._masteryRoofWheel=g;
  }
}
