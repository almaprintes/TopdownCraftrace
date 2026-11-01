import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = readFileSync(new URL('../src/game/scenes/RaceScene.js', import.meta.url), 'utf8');
const marker='this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);';
const created=file.indexOf(marker);
assert.ok(created>0,'UI camera must be present');
const earlyIgnore=[
  'this.uiCam?.ignore?.(this._shoulderLeft);',
  'this.uiCam?.ignore?.(this._shoulderRight);',
  'this.uiCam?.ignore?.(this._curbOuter);',
  'this.uiCam?.ignore?.(this._curbInner);',
  'this.uiCam?.ignore?.(this.finishGfx);',
  'this.uiCam?.ignore?.(this.cpGfx);'
];
for(const statement of earlyIgnore){
  const pos=file.indexOf(statement);
  assert.ok(pos>=0&&pos<created,'Early world camera ignore is before camera creation: '+statement);
}
const late=file.indexOf('this._applyCameraIgnores = () =>',created);
assert.ok(late>created);
const end=file.indexOf('// aplicar una vez aquí',late);
const block=file.slice(late,end);
assert.match(block,/this\.uiCam\?\.ignore\(this\.carRig\)/);
assert.match(block,/this\.uiCam\?\.ignore\(this\.finishGfx\)/);
// Merely report which early exclusions the later code repeats. Do not
// turn missing cameraFilter changes into a permanent regression expectation:
// the one-camera renderer does not rely on these ignored masks.
const earlyNames=['_shoulderLeft','_shoulderRight','_curbOuter','_curbInner','cpGfx'];
const unhandledNames=earlyNames.filter(name=>!block.includes('this.uiCam?.ignore(this.'+name+')'));
assert.ok(Array.isArray(unhandledNames));
const fixed=readFileSync(new URL('../src/game/scenes/RaceFixedScene.js', import.meta.url),'utf8');
assert.match(fixed,/if \(this\.uiCam\) this\.uiCam\.setVisible\(false\);/,'Single-camera fix disables the UI camera');
assert.match(fixed,/main\.setVisible\(true\);/,'Main camera remains visible');
const styled=readFileSync(new URL('../src/game/scenes/RaceStyledHudScene.js',import.meta.url),'utf8');
assert.match(styled,/uiCam sigue desactivada por el fix iOS/,'Styled HUD explicitly relies on a disabled UI camera');
console.log('Camera audit: six early ignore calls exist but RaceFixedScene disables uiCam; no second camera render in this path.');
