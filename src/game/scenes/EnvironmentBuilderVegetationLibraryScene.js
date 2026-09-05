import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderMaterialStudioScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const VEGETATION=[
  {cat:'VEGETACIÓN',id:'tree_broad_03',path:'environment/vegetation/tree_broad_03.webp'},
  {cat:'VEGETACIÓN',id:'tree_broad_04',path:'environment/vegetation/tree_broad_04.webp'},
  {cat:'VEGETACIÓN',id:'tree_broad_05',path:'environment/vegetation/tree_broad_05.webp'},
  {cat:'VEGETACIÓN',id:'bush_round_01',path:'environment/vegetation/bush_round_01.webp'},
  {cat:'VEGETACIÓN',id:'plant_broadleaf_01',path:'environment/vegetation/plant_broadleaf_01.webp'},
  {cat:'VEGETACIÓN',id:'plant_rosette_01',path:'environment/vegetation/plant_rosette_01.webp'},
  {cat:'VEGETACIÓN',id:'plant_sword_01',path:'environment/vegetation/plant_sword_01.webp'},
  {cat:'VEGETACIÓN',id:'plant_tropical_01',path:'environment/vegetation/plant_tropical_01.webp'},
  {cat:'VEGETACIÓN',id:'plant_variegated_01',path:'environment/vegetation/plant_variegated_01.webp'},
  {cat:'VEGETACIÓN',id:'plant_variegated_02',path:'environment/vegetation/plant_variegated_02.webp'}
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
}
