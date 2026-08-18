import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderLayersSurfaceScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const ASSETS=[
  ['tree_broad_01','environment/vegetation/tree_broad_01.webp'],
  ['tree_broad_02','environment/vegetation/tree_broad_02.webp'],
  ['palm_tall_01','environment/vegetation/palm_tall_01.webp'],
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
  ['pit_garage_small_01','environment/structures/pit_garage_small_01.webp']
];

const CORRECT_PATHS={
  tree_broad_01:'environment/vegetation/tree_broad_01.webp',
  tree_broad_02:'environment/vegetation/tree_broad_02.webp',
  palm_tall_01:'environment/vegetation/palm_tall_01.webp'
};

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  preload(){
    for(const [id,path] of ASSETS)this.load.image(`env:${id}`,`${BASE}assets/${path}`);
  }

  _catalogItemsForCategory(category){
    const items=super._catalogItemsForCategory?.(category)||[];
    return items.map(a=>CORRECT_PATHS[a.id]?{...a,path:CORRECT_PATHS[a.id]}:a);
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
      h.r.setFillStyle(h.color,on?.22:0);
      h.r.setStrokeStyle(on?3:0,h.color,on?1:0);
    }
  }

  _status(){
    super._status?.();
    this._syncToolStateHighlights();
  }
}
