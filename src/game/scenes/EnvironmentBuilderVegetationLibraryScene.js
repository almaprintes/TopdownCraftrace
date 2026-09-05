import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderMaterialStudioScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const VEGETATION=[
  {cat:'VEGETACIÓN',id:'tree_broad_03',path:'environment/vegetation/tree_broad_03.webp',w:175},
  {cat:'VEGETACIÓN',id:'tree_broad_04',path:'environment/vegetation/tree_broad_04.webp',w:170},
  {cat:'VEGETACIÓN',id:'tree_broad_05',path:'environment/vegetation/tree_broad_05.webp',w:170},
  {cat:'VEGETACIÓN',id:'bush_round_01',path:'environment/vegetation/bush_round_01.webp',w:82},
  {cat:'VEGETACIÓN',id:'plant_broadleaf_01',path:'environment/vegetation/plant_broadleaf_01.webp',w:86},
  {cat:'VEGETACIÓN',id:'plant_rosette_01',path:'environment/vegetation/plant_rosette_01.webp',w:82},
  {cat:'VEGETACIÓN',id:'plant_sword_01',path:'environment/vegetation/plant_sword_01.webp',w:84},
  {cat:'VEGETACIÓN',id:'plant_tropical_01',path:'environment/vegetation/plant_tropical_01.webp',w:96},
  {cat:'VEGETACIÓN',id:'plant_variegated_01',path:'environment/vegetation/plant_variegated_01.webp',w:82},
  {cat:'VEGETACIÓN',id:'plant_variegated_02',path:'environment/vegetation/plant_variegated_02.webp',w:82}
];

export class EnvironmentBuilderScene extends Current{
  preload(){
    super.preload?.();
    for(const a of VEGETATION){
      const key=`env:${a.id}`;
      if(!this.textures?.exists?.(key))this.load.image(key,`${BASE}assets/${a.path}`);
    }
  }

  _allAssets(){
    const current=super._allAssets?.()||[];
    const ids=new Set(current.map(a=>a?.id));
    return current.concat(VEGETATION.filter(a=>!ids.has(a.id)));
  }

  _spawn(a,data=null){
    const def=a?.w? a : VEGETATION.find(v=>v.id===a?.id) || a;
    return super._spawn?.(def,data);
  }

  _duplicate(){
    const selected=this._selected;
    const id=selected?._env?.asset;
    const def=VEGETATION.find(v=>v.id===id);
    if(!def)return super._duplicate?.();
    return this._spawn(def,{
      x:selected.x+35,
      y:selected.y+35,
      displayWidth:selected.displayWidth,
      rotation:selected.rotation,
      flipX:selected.flipX,
      flipY:selected.flipY
    });
  }
}
