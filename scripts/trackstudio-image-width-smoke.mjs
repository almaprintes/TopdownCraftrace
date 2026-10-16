import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {trackStudioWidthMaximum,trackStudioWidthStep,nextTrackStudioWidthStep,TRACK_STUDIO_WIDTH_STEPS,CLASSIC_TRACK_WIDTH_MAX,NATIVE_IMAGE_TRACK_WIDTH_MAX} from '../src/game/studio/trackStudioWidthRange.js';
const oldPhoto={width:1672,height:941};
const newPhoto={width:6688,height:3764};
assert.equal(CLASSIC_TRACK_WIDTH_MAX,260);
assert.equal(trackStudioWidthMaximum(null),260);
assert.equal(trackStudioWidthStep(null,260),5);
assert.equal(trackStudioWidthMaximum(oldPhoto),470);
assert.equal(trackStudioWidthStep(oldPhoto,470),5);
assert.equal(trackStudioWidthMaximum(newPhoto),1600);
assert.equal(trackStudioWidthStep(newPhoto,1600),5);
assert.equal(trackStudioWidthMaximum(newPhoto,1100),1600);
assert.deepEqual(TRACK_STUDIO_WIDTH_STEPS,[1,5,10,25,50,100]);
for(const image of [null,oldPhoto,newPhoto]){
  for(const step of TRACK_STUDIO_WIDTH_STEPS) {
    assert.equal(trackStudioWidthStep(image,1600,step),step,'Precision must never depend on the photo resolution');
  }
}
assert.equal(trackStudioWidthStep(newPhoto,1600,500),5,'Invalid precision returns to a safe 5px');
assert.equal(nextTrackStudioWidthStep(5),10);
assert.equal(nextTrackStudioWidthStep(100),1);
assert.equal(nextTrackStudioWidthStep(1),5);
// Regression: from a 40px roadway, fine controls must not jump to 90px.
assert.equal(40+trackStudioWidthStep(newPhoto,1600),45);
assert.equal(40-trackStudioWidthStep(newPhoto,1600),35);
assert.equal(trackStudioWidthMaximum({width:1800,height:3200}),900,'Vertical rally uses its shorter side');
assert.equal(trackStudioWidthMaximum({width:0,height:0}),260);
assert.equal(trackStudioWidthMaximum(newPhoto,1800),1800,'Never silently shrink a stored authored width');
assert.equal(NATIVE_IMAGE_TRACK_WIDTH_MAX,1600);
const studio=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const mode=readFileSync('src/game/studio/installImageMode.js','utf8');
const geometry=readFileSync('src/game/studio/trackShapeGeometry.js','utf8');
assert.ok(studio.includes('this._trackWidthMax = 260;'));
assert.ok(studio.includes('trackStudioWidthStep(this._imageCanvas, this._trackWidthMax, this._widthStep)'));
assert.ok(studio.includes('this._pushHistory();\n    this._trackWidth=next;'));
assert.ok(!studio.includes('this._changeTrackWidth(10);'));
assert.ok(!studio.includes('this._changeTrackWidth(-10);'));
assert.ok(mode.includes('s._trackWidthMax=trackStudioWidthMaximum(s._imageCanvas,s._trackWidth)'),'Photo mount sets width limit');
assert.ok(mode.includes('s._trackWidthMax=trackStudioWidthMaximum(data?.imageCanvas,s._trackWidth)'),'Saved photo restores appropriate width');
assert.ok(mode.includes('s._trackWidthMax=CLASSIC_TRACK_WIDTH_MAX'),'Classic mode resets limit');
assert.ok(geometry.includes('const half=width*.5')||geometry.includes('const sign=side===0?-1:1'),'Bézier shape uses authored pixel width');
console.log('TrackStudio photo road widths: 5px default steps independent of resolution, selectable 1/5/10/25/50/100px, same max and authored geometry: OK');
