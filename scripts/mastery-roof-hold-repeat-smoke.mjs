import assert from 'node:assert/strict';
import {bindMasteryHoldRepeat} from '../src/game/ui/masteryHoldRepeat.js';

class FakeClock extends EventTarget {
  constructor(){super();this.now=0;this.nextId=1;this.jobs=new Map();}
  setTimeout(fn,ms){return this.schedule(fn,ms,0);}
  setInterval(fn,ms){return this.schedule(fn,ms,ms);}
  clearTimeout(id){this.jobs.delete(id);}
  clearInterval(id){this.jobs.delete(id);}
  schedule(fn,ms,interval){const id=this.nextId++;this.jobs.set(id,{fn,at:this.now+ms,interval});return id;}
  tick(ms){
    const until=this.now+ms;
    for(;;){
      const next=[...this.jobs].filter(([,job])=>job.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!next)break;
      const [id,job]=next;
      this.now=job.at;
      if(job.interval)this.jobs.set(id,{...job,at:this.now+job.interval});
      else this.jobs.delete(id);
      job.fn();
    }
    this.now=until;
  }
}
class FakeButton extends EventTarget {
  constructor(){super();this.tags=new Set();this.classList={add:v=>this.tags.add(v),remove:v=>this.tags.delete(v)};}
  setPointerCapture(id){this.pointerCapture=id;}
}
const pointer=(type,pointerId=7)=>{
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{pointerId,pointerType:'touch',button:0,isPrimary:true});
  return event;
};
const clock=new FakeClock(),documentTarget=new EventTarget(),button=new FakeButton();
let steps=0;
const hold=bindMasteryHoldRepeat(button,()=>steps++,{windowTarget:clock,documentTarget,delayMs:350,intervalMs:80});
button.dispatchEvent(pointer('pointerdown'));
assert.equal(steps,1,'Tap moves exactly one pixel');
assert.equal(button.tags.has('is-holding'),true);
clock.tick(349);assert.equal(steps,1,'Hold delay does not move early');
clock.tick(1);assert.equal(steps,1);
clock.tick(240);assert.equal(steps,4,'Sustained press moves once every 80ms');
button.dispatchEvent(pointer('pointerup'));
assert.equal(button.tags.has('is-holding'),false);
clock.tick(1000);assert.equal(steps,4,'Releasing finger must stop movement');
button.dispatchEvent(pointer('pointerdown'));
clock.tick(430);
button.dispatchEvent(pointer('pointercancel'));
const afterCancel=steps;clock.tick(1000);assert.equal(steps,afterCancel,'Pointer cancellation stops repeat');
button.dispatchEvent(pointer('pointerdown'));clock.tick(430);
clock.dispatchEvent(new Event('blur'));
const afterBlur=steps;clock.tick(1000);assert.equal(steps,afterBlur,'Window blur stops repeat');
button.dispatchEvent(pointer('pointerdown'));
button.dispatchEvent(pointer('pointerleave'));
const afterLeave=steps;clock.tick(1000);assert.equal(steps,afterLeave,'Dragging away stops repeat');
documentTarget.hidden=true;
button.dispatchEvent(pointer('pointerdown'));
documentTarget.dispatchEvent(new Event('visibilitychange'));
const afterVisibility=steps;clock.tick(1000);assert.equal(steps,afterVisibility,'Hidden page stops repeat');
documentTarget.hidden=false;
const keyboard=new Event('click',{cancelable:true});
Object.defineProperty(keyboard,'detail',{value:0});
button.dispatchEvent(keyboard);assert.equal(steps,afterVisibility+1,'Keyboard click moves once');
const context=new Event('contextmenu',{cancelable:true});
button.dispatchEvent(context);assert.equal(context.defaultPrevented,true,'Safari long-press menu is blocked');
const selection=new Event('selectstart',{cancelable:true});
button.dispatchEvent(selection);assert.equal(selection.defaultPrevented,true,'iPhone selection handles blocked');
hold.dispose();
button.dispatchEvent(pointer('pointerdown'));clock.tick(2000);
assert.equal(steps,afterVisibility+1,'Disposed controls cannot act');
console.log('Mastery iPhone hold controls: 1px tap, timed repeat, release/cancel/blur/hidden cleanup and text selection guard OK');
