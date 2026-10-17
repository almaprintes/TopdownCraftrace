// Karting Canarias re-trace (4096x6144). Build-only installer.
// Supply ONE corrected .tdrtrack containing both source geometry and WebP:
// src/game/tracks/library/karting-canarias-4096/source/karting-canarias-4096.tdrtrack
// Never replace the owner's source or modify the public game when absent.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
import {orderClosedCircuitGates,loopPathMetrics} from '../src/game/tracks/closedCircuitGateOrder.js';
import {spawnUpstreamOfFinish} from '../src/game/tracks/imageNativeDriving.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE='src/game/tracks/library/karting-canarias-4096/source/karting-canarias-4096.tdrtrack';
const TRACK='src/game/tracks/library/karting-canarias-4096/track.json';
const PHOTO='public/assets/tracks/karting-canarias-4096';
const SHA='1c3e92545c12e0b9941f10e81f8ca6c58e233c909e59005c465507d3b90bc086';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const abs=p=>path.join(ROOT,p);

export function decodeOwnerRebuildBundle(bytes){
  if(!bytes.subarray(0,21).equals(Buffer.from('TDR-IMAGE-PROJECT-V1\n')))throw Error('New Canarias: invalid .tdrtrack header');
  const first=bytes.indexOf(10,21),declared=Number(bytes.subarray(21,first).toString('ascii'));
  if(first<0||!Number.isSafeInteger(declared)||declared<100||declared>10_000_000)throw Error('New Canarias: invalid project length');
  const end=first+1+declared;
  if(end>=bytes.length)throw Error('New Canarias: missing embedded photo');
  const project=JSON.parse(bytes.subarray(first+1,end).toString('utf8'));
  const photo=bytes.subarray(end);
  if(!photo.subarray(0,4).equals(Buffer.from('RIFF'))||
    !photo.subarray(8,12).equals(Buffer.from('WEBP'))||
    !project.imageAsset||project.imageAsset.size!==photo.length)
    throw Error('New Canarias: embedded WebP invalid');
  return {project,photo};
}
export function createRebuiltCanariasTrack(project,sourceSha){
  const t=project?.gameTrack;
  if(!t||t.worldW!==4096||t.worldH!==6144||t.trackWidth!==180||
    t.centerline?.length!==590||!t.closed||!shapeIsValid(t.trackShape)||
    !t.startLine?.a||!t.startLine?.b||t.checkpoints?.length!==3)
    throw Error('New Canarias: 4096x6144 owner geometry incomplete');
  // RaceScene accepts CP1+CP2 for lap validity. Preserve all 3 user gates in
  // metadata, use first and last (roughly 1/3 and 2/3 lap) as two active gates.
  // Never silently declare that the middle authored gate is enforced.
  const selected=[t.checkpoints[0],t.checkpoints[2]];
  const ordered=orderClosedCircuitGates(t.centerline,t.startLine,selected,
    {shape:t.trackShape,baseWidth:t.trackWidth});
  if(!ordered.diagnostics.authoredPreserved)throw Error('New Canarias: authored CP1/CP3 not valid for lap');
  const metrics=loopPathMetrics(t.centerline);
  if(Math.abs(metrics.total-13474.150923)>10)throw Error('New Canarias: owner centerline length changed');
  const finish=ordered.finish;
  const origin=spawnUpstreamOfFinish(t.centerline,finish,Math.max(35,Math.min(85,t.trackWidth*.6)));
  if(!origin)throw Error('New Canarias: no spawn upstream of start/finish');
  const mid={x:(finish.a.x+finish.b.x)/2,y:(finish.a.y+finish.b.y)/2};
  const tiles=[];
  for(let row=0;row<4;row++)for(let col=0;col<2;col++)
    tiles.push({x:col*2048,y:row*1536,width:2048,height:1536,
      assetPath:'assets/tracks/karting-canarias-4096/photo-'+row+'-'+col+'.webp'});
  return {...t,
    name:'KARTING CANARIAS',brand:'TDR',category:'Karting / Técnico',
    difficulty:'Alta',lengthLabel:'Corta',raceDirection:'forward',
    closed:true,raceType:'circuit',carScale:1,worldW:4096,worldH:6144,
    startLine:null,finishLine:finish,
    finishAnchor:{x:mid.x,y:mid.y,r:Math.atan2(finish.normal.y,finish.normal.x)},
    start:{x:origin.x,y:origin.y,r:origin.r},
    checkpoints:ordered.checkpoints,checkpointMode:'authored',grid:null,
    meta:{...(t.meta||{}),id:'karting-canarias-4096',trackId:'karting-canarias-4096',
      renderMode:'image-native',raceTravelDirection:'forward',
      paintedCheckeredFinish:true,authoredCheckpointsSourceCount:3,
      // Third gate is preserved, but RaceScene currently enforces two.
      authoredCheckpointReference:t.checkpoints,
      originalOwnerBundleSha256:sourceSha,
      originalOwnerPhotoSha256:'542ef00672d7e8f8c82e7bed426fcc78c0922933a73623f268c7ea2b96df6d81',
      imageNative:{schema:1,availability:'published',width:4096,height:6144,worldScale:1,
        assetPath:tiles[0].assetPath,tiles},
      source:'Owner rebuilt TrackStudio .tdrtrack (4096x6144)',sourceFile:path.basename(SOURCE),
      authoredStartLineRole:'closed-circuit-finish'}
  };
}
export async function installRebuiltCanarias(){
  if(!fs.existsSync(abs(SOURCE))){
    console.info('[Canarias 4096] SOURCE PENDING: upload '+SOURCE+' to activate rebuild.');
    return {pendingSource:true};
  }
  const bundle=fs.readFileSync(abs(SOURCE));
  if(hash(bundle)!==SHA)throw Error('New Canarias: wrong corrected owner .tdrtrack SHA256');
  const {project,photo}=decodeOwnerRebuildBundle(bundle);
  const meta=await sharp(photo).metadata();
  if(meta.format!=='webp'||meta.width!==4096||meta.height!==6144)
    throw Error('New Canarias: WebP dimensions mismatch');
  const track=createRebuiltCanariasTrack(project,SHA);
  fs.mkdirSync(abs(PHOTO),{recursive:true});
  for(let row=0;row<4;row++)for(let col=0;col<2;col++){
    const dest=abs(PHOTO+'/photo-'+row+'-'+col+'.webp');
    await sharp(photo).extract({left:col*2048,top:row*1536,width:2048,height:1536})
      .webp({quality:94,effort:3}).toFile(dest);
  }
  fs.mkdirSync(path.dirname(abs(TRACK)),{recursive:true});
  fs.writeFileSync(abs(TRACK),JSON.stringify(track,null,2)+'\n');
  // One low-cost selector image from the SAME owner's source photograph.
  const thumb=abs('public/assets/tracks/selector/karting-canarias-4096.webp');
  fs.mkdirSync(path.dirname(thumb),{recursive:true});
  await sharp(photo).resize(900,600,{fit:'contain',background:'#07131d'})
    .modulate({saturation:1.15,brightness:.99}).webp({quality:78,effort:4}).toFile(thumb);
  const originalImageHash=hash(photo);
  console.info('[Canarias 4096] INSTALLED 590 nodes / 8 full-res photo tiles, sha='+originalImageHash);
  return {id:'karting-canarias-4096',world:[4096,6144],tiles:8,
    checkpointsActive:2,checkpointsOriginal:3,sourceImageSha256:originalImageHash};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await installRebuiltCanarias();
