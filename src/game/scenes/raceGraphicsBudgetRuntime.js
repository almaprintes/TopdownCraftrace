import { createTrackEnvironment } from '../tracks/environmentRegistry.js';

const PRESETS={
  performance:{density:.45,materials:new Set(['asphalt'])},
  medium:{density:.70,materials:new Set(['asphalt','grass'])},
  high:{density:.88,materials:new Set(['asphalt','grass','offroad'])},
  ultra:{density:1,materials:new Set(['asphalt','grass','offroad'])}
};

function presetFor(scene){
  const direct=String(scene?._gfxPreset||'').toLowerCase();
  if(PRESETS[direct])return direct;
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}'),v=s?.video||{};
    const p=String(v.preset||'').toLowerCase();
    if(PRESETS[p])return p;
    return String(v.quality)==='low'?'performance':String(v.quality)==='medium'?'medium':'high';
  }catch{return 'high';}
}

function normalize(value){return String(value||'').trim().toLowerCase().replace(/_/g,'-');}
function environmentFor(scene){
  const candidates=[scene?.trackKey,scene?.track?.meta?.id,scene?.track?.id,scene?.track?.trackId,scene?.track?.meta?.trackId].map(normalize).filter(Boolean);
  for(const key of candidates){const env=createTrackEnvironment(key);if(env)return env;}
  return null;
}
function isCollisionVisual(item){return String(item?.path||'').includes('environment/barriers/');}
function materialType(obj){const key=String(obj?.texture?.key||'');const match=key.match(/^race-env-material:(asphalt|grass|offroad):/);return match?.[1]||'';}

function applyBudget(scene){
  const preset=presetFor(scene),budget=PRESETS[preset]||PRESETS.high;
  scene._gfxPreset=preset;
  scene._tdrEnvironmentDensity=budget.density;
  scene._tdrStudioMaterialTypes=new Set(budget.materials);

  for(const obj of scene?._tdrStudioMaterials?.objects||[]){
    const type=materialType(obj),enabled=!type||budget.materials.has(type);
    obj?.setVisible?.(enabled);if(obj)obj.active=enabled;
  }

  const env=environmentFor(scene),objects=scene?._tdrRaceEnvironment?.objects||[],items=env?.environment||[];
  if(objects.length&&items.length){
    let decorativeIndex=0;
    for(let i=0;i<objects.length;i++){
      const obj=objects[i],item=items[i];
      if(!obj)continue;
      if(isCollisionVisual(item)){obj.setVisible?.(true);obj.active=true;continue;}
      const keep=budget.density>=1||((decorativeIndex*37)%100)<Math.round(budget.density*100);
      decorativeIndex++;
      obj.setVisible?.(keep);obj.active=keep;
    }
  }

  console.info('[graphics-budget] applied',{preset,density:budget.density,materials:[...budget.materials]});
}

export function installRaceGraphicsBudgetRuntime(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;if(!proto||proto.__tdrGraphicsBudgetRuntimeInstalled)return;
  const originalCreate=proto.create;
  proto.create=function(data){const result=originalCreate?.call(this,data);try{applyBudget(this);}catch(err){console.warn('[graphics-budget] apply failed',err);}return result;};
  proto.__tdrGraphicsBudgetRuntimeInstalled=true;
}
