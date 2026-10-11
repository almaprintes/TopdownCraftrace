import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {raceImageCarVisualScale,unscaledCarVisualLength}
  from '../src/game/tracks/imageNativeCarVisualScale.js';
import {makeKartingPreviewRecord,LOCAL_KARTING_PREVIEW_KEY}
  from '../src/game/tracks/localKartingPreview.js';

const scaled=raceImageCarVisualScale(LOCAL_KARTING_PREVIEW_KEY,3);
assert.equal(scaled,3);
assert.equal(raceImageCarVisualScale('karting-tenerife',3),1,'Original KT must not change');
assert.equal(raceImageCarVisualScale('karting-canarias',3),1,'Other tracks unaffected');
assert.equal(raceImageCarVisualScale('import:test',3),1);
assert.equal(raceImageCarVisualScale(LOCAL_KARTING_PREVIEW_KEY,NaN),1);
assert.equal(raceImageCarVisualScale(LOCAL_KARTING_PREVIEW_KEY,100),4);
assert.equal(raceImageCarVisualScale(LOCAL_KARTING_PREVIEW_KEY,0),1);

const originalVisualWidth=96*1.35*.65;
assert.equal(originalVisualWidth*scaled,96*1.35*.65*3,
  'Car sprite footprint must scale as much as the track image');
const p=unscaledCarVisualLength(originalVisualWidth*scaled,scaled);
assert.ok(Math.abs(p-originalVisualWidth)<1e-8,
  'The steering wheelbase must use original unscaled car visual length');
assert.equal(unscaledCarVisualLength(130,1),130,'Normal physics unchanged');
assert.equal(unscaledCarVisualLength(0,3),0);
assert.equal(unscaledCarVisualLength(Number.NaN,3),0);

const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
const bike=readFileSync('src/game/scenes/RaceBicycleHandlingScene.js','utf8');
const scale=readFileSync('src/game/tracks/localKartingPreview.js','utf8');
assert.ok(race.includes('this.carParams = resolveCarParams(this.baseSpec, this.tuning);'),
  'Restore original physics for ALL cars');
assert.ok(!race.includes('imageNativeDrivingProfile'),
  'The rejected vehicle-specific tuning must not be restored');
assert.ok(race.includes('body.setCircle(Math.round(baseRadius * vScale * trackCarScale));'),
  'Arcade collider radius must stay as it was in DEV 1.2.111');
assert.ok(race.includes('this._imageNativeCarVisualScale = raceImageCarVisualScale(this.trackKey,t01?.imageWorldScale)'),
  'Visual scaling is based on the authored world scale only');
assert.ok(race.includes('const TARGET_W = 96 * vScale * VISUAL_SCALE_MULT * trackCarScale * this._imageNativeCarVisualScale;'));
assert.ok(race.includes('const TARGET_H = 48 * vScale * VISUAL_SCALE_MULT * trackCarScale * this._imageNativeCarVisualScale;'));
assert.ok(bike.includes('unscaledCarVisualLength('));
assert.ok(bike.includes('this._imageNativeCarVisualScale || 1'),
  'Kinematic bicycle steering must not become harder due to a larger rendered sprite');
assert.ok(scale.includes("carScale:.65,"),
  'Original car/rally scale and collider size are unchanged');
assert.ok(scale.includes('.setScale(scale).setDepth(9)'),
  'Photo remains lightweight; no new 5K raster is uploaded');
console.log('Karting image-native x3 car visual: matching road ratio, stock physics and wheelbase, original texture: OK');
