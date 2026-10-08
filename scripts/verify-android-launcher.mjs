import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const approved=await readFile(resolve(root,'assets/branding/tdr-play-store-icon.png'));
const metadata=await sharp(approved).metadata();
assert.equal(metadata.width,512,'Official Google Play icon must be 512 px wide');
assert.equal(metadata.height,512,'Official Google Play icon must be 512 px high');
const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
for(const [density,size] of Object.entries(densities)){
  const expected=await sharp(approved).resize(size,size,{fit:'contain'}).ensureAlpha().raw().toBuffer();
  for(const name of ['ic_launcher.png','ic_launcher_round.png']){
    const actual=await sharp(resolve(root,'android/app/src/main/res/mipmap-'+density,name)).ensureAlpha().raw().toBuffer();
    assert.equal(actual.length,expected.length,`Android launcher size differs: ${density}/${name}`);
    assert.deepEqual(actual,expected,`Android launcher is not the approved Play icon: ${density}/${name}`);
  }
}
console.log('Android launcher matches approved Play icon at all densities (wheel + flags).');
