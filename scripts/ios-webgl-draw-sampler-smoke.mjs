import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
  beginIosWebglDrawCallSample,formatIosWebglDrawCallSample
} from '../src/game/performance/iosWebglDrawCallSample.js';

const createMock=()=>{
  const proto={
    drawElements(){return 'ok-e';},
    drawArrays(){return 'ok-a';}
  };
  const gl=Object.create(proto);
  const events=new EventEmitter();
  const timeouts=[];
  const scheduler={
    set(fn,ms){timeouts.push({fn,ms});return timeouts.length-1;},
    clear(id){timeouts[id]=null;}
  };
  return {gl,events,game:{renderer:{gl},events},scheduler,timeouts};
};

const m=createMock();
const beforeElements=m.gl.drawElements,beforeArrays=m.gl.drawArrays;
const reports=[];
const sample=beginIosWebglDrawCallSample({
  game:m.game,maxFrames:3,scheduler:m.scheduler,onComplete:r=>reports.push(r)
});
assert.equal(sample.ok,true);
assert.notEqual(m.gl.drawElements,beforeElements);
for(let frame=0;frame<3;frame++){
  m.events.emit('prerender');
  for(let i=0;i<=frame;i++)assert.equal(m.gl.drawElements(), 'ok-e');
  m.gl.drawArrays();
  m.events.emit('postrender');
}
assert.equal(reports.length,1);
const r=reports[0];
assert.equal(r.frames,3);
assert.equal(r.drawCalls,9);
assert.equal(r.drawPerFrame,3);
assert.equal(r.maxDrawPerFrame,4);
assert.deepEqual(r.methods,{drawElements:6,drawArrays:3});
assert.equal(r.reason,'FRAMES');
assert.equal(m.gl.drawElements,beforeElements);
assert.equal(m.gl.drawArrays,beforeArrays);
assert.equal(Object.hasOwn(m.gl,'drawElements'),false);
assert.equal(Object.hasOwn(m.gl,'drawArrays'),false);
assert.equal(m.events.listenerCount('prerender'),0);
assert.equal(m.events.listenerCount('postrender'),0);
assert.match(formatIosWebglDrawCallSample(r),/NO MIDE TIEMPO GPU/);
assert.equal(sample.cancel(),null);

const cancel=createMock();
let cancels=0;
const c=beginIosWebglDrawCallSample({game:cancel.game,scheduler:cancel.scheduler,onComplete:r=>{cancels++;assert.equal(r.reason,'CANCELLED');}});
assert.equal(c.ok,true);
assert.equal(c.cancel().frames,0);
assert.equal(cancels,1);
assert.equal(cancel.events.listenerCount('postrender'),0);
assert.equal(Object.hasOwn(cancel.gl,'drawElements'),false);

const timer=createMock();
let timeoutReport;
const t=beginIosWebglDrawCallSample({game:timer.game,scheduler:timer.scheduler,onComplete:r=>{timeoutReport=r;}});
assert.equal(t.ok,true);
timer.timeouts[0].fn();
assert.equal(timeoutReport.reason,'TIMEOUT');
assert.equal(Object.hasOwn(timer.gl,'drawElements'),false);

const readonly=createMock();
Object.preventExtensions(readonly.gl);
const bad=beginIosWebglDrawCallSample({game:readonly.game,scheduler:readonly.scheduler});
assert.equal(bad.ok,false);
assert.equal(readonly.gl.drawElements,readonly.gl.__proto__.drawElements);
assert.equal(readonly.events.listenerCount('postrender'),0);

assert.equal(beginIosWebglDrawCallSample({game:null}).ok,false);
console.log('iOS WebGL 90-frame sampler checks passed: draw counting, original method restore, cancellation, timeout, and non-writable GL context safety.');
