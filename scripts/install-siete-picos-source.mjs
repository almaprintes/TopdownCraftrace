// 7 Picos — official second TrackStudio source, dated 2026-10-24.
// Fully replaces the first circuit. Geometry is already 4344x3258: 1:1 world.
// Keep the author's source WebP and 32 Bezier nodes exact; use 6 GPU-safe tiles.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
import {expandCheckpointToEdges} from '../src/game/tracks/imageNativeCheckpointWidth.js';
import {spawnUpstreamOfFinish} from '../src/game/tracks/imageNativeDriving.js';
import {orderClosedCircuitGates} from '../src/game/tracks/closedCircuitGateOrder.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SIETE_PICOS_SOURCE='src/game/tracks/library/siete-picos/source/7-picos.tdrtrack';
export const SIETE_PICOS_TRACK='src/game/tracks/library/siete-picos/track.json';
export const SIETE_PICOS_ASSET='assets/tracks/siete-picos';
export const SIETE_PICOS_PHOTO=SIETE_PICOS_ASSET+'/7-picos.webp';
export const SIETE_PICOS_SHA256='380fb298bd42ae035599894f3ad75a3393421709881e8b3133223a81a26bfc80';
export const SIETE_PICOS_W=4344,SIETE_PICOS_H=3258;
const TW=1448,TH=1629;
const abs=p=>path.join(ROOT,p);
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
export const sietePicosPhotoTiles=Object.freeze(
  Array.from({length:6},(_,index)=>{
    const row=Math.floor(index/3),col=index%3;
    return {x:col*TW,y:row*TH,width:TW,height:TH,
      assetPath:SIETE_PICOS_ASSET+'/photo-'+row+'-'+col+'.webp'};
  })
);

export function unpackSietePicosSource(){
  if(!fs.existsSync(abs(SIETE_PICOS_SOURCE)))return null;
  const bytes=fs.readFileSync(abs(SIETE_PICOS_SOURCE));
  const digest=sha256(bytes);
  if(digest!==SIETE_PICOS_SHA256)
    throw Error('7 Picos: la fuente subida no coincide con el nuevo trazado 4344x3258');
  const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
  if(!bytes.subarray(0,magic.length).equals(magic))
    throw Error('7 Picos: formato TrackStudio incorrecto');
  const end=bytes.indexOf(10,magic.length);
  const length=Number(bytes.toString('ascii',magic.length,end));
  if(end<0||!Number.isSafeInteger(length)||length<1000||length>2_000_000)
    throw Error('7 Picos: cabecera JSON inválida');
  const after=end+1+length;
  if(after>=bytes.length)throw Error('7 Picos: falta la fotografía');
  const bundle=JSON.parse(bytes.subarray(end+1,after).toString('utf8'));
  const t=bundle.gameTrack,photo=bytes.subarray(after);
  if(photo.toString('ascii',0,4)!=='RIFF'||photo.toString('ascii',8,12)!=='WEBP'||
    bundle.imageAsset?.type!=='image/webp'||
    bundle.imageAsset?.width!==SIETE_PICOS_W||bundle.imageAsset?.height!==SIETE_PICOS_H||
    bundle.imageAsset?.size!==photo.length||
    t?.worldW!==SIETE_PICOS_W||t?.worldH!==SIETE_PICOS_H||
    t?.closed!==true||t?.raceType!=='circuit'||
    !shapeIsValid(t?.trackShape)||!t.trackShape.closed||
    t.trackShape.sourceNodeCount!==32||
    t.trackShape.leftEdge.length!==32||t.trackShape.rightEdge.length!==32||
    t.centerline?.length!==898||t.checkpoints?.length!==2||
    !(t.finishLine?.a&&t.finishLine?.b)&&!(t.startLine?.a&&t.startLine?.b))
    throw Error('7 Picos: fotografía y geometría nuevas no coinciden');
  return {t,photo,bundle,digest};
}

export async function installSietePicos({withAssets=true}={}){
  const packed=unpackSietePicosSource();
  if(!packed)throw Error('7 Picos: falta la fuente oficial '+SIETE_PICOS_SOURCE);
  const {t,photo,digest}=packed;
  const authoredFinish=t.finishLine?.a&&t.finishLine?.b?t.finishLine:t.startLine;
  const ordered=orderClosedCircuitGates(t.centerline,authoredFinish,t.checkpoints,{
    shape:t.trackShape,expandGate:expandCheckpointToEdges,
    baseWidth:Number(t.trackWidth)||120
  });
  if(!ordered.finish||ordered.checkpoints.length!==2||
    ordered.diagnostics?.crossed?.some(value=>!value))
    throw Error('7 Picos: comprobar meta, sentido y orden de checkpoints nuevos');
  const finish=ordered.finish;
  const near=spawnUpstreamOfFinish(t.centerline,finish,
    Math.max(32,Math.min(100,(Number(t.trackWidth)||120)*.60)));
  if(!near||![near.x,near.y,near.r].every(Number.isFinite))
    throw Error('7 Picos: no es posible ubicar el coche antes de la meta');
  const finishAnchor={x:(finish.a.x+finish.b.x)/2,
    y:(finish.a.y+finish.b.y)/2,r:Math.atan2(finish.normal.y,finish.normal.x)};
  const imageHash=sha256(photo);
  const record={
    name:'7 PICOS',brand:'TDR',category:'Montaña / Volcánico',
    difficulty:'Alta',lengthLabel:'Media',surface:'Asfalto',
    worldW:SIETE_PICOS_W,worldH:SIETE_PICOS_H,
    trackWidth:Number(t.trackWidth)||120,grassMargin:t.grassMargin,
    sampleStepPx:t.sampleStepPx,cellSize:t.cellSize,shoulderPx:t.shoulderPx,
    closed:true,raceType:'circuit',raceDirection:'forward',carScale:1,
    centerline:t.centerline,trackShape:t.trackShape,
    start:{x:near.x,y:near.y,r:near.r},grid:null,startLine:null,
    finishLine:finish,finishAnchor,checkpointMode:'authored',
    checkpoints:ordered.checkpoints,
    meta:{...t.meta,id:'siete-picos',trackId:'siete-picos',
      hiddenFromTrackSelect:true, // DEV player and Environment Builder exceptions are separate.
      renderMode:'image-native',
      imageNative:{schema:1,availability:'published',
        width:SIETE_PICOS_W,height:SIETE_PICOS_H,
        assetPath:SIETE_PICOS_PHOTO,tiles:sietePicosPhotoTiles},
      source:'Track Studio .tdrtrack',sourceFile:path.basename(SIETE_PICOS_SOURCE),
      sourceBundleSha256:digest,sourceImageSha256:imageHash,
      gateOrderDiagnostics:ordered.diagnostics}
  };
  const out=abs(SIETE_PICOS_TRACK),json=JSON.stringify(record,null,2)+'\n';
  fs.mkdirSync(path.dirname(out),{recursive:true});
  if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==json)fs.writeFileSync(out,json);
  if(withAssets){
    const {default:sharp}=await import('sharp');
    const dir=abs('public/'+SIETE_PICOS_ASSET);
    fs.mkdirSync(dir,{recursive:true});
    // This is a wholly replaced private circuit. Remove its stale first-version
    // master/single-texture iPhone assets and any old tiles before generating.
    for(const name of fs.readdirSync(dir)){
      if(name==='7-picos.webp'||name==='7-picos-ios.webp'||/^photo-\d+-\d+(?:-ios)?\.webp$/.test(name))
        fs.rmSync(path.join(dir,name),{force:true});
    }
    fs.writeFileSync(abs('public/'+SIETE_PICOS_PHOTO),photo);
    for(const tile of sietePicosPhotoTiles){
      await sharp(photo).extract({left:tile.x,top:tile.y,
        width:tile.width,height:tile.height})
        .webp({quality:86,effort:5}).toFile(abs('public/'+tile.assetPath));
    }
  }
  console.log('[7-picos] Nuevo trazado oficial instalado (sin reescalar):',
    SIETE_PICOS_W+'x'+SIETE_PICOS_H,t.centerline.length+' puntos',
    '32 nodos Bezier, 6 tiles, 2 CP',JSON.stringify(ordered.diagnostics));
  return {installed:true,trackId:'siete-picos',world:[SIETE_PICOS_W,SIETE_PICOS_H],
    worldScale:1,sourceSha256:digest,
    points:t.centerline.length,tiles:sietePicosPhotoTiles.length,
    checkpoints:ordered.checkpoints.length,gateOrder:ordered.diagnostics};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await installSietePicos();
