// Reproducible Karting Canarias owner TrackStudio install — image-native, 1:1.
// Never remap the authored Bézier road, and NEVER turn a closed circuit into an A->B stage.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
import {orderClosedCircuitGates} from '../src/game/tracks/closedCircuitGateOrder.js';
import {spawnUpstreamOfFinish} from '../src/game/tracks/imageNativeDriving.js';
import {KARTING_CANARIAS_WORLD_SCALE,scaleKartingCanariasRaceTrack} from '../src/game/tracks/kartingCanariasWorldScale.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE='src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json';
const TARGET='src/game/tracks/library/karting-canarias/track.json';
const PHOTO='public/assets/tracks/karting-canarias/karting-canarias-new.webp';
const STAGING='public/assets/tracks/karting-canarias/photo-staging.json';
const SOURCE_SHA='dec073a892ae8e5e87193313372ae54f5126fb7d02ce92532618bdf8aad2284a';
const BUNDLE_SHA='4327ff06e677431e4b7343f7d5b5e8bd08ea1d0645da75782a1f4afaafed5dc6';
const IMAGE_SHA='4472ddf772300318555aad8814ff47da70a759879cca68e66a9f0ca72cac72d2';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const abs=p=>path.join(ROOT,p);
const mid=g=>({x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2});

export function buildOwnerKartingCanarias(){
  const json=fs.readFileSync(abs(SOURCE));
  if(hash(json)!==SOURCE_SHA)throw Error('Karting Canarias: el proyecto Track Studio ya no es el archivo del propietario');
  const project=JSON.parse(json.toString('utf8')),t=project.gameTrack,im=project.imageAsset;
  const bytes=fs.readFileSync(abs(PHOTO));
  if(bytes.length!==im?.size||hash(bytes)!==IMAGE_SHA)throw Error('Karting Canarias: WebP distinto al contenido del .tdrtrack');
  const reconstructed=Buffer.concat([Buffer.from('TDR-IMAGE-PROJECT-V1\n'+json.length+'\n'),json,bytes]);
  if(hash(reconstructed)!==BUNDLE_SHA)throw Error('Karting Canarias: archivo del propietario no reconstruible');
  const W=2048,H=3072,photo=JSON.parse(fs.readFileSync(abs(STAGING),'utf8'));
  if(t.worldW!==W||t.worldH!==H||im.width!==W||im.height!==H||
     !t.closed||t.raceType!=='circuit'||!t.trackShape?.closed||!shapeIsValid(t.trackShape)||
     t.centerline?.length!==506||!t.startLine?.a||!t.startLine?.b||
     t.checkpoints?.length!==2||t.finishLine!==null)
    throw Error('Karting Canarias: geometría, línea de salida o checkpoints incompletos');
  if(photo.sourceSha256!==IMAGE_SHA||photo.imageWidth!==W||photo.imageHeight!==H||
     photo.tiles?.length!==4)throw Error('Karting Canarias: mosaicos WebP no coinciden');
  // TrackStudio lets closed circuits author SALIDA without separately authoring
  // META. In a *lap* track, that single crossing is logically the finish.
  // Explicitly remove startLine so RaceScene never misdetects an A->B rally.
  const ordered=orderClosedCircuitGates(t.centerline,t.startLine,t.checkpoints,
     {shape:t.trackShape,baseWidth:t.trackWidth});
  if(!ordered.diagnostics.authoredPreserved)
    throw Error('Karting Canarias: checkpoint fuera de la pista o en orden incorrecto, revisar TrackStudio');
  if(ordered.diagnostics.checkpointFractions[0]<.2||
     ordered.diagnostics.checkpointFractions[1]>.92)
    throw Error('Karting Canarias: checkpoints demasiado cerca de la línea de salida');
  const finish=ordered.finish;
  const start=spawnUpstreamOfFinish(t.centerline,finish,Math.max(35,Math.min(85,t.trackWidth*.6)));
  if(!start)throw Error('Karting Canarias: salida orientada contra el recorrido');
  const m=mid(finish);
  // All published world coordinates are enlarged together. Source JSON/WebP
  // remain untouched and the car's physics and visual scale stay unchanged.
  return scaleKartingCanariasRaceTrack({
    ...t,name:'KARTING CANARIAS',brand:'TDR',category:'Karting / Técnico',
    difficulty:'Alta',lengthLabel:'Corta',raceDirection:'forward',
    carScale:1,closed:true,raceType:'circuit',startLine:null,
    finishLine:finish,finishAnchor:{x:m.x,y:m.y,r:Math.atan2(finish.normal.y,finish.normal.x)},
    start:{x:start.x,y:start.y,r:start.r},grid:null,
    checkpoints:ordered.checkpoints,checkpointMode:'authored',
    meta:{...(t.meta||{}),id:'karting-canarias',trackId:'karting-canarias',
      renderMode:'image-native',raceTravelDirection:'forward',
      imageNative:{schema:1,availability:'published',width:W,height:H,
        assetPath:photo.assetPath,tiles:photo.tiles.map(tile=>({
          x:tile.x,y:tile.y,width:tile.width,height:tile.height,assetPath:tile.assetPath
        }))},
      source:'Owner TrackStudio .tdrtrack',sourceFile:'trackstudio-image-1792189935586(1).tdrtrack',
      sourceBundleSha256:BUNDLE_SHA,sourceImageSha256:IMAGE_SHA,
      authoredStartLineRole:'closed-circuit-finish'}
  },KARTING_CANARIAS_WORLD_SCALE);
}
export function installKartingCanariasSource(){
  const track=buildOwnerKartingCanarias();
  const json=JSON.stringify(track,null,2)+'\n',target=abs(TARGET);
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==json)
    fs.writeFileSync(target,json);
  return {id:'karting-canarias',world:[track.worldW,track.worldH],
    checkpoints:track.checkpoints.length,tiles:track.meta.imageNative.tiles.length,
    centerline:track.centerline.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log('[karting-canarias] OWNER TRACK INSTALLED',installKartingCanariasSource());
