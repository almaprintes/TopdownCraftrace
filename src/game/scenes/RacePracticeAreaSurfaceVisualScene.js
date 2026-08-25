import { RaceScene as CurrentRaceScene } from './RacePracticeAreaNoChunksScene.js';

const SURFACE_COLORS=Object.freeze({
  ASPHALT:0x454b4f,
  DIRT:0x76513a,
  GRASS:0x405a3c
});

export class RaceScene extends CurrentRaceScene{
  _buildPracticeWorld(){
    super._buildPracticeWorld();
    if(!this._practiceAreaMode)return;

    // La física y la presentación comparten una única fuente: practiceZones.
    // RacePracticeAreaScene crea primero un rectángulo por zona, en el mismo orden.
    const zones=Array.isArray(this._practiceZones)?this._practiceZones:[];
    const objects=Array.isArray(this._practiceWorldObjects)?this._practiceWorldObjects:[];
    const rects=objects.filter(o=>o?.type==='Rectangle').slice(0,zones.length);

    zones.forEach((zone,i)=>{
      const material=String(zone?.id||'GRASS').toUpperCase();
      const color=SURFACE_COLORS[material]??SURFACE_COLORS.GRASS;
      const rect=rects[i];
      if(!rect)return;
      try{
        rect.setPosition(Number(zone.x)||0,Number(zone.y)||0);
        rect.setSize(Number(zone.w)||1,Number(zone.h)||1);
        rect.setDisplaySize(Number(zone.w)||1,Number(zone.h)||1);
        rect.setFillStyle(color,1);
      }catch{}
    });
  }
}
