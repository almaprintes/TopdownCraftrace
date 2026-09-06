import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderLayersSurfaceScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const ASSETS=[
  ['tree_broad_01','environment/vegetation/tree_broad_01.webp'],
  ['tree_broad_02','environment/vegetation/tree_broad_02.webp'],
  ['palm_tall_01','environment/vegetation/palm_tall_01.webp'],
  ['plant_rosette_01','environment/vegetation/plant_rosette_01.webp'],
  ['shrub_round_01','environment/shrub_round_01.webp'],
  ['shrub_flowers_01','environment/shrub_flowers_01.webp'],
  ['concrete_barrier_straight_01','environment/barriers/concrete_barrier_straight_01.webp'],
  ['guardrail_curve_01','environment/barriers/guardrail_curve_01.webp'],
  ['guardrail_straight_01','environment/barriers/guardrail_straight_01.webp'],
  ['plastic_barrier_redwhite_01','environment/barriers/plastic_barrier_redwhite_01.webp'],
  ['tire_barrier_curve_l_01','environment/barriers/tire_barrier_curve_l_01.webp'],
  ['tire_barrier_straight_short_01','environment/barriers/tire_barrier_straight_short_01.webp'],
  ['tire_stack_compact_01','environment/barriers/tire_stack_compact_01.webp'],
  ['bollard_metal_short_01','environment/props/bollard_metal_short_01.webp'],
  ['cone_orange_01','environment/props/cone_orange_01.webp'],
  ['direction_sign_01','environment/props/direction_sign_01.webp'],
  ['extinguisher_post_01','environment/props/extinguisher_post_01.webp'],
  ['fence_chainlink_curve_l_01','environment/props/fence_chainlink_curve_l_01.webp'],
  ['fence_chainlink_straight_01','environment/props/fence_chainlink_straight_01.webp'],
  ['light_post_short_01','environment/props/light_post_short_01.webp'],
  ['metal_barrel_01','environment/props/metal_barrel_01.webp'],
  ['race_start_light_01','environment/props/race_start_light_01.webp'],
  ['toolbox_01','environment/props/toolbox_01.webp'],
  ['wood_pallet_01','environment/props/wood_pallet_01.webp'],
  ['control_tower_small_01','environment/structures/control_tower_small_01.webp'],
  ['grandstand_sparse_01','environment/structures/grandstand_sparse_01.webp'],
  ['grandstand_half_01','environment/structures/grandstand_half_01.webp'],
  ['grandstand_full_01','environment/structures/grandstand_full_01.webp'],
  ['marshal_post_01','environment/structures/marshal_post_01.webp'],
  ['paddock_box_small_01','environment/structures/paddock_box_small_01.webp'],
  ['pit_garage_small_01','environment/structures/pit_garage_small_01.webp'],
  ['santacruz_auditorio','environment/structures/santacruz_auditorio.webp'],
  ['santacruz_heliodoro','environment/structures/santacruz_heliodoro.webp'],
  ['santacruz_monumento','environment/structures/santacruz_monumento.webp'],
  ['santacruz_plaza_espana','environment/structures/santacruz_plaza_espana.webp']
];

const CORRECT_PATHS={
  tree_broad_01:'environment/vegetation/tree_broad_01.webp',
  tree_broad_02:'environment/vegetation/tree_broad_02.webp',
  palm_tall_01:'environment/vegetation/palm_tall_01.webp',
  plant_rosette_01:'environment/vegetation/plant_rosette_01.webp'
};

const VEGETATION_ITEMS=[
  {cat:'VEGETACIÓN',id:'tree_broad_01',path:'environment/vegetation/tree_broad_01.webp',w:150},
  {cat:'VEGETACIÓN',id:'tree_broad_02',path:'environment/vegetation/tree_broad_02.webp',w:170},
  {cat:'VEGETACIÓN',id:'palm_tall_01',path:'environment/vegetation/palm_tall_01.webp',w:180},
  {cat:'VEGETACIÓN',id:'plant_rosette_01',path:'environment/vegetation/plant_rosette_01.webp',w:110}
];

const SANTACRUZ_ITEMS=[
  {cat:'ESTRUCTURAS',id:'santacruz_auditorio',path:'environment/structures/santacruz_auditorio.webp',w:520},
  {cat:'ESTRUCTURAS',id:'santacruz_heliodoro',path:'environment/structures/santacruz_heliodoro.webp',w:560},
  {cat:'ESTRUCTURAS',id:'santacruz_monumento',path:'environment/structures/santacruz_monumento.webp',w:480},
  {cat:'ESTRUCTURAS',id:'santacruz_plaza_espana',path:'environment/structures/santacruz_plaza_espana.webp',w:560}
];

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  preload(){
    for(const [id,path] of ASSETS)this.load.image(`env:${id}`,`${BASE}assets/${path}`);
  }

  _catalogItemsForCategory(category){
    const items=super._catalogItemsForCategory?.(category)||[];
    const corrected=items.map(a=>CORRECT_PATHS[a.id]?{...a,path:CORRECT_PATHS[a.id]}:a);
    if(category==='VEGETACIÓN'){
      const ids=new Set(corrected.map(a=>a.id));
      return corrected.concat(VEGETATION_ITEMS.filter(a=>!ids.has(a.id)));
    }
    if(category!=='ESTRUCTURAS')return corrected;
    const ids=new Set(corrected.map(a=>a.id));
    return corrected.concat(SANTACRUZ_ITEMS.filter(a=>!ids.has(a.id)));
  }

  _setupUi(){
    super._setupUi();
    this._installToolStateHighlights();
    this._syncToolStateHighlights();
  }

  _installToolStateHighlights(){
    const x=10;
    const defs=[
      ['pan',this._top+162,0x35cfff],
      ['select',this._top+210,0x2bff88],
      ['surface',this._top+258,0xe1b33b]
    ];
    this._toolStateHighlights={};
    for(const [mode,y,color] of defs){
      const r=this.add.rectangle(x,y,44,38,0x000000,0)
        .setOrigin(0)
        .setStrokeStyle(0,color,0)
        .setDepth(9000);
      this._editCam?.ignore(r);
      this._toolStateHighlights[mode]={r,color};
    }
  }

  _syncToolStateHighlights(){
    if(!this._toolStateHighlights)return;
    const active=this._mode==='pan'?'pan':this._mode==='surface'?'surface':'select';
    for(const [mode,h] of Object.entries(this._toolStateHighlights)){
      const on=mode===active;
      h.r.setFillStyle(h.color,on?0.22:0);
      h.r.setStrokeStyle(on?3:0,h.color,on?1:0);
    }
  }

  _status(){
    super._status?.();
    this._syncToolStateHighlights();
  }
}
