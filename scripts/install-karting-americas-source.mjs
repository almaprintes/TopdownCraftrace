// Permanent Karting Americas native-photo source installer (build-time).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
import {expandCheckpointToEdges} from '../src/game/tracks/imageNativeCheckpointWidth.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE='src/game/tracks/library/karting-americas/source/trackstudio-image-1792095082437.tdrtrack';
const TARGET='src/game/tracks/library/karting-americas/track.json';
const ASSET='assets/tracks/karting-americas',PHOTO=ASSET+'/karting-americas-official.webp';
const EXPECTED_SHA256='dbd1f8841af860ece78be3ffa847502c03dac974c7c63190672b0bc590aa0fef';
const W=2862,H=3435,TW=1431,TH=1145;
const abs=p=>path.join(root,p);
const tiles=Array.from({length:6},(_,i)=>{
 const row=Math.floor(i/2),col=i%2;
 return {x:col*TW,y:row*TH,width:TW,height:TH,assetPath:ASSET+'/photo-'+row+'-'+col+'.webp'};
});
function unpack(){
 const bytes=fs.readFileSync(abs(SOURCE));
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==EXPECTED_SHA256)throw Error('Karting Américas: la fuente no coincide con el archivo x2.5 validado');
 const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
 if(!bytes.subarray(0,magic.length).equals(magic))throw Error('Karting Américas: cabecera incorrecta');
 const end=bytes.indexOf(10,magic.length),length=Number(bytes.toString('ascii',magic.length,end));
 if(end<0||!Number.isSafeInteger(length)||length<100||length>2000000)throw Error('Karting Américas: datos de fuente corruptos');
 const project=JSON.parse(bytes.subarray(end+1,end+1+length).toString('utf8'));
 const t=project.gameTrack,meta=project.imageAsset,image=bytes.subarray(end+1+length);
 const png=Buffer.from([137,80,78,71,13,10,26,10]);
 if(!image.subarray(0,8).equals(png)||image.readUInt32BE(16)!==W||image.readUInt32BE(20)!==H||
    meta?.width!==W||meta?.height!==H||meta?.type!=='image/png'||meta?.size!==image.length)
   throw Error('Karting Américas: imagen de fuente 1:1 ausente o corrupta');
 if(t?.worldW!==W||t?.worldH!==H||!t.closed||!shapeIsValid(t.trackShape)||
    !t.trackShape.closed||t.centerline?.length!==730||t.checkpoints?.length!==2||
    !t.finishLine?.a||!t.finishLine?.b||!t.finishLine?.normal||!t.start)
   throw Error('Karting Américas: trazado, meta o checkpoints incompletos');
 return {t,image};
}
export async function installKartingAmericas({withAssets=true}={}){
 const {t,image}=unpack(),finish=t.finishLine,normal=finish.normal;
 const finishAnchor={x:(finish.a.x+finish.b.x)/2,y:(finish.a.y+finish.b.y)/2,r:Math.atan2(normal.y,normal.x)};
 const checkpoints=t.checkpoints.map((gate,i)=>{
   if(!gate?.a||!gate?.b)throw Error('Karting Américas: checkpoint '+i+' inválido');
   try{return expandCheckpointToEdges(gate,t.trackShape);}
   catch(error){console.warn('[karting-americas] checkpoint original conservado:',error.message);return gate;}
 });
 const first=t.centerline[0],next=t.centerline[5],heading=Number.isFinite(Number(t.start.r))
   ?Number(t.start.r):Math.atan2(next.y-first.y,next.x-first.x);
 if(!Number.isFinite(Number(t.start.x))||!Number.isFinite(Number(t.start.y))||!Number.isFinite(heading))
   throw Error('Karting Américas: salida inválida');
 const track={
   name:'KARTING AMÉRICAS',brand:'TDR',category:'Karting / Técnico',
   difficulty:'Alta',lengthLabel:'Media',surface:'Asfalto',
   worldW:W,worldH:H,trackWidth:t.trackWidth,grassMargin:t.grassMargin,
   sampleStepPx:t.sampleStepPx,cellSize:t.cellSize,shoulderPx:t.shoulderPx,
   closed:true,raceType:'circuit',raceDirection:'forward',carScale:1,
   start:{...t.start,r:heading},grid:t.grid||null,startLine:t.startLine||null,
   finishLine:finish,finishAnchor,checkpointMode:'authored',checkpoints,
   centerline:t.centerline,trackShape:t.trackShape,
   meta:{...(t.meta||{}),id:'karting-americas',trackId:'karting-americas',
     renderMode:'image-native',imageNative:{schema:1,availability:'published',width:W,height:H,
       assetPath:PHOTO,tiles},
     source:'Track Studio .tdrtrack',sourceFile:path.basename(SOURCE),
     sourceImageSha256:crypto.createHash('sha256').update(image).digest('hex')}
 };
 const target=abs(TARGET),json=JSON.stringify(track,null,2)+'\n';
 fs.mkdirSync(path.dirname(target),{recursive:true});
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==json)fs.writeFileSync(target,json);
 if(withAssets){
   const {default:sharp}=await import('sharp');
   const master=abs('public/'+PHOTO),stamp=fs.statSync(abs(SOURCE)).mtimeMs;
   fs.mkdirSync(path.dirname(master),{recursive:true});
   if(!fs.existsSync(master)||fs.statSync(master).mtimeMs<stamp)
     await sharp(image).webp({quality:86,effort:5}).toFile(master);
   for(const tile of tiles){
     const dest=abs('public/'+tile.assetPath);
     if(!fs.existsSync(dest)||fs.statSync(dest).mtimeMs<stamp)
       await sharp(image).extract({left:tile.x,top:tile.y,width:tile.width,height:tile.height})
         .webp({quality:86,effort:5}).toFile(dest);
   }
 }
 return {trackId:'karting-americas',world:[W,H],points:t.centerline.length,
   checkpoints:checkpoints.length,tiles:tiles.length,withAssets};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
 console.log('[karting-americas] OFFICIAL INSTALLED',await installKartingAmericas());
