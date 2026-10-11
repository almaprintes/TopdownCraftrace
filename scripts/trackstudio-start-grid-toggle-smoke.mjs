import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const ui=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const method=(name,next)=>{
  const first=src.indexOf(name+'() {');
  const last=src.indexOf(next,first+name.length);
  assert.ok(first>=0&&last>first,'Missing '+name);
  const text=src.slice(first,last);
  return new Function('return ({'+text+'}).'+name)();
};
const getVisual=method('_getVisualGridSlots','  _redrawEditor()');
const getProjectData=method('_getProjectData','_exportToGameTrack()');
globalThis.Phaser={Math:{Clamp:(n,lo,hi)=>Math.min(Math.max(n,lo),hi),Linear:(a,b,t)=>a+(b-a)*t}};
const finish={a:{x:240,y:460},b:{x:240,y:540},normal:{x:1,y:0}};
const centerline=Array.from({length:20},(_,i)=>({x:i*80,y:500}));
const model={
  _showStartingGrid:true,_isClosed:true,_raceType:'circuit',
  _finishLine:finish,_trackWidth:70,
  _getBezierPoints:()=>centerline,_nodes:[{x:0,y:500}],
  _checkpoints:[],_startLine:null
};
assert.equal(getVisual.call(model).length,20,'Grid enabled should retain existing 20 places');
model._showStartingGrid=false;
assert.deepEqual(getVisual.call(model),[],'Grid disabled must remove all starting places');
model._isClosed=false;model._showStartingGrid=true;
assert.deepEqual(getVisual.call(model),[],'Open stage remains without starting grid');
model._isClosed=true;
assert.equal(getProjectData.call(model).showStartingGrid,true);
model._showStartingGrid=false;
assert.equal(getProjectData.call(model).showStartingGrid,false,'Toggle must be saved in editable project');
assert.ok(src.includes('this._showStartingGrid = data.showStartingGrid !== false;'),'Loading historic projects must default to current behavior');
assert.ok(src.includes("typeof data.showStartingGrid === 'boolean'"),'Raw track imports must preserve explicit setting');
assert.ok(src.includes("this._showStartingGrid !== false && this._isClosed && this._raceType !== 'stage'"),'Exported grid must be omitted when disabled');
assert.ok(src.includes('let grid = null;'),'Export starts with a null optional grid');
for(const expected of [
  "s._showStartingGrid = s._showStartingGrid === false",
  "'PARRILLA: SÍ'",
  "'PARRILLA: NO'",
  's._pushHistory()',
  's._autosaveRecovery()',
  's._redrawEditor()',
  'refreshGridToggle()',
]){
  assert.ok(ui.includes(expected),'Missing toggle behavior: '+expected);
}
assert.ok(!ui.includes('gridOn.setText(')&&!ui.includes('gridOff.setText('),'Do not trigger Phaser Text UV crash');
console.log('TrackStudio starting grid optional: live 20/0 slots, historic default, local save, export gate and static iOS-safe buttons: OK');
