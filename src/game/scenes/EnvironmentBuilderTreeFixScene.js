import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderSafetyScene.js';

const BASE=import.meta.env.BASE_URL||'/';
const BROKEN='tree_broad_01';
const FIXED_PATH='environment/tree_deciduous_01.webp';
const FIXED_KEY='env:tree_broad_01_fixed';

export class EnvironmentBuilderScene extends Current{
  preload(){
    super.preload?.();
    this.load.image(FIXED_KEY,`${BASE}assets/${FIXED_PATH}`);
  }

  _catalogItemsForCategory(category){
    return (super._catalogItemsForCategory?.(category)||[]).map(a=>
      a?.id===BROKEN?{...a,id:'tree_broad_01_fixed',path:FIXED_PATH,label:'tree broad'}:a
    );
  }

  _spawn(a,data=null){
    const src=a?.id===BROKEN?{...a,id:'tree_broad_01_fixed',path:FIXED_PATH}:a;
    const obj=super._spawn(src,data);
    if(obj?._env?.asset==='tree_broad_01_fixed'){
      obj._env.asset=BROKEN;
      obj._env.path=FIXED_PATH;
    }
    return obj;
  }

  _applyProject(p){
    const q=p?JSON.parse(JSON.stringify(p)):p;
    for(const d of q?.environment||[]){
      if(d?.asset===BROKEN){
        d.asset='tree_broad_01_fixed';
        d.path=FIXED_PATH;
      }
    }
    super._applyProject(q);
    for(const o of this._objects||[]){
      if(o?._env?.asset==='tree_broad_01_fixed'){
        o._env.asset=BROKEN;
        o._env.path=FIXED_PATH;
      }
    }
  }
}
