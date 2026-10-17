// Read-only: inspect alpha silhouettes and karting scales after source installers.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import {availableCarSkins} from '../src/game/skins/carSkins.js';
import {skinGeometry} from '../src/game/skins/skinGeometry.js';
import {generateAudit} from './audit-track-car-scale.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const r=(x,d=2)=>Number.isFinite(x)?Number(x.toFixed(d)):null;
const percent=(x,y)=>y>0?r(x*100/y,2):null;
export function alphaBoundingBox(data,width,height,channels=4,threshold=16){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||channels<4||data.length<width*height*channels)throw Error('invalid pixel buffer');
  let minx=width,miny=height,maxx=-1,maxy=-1,visible=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(data[(y*width+x)*channels+3]<threshold)continue;
    minx=Math.min(minx,x);maxx=Math.max(maxx,x);
    miny=Math.min(miny,y);maxy=Math.max(maxy,y);visible++;
  }
  return visible?{x:minx,y:miny,width:maxx-minx+1,height:maxy-miny+1,
    visiblePixels:visible,fillPercent:percent(visible,width*height)}:null;
}
export async function inspectAlpha(file,threshold=16){
  const metadata=await sharp(file).metadata();
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return {width:info.width,height:info.height,format:metadata.format,
    hasAlpha:metadata.hasAlpha===true,bbox:alphaBoundingBox(data,info.width,info.height,info.channels,threshold),
    bbox128:alphaBoundingBox(data,info.width,info.height,info.channels,128)};
}
function visibleGeometry(spec,skin,texture,trackScale=1){
  const ratio=Number(spec.visualScale)||1,fix=skinGeometry(spec.id,skin);
  const factor=Math.min(96*ratio*1.35*trackScale/texture.width,
    48*ratio*1.35*trackScale/texture.height)*(1+fix.scale);
  const quarter=Math.round(fix.rotation/90)%2!==0;
  const widthPixels=quarter?texture.bbox?.height:texture.bbox?.width;
  const lengthPixels=quarter?texture.bbox?.width:texture.bbox?.height;
  return {width:r(widthPixels*factor),length:r(lengthPixels*factor),
    fit:r(factor,5),rotation:fix.rotation,skinScale:1+fix.scale};
}
async function auditSkins(cars){
  const list=[];
  for(const car of cars){
    const spec=CAR_SPECS[car.id];
    for(const skin of availableCarSkins(car.id,spec)){
      const filename=skin.file||spec.skin||'';
      const file=path.join(root,'public/assets/skins',filename);
      if(!filename||!fs.existsSync(file)){
        list.push({id:car.id,name:car.name,skin:skin.id,file:filename,missing:true});
        continue;
      }
      const texture=await inspectAlpha(file);
      const visual=texture.bbox?visibleGeometry(spec,skin.id,texture):null;
      list.push({id:car.id,name:car.name,skin:skin.id,filename,texture,
        nominalShortSidePx:car.nominal.spriteShortSidePx,
        nominalWidthPx:car.nominal.spriteWidthPx,
        visualScale:Number(spec.visualScale)||1,collisionScale:Number(spec.collisionScale??spec.visualScale)||1,
        visible:visual,
        widthVsNominalPercent:visual?percent(visual.width,car.nominal.spriteWidthPx):null,
        warning:!texture.hasAlpha?'Imagen opaca; caja alfa no es contorno fiable':
          !texture.bbox?'Sin píxeles alfa >= 16':null});
    }
  }
  return list;
}
function kartings(base,skins){
  const ids=['karting-tenerife','karting-americas','karting-canarias'];
  const spark=skins.find(x=>x.id==='helix_spark'&&x.skin==='original');
  const cuper=skins.find(x=>x.id==='crown_cuper'&&x.skin==='original');
  if(!spark?.visible||!cuper?.visible)throw Error('Missing Spark or Cuper silhouette');
  const tracks=ids.map(id=>base.tracks.find(t=>t.id===id));
  if(tracks.some(t=>!t))throw Error('Missing installed karting');
  const reference=tracks[0].road.median;
  return tracks.map(t=>({
    id:t.id,worldScale:t.image.worldScale,carScale:t.carScale,
    widthMedian:t.road.median,widthP10:t.road.low,widthP90:t.road.high,
    valid:t.road.valid,total:t.road.total,
    sparkVisibleWidthPx:r(spark.visible.width*t.carScale),
    cuperVisibleWidthPx:r(cuper.visible.width*t.carScale),
    sparkSharePercent:percent(spark.visible.width*t.carScale,t.road.median),
    cuperSharePercent:percent(cuper.visible.width*t.carScale,t.road.median),
    relativeSparkToTenerifePercent:percent(t.carScale*reference,tracks[0].carScale*t.road.median),
    photoRoadWidthEquivalentPx:r(t.road.median/t.image.worldScale)
  }));
}
function markdown(data){
  const lines=[
    '# Auditoría de siluetas visibles y escala de tres kartings',
    '',
    'Datos POST-INSTALADORES. Solo lectura. No se alteran skins, física, fotos ni récords.',
    '',
    'Caja alfa mínima con umbral 16/255: no equivale a carrocería física ni a bounding box exacta tras suavizado.',
    'Se aplica el mismo ajuste al rectángulo de sprite que RaceScene y los ajustes actuales de skinGeometry.',
    'La cámara cambia proporciones de pantalla, pero no el cociente relativo coche/carretera.',
    '',
    '## Comparación de los tres kartings',
    '',
    '| Circuito | Asfalto mediano | P10–P90 | Spark visible % | Cuper visible % | Spark relativo a Tenerife | Mundo × |',
    '|---|---:|---:|---:|---:|---:|---:|'
  ];
  for(const t of data.kartings)lines.push('| '+t.id+' | '+t.widthMedian+' px | '+t.widthP10+'–'+t.widthP90+
    ' px | '+t.sparkSharePercent+'% | '+t.cuperSharePercent+'% | '+t.relativeSparkToTenerifePercent+
    '% | '+t.worldScale+' |');
  lines.push('','## Las 18 carrocerías predeterminadas y Gold del Cuper','','| Coche / skin | WebP | BBox alfa>=16 | BBox % del ancho de la imagen | Ancho visible en carrera | Ancho nominal | Observación |','|---|---:|---:|---:|---:|---:|---|');
  for(const car of data.skins){
    const t=car.texture;
    lines.push('| '+car.name+' · '+car.skin+' | '+(t?t.width+'×'+t.height:'—')+
      ' | '+(t?.bbox?t.bbox.width+'×'+t.bbox.height:'—')+' | '+
      (t?.bbox?percent(t.bbox.width,t.width)+'%':'—')+
      ' | '+(car.visible?.width??'—')+' px | '+(car.nominalWidthPx??'—')+
      ' px | '+(car.warning|| (car.missing?'Falta asset':'—'))+' |');
  }
  lines.push('','## Interpretación antes de corregir','','- No tocar el factor 2.5 de Canarias ni el 0.35 de Arafo: afectan a geometría o colisión.',
    '- Evaluar anomalías de Cuper con el contorno alfa, proporción del vehículo y orientación de ambas skins.',
    '- Si la imagen ya está recortada sin padding, una discrepancia puede ser artística o geométrica, no un defecto de transparencias.',
    '- La comparación física exige mediciones verificadas de ancho real de carretera; estas anchuras son en píxeles del mundo.',
    '- No reactivar culling ni volver a reducir WebP iPhone. Las auditorías no demuestran la causa térmica.','');
  return lines.join('\n');
}
export async function createReport(){
  const base=await generateAudit(); // applies effective car overrides first
  const skins=await auditSkins(base.cars);
  const three=kartings(base,skins);
  return {schemaVersion:1,sourceSha:process.env.GITHUB_SHA||null,createdAt:new Date().toISOString(),
    method:'sharp alpha >=16, effective car specs and skinGeometry; official post-install Bezier tracks',
    kartings:three,skins,warnings:skins.filter(s=>s.missing||s.warning).map(s=>s.id+'/'+s.skin+': '+(s.warning||'missing'))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const flag=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
  const folder=path.resolve(flag('--out-dir')||path.join(root,'reports','car-alpha-kartings'));
  const result=await createReport(),body=markdown(result);
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'alpha-kartings.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(folder,'INFORME.md'),body+'\n');
  if(flag('--summary'))fs.appendFileSync(flag('--summary'),body+'\n');
  console.log('ALPHA_KARTINGS_OK: '+result.skins.length+' skins, '+result.kartings.length+' kartings; warnings '+result.warnings.length);
  for(const s of result.skins.filter(x=>['helix_spark','crown_cuper','forge_colossus'].includes(x.id)))
    console.log(s.id+'/'+s.skin+': alpha '+s.texture?.bbox?.width+'x'+s.texture?.bbox?.height+' -> world '+s.visible?.width+' px, nominal '+s.nominalWidthPx+'px');
  for(const t of result.kartings)console.log(t.id+': road '+t.widthMedian+' px, Spark '+t.sparkSharePercent+'%, Cuper '+t.cuperSharePercent+'%');
}
