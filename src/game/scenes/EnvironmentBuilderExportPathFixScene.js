import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderCreationGuardScene.js';

const FIX={
  tree_broad_02:'environment/vegetation/tree_broad_02.webp',
  palm_tall_01:'environment/vegetation/palm_tall_01.webp',
  tree_broad_01:'environment/tree_deciduous_01.webp'
};

export class EnvironmentBuilderScene extends Current{
  _project(){
    const p=super._project?.()||{};
    p.environment=(p.environment||[]).map(d=>FIX[d?.asset]?{...d,path:FIX[d.asset]}:d);
    return p;
  }
}
