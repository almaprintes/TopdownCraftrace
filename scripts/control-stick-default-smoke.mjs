// Factory stick must be comfortably inboard both during races and in
// Controls > Personalizar. Existing player custom layouts are preserved.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  defaultControlLayout,readControlLayout,saveControlLayout,
  resetControlLayout,controlLayoutKey,handbrakeControlGeometry,applyDomControlLayout
} from '../src/game/controls/controlLayout.js';

const memory=new Map();
globalThis.localStorage={
  getItem:key=>memory.get(key)??null,
  setItem:(key,value)=>memory.set(key,String(value))
};
globalThis.innerWidth=844;
globalThis.innerHeight=390;
const normal={steeringMode:'stick',leftHanded:false};
const left={steeringMode:'stick',leftHanded:true};
assert.equal(controlLayoutKey(normal),'stick:right');
assert.equal(controlLayoutKey(left),'stick:left');
assert.equal(defaultControlLayout(normal).steer.x,.17,
  'The default stick must sit comfortably inward from the left bezel');
assert.equal(defaultControlLayout(left).steer.x,.83,
  'Left-handed default is mirrored at the same bezel clearance');
assert.equal(defaultControlLayout(normal).steer.y,.77,
  'Do not change vertical placement');
assert.equal(defaultControlLayout(normal).steer.scale,1,
  'Do not change physical/visual joystick size');
assert.equal(readControlLayout(normal).layout.steer.x,.17,
  'Gameplay must use the new factory default');
assert.equal(readControlLayout(left).layout.steer.x,.83,
  'Left-handed gameplay must mirror the default');
const customized={...defaultControlLayout(normal),steer:{x:.29,y:.73,scale:1.1}};
saveControlLayout(customized,normal);
assert.deepEqual(readControlLayout(normal).layout.steer,customized.steer,
  'Never silently override an existing player calibration');
assert.equal(readControlLayout(left).layout.steer.x,.83,
  'Changing right-hand controls must not overwrite left-handed defaults');
const restored=resetControlLayout(normal);
assert.equal(restored.steer.x,.17,'Reset should restore the new factory position');
assert.equal(readControlLayout(normal).layout.steer.x,.17,
  'The reset position must also propagate to gameplay');
const cal=readFileSync('src/game/scenes/SettingsDomScene.js','utf8');
assert.match(cal,/structuredClone\(current\|\|defaultControlLayout\(c\)\)/,
  'Controls customization must use the very same defaults as live racing');
assert.match(cal,/this\._calLayout=structuredClone\(defaultControlLayout\(c\)\)/,
  'Reset in customization must show the actual race factory position');
const actual=readFileSync('src/game/scenes/RaceControlSchemeScene.js','utf8');
assert.match(actual,/sanitizeLayoutPoint\(readControlLayout\(\)\.layout\.steer\s*\|\|\s*\{\}\)/,
  'The live analog stick must derive its position from shared persisted settings');
console.log('Stick factory position 17% from steering edge, mirrored left, calibration and saved layout preserved.');

for(const [w,h] of [[844,390],[956,440],[640,300],[390,844],[1280,720]]){
  for(const scale of [.65,1,1.55,99]){
    const g=handbrakeControlGeometry({x:.96,y:.94,scale},{w,h});
    assert.ok(g.width<=102*1.55 && g.height<=h*.46+1e-8);
    assert.ok(g.x+g.width/2<=w-4+1e-8 && g.y+g.height/2<=h-4+1e-8);
    assert.ok(Math.abs(g.width/g.height-859/1024)<1e-8);
  }
}
const applied=new Map();
const handbrake={dataset:{tdrLayoutBaseWidth:'700'},style:{setProperty:(k,v,p)=>applied.set(k,[v,p])},
  getBoundingClientRect:()=>{throw Error('Never measure transient handbrake bounds');}};
globalThis.document={getElementById:id=>id==='tdr-handbrake'?handbrake:null};
applyDomControlLayout();
assert.deepEqual(applied.get('width'),['78px','important']);
assert.ok(parseFloat(applied.get('height')[0])<94);
assert.equal(applied.get('background-size')[0],'100% 100%');
assert.equal(handbrake.dataset.tdrLayoutBaseWidth,undefined);
console.log('Handbrake: bounded explicit geometry, stale measurements ignored, works independently of pedal root.');
