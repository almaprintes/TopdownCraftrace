// Admin WebP must remain lazy, independent of races, safe for mobile and offline.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {targetWebpDimensions,makeWebpFilename,humanBytes,MAX_BATCH_COUNT,QUALITY_DEFAULT}
  from '../src/game/ui/adminImageWebpTool.js';

assert.equal(MAX_BATCH_COUNT,8);
assert.equal(QUALITY_DEFAULT,86);
assert.deepEqual(targetWebpDimensions(1448,1086,2.5),{width:3620,height:2715,pixels:9828300});
assert.deepEqual(targetWebpDimensions(1448,1086,1,{mobile:true}),{width:1448,height:1086,pixels:1572528});
assert.throws(()=>targetWebpDimensions(4096,6144,2.5),/8192/);
assert.throws(()=>targetWebpDimensions(4096,6144,1,{mobile:true}),/16 MP/);
assert.deepEqual(targetWebpDimensions(4096,6144,1),{width:4096,height:6144,pixels:25165824});
assert.equal(makeWebpFilename('7 PICOS.png',2.5),'7 PICOS-x2_5.webp');
assert.equal(makeWebpFilename('foto.jpg',1),'foto.webp');
assert.equal(humanBytes(1048576),'1.00 MB');
const tool=fs.readFileSync('src/game/ui/adminImageWebpTool.js','utf8');
assert.match(tool,/canvas\.toBlob\(/);
assert.match(tool,/'image\/webp',quality\/100/);
assert.match(tool,/blob\.type!=='image\/webp'/);
assert.match(tool,/URL\.revokeObjectURL\(url\)/);
assert.match(tool,/canvas\.width=0;canvas\.height=0/);
assert.match(tool,/navigator\.canShare/);
assert.match(tool,/const selected=Array\.from\(pick\.files/);
assert.doesNotMatch(tool,/fetch\(|XMLHttpRequest|WebSocket/);
const admin=fs.readFileSync('src/game/scenes/AdminHubScene.js','utf8');
assert.match(admin,/webpTool\.textContent='IMÁGENES → WEBP'/);
assert.match(admin,/import\('\.\.\/ui\/adminImageWebpTool\.js'\)/);
assert.match(admin,/this\._webpToolDispose\?\.\(\)/);
const game=fs.readFileSync('src/game/game.js','utf8');
assert.ok(!game.includes('adminImageWebpTool'),'Converter cannot be eager-loaded in race bundle');
console.log('Admin WebP OK: ×2.5 size, 86/100 quality, 16MP mobile guard, canvas encoder, alpha, local batches, lazy DEV-only overlay.');
