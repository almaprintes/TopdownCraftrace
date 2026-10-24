import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindVisibleStickPointer} from '../src/game/controls/domStickPointer.js';

const handlers={};
const css={};
const style={
 setProperty:(k,v)=>{css[k]=v;},
 removeProperty:(k)=>{delete css[k];}
};
const rect={left:200,top:400,right:420,bottom:620,width:220,height:220};
const el={
 style,
 getBoundingClientRect:()=>rect,
 addEventListener:(n,fn)=>{handlers[n]=fn;},
 removeEventListener:(n)=>{delete handlers[n];},
 setPointerCapture:()=>{},
 hasPointerCapture:()=>true,
 releasePointerCapture:()=>{}
};
const state={steer:0,stickX:0,stickY:0,leftActive:false};
const unbind=bindVisibleStickPointer(el,state);
const e=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){},stopPropagation(){}});
assert.equal(css['pointer-events'],'auto');
handlers.pointerdown(e(1,310,510)); // Inside DOM-visible circle.
handlers.pointermove(e(1,348,510));
assert.ok(state.steer>.4,'The visible knob must respond horizontally');
assert.equal(state.leftActive,true);
handlers.pointermove(e(2,240,470));
assert.ok(state.steer>.4,'Another finger cannot steal direction');
handlers.pointermove(e(1,310,460));
assert.ok(Math.abs(state.steer)<.01,'Returning to finger-origin must center');
assert.ok(state.stickY<-.4,'Vertical motion must update stick Y');
handlers.pointercancel(e(1,310,460));
assert.deepEqual({steer:state.steer,x:state.stickX,y:state.stickY,active:state.leftActive},{steer:0,x:0,y:0,active:false});
handlers.pointerdown(e(3,310,510));
handlers.pointermove(e(3,355,510));
assert.ok(state.steer>.5);
handlers.lostpointercapture(e(3,355,510));
assert.equal(state.steer,0);
unbind();
assert.equal(Object.keys(handlers).length,0);
assert.equal(css['pointer-events'],undefined);

const hb=readFileSync('src/game/scenes/RaceHandbrakeScene.js','utf8');
const main=readFileSync('src/main.js','utf8');
const rc=readFileSync('src/game/scenes/RaceRcTwinAxisScene.js','utf8');
assert.match(hb,/bindVisibleStickPointer\(visible,this\.touch\)/);
assert.match(hb,/this\._tdrSteeringMode==='stick'&&!this\._tdrRcMode/);
assert.match(main,/width: clamp\(190px, 21vw, 236px\)/);
assert.match(main,/const rcMode=race\?\._tdrRcMode===true/);
assert.match(main,/rcMode\?'none':'block'/);
assert.match(rc,/width:clamp\(215px,27vw,290px\)/);
assert.match(rc,/width:clamp\(118px,14vw,150px\)/);
assert.match(rc,/getBoundingClientRect\(\)/);
assert.match(rc,/el\.style\.transform=/);
assert.doesNotMatch(rc,/setInterval\(|requestAnimationFrame\(/);
console.log('PASS: Actual visible joystick has active hitbox/pointer tracking, RC receives its own larger zones, old pedals hidden');
