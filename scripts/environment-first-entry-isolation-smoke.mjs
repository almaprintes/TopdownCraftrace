// First entry into another circuit must never inherit a previous scene's collision map.
// Reproduces Phaser's reused RaceScene: init(new track) has run but create() has not.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';

const vite=await createServer({server:{middlewareMode:true,preTransformRequests:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
try{
  const [{envFor},{CLOSED_CIRCUIT_VARIANTS},{createTrackEnvironment}]=await Promise.all([
    vite.ssrLoadModule('/src/game/scenes/raceEnvironmentRuntime.js'),
    vite.ssrLoadModule('/src/game/tracks/trackReverseVariant.js'),
    vite.ssrLoadModule('/src/game/tracks/environmentRegistry.js')
  ]);
  const keys=[
    'karting-tenerife','karting-americas','santa-cruz','circuito-atlantico',
    'karting-canarias-4096','karting-canarias','rally-arafo-los-loros',
    ...CLOSED_CIRCUIT_VARIANTS.map(v=>v.alternate)
  ];
  for(const trackKey of new Set(keys)){
    const fresh=envFor({trackKey,track:null});
    const previous=[
      'karting-canarias-4096','karting-americas','santa-cruz','circuito-atlantico',
      'karting-canarias-4096-inverso','rally-arafo-los-loros'
    ];
    for(const old of previous){
      const cold={trackKey,track:{
        id:old,trackId:old,meta:{id:old,trackId:old,key:old,name:old,renderMode:'image-native'}
      }};
      assert.deepEqual(envFor(cold),fresh,
        'FIRST ENTRY '+trackKey+' must not inherit collisions from previous '+old);
      cold.track={id:trackKey,meta:{id:trackKey,renderMode:'image-native'}};
      assert.deepEqual(envFor(cold),fresh,
        'RESTART '+trackKey+' must use identical geometry to first entry');
    }
  }
  const canarias=createTrackEnvironment('karting-canarias-4096');
  const tenerife=createTrackEnvironment('karting-tenerife');
  assert.ok(canarias?.collisionLines?.length||canarias?.collisionZones?.length,
    '4096 collision project must contain the owner-authored obstacles');
  assert.ok(tenerife?.collisionLines?.length||tenerife?.collisionZones?.length,
    'Tenerife collision project must exist');
  const staleCanarias={id:'karting-canarias-4096',meta:{id:'karting-canarias-4096'}};
  assert.deepEqual(envFor({trackKey:'karting-tenerife',track:staleCanarias}),
    envFor({trackKey:'karting-tenerife'}),'Tenerife may not receive Canarias barriers');
  assert.deepEqual(envFor({trackKey:'karting-canarias-4096-inverso',track:{id:'santa-cruz'}}),
    envFor({trackKey:'karting-canarias-4096'}),'4096 inverse must use same physical geometry');
  for(const trackKey of ['import:unknown','karting-tenerife-studio',''])
    assert.equal(envFor({trackKey,track:staleCanarias}),null,
      'Unknown/local preview must never inherit a previously selected project: '+trackKey);
  const source=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
  const fn=source.slice(source.indexOf('export function envFor(scene)'),source.indexOf('function textureKey('));
  assert.ok(!fn.includes('scene?.track?.meta')&&!fn.includes('scene?.track?.id')&&!fn.includes('scene?.track?.trackId'),
    'Selection cannot inspect stale scene.track while preload/create are racing');
  assert.match(source,/proto\.preload=function[\s\S]*?envFor\(this\)/,
    'Preload resolves environment from the selected active identity');
  assert.match(source,/proto\.create=function\(data\)\{this\._tdrCanopyZones=\[\];const env=envFor\(this\)/,
    'Create must agree with preload without stale geometry');
  const html=readFileSync('index.html','utf8');
  const devVersion=html.match(/<meta name="tdr-dev-version" content="DEV (\d+)\.(\d+)\.(\d+)"\s*\/>/);
  assert.ok(devVersion,'DEV must have a numeric major.minor.patch version in the canonical meta tag');
  const [major,minor,patch]=devVersion.slice(1).map(Number);
  assert.ok(major>1||(major===1&&(minor>2||(minor===2&&patch>=333))),
    'First-entry collision correction must remain included in all newer DEV versions');
  console.log('PASS: first-load/restart collision geometry identical for normal/inverse circuits, independent of previous scene track; no borrowed 4096 barriers');
}finally{await vite.close();}
