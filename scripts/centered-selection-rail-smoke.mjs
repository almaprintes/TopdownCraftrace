// Both visible player selectors: exact tap centering and end-of-inertia snapping.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {centeredRailTarget,closestCenteredIndex,attachCenteredSelectionRail} from '../src/game/ui/centeredSelectionRail.js';

assert.equal(centeredRailTarget(0,300,115,70,550),0,'top card can sit dead center');
assert.equal(centeredRailTarget(0,300,760,70,700),700,'last card clamps to bottom');
assert.equal(centeredRailTarget(250,300,140,70,900),275,'scroll offset should be relative');
assert.equal(closestCenteredIndex(150,[40,130,202,270]),1);
assert.equal(closestCenteredIndex(150,[40,100,147,270]),2);

const read=p=>readFileSync(p,'utf8');
const css=read('src/game/ui/selectionPaddock.css');
const car=read('src/game/scenes/GarageSelectionCenterScene.js');
const circuit=read('src/game/scenes/TrackGarageAndroidTouchScene.js');
const selector=read('src/game/scenes/TrackGarageProgressionScene.js');
for(const selectorName of ['.tdr-garage-dom-list','.tdr-ts-list','.tdr-garage-dom-car','.tdr-ts-card'])
  assert.ok(css.includes(selectorName),'Missing CSS for '+selectorName);
assert.match(css,/scroll-snap-type:y mandatory/);
assert.match(css,/scroll-snap-align:center/);
assert.match(css,/-webkit-overflow-scrolling:touch/);
assert.match(car,/attachCenteredSelectionRail/);
assert.match(circuit,/attachCenteredSelectionRail/);
assert.match(selector,/_selectTrackCard/);
assert.doesNotMatch(circuit,/scrollIntoView/,'Track selector must not align tapped card to edge');

class FakeCard {
  constructor(list,index,height){this.list=list;this.index=index;this.offsetHeight=height;}
  getBoundingClientRect(){
    const y=this.list.top+Number.parseFloat(this.list.style.paddingTop||'0')+
      this.list.cards.slice(0,this.index).reduce((n,c)=>n+c.offsetHeight+this.list.gap,0)-
      this.list.scrollTop;
    return {top:y,bottom:y+this.offsetHeight,height:this.offsetHeight};
  }
}
class FakeList extends EventTarget {
  constructor(heights){
    super();this.top=80;this.clientHeight=300;this.gap=6;
    this.scrollTop=0;this.style={};this.cards=heights.map((h,i)=>new FakeCard(this,i,h));
  }
  get scrollHeight(){return Number.parseFloat(this.style.paddingTop||'0')+
    this.cards.reduce((n,c)=>n+c.offsetHeight+this.gap,0)-this.gap+
    Number.parseFloat(this.style.paddingBottom||'0');}
  getBoundingClientRect(){return {top:this.top,bottom:this.top+this.clientHeight,height:this.clientHeight};}
  querySelectorAll(){return this.cards;}
  scrollTo({top}){this.scrollTop=top;this.dispatchEvent(new Event('scroll'));}
}
const list=new FakeList([68,76,70,82,66,80]);
const root={querySelector:()=>list};
let settled=-1;
const rail=attachCenteredSelectionRail(root,{listSelector:'.rail',itemSelector:'.card',onSettle:i=>settled=i});
function nearCenter(i){
  const r=list.cards[i].getBoundingClientRect(),v=list.getBoundingClientRect();
  assert.ok(Math.abs((r.top+r.bottom-v.top-v.bottom)/2)<0.01,`Card ${i} not pixel-centered`);
}
rail.center(0,'instant');nearCenter(0);
rail.center(5,'instant');nearCenter(5);
rail.center(3,'instant');nearCenter(3);
await new Promise(resolve=>setTimeout(resolve,55)); // programmatic settle guard ends
// Native momentum has reached the third card: browser emits final scrollend.
const target=centeredRailTarget(list.scrollTop,list.clientHeight,
  list.cards[2].getBoundingClientRect().top-list.top,list.cards[2].offsetHeight,
  list.scrollHeight-list.clientHeight);
list.scrollTop=target;
list.dispatchEvent(new Event('wheel'));
list.dispatchEvent(new Event('scroll'));
list.dispatchEvent(new Event('scrollend'));
assert.equal(settled,2,'swiping updates the centered selected card');
nearCenter(2);
rail.destroy();
console.log('Garage + track selector: first/middle/last exact center, tap navigation and inertial settle OK');
