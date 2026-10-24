// 7 Picos: prepare the official Environment Studio project from the owner's
// original TrackStudio image bundle. The image and authored Bézier strip remain
// pixel-aligned; no circuit is registered until the exact source is uploaded.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
import {expandCheckpointToEdges} from '../src/game/tracks/imageNativeCheckpointWidth.js';
import {spawnUpstreamOfFinish} from '../src/game/tracks/imageNativeDriving.js';
import {orderClosedCircuitGates} from '../src/game/tracks/closedCircuitGateOrder.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE='src/game/tracks/library/siete-picos/source/7-picos.tdrtrack';
const TRACK='src/game/tracks/library/siete-picos/track.json';
const PHOTO='assets/tracks/siete-picos/7-picos.webp';
const PHOTO_IOS='assets/tracks/siete-picos/7-picos-ios.webp';
const SHA='270261f98c716a4c1b55a4e6184527c4347f140fc40f2d4af0c262f356f794cb';
const WIDTH=1448,HEIGHT=1086;
const absolute=p=>path.join(ROOT,p);

function readBundle(){
  const bytes=fs.readFileSync(absolute(SOURCE));
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
  if(digest!==SHA)throw Error('7 Picos: el .tdrtrack no es la última versión recibida (incluye SALIDA y dos checkpoints)');
  const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
  if(!bytes.subarray(0,magic.length).equals(magic))throw Error('7 Picos: cabecera TrackStudio incorrecta');
  const end=bytes.indexOf(10,magic.length);
  if(end<0)throw Error('7 Picos: tamaño JSON ausente');
  const size=Number(bytes.toString('ascii',magic.length,end));
  if(!Number.isSafeInteger(size)||size<1000||size>2000000)throw Error('7 Picos: longitud JSON inválida');
  const after=end+1+size;
  if(after>=bytes.length)throw Error('7 Picos: foto ausente');
  const bundle=JSON.parse(bytes.subarray(end+1,after).toString('utf8'));
  const t=bundle.gameTrack;
  const photo=bytes.subarray(after);
  const signature=Buffer.from([137,80,78,71,13,10,26,10]);
  if(!photo.subarray(0,8).equals(signature)||photo.readUInt32BE(16)!==WIDTH||photo.readUInt32BE(20)!==HEIGHT||
     bundle.imageAsset?.width!==WIDTH||bundle.imageAsset?.height!==HEIGHT||
     bundle.imageAsset?.type!=='image/png'||bundle.imageAsset?.size!==photo.length)
    throw Error('7 Picos: fotografía PNG distinta de la usada en TrackStudio');
  if(t?.worldW!==WIDTH||t?.worldH!==HEIGHT||t?.closed!==true||t?.raceType!=='circuit'||
    t?.centerline?.length!==730||!shapeIsValid(t.trackShape)||!t.trackShape.closed||
    t.trackShape.sourceNodeCount!==26||t.checkpoints?.length!==2||
    !(t.finishLine?.a&&t.finishLine?.b)&&!(t.startLine?.a&&t.startLine?.b))
    throw Error('7 Picos: geometría, salida o checkpoints incompletos');
  return {t,photo,digest};
}

export async function installSietePicos({withAssets=true}={}){
  if(!fs.existsSync(absolute(SOURCE))){
    console.log('[7-picos] Pendiente de subir el .tdrtrack: el circuito aún no se registra');
    return {installed:false,pending:SOURCE};
  }
  const {t,photo,digest}=readBundle();
  // TrackStudio's latest closed-circuit export calls the finish gate
  // "startLine". Use it as META, never install a stage (A→B) startLine:
  // that would prevent closed laps from counting correctly.
  const authoredFinish=t.finishLine?.a&&t.finishLine?.b?t.finishLine:t.startLine;
  const ordered=orderClosedCircuitGates(t.centerline,authoredFinish,t.checkpoints,{
    shape:t.trackShape,expandGate:expandCheckpointToEdges,baseWidth:Number(t.trackWidth)||65
  });
  const finish=ordered.finish;
  const distance=Math.max(32,Math.min(100,(Number(t.trackWidth)||65)*.60));
  const start=spawnUpstreamOfFinish(t.centerline,finish,distance);
  if(!start)throw Error('7 Picos: no es posible situar la parrilla antes de META');
  const finishAnchor={x:(finish.a.x+finish.b.x)*.5,
    y:(finish.a.y+finish.b.y)*.5,
    r:Math.atan2(finish.normal.y,finish.normal.x)};
  const photoSha=crypto.createHash('sha256').update(photo).digest('hex');
  const record={
    name:'7 PICOS',brand:'TDR',category:'Montaña / Volcánico',
    difficulty:'Alta',lengthLabel:'Media',surface:'Asfalto',
    worldW:WIDTH,worldH:HEIGHT,trackWidth:Number(t.trackWidth)||65,
    grassMargin:t.grassMargin,sampleStepPx:t.sampleStepPx,
    cellSize:t.cellSize,shoulderPx:t.shoulderPx,
    closed:true,raceType:'circuit',raceDirection:'forward',carScale:1,
    centerline:t.centerline,trackShape:t.trackShape,
    start:{x:start.x,y:start.y,r:start.r},grid:null,startLine:null,
    finishLine:finish,finishAnchor,checkpointMode:'authored',
    checkpoints:ordered.checkpoints,
    meta:{...(t.meta||{}),id:'siete-picos',trackId:'siete-picos',
      hiddenFromTrackSelect:true, // Editor only until barriers and QA are signed off.
      renderMode:'image-native',
      imageNative:{schema:1,availability:'published',width:WIDTH,height:HEIGHT,
        assetPath:PHOTO,tiles:[{x:0,y:0,width:WIDTH,height:HEIGHT,assetPath:PHOTO}]},
      source:'Track Studio .tdrtrack',sourceFile:path.basename(SOURCE),
      sourceBundleSha256:digest,sourceImageSha256:photoSha,
      gateOrderDiagnostics:ordered.diagnostics}
  };
  const out=absolute(TRACK);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const json=JSON.stringify(record,null,2)+'\n';
  if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==json)fs.writeFileSync(out,json);
  if(withAssets){
    const {default:sharp}=await import('sharp');
    const dest=absolute('public/'+PHOTO),destIOS=absolute('public/'+PHOTO_IOS);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    const full=await sharp(photo).webp({quality:86,effort:5}).toBuffer();
    fs.writeFileSync(dest,full);
    const small=await sharp(photo).resize(Math.round(WIDTH*.65),Math.round(HEIGHT*.65),{kernel:'lanczos3'})
      .webp({quality:78,effort:4}).toBuffer();
    fs.writeFileSync(destIOS,small);
  }
  console.log('[7-picos] Instalado para Environment Studio; editor-only:',
    WIDTH+'x'+HEIGHT,t.centerline.length+' puntos',
    ordered.checkpoints.length+' CP',JSON.stringify(ordered.diagnostics));
  return {installed:true,trackId:'siete-picos',world:[WIDTH,HEIGHT],
    checkpoints:ordered.checkpoints.length,gateOrder:ordered.diagnostics};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await installSietePicos();