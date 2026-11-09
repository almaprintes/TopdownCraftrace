// Regression: publisher ZIP contains a 20-image ZIP plus a Python script.
// Safari lacks DecompressionStream('deflate-raw') on some versions; tiny-inflate
// must be able to handle the exact same DEFLATE archive offline.
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {readStudioAvatarZip,studioAvatarImageType} from '../src/game/ui/studioAvatarZip.mjs';
const crc32=data=>{
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let n=0;n<8;n++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
 return (crc^0xffffffff)>>>0;
};
const zip=entries=>{
 let offset=0;const local=[],central=[];
 for(const {name,data,method=8} of entries){
   const title=Buffer.from(name,'utf8'),plain=Buffer.from(data);
   const compressed=method===8?deflateRawSync(plain):plain,crc=crc32(plain);
   const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);
   h.writeUInt16LE(method,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);
   h.writeUInt32LE(plain.length,22);h.writeUInt16LE(title.length,26);
   local.push(h,title,compressed);
   const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);
   c.writeUInt16LE(20,6);c.writeUInt16LE(method,10);
   c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);
   c.writeUInt32LE(plain.length,24);c.writeUInt16LE(title.length,28);
   c.writeUInt32LE(offset,42);
   central.push(c,title);
   offset+=h.length+title.length+compressed.length;
 }
 const cd=Buffer.concat(central),e=Buffer.alloc(22);
 e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(entries.length,8);
 e.writeUInt16LE(entries.length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(offset,16);
 return Buffer.concat([...local,cd,e]);
};
const webp=()=>{
 const b=Buffer.alloc(20);b.write('RIFF',0);b.writeUInt32LE(12,4);b.write('WEBP',8);b.write('VP8 ',12);return b;
};
const pic=webp();
const inner=zip(Array.from({length:20},(_,i)=>({
 name:'avatar_'+String(i+1).padStart(2,'0')+'.webp',data:pic,
 method:8
})));
const outer=zip([
 {name:'craftstudio_20_avatar_catalog_final.zip',data:inner,method:8},
 {name:'publish_craftstudio_avatars.py',data:Buffer.from('print("ok")'),method:8}
]);
const old=globalThis.DecompressionStream;
try{
 globalThis.DecompressionStream=undefined; // reproduce the Safari missing API
 const unpacked=await readStudioAvatarZip(new Blob([outer]));
 assert.equal(unpacked.length,20,'nested publisher must contain all twenty WebPs');
 assert.equal(unpacked[0].name,'avatar_01.webp');
 assert.equal(unpacked[19].name,'avatar_20.webp');
 assert.ok(unpacked.every(x=>x.mime==='image/webp'&&Buffer.compare(Buffer.from(x.bytes),pic)===0));
 const direct=await readStudioAvatarZip(new Blob([inner]));
 assert.equal(direct.length,20,'direct catalog ZIP also works');
 await assert.rejects(readStudioAvatarZip(new Blob([zip([{name:'script.py',data:Buffer.from('x')}])])),/No se han encontrado imágenes/);
 assert.equal(studioAvatarImageType('pilot.WEBP'),'image/webp');
 assert.equal(studioAvatarImageType('photo.PNG'),'image/png');
 assert.equal(studioAvatarImageType('pic.JPG'),'image/jpeg');
 assert.equal(studioAvatarImageType('script.py'),null);
}finally{globalThis.DecompressionStream=old;}
console.log('STUDIO ZIP: nested 20 WebP + Python ignored, direct ZIP, Safari inflater, empty archive diagnostics OK');
