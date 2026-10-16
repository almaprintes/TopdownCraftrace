import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {describeImageNativeRace,validateImageNativeRaceDescriptor,installImageNativeRaceLoader} from '../src/game/tracks/imageNativeRaceLoader.js';
import {isImageNativeTrackScene} from '../src/game/tracks/imageNativeTrackIdentity.js';
import {makeKartingPreviewRecord,LOCAL_KARTING_PREVIEW_KEY} from '../src/game/tracks/localKartingPreview.js';
const ring=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]].map(([x,y])=>({x,y,handleIn:{x:x-3,y:y-3},handleOut:{x:x+3,y:y+3}}));
const shape={version:1,closed:true,leftEdge:ring(200,200,800,700),rightEdge:ring(100,100,900,800)};
const centerline=Array.from({length:30},(_,i)=>({x:250+i*5,y:300+(i%5)*8,width:70}));
const track={worldW:1000,worldH:900,centerline,trackShape:shape,closed:true,raceType:'circuit',
 start:{x:250,y:300,r:0},finishLine:{a:{x:400,y:300},b:{x:400,y:370}}};
const editor={imageCanvas:{imageId:'k1',width:1000,height:900,size:100,type:'image/png'},trackShape:shape,isClosed:true};
const preview=makeKartingPreviewRecord(editor,track);
const store=new Map([['tdr:trackstudio:karting-tenerife-preview-v1',JSON.stringify(preview)]]);
globalThis.localStorage={getItem:key=>store.get(key)||null};
const desc=describeImageNativeRace(LOCAL_KARTING_PREVIEW_KEY);
assert.equal(desc.type,'local');
assert.equal(validateImageNativeRaceDescriptor(desc),desc);
assert.equal(isImageNativeTrackScene({trackKey:LOCAL_KARTING_PREVIEW_KEY}),true);
assert.equal(isImageNativeTrackScene({trackKey:'other',track:{meta:{meta:{renderMode:'image-native',imageNative:{schema:1}}}}}),true);
assert.equal(isImageNativeTrackScene({trackKey:'karting-tenerife'}),false);
assert.equal(describeImageNativeRace('karting-tenerife'),null);
const published={...preview.track,meta:{...preview.track.meta,renderMode:'image-native',
 imageNative:{schema:1,availability:'published',assetPath:'assets/tracks/new.webp',width:1000,height:900}}};
assert.equal(describeImageNativeRace('next-track',()=>published).path,'assets/tracks/new.webp');
assert.throws(()=>describeImageNativeRace('next-track',()=>({...published,meta:{...published.meta,imageNative:{...published.meta.imageNative,assetPath:'../unsafe.webp'}}})),/ruta|Ruta/);
assert.throws(()=>describeImageNativeRace('next-track',()=>({...published,meta:{...published.meta,imageNative:{...published.meta.imageNative,availability:'local'}}})),/solo está/);
assert.throws(()=>validateImageNativeRaceDescriptor({...desc,width:1200}),/1:1/);
assert.throws(()=>validateImageNativeRaceDescriptor({...desc,track:{...desc.track,trackShape:null}}),/Bézier/);
store.clear();
assert.throws(()=>describeImageNativeRace(LOCAL_KARTING_PREVIEW_KEY),/Falta la prueba local/);
class MockRace {init(data){this.trackKey=data.trackKey;}}
installImageNativeRaceLoader(MockRace);
const recycled=new MockRace();
recycled._imageNativePrepared={trackKey:'preview'};
recycled._imageNativeLoading=true;
recycled._imageNativeLoadError=new Error('previous');
recycled.init({trackKey:'karting-tenerife'});
assert.equal(recycled._imageNativePrepared,null,'Native flag must reset for classic circuit');
assert.equal(recycled._imageNativeLoading,false);
assert.equal(recycled._imageNativeLoadError,null);
assert.equal(isImageNativeTrackScene(recycled),false,'Classic art must return after a native race');
assert.equal(isImageNativeTrackScene({trackKey:'karting-tenerife',track:{
  id:LOCAL_KARTING_PREVIEW_KEY,meta:{id:LOCAL_KARTING_PREVIEW_KEY,localPreview:true,source:'trackstudio-image-native'}
}}),false,'Stale preview metadata must not suppress classic preload rendering');
const base=readFileSync('src/game/scenes/RaceScene.js','utf8');
const env=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
const world=readFileSync('src/game/scenes/RaceWorldAlignedMaterialsScene.js','utf8');
const game=readFileSync('src/game/game.js','utf8');
const loader=readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
assert.ok(base.includes('if (!imageNativeVisual) {'),'No old grass/offroad');
assert.ok(base.includes('if (!isImageNativeTrackScene(this) && cells && this.car'),'No procedural asphalt culling');
assert.ok(env.includes("isImageNativeTrackScene(scene)&&!['karting-tenerife','santa-cruz','karting-americas','rally-arafo-los-loros'].includes(normalizeTrackKey(scene?.trackKey))"),'Only published photo-native races, including Arafo, may load authored environments; local previews remain isolated');
assert.ok(!env.includes("'karting-tenerife-studio'].includes(normalizeTrackKey(scene?.trackKey))"),'A local preview must not be whitelisted as a published environment');
assert.ok(world.includes('if (isImageNativeTrackScene(this))'),'Native identity not tied to Karting');
assert.ok(game.includes('installImageNativeRaceLoader(RaceScene,key=>hasTrack(key)?createTrack(key):null);'),'Registry-aware preflight installed before race creation');
assert.ok(loader.includes('if(!desc)return create?.call(this,data)'),'Classic tracks untouched');
assert.ok(loader.includes('if(this._imageNativeLoading||this._imageNativeLoadError)return'),'Fail closed');
assert.ok(!world.includes('activateKartingPreviewImage(this)'),'No second async decoder');
console.log('Native photo loading: fail-closed, 1:1, single-image path, classic circuit isolation: OK');
