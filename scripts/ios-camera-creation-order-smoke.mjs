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
for(const name of ['_shoulderLeft','_shoulderRight','_curbOuter','_curbInner','cpGfx'])
  assert.ok(!block.includes('this.uiCam?.ignore(this.'+name+')'),'No late exclusion for '+name+'; capture via diagnostic, do not change UI blindly');
console.log('iOS camera creation-order audit confirmed: six early ignore calls predate uiCam; only some late recovery exists.');
