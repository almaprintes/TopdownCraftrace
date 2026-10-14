import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const paths=['public/assets/skins/skin_crown_cuper_original.webp','public/assets/skins/skin_crown_cuper_gold.webp'];
const output='src/game/skins/cuperAssetsStatus.json';
const presence=paths.map(p=>existsSync(p));
function inspectWebP(path){
 const bytes=readFileSync(path);
 if(bytes.length<32||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'
    ||bytes.toString('ascii',12,16)!=='VP8X')throw Error('Expected a transparent VP8X WebP: '+path);
 const width=1+bytes.readUIntLE(24,3),height=1+bytes.readUIntLE(27,3);
 const alpha=(bytes[20]&0x10)!==0;
 if(width!==512||height!==768||!alpha)throw Error('Expected 512×768 RGBA WebP: '+path+' actual '+width+'×'+height+' alpha '+alpha);
 return{width,height,bytes:bytes.length};
}
let published=false;
if(presence.every(Boolean)){
 const both=paths.map(inspectWebP);published=true;
 console.log('CROWN Cuper sprites verified:',both);
}else if(presence.some(Boolean)){
 console.warn('CROWN Cuper requires BOTH WebPs. Not enabling incomplete car.');
}else{
 console.log('CROWN Cuper assets pending: retaining stable 17-car player garage.');
}
writeFileSync(output,JSON.stringify({published},null,2)+'\n');
