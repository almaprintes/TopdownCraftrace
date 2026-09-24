import assert from 'node:assert/strict';
import { installFreshGestureGuard } from '../src/game/ui/freshGestureGuard.js';

const handlers={};
const root={
  contains:node=>node?.inside===true,
  addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn);}
};
const action=inside=>{const node={inside,closest:()=>inside?node:null};return node;};
const fire=(type,target,detail=1,pointerType='touch')=>{
  const event={target,detail,pointerType,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
  for(const fn of handlers[type]||[])fn(event);
  return event;
};
installFreshGestureGuard(root);
const finish=action(true),double=action(true);
assert.equal(fire('click',double).prevented,true,'rejects a click inherited from the previous screen');
fire('pointerdown',double);
assert.equal(fire('click',double).prevented,false,'accepts a new gesture on the same action');
assert.equal(fire('click',double).prevented,true,'does not reuse an already consumed gesture');
fire('pointerdown',finish);
assert.equal(fire('click',double).prevented,true,'rejects retargeting to a newly mounted action');
assert.equal(fire('click',double,0,'').prevented,false,'keeps keyboard and accessibility clicks');
console.log('Fresh gesture guard verified');
