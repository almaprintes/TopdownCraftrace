// Circuito Atlántico 2026 photographic source installer.
// The 4.0 MB .tdrtrack binary MUST be uploaded by the owner to the path below.
// Until then, the old Atlántico remains completely untouched.
// On source arrival, install its exact image-native geometry and six GPU tiles.
// Keep source photo and original geometry archived; scale only published world-space geometry.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
import {orderClosedCircuitGates} from '../src/game/tracks/closedCircuitGateOrder.js';
import {spawnUpstreamOfFinish} from '../src/game/tracks/imageNativeDriving.js';
import {scaleAtlanticoRaceTrack} from '../src/game/tracks/atlanticoWorldScale.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const ATLANTICO_SOURCE='src/game/tracks/library/track01/source/trackstudio-image-1792228071935.tdrtrack';
export const ATLANTICO_TARGET='src/game/tracks/library/track01/track.json';
export const ATLANTICO_ASSET='assets/tracks/circuito-atlantico';
export const ATLANTICO_PHOTO=ATLANTICO_ASSET+'/circuito-atlantico-official.webp';
export const ATLANTICO_SHA256='92863db4589e6d603d7c766f1432e04aef04a772d6a4d6b89604df1c843d4a85';
export const ATLANTICO_IMAGE_SHA256='5e55c32f7c8e4ce6b982b6eefcc089c24e096f5b7704af9e9f443b5aacded9f9';
export const ATLANTICO_W=4344,ATLANTICO_H=3258;
const TW=1448,TH=1629;
const abs=p=>path.join(root,p);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');

export const atlanticPhotoTiles=Object.freeze(
  Array.from({length:6},(_,i)=>{
    const row=Math.floor(i/3),col=i%3;
    return {x:col*TW,y:row*TH,width:TW,height:TH,
      assetPath:ATLANTICO_ASSET+'/photo-'+row+'-'+col+'.webp'};
  })
);

export function unpackAtlanticoSource(){
  if(!fs.existsSync(abs(ATLANTICO_SOURCE)))return null;
  const b=fs.readFileSync(abs(ATLANTICO_SOURCE));
  if(digest(b)!==ATLANTICO_SHA256)
    throw Error('Atlántico: .tdrtrack no coincide con el archivo entregado por el propietario');
  const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
  if(!b.subarray(0,magic.length).equals(magic))
    throw Error('Atlántico: archivo Track Studio sin cabecera válida');
  const end=b.indexOf(10,magic.length),n=Number(b.toString('ascii',magic.length,end));
  if(end<0||!Number.isSafeInteger(n)||n<1000||n>1000000)
    throw Error('Atlántico: metadatos de Track Studio corruptos');
  const doc=JSON.parse(b.toString('utf8',end+1,end+1+n));
  const t=doc.gameTrack,asset=doc.imageAsset,image=b.subarray(end+1+n);
  if(asset?.type!=='image/webp'||asset?.width!==ATLANTICO_W||asset?.height!==ATLANTICO_H||
      asset?.size!==image.length||digest(image)!==ATLANTICO_IMAGE_SHA256||
      image.toString('ascii',0,4)!=='RIFF'||image.toString('ascii',8,12)!=='WEBP')
    throw Error('Atlántico: fotografía original WebP alterada o ausente');
  if(t?.worldW!==ATLANTICO_W||t?.worldH!==ATLANTICO_H||
      t?.closed!==true||t?.raceType!=='circuit'||t?.centerline?.length!==394||
      t?.trackWidth!==305||t?.checkpoints?.length!==2||
      !t?.startLine?.a||!t?.startLine?.b||t?.finishLine!==null||
      !shapeIsValid(t.trackShape)||!t.trackShape.closed||
      t.trackShape.leftEdge.length!==14||t.trackShape.rightEdge.length!==14)
    throw Error('Atlántico: geometría, puntos de Bézier o puertas incompletos');
  return {t,image,doc};
}

export function buildAtlanticoTrack(t){
  // A closed circuit has only one lap gate. The author exported it in the
  // startLine field because Track Studio showed no separate META control.
  // Publishing startLine+finishLine would classify the race as A->B stage!
  const gates=orderClosedCircuitGates(t.centerline,t.startLine,t.checkpoints,{
    baseWidth:t.trackWidth
  });
  if(!gates.diagnostics.authoredPreserved||
      gates.diagnostics.crossed.some(c=>!c))
    throw Error('Atlántico: los checkpoints deben respetarse exactamente, no repararse automáticamente');
  const near=spawnUpstreamOfFinish(t.centerline,gates.finish,Math.min(100,t.trackWidth*.6));
  if(!near||![near.x,near.y,near.r].every(Number.isFinite))
    throw Error('Atlántico: no se puede orientar la salida antes de META');
  const finish=gates.finish,finishAnchor={
    x:(finish.a.x+finish.b.x)/2,y:(finish.a.y+finish.b.y)/2,
    r:Math.atan2(finish.normal.y,finish.normal.x)
  };
  const output={
    name:'CIRCUITO ATLÁNTICO',brand:'TDR',category:'Circuito / Técnico',
    difficulty:'Media',lengthLabel:'Corta',surface:'Asfalto',
    worldW:t.worldW,worldH:t.worldH,
    trackWidth:t.trackWidth,grassMargin:t.grassMargin,
    sampleStepPx:t.sampleStepPx,cellSize:t.cellSize,shoulderPx:t.shoulderPx,
    closed:true,raceType:'circuit',raceDirection:'forward',carScale:1,
    start:{x:near.x,y:near.y,r:near.r},grid:t.grid||null,
    startLine:null,finishLine:finish,finishAnchor,
    checkpointMode:'authored',checkpoints:gates.checkpoints,
    centerline:t.centerline,trackShape:t.trackShape,
    meta:{...t.meta,id:'circuito-atlantico',trackId:'circuito-atlantico',
      renderMode:'image-native',raceType:'circuit',
      imageNative:{schema:1,availability:'published',
        width:ATLANTICO_W,height:ATLANTICO_H,
        assetPath:ATLANTICO_PHOTO,tiles:atlanticPhotoTiles},
      source:'Track Studio .tdrtrack',sourceFile:path.basename(ATLANTICO_SOURCE),
      sourceSha256:ATLANTICO_SHA256,sourceImageSha256:ATLANTICO_IMAGE_SHA256,
      sourceGateRole:'startLine-as-closed-lap-finish'}
  };
  return {track:scaleAtlanticoRaceTrack(output),diagnostics:gates.diagnostics};
}

export async function installCircuitoAtlanticoSource({withAssets=true}={}){
  const packed=unpackAtlanticoSource();
  if(!packed){
    console.log('[atlantico] Fuente binaria pendiente del propietario; circuito anterior intacto');
    return {installed:false,reason:'Upload '+ATLANTICO_SOURCE};
  }
  const {track,diagnostics}=buildAtlanticoTrack(packed.t);
  const target=abs(ATLANTICO_TARGET),data=JSON.stringify(track,null,2)+'\n';
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==data)
    fs.writeFileSync(target,data);
  if(withAssets){
    const master=abs('public/'+ATLANTICO_PHOTO);
    fs.mkdirSync(path.dirname(master),{recursive:true});
    if(!fs.existsSync(master)||digest(fs.readFileSync(master))!==ATLANTICO_IMAGE_SHA256)
      fs.writeFileSync(master,packed.image);
    const {default:sharp}=await import('sharp');
    for(const tile of atlanticPhotoTiles){
      const dst=abs('public/'+tile.assetPath);
      if(!fs.existsSync(dst)||fs.statSync(dst).mtimeMs<fs.statSync(abs(ATLANTICO_SOURCE)).mtimeMs){
        fs.mkdirSync(path.dirname(dst),{recursive:true});
        await sharp(packed.image).extract({
          left:tile.x,top:tile.y,width:tile.width,height:tile.height
        }).webp({quality:86,effort:5}).toFile(dst);
      }
    }
  }
  console.log('[atlantico] nueva fotografía y circuito oficiales instalados',
    {world:[ATLANTICO_W,ATLANTICO_H],points:394,tiles:6,diagnostics});
  return {installed:true,world:[ATLANTICO_W,ATLANTICO_H],
    points:track.centerline.length,checkpoints:track.checkpoints.length,
    tiles:atlanticPhotoTiles.length,diagnostics};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await installCircuitoAtlanticoSource();
