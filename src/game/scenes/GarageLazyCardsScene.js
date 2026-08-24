import { GarageScene as CurrentGarageScene } from './GarageCleanTypographyScene.js';

const CARDS = [
  ['card_avenir_apex','card_avenir_apex_raro_008.webp'],
  ['card_avenir_gripline','card_avenir_gripline_poco_comun_007.webp'],
  ['card_avenir_torque','card_avenir_torque_elite_009.webp'],
  ['card_crown_axis','card_crown_axis_poco_comun_004.webp'],
  ['card_crown_equinox','card_crown_equinox_raro_006.webp'],
  ['card_crown_vector','card_crown_vector_raro_005.webp'],
  ['card_forge_anvil','card_forge_anvil_elite_014.webp'],
  ['card_forge_colossus','card_forge_colossus_legendario_015.webp'],
  ['card_forge_hammer','card_forge_hammer_raro_013.webp'],
  ['card_helix_comet','card_helix_comet_poco_comun_002.webp'],
  ['card_helix_pulse','card_helix_pulse_poco_comun_003.webp'],
  ['card_helix_spark','card_helix_spark_comun_001.webp'],
  ['card_helix_vortex','card_helix_vortex_raro_016.webp'],
  ['card_veloce_flash','card_veloce_flash_poco_comun_010.webp'],
  ['card_veloce_photon','card_veloce_photon_elite_012.webp'],
  ['card_veloce_surge','card_veloce_surge_raro_011.webp']
];

export class GarageScene extends CurrentGarageScene {
  preload(){
    super.preload?.();
    this.load.setPath('assets/cars/runtime');
    for(const [key,file] of CARDS){
      if(!this.textures.exists(key)) this.load.image(key,file);
    }
    this.load.setPath('');
  }

  create(){
    super.create();
    // Las cards se mantienen mientras la app siga viva porque el garaje puede reabrirse,
    // pero ya no ocupan memoria en sesiones que nunca entran al garaje.
  }
}
