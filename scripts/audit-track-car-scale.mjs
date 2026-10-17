// DEV-only, read-only diagnostic. Run AFTER all track source installers in prebuild.
// Never changes published tracks, source bundles, player records, textures or car specs.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { CAR_SPECS, applyCarOverrides } from '../src/game/cars/carSpecs.js';
import { sampleShapeEdge, shapeIsValid } from '../src/game/studio/trackShapeGeometry.js';
import { METERS_PER_PX } from '../src/game/cars/speedUnits.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const round=(x,n=2)=>Number.isFinite(x)?Number(x.toFixed(n)):null;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
const ratio=(a,b)=>finite(a)&&finite(b)&&b>0?round(a/b,4):null;
const median=arr=>quantile(arr,.5);
function quantile(list,q){
  if(!list.length)return null;
  const v=[...list].sort((a,b)=>a-b),at=(v.length-1)*q,i=Math.floor(at),t=at-i;
  return v[i]*(1-t)+v[Math.min(v.length-1,i+1)]*t;
}
const samplesFromSource=raw=>(raw||[]).map(p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p.x),y:Number(p.y)}).filter(p=>finite(p.x)&&finite(p.y));
function crossing(p,n,points){
  // Intersect the road-normal line with an authored Bezier-polyline edge.
  // Reject non-local crossings on hairpins; do not label guesses "exact".
  let best=null;
  for(let j=0;j+1<points.length;j++){
    const a=points[j],b=points[j+1],dx=b.x-a.x,dy=b.y-a.y;
    const den=cross(n.x,n.y,dx,dy);
    if(Math.abs(den)<1e-9)continue;
    const apx=a.x-p.x,apy=a.y-p.y;
    const edgeT=cross(apx,apy,n.x,n.y)/den;
    if(edgeT<-.000001||edgeT>1.000001)continue;
    const off=cross(apx,apy,dx,dy)/den;
    if(!finite(off))continue;
    if(best===null||Math.abs(off)<Math.abs(best))best=off;
  }
  return best;
}
export function measureRoadSections(track,{sampleCount=36,edgeSteps=12}={}){
  const nodes=samplesFromSource(track?.centerline);
  const nominal=Number(track?.trackWidth)||0;
  const closed=track?.closed!==false;
  if(nodes.length<2||!shapeIsValid(track?.trackShape))
    return {method:'bezier-normal-cross-section',total:0,valid:0,rejected:0,
      coverage:0,low:null,median:null,high:null,samples:[],reason:'invalid centerline or shape'};
  const left=sampleShapeEdge(track.trackShape.leftEdge,closed,edgeSteps);
  const right=sampleShapeEdge(track.trackShape.rightEdge,closed,edgeSteps);
  if(closed){left.push(left[0]);right.push(right[0]);}
  const segments=[];
  let total=0;
  const count=nodes.length-(closed&&Math.hypot(nodes[0].x-nodes[nodes.length-1].x,nodes[0].y-nodes[nodes.length-1].y)<.01?1:0);
  for(let i=0;i<(closed?count:count-1);i++){
    const a=nodes[i],b=nodes[(i+1)%count],len=Math.hypot(b.x-a.x,b.y-a.y);
    if(len>.0001){segments.push({a,b,len,at:total});total+=len;}
  }
  if(!segments.length)return {method:'bezier-normal-cross-section',total:0,valid:0,rejected:0,
    coverage:0,low:null,median:null,high:null,samples:[],reason:'degenerate centerline'};
  const widths=[],records=[];
  for(let i=0;i<sampleCount;i++){
    const at=total*(i+.5)/sampleCount;
    let seg=segments[segments.length-1];
    for(const s of segments){if(at<=s.at+s.len){seg=s;break;}}
    const t=Math.max(0,Math.min(1,(at-seg.at)/seg.len));
    const p={x:seg.a.x+(seg.b.x-seg.a.x)*t,y:seg.a.y+(seg.b.y-seg.a.y)*t};
    const n={x:-(seg.b.y-seg.a.y)/seg.len,y:(seg.b.x-seg.a.x)/seg.len};
    const l=crossing(p,n,left),r=crossing(p,n,right);
    let width=l===null||r===null||l*r>=0?null:Math.abs(r-l);
    // A distant different lap branch can intersect the same normal in a hairpin.
    const suspect=width!==null&&(width<Math.max(3,nominal*.18)||width>Math.max(250,nominal*3.5));
    if(suspect)width=null;
    if(width!==null)widths.push(width);
    records.push({fraction:round((i+.5)/sampleCount,4),x:round(p.x,1),y:round(p.y,1),
      widthPx:round(width),widthMeters:width===null?null:round(width*METERS_PER_PX),
      valid:width!==null});
  }
  return {method:'bezier-normal-cross-section',total:sampleCount,valid:widths.length,
    rejected:sampleCount-widths.length,coverage:round(widths.length/sampleCount,3),
    low:round(quantile(widths,.10)),median:round(median(widths)),
    high:round(quantile(widths,.90)),min:round(widths.length?Math.min(...widths):NaN),
    max:round(widths.length?Math.max(...widths):NaN),
    pathLengthPx:round(total),pathLengthMeters:round(total*METERS_PER_PX),
    samples:records,reason:widths.length<sampleCount*.7?'CHECK: cross-sections unreliable near adjacent road branches':null};
}
export function carGeometry(spec,trackCarScale=1,source={width:2,height:1}){
  const visual=Number(spec.visualScale)||1;
  const collision=Number(spec.collisionScale??visual);
  const t=Math.max(.35,Math.min(1.5,Number(trackCarScale)||1));
  const boxW=96*visual*1.35*t,boxH=48*visual*1.35*t;
  const sw=Number(source.width)||0,sh=Number(source.height)||0;
  const fit=sw>0&&sh>0?Math.min(boxW/sw,boxH/sh):null;
  const w=fit===null?null:sw*fit,h=fit===null?null:sh*fit;
  const radius=Math.round(14*collision*t);
  return {visualScale:visual,collisionScale:collision,trackCarScale:t,
    targetBoxWidthPx:round(boxW),targetBoxHeightPx:round(boxH),
    spriteWidthPx:round(w),spriteHeightPx:round(h),
    spriteShortSidePx:w===null?null:round(Math.min(w,h)),
    collisionRadiusPx:radius,collisionDiameterPx:radius*2,
    assumesDefaultSkin:true};
}
function listedTracks(){
  // Read the real selection source, without importing browser globals or changing it.
  const s=fs.readFileSync(path.join(ROOT,'src/game/tracks/trackUnlocks.js'),'utf8');
  const match=s.match(/PUBLISHED_TRACK_IDS\s*=\s*Object\.freeze\(\[([^\]]+)\]\)/);
  if(!match)throw Error('PUBLISHED_TRACK_IDS selection changed; update inventory parser');
  return [...match[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
}
const trackFile=id=>id==='circuito-atlantico'?'track01':id;
async function imageSize(file){
  if(!fs.existsSync(file))return null;
  const m=await sharp(file).metadata();
  return {width:m.width,height:m.height,format:m.format};
}
async function auditTrack(id){
  const file='src/game/tracks/library/'+trackFile(id)+'/track.json';
  if(!fs.existsSync(path.join(ROOT,file)))throw Error('Missing post-install track '+file);
  const track=read(file);
  if(track.meta?.renderMode!=='image-native')throw Error('Not installed image-native '+id+'; run installers FIRST');
  const photo=track.meta.imageNative||{};
  if(photo.availability!=='published'||!Array.isArray(photo.tiles)||!photo.tiles.length)
    throw Error('Missing published photo tiles for '+id);
  const worldScale=Number(photo.worldScale)||1;
  if(Math.abs(Number(track.worldW)-Number(photo.width)*worldScale)>.01||
     Math.abs(Number(track.worldH)-Number(photo.height)*worldScale)>.01)
    throw Error('Photo-world misalignment '+id);
  let originalBytes=0,compactBytes=0,existingOriginal=0,existingCompact=0;
  const tiles=[];
  for(const tile of photo.tiles){
    const p=path.join(ROOT,'public',tile.assetPath);
    const iosP=p.replace(/\.webp$/,'-ios.webp');
    const org=await imageSize(p),ios=await imageSize(iosP);
    if(!org||org.width!==tile.width||org.height!==tile.height)
      throw Error('Missing or wrong original tile '+p);
    const estimate={width:Math.max(1,Math.round(tile.width*.65)),height:Math.max(1,Math.round(tile.height*.65))};
    if(ios&&(ios.width!==estimate.width||ios.height!==estimate.height))
      throw Error('Wrong compact iPhone tile '+iosP);
    originalBytes+=tile.width*tile.height*4;
    compactBytes+=estimate.width*estimate.height*4;
    existingOriginal++;
    if(ios)existingCompact++;
    tiles.push({assetPath:tile.assetPath,original:{width:tile.width,height:tile.height},
      iphoneCompact:ios||null,estimatedRgbaMiB:round(tile.width*tile.height*4/1048576,3)});
  }
  const road=measureRoadSections(track);
  return {id,displayName:track.name,sourceFile:file,
    mode:track.closed===false?'open-stage':'closed-circuit',
    image:{width:photo.width,height:photo.height,worldScale,tiles:tiles.length,
      originalRgbaMiB:round(originalBytes/1048576,2),
      compactIphoneRgbaMiB:round(compactBytes/1048576,2),
      compactScale:.65,originalTilesVerified:existingOriginal,
      compactTilesVerified:existingCompact,blocks:tiles},
    world:{width:track.worldW,height:track.worldH},
    declaredTrackWidthPx:track.trackWidth,carScale:Number(track.carScale??1),
    road,roadWidthForComparisonPx:road.coverage>=.7?road.median:null};
}
async function auditCars(){
  applyCarOverrides(read('community/car-overrides.json'));
  const cars=Object.values(CAR_SPECS).filter(x=>Number(x.collectionNo)>0)
    .sort((a,b)=>a.collectionNo-b.collectionNo);
  const list=[];
  for(const s of cars){
    const file=path.join(ROOT,'public/assets/skins',s.skin||'');
    const source=await imageSize(file);
    // This is the spec's DEFAULT skin. User-equipped variants can differ;
    // skinGeometry.json currently holds optional per-skin transforms.
    const visual=carGeometry(s,1,source||{width:0,height:0});
    list.push({id:s.id,name:s.name,collectionNo:s.collectionNo,
      defaultSkin:s.skin||null,image:source,missingSkin:!source,
      visualScale:visual.visualScale,collisionScale:visual.collisionScale,
      nominal:visual});
  }
  return list;
}
export async function generateAudit(){
  const ids=listedTracks();
  if(ids.length!==6)throw Error('Expected six published tracks; update inventory expectations');
  const tracks=[];
  for(const id of ids)tracks.push(await auditTrack(id));
  const cars=await auditCars();
  const combinations=tracks.map(t=>({
    track:t.id,relativeCars:cars.map(c=>{
      const size=carGeometry(c,t.carScale,c.image||{width:0,height:0});
      return {car:c.id,carName:c.name,...size,
        carShortSideOverMeasuredRoad:ratio(size.spriteShortSidePx,t.roadWidthForComparisonPx),
        collisionDiameterOverMeasuredRoad:ratio(size.collisionDiameterPx,t.roadWidthForComparisonPx),
        carShortSideOverDeclaredRoad:ratio(size.spriteShortSidePx,t.declaredTrackWidthPx)};
    })
  }));
  const warnings=tracks.flatMap(t=>{
    const a=[];
    if(t.road.coverage<.7)a.push(t.id+': insufficient reliable Bezier normal intersections; see samples (DO NOT assume nominal road width is exact)');
    if(t.image.compactTilesVerified!==t.image.tiles)a.push(t.id+': iPhone tiles not all generated (run prebuild)');
    if(t.carScale!==1)a.push(t.id+': per-circuit car scale '+t.carScale+' affects both sprite AND collision');
    if(t.image.worldScale!==1)a.push(t.id+': image-to-world scale '+t.image.worldScale+' affects distances and road/car ratio');
    return a;
  });
  for(const c of cars)if(c.missingSkin)warnings.push(c.id+': missing default skin; sprite bounds unavailable');
  return {schemaVersion:1,generatedAt:new Date().toISOString(),
    sourceSha:process.env.GITHUB_SHA||null,
    source:'post-install track.json + official Bezier trackShape + CAR_SPECS merged with community/car-overrides.json',
    conditions:['Read-only', 'Does not evaluate equipped player skins', 'Bezier cross-sections are estimates and may be ambiguous near hairpins',
      'iPhone RGBA size is an estimate, not measured GPU residency',
      'Dynamic camera zoom affects sprite and road equally and is excluded from relative ratios',
      'TrackStudio/Environment originals and online times not modified'],
    tracks,cars,combinations,warnings};
}
function f(v,d=1){return v===null||v===undefined?'—':Number(v).toFixed(d);}
export function toMarkdown(a){
  const lines=['# Top Down RACE — Inventario de escala post-build',
    '', 'Generado: '+a.generatedAt+' · Git SHA: '+(a.sourceSha||'local')+' · **Solo lectura**',
    '', 'Los anchos medidos son estimaciones por intersecciones normales con los bordes Bézier.',
    'Los tamaños de sprites corresponden a la **skin predeterminada** y su aspect ratio; otras skins del jugador pueden tener otra calibración.',
    'No se aplica zoom dinámico al cociente coche/carretera, porque multiplica ambos por igual.',
    '', '## Circuitos publicados', '',
    '| Circuito | Mundo (px) | Foto (px) | × mundo | × coche | Ancho declarado | Ancho Bézier p10 / mediana / p90 (px) | Muestras fiables | GPU foto original / iPhone (MiB) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for(const t of a.tracks)lines.push('| '+t.id+' | '+t.world.width+'×'+t.world.height+
    ' | '+t.image.width+'×'+t.image.height+' | '+f(t.image.worldScale,2)+' | '+f(t.carScale,2)+
    ' | '+f(t.declaredTrackWidthPx)+' | '+[t.road.low,t.road.median,t.road.high].map(x=>f(x)).join(' / ')+
    ' | '+t.road.valid+'/'+t.road.total+' | '+f(t.image.originalRgbaMiB)+' / '+f(t.image.compactIphoneRgbaMiB)+' |');
  lines.push('','## Coches oficiales (overrides aplicados)', '',
    '| Coche | Visual × | Colisión × | Caja nominal (px) | Sprite predeterminado (px) | Radio de colisión (px) |',
    '|---|---:|---:|---:|---:|---:|');
  for(const c of a.cars)lines.push('| '+c.name+' | '+f(c.visualScale,2)+' | '+f(c.collisionScale,2)+
    ' | '+f(c.nominal.targetBoxWidthPx)+'×'+f(c.nominal.targetBoxHeightPx)+
    ' | '+f(c.nominal.spriteWidthPx)+'×'+f(c.nominal.spriteHeightPx)+
    ' | '+f(c.nominal.collisionRadiusPx,0)+' |');
  lines.push('','## Proporción de anchura visual del coche / anchura real estimada del asfalto', '',
    'Un valor 0,20 significa que el lado corto del sprite ocupa ~20 % del ancho de la carretera.',
    'No interpretar como anchura física del vehículo ni certificación geométrica. — significa muestra insuficiente o skin ausente.',
    '', '| Coche | '+a.tracks.map(t=>t.id).join(' | ')+' |',
    '|---|'+a.tracks.map(()=>'---:').join('|')+'|');
  for(let i=0;i<a.cars.length;i++){
    lines.push('| '+a.cars[i].name+' | '+a.combinations.map(t=>{
      const v=t.relativeCars[i].carShortSideOverMeasuredRoad;
      return v===null?'—':f(v*100,1)+' %';
    }).join(' | ')+' |');
  }
  lines.push('','## Advertencias y verificación', '',
    ...(a.warnings.length?a.warnings.map(w=>'- '+w):['- Sin advertencias automáticas.']),
    '', '**Interpretación:** comprobar valores atípicos visualmente en Track Studio antes de cambiar una cifra.',
    'Las carreteras de rally, karting y ciudad no tienen por qué medir lo mismo; el estándar es la escala coherente, no una anchura uniforme.',
    'NO activar culling/streaming; NO modificar fotos, coches, físicas, récords ni circuitos a partir de este informe.',
    '');
  return lines.join('\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
  const outputDir=arg('--out-dir')||path.join(ROOT,'reports','track-car-scale');
  const summary=arg('--summary');
  const data=await generateAudit();
  const md=toMarkdown(data);
  fs.mkdirSync(outputDir,{recursive:true});
  fs.writeFileSync(path.join(outputDir,'inventory.json'),JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync(path.join(outputDir,'INFORME.md'),md+'\n');
  if(summary)fs.appendFileSync(summary,md+'\n');
  console.info('AUDIT_OK: '+data.tracks.length+' circuits × '+data.cars.length+
    ' cars; output '+outputDir+'; warnings '+data.warnings.length);
  console.info(data.tracks.map(t=>t.id+': road='+t.road.valid+'/'+t.road.total+
    ' median='+t.road.median+'px; scale='+t.carScale+
    '; iPhone RGBA='+t.image.compactIphoneRgbaMiB+' MiB').join('\n'));
}
