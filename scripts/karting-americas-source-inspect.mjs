import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const filename='src/game/tracks/library/karting-americas/source/trackstudio-image-1792095082437.tdrtrack';
const file=readFileSync(filename);
const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n','utf8');
assert.ok(file.subarray(0,magic.length).equals(magic),'No es un paquete TDR-IMAGE-PROJECT-V1');
const end=file.indexOf(10,magic.length);
assert.ok(end>magic.length&&end<100,'Longitud JSON de cabecera ausente');
const lengthText=file.subarray(magic.length,end).toString('ascii');
assert.match(lengthText,/^\\d+$/,'Longitud JSON de cabecera inválida');
const jsonSize=Number(lengthText);
assert.ok(jsonSize>0&&jsonSize<20_000_000&&end+1+jsonSize<file.length,'JSON interno fuera del paquete');
const project=JSON.parse(file.subarray(end+1,end+1+jsonSize).toString('utf8'));
const image=file.subarray(end+1+jsonSize);
const pngHeader=Buffer.from([137,80,78,71,13,10,26,10]);
const png=image.subarray(0,8).equals(pngHeader);
const jpeg=image.length>3&&image[0]===255&&image[1]===216&&image[2]===255;
const webp=image.subarray(0,4).toString('ascii')==='RIFF'&&image.subarray(8,12).toString('ascii')==='WEBP';
assert.ok(png||jpeg||webp,'Imagen incrustada sin formato válido');
const width=png?image.readUInt32BE(16):null;
const height=png?image.readUInt32BE(20):null;
const canvas=project.editor?.imageCanvas??{};
const authored=project.gameTrack??{};
const shape=authored.trackShape??project.editor?.trackShape??{};
const count=(a)=>Array.isArray(a)?a.length:0;
const report={
  file:filename,
  fileBytes:file.length,
  sha256:createHash('sha256').update(file).digest('hex'),
  jsonBytes:jsonSize,
  photoBytes:image.length,
  photoType:png?'image/png':jpeg?'image/jpeg':'image/webp',
  embeddedPngWidth:width,embeddedPngHeight:height,
  imageAsset:project.imageAsset??null,
  editorCanvas:{width:canvas.width??null,height:canvas.height??null,imageId:canvas.imageId??null},
  track:{id:authored.id??null,name:authored.name??null,worldW:authored.worldW??null,worldH:authored.worldH??null,closed:authored.closed??null,trackWidth:authored.trackWidth??null,centerlinePoints:count(authored.centerline),leftEdgeNodes:count(shape.leftEdge),rightEdgeNodes:count(shape.rightEdge),checkpoints:count(authored.checkpoints),finishLine:!!authored.finishLine,start:!!authored.start},
  isX25:width===2862&&height===3435&&Number(canvas.width)===2862&&Number(canvas.height)===3435&&Number(authored.worldW)===2862&&Number(authored.worldH)===3435,
  sourceComplete:count(authored.centerline)>=3&&count(shape.leftEdge)>=3&&count(shape.rightEdge)>=3&&!!authored.finishLine&&!!authored.start
};
if(project.imageAsset?.size!=null)assert.equal(image.length,Number(project.imageAsset.size),'Imagen incompleta');
console.log('KARTING_AMERICAS_SOURCE_INSPECTION='+JSON.stringify(report));
console.log(report.isX25&&report.sourceComplete?'KARTING AMÉRICAS: paquete x2.5 completo':'KARTING AMÉRICAS: revisar dimensiones o geometría antes de instalar');
