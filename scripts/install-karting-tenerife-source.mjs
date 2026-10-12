// Fuente única: source/Karting Tenerife.tdrtrack. Foto y geometría 1:1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'src/game/tracks/library/karting-tenerife/source/Karting Tenerife.tdrtrack');
const trackPath=path.join(root,'src/game/tracks/library/karting-tenerife/track.json');
const photoPath=path.join(root,'public/assets/tracks/karting-tenerife/karting-tenerife-official.webp');
const tileDir=path.join(root,'public/assets/tracks/karting-tenerife/beauty');
function unpack(){
  const buf=fs.readFileSync(source),magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
  if(!buf.subarray(0,magic.length).equals(magic))throw Error('Cabecera .tdrtrack inválida');
  const idx=buf.indexOf(10,magic.length),length=Number(buf.toString('ascii',magic.length,idx)),offset=idx+1;
  if(idx<0||!Number.isSafeInteger(length)||length<2||length>20_000_000)throw Error('Longitud inválida');
  const p=JSON.parse(buf.toString('utf8',offset,offset+length)),image=buf.subarray(offset+length),t=p.gameTrack,m=p.imageAsset;
  if(m?.type!=='image/webp'||m.size!==image.length||m.width!==3344||m.height!==1882||
    t.worldW!==3344||t.worldH!==1882||t.closed!==true||
    !t.trackShape?.closed||!t.trackShape?.leftEdge?.length||!t.trackShape?.rightEdge?.length||
    t.centerline?.length!==1038||t.checkpoints?.length!==2||!t.finishLine?.normal)throw Error('Datos de pista o imagen incompletos');
  return {t,m,image,nodes:p.editor?.nodes?.length};
}
export async function installKartingTenerife({withAssets=false}={}){
  const {t,m,image,nodes}=unpack(),f=t.finishLine,n=f.normal;
  const finishAnchor={x:(f.a.x+f.b.x)/2,y:(f.a.y+f.b.y)/2,r:Math.atan2(n.y,n.x)};
  // The final .tdrtrack ships an uncalibrated start.r=0 even though the
  // authored race centerline leaves the starting position heading north.
  // Derive ONLY the initial heading from the first path segment. Neither
  // source .tdrtrack, spawn coordinates nor the car's physics are changed.
  const first=t.centerline[0],ahead=t.centerline[Math.min(5,t.centerline.length-1)];
  const sx=Number(first?.x),sy=Number(first?.y),dx=Number(ahead?.x)-sx,dy=Number(ahead?.y)-sy;
  if(![sx,sy,dx,dy].every(Number.isFinite)||Math.hypot(dx,dy)<8)
    throw Error('Karting Tenerife: orientación de salida indeterminada');
  const spawnHeading=Math.atan2(dy,dx);
  const authoredSpawn={...t.start,r:spawnHeading};
  const result={
    name:'KARTING TENERIFE',brand:'TDR',category:'Karting / Técnico',difficulty:'Alta',
    lengthLabel:'Corta',surface:'Asfalto',worldW:t.worldW,worldH:t.worldH,
    trackWidth:t.trackWidth,grassMargin:t.grassMargin,sampleStepPx:t.sampleStepPx,
    cellSize:t.cellSize,shoulderPx:t.shoulderPx,closed:true,raceType:'circuit',
    raceDirection:'forward',carScale:1,start:authoredSpawn,grid:t.grid||null,
    startLine:t.startLine||null,finishLine:f,finishAnchor,
    checkpointMode:'authored',checkpoints:t.checkpoints,
    centerline:t.centerline,trackShape:t.trackShape,
    meta:{...(t.meta||{}),renderMode:'image-native',
      imageNative:{schema:1,availability:'published',width:3344,height:1882,
        assetPath:'assets/tracks/karting-tenerife/karting-tenerife-official.webp'},
      source:'Track Studio .tdrtrack',sourceFile:'Karting Tenerife.tdrtrack',
      sourceImageSha256:crypto.createHash('sha256').update(image).digest('hex')}
  };
  const json=JSON.stringify(result,null,2)+'\n';
  if(!fs.existsSync(trackPath)||fs.readFileSync(trackPath,'utf8')!==json)fs.writeFileSync(trackPath,json);
  if(withAssets){
    fs.mkdirSync(path.dirname(photoPath),{recursive:true});
    if(!fs.existsSync(photoPath)||!fs.readFileSync(photoPath).equals(image))fs.writeFileSync(photoPath,image);
    fs.mkdirSync(tileDir,{recursive:true});
    const {default:sharp}=await import('sharp');
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      const filename=path.join(tileDir,`karting-tenerife-trackstudio-${row*2+col}.webp`);
      if(fs.existsSync(filename)&&fs.statSync(filename).mtimeMs>=fs.statSync(source).mtimeMs)continue;
      await sharp(image).extract({left:col*1672,top:row*941,width:1672,height:941}).webp({quality:86,effort:5}).toFile(filename);
    }
  }
  return {worldW:t.worldW,worldH:t.worldH,points:t.centerline.length,nodes,withAssets};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  console.log('[karting-tenerife] source installed',await installKartingTenerife({withAssets:!process.argv.includes('--metadata-only')}));
}
