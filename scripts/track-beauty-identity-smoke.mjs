import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED_TRACK_BEAUTY_LAYERS } from '../src/game/tracks/trackBeautyLayers.generated.js';
import { getTrackBeautyLayerConfig } from '../src/game/tracks/trackBeautyLayers.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ATLANTICO='circuito-atlantico';
const published=['circuito-atlantico','santa-cruz','karting-tenerife','karting-canarias'];

function assert(condition,message){if(!condition)throw new Error(message);}

assert(!Object.hasOwn(GENERATED_TRACK_BEAUTY_LAYERS,'track01'),'legacy track01 must never be a runtime beauty identity');
for(const trackId of published){
  const cfg=getTrackBeautyLayerConfig(trackId);
  assert(cfg?.useBeautyLayer===true,`${trackId} is missing its optimized beauty layer`);
  assert(cfg?.assetsAvailable===true,`${trackId} beauty assets are unavailable`);
  assert(Array.isArray(cfg?.tiles)&&cfg.tiles.length===4,`${trackId} must expose exactly four optimized tiles`);
  for(const tile of cfg.tiles){
    const relative=String(tile?.path||'').split('?')[0];
    assert(relative,`${trackId} has a beauty tile without a path`);
    assert(fs.existsSync(path.join(ROOT,'public',relative)),`${trackId} beauty tile is missing: ${relative}`);
  }
}

const atlantico=getTrackBeautyLayerConfig(ATLANTICO);
assert(atlantico===GENERATED_TRACK_BEAUTY_LAYERS[ATLANTICO],'Circuito Atlantico must resolve directly by its canonical identity');
for(const relative of [
  'src/game/scenes/RaceRealSurfaceAssetsScene.js',
  'src/game/scenes/RaceWorldAlignedMaterialsScene.js',
  'src/game/scenes/RaceAdaptiveStartScene.js'
]){
  const source=fs.readFileSync(path.join(ROOT,relative),'utf8');
  assert(source.includes(ATLANTICO),`${relative} must use the canonical Circuito Atlantico identity`);
}
const surfaceSource=fs.readFileSync(path.join(ROOT,'src/game/scenes/RaceRealSurfaceAssetsScene.js'),'utf8');
assert(surfaceSource.includes('this._beautyLayerActive===true'),'optimized Atlántico must bypass legacy per-frame surface presentation');
console.log('[track-beauty-identity] canonical published circuits resolve four optimized tiles');
