// Santa Cruz photographic circuit installer. SOURCE .tdrtrack is authoritative.
// Until the source package is added to main, the existing Santa Cruz stays intact.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {expandCheckpointToEdges} from '../src/game/tracks/imageNativeCheckpointWidth.js';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'src/game/tracks/library/santa-cruz/source/Santa Cruz x3 nitido.tdrtrack');
const target=path.join(root,'src/game/tracks/library/santa-cruz/track.json');
const environmentSource=path.join(root,'src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json');
const environmentTarget=path.join(root,'src/game/tracks/library/santa-cruz/santa-cruz.environment.json');
const assets=path.join(root,'public/assets/tracks/santa-cruz');
const WIDTH=3072,HEIGHT=4608,TILE=1536;
const assetPath='assets/tracks/santa-cruz/santa-cruz-official.webp';
function parseSource(){
  const b=fs.readFileSync(source),magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
  if(!b.subarray(0,magic.length).equals(magic))throw Error('Santa Cruz: cabecera .tdrtrack inválida');
  const end=b.indexOf(10,magic.length),size=Number(b.toString('ascii',magic.length,end)),at=end+1;
  if(end<0||!Number.isSafeInteger(size)||size<100||size>2_000_000)throw Error('Santa Cruz: metadatos inválidos');
  const p=JSON.parse(b.toString('utf8',at,at+size)),image=b.subarray(at+size);
  const t=p.gameTrack,m=p.imageAsset;
  if(m?.type!=='image/webp'||m.width!==WIDTH||m.height!==HEIGHT||m.size!==image.length||
     image.toString('ascii',0,4)!=='RIFF'||image.toString('ascii',8,12)!=='WEBP')
    throw Error('Santa Cruz: fotografía WebP original ausente o alterada');
  if(t?.worldW!==WIDTH||t?.worldH!==HEIGHT||t?.closed!==true||
     !shapeIsValid(t?.trackShape)||!t.trackShape.closed||
     t?.centerline?.length<100||t?.checkpoints?.length!==2||
     !t?.finishLine?.normal||!t?.finishLine?.a||!t?.finishLine?.b)
    throw Error('Santa Cruz: geometría, meta o checkpoints incompletos');
  return {t,image};
}
export async function installSantaCruzSource(){
  if(!fs.existsSync(source))return {installed:false,reason:'Esperando paquete Santa Cruz x3 nitido.tdrtrack'};
  const {t,image}=parseSource();
  const first=t.centerline[0],ahead=t.centerline[Math.min(6,t.centerline.length-1)];
  const dx=Number(ahead.x)-Number(first.x),dy=Number(ahead.y)-Number(first.y);
  if(Math.hypot(dx,dy)<5)throw Error('Santa Cruz: rumbo de salida inválido');
  const f=t.finishLine,n=f.normal,finishAnchor={
    x:(f.a.x+f.b.x)/2,y:(f.a.y+f.b.y)/2,r:Math.atan2(n.y,n.x)
  };
  const checkpoints=t.checkpoints.map((g,i)=>{
    try{return expandCheckpointToEdges(g,t.trackShape);}
    catch(error){throw Error('Santa Cruz CP'+(i+1)+': '+error.message);}
  });
  const tiles=[];
  for(let y=0;y<HEIGHT;y+=TILE)for(let x=0;x<WIDTH;x+=TILE){
    const col=x/TILE,row=y/TILE;
    tiles.push({x,y,width:TILE,height:TILE,
      assetPath:'assets/tracks/santa-cruz/photo-'+row+'-'+col+'.webp'});
  }
  const photo={schema:1,availability:'published',width:WIDTH,height:HEIGHT,assetPath,tiles};
  const record={
    name:'SANTA CRUZ',brand:'TDR',category:'Urbano / Técnico',difficulty:'Media',
    lengthLabel:'Media',surface:'Asfalto',worldW:WIDTH,worldH:HEIGHT,
    trackWidth:t.trackWidth,grassMargin:t.grassMargin,sampleStepPx:t.sampleStepPx,
    cellSize:t.cellSize,shoulderPx:t.shoulderPx,closed:true,raceType:'circuit',
    raceDirection:'forward',carScale:1,
    start:{...t.start,r:Math.atan2(dy,dx)},
    startLine:t.startLine||null,finishLine:f,finishAnchor,
    checkpointMode:'authored',checkpoints,centerline:t.centerline,
    trackShape:t.trackShape,grid:t.grid||null,
    meta:{...(t.meta||{}),renderMode:'image-native',imageNative:photo,
      source:'Track Studio .tdrtrack',sourceFile:'Santa Cruz x3 nitido.tdrtrack',
      sourceImageSha256:crypto.createHash('sha256').update(image).digest('hex')}
  };
  fs.mkdirSync(assets,{recursive:true});
  // A real master copy and six 1536px tiles: small GPU textures even on iPhone 12.
  const master=path.join(assets,'santa-cruz-official.webp');
  if(!fs.existsSync(master)||!fs.readFileSync(master).equals(image))fs.writeFileSync(master,image);
  const {default:sharp}=await import('sharp');
  for(const tile of tiles){
    const output=path.join(root,'public',tile.assetPath);
    if(!fs.existsSync(output)||fs.statSync(output).mtimeMs<fs.statSync(source).mtimeMs)
      await sharp(image).extract({left:tile.x,top:tile.y,width:tile.width,height:tile.height})
        .webp({quality:91,effort:5}).toFile(output);
  }
  fs.writeFileSync(target,JSON.stringify(record,null,2)+'\n');
  const environment=JSON.parse(fs.readFileSync(environmentSource,'utf8'));
  if(environment.trackId!=='santa-cruz'||!Array.isArray(environment.collisionLines)||
     !Array.isArray(environment.collisionZones))
    throw Error('Santa Cruz: proyecto de colisiones inválido');
  fs.writeFileSync(environmentTarget,JSON.stringify(environment,null,2)+'\n');
  return {installed:true,world:[WIDTH,HEIGHT],checkpoints:checkpoints.length,tiles:tiles.length,
    collisionLines:environment.collisionLines.length,collisionZones:environment.collisionZones.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log('[santa-cruz]',await installSantaCruzSource());
