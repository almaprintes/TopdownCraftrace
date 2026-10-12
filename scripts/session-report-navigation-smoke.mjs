import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installSessionReportNavigation,sessionReportSection} from '../src/game/ui/sessionReportNavigation.js';

function element(tag='div',label=''){
  const node={
    tagName:tag.toUpperCase(),textContent:label,children:[],dataset:{},style:{},
    attributes:{},parentNode:null,hidden:false,scrollTop:77,events:{},
    className:'',_classSet:new Set(),
    classList:{
      add(x){node._classSet.add(x)},
      contains(x){return node._classSet.has(x)},
      toggle(x,enable){if(enable)node._classSet.add(x);else node._classSet.delete(x)}
    },
    setAttribute(k,v){this.attributes[k]=String(v)},
    getAttribute(k){return this.attributes[k]},
    append(...elements){for(const x of elements)this.appendChild(x)},
    appendChild(x){if(x.parentNode)x.parentNode.children=x.parentNode.children.filter(y=>y!==x);this.children.push(x);x.parentNode=this;return x},
    insertBefore(x,y){if(x.parentNode)x.parentNode.children=x.parentNode.children.filter(z=>z!==x);const i=this.children.indexOf(y);this.children.splice(i<0?this.children.length:i,0,x);x.parentNode=this;return x},
    addEventListener(name,fn){this.events[name]=fn},
    click(){this.events.click?.()},
    querySelector(selector){
      const check=n=>selector.startsWith('[data-a=')?n.dataset?.a===selector.match(/"(.+?)"/)?.[1]:
        selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):
        selector.startsWith('[data-report-')?!!n.dataset.reportPage:false;
      const visit=n=>{for(const child of n.children){if(check(child))return child;const found=visit(child);if(found)return found;}return null;};
      return visit(this);
    }
  };
  return node;
}
const doc={createElement:tag=>element(tag)};
const root=element('div');root.ownerDocument=doc;
const modal=element('div');modal.className='modal';
const scroll=element('div');scroll.className='scroll';
const report=element('main');report.className='report';
const actions=element('div');actions.className='actions';
root.appendChild(modal);modal.append(scroll,actions);scroll.appendChild(report);
const exportBtn=element('button');exportBtn.dataset.a='export';
const exitBtn=element('button');exitBtn.dataset.a='exit';
const continueBtn=element('button');continueBtn.dataset.a='continue';
actions.append(continueBtn,exportBtn,exitBtn);
const hero=element('div');hero.className='hero';
const headline=element('div');headline.className='headline';
const stats=element('div');stats.className='grid';
const usage=element('h3','Uso de controles');
const bars=element('div');bars.className='bars';
const braking=element('div');braking.className='grid compact';
const laps=element('h3','Vueltas · Sectores');
const sectors=element('div');sectors.className='f1laps';
const legend=element('div');legend.className='f1legend';
const insight=element('div');insight.className='insight';
const original=[hero,headline,stats,usage,bars,braking,laps,sectors,legend,insight];
report.append(...original);
assert.equal(sessionReportSection(usage,0),1);
assert.equal(sessionReportSection(laps,1),2);
assert.equal(sessionReportSection(hero,0),0);
const nav=installSessionReportNavigation(root);
assert.ok(nav);
assert.equal(root.dataset.reportNavigation,'1');
assert.equal(nav.count,3);
assert.equal(nav.getPage(),0);
const pages=report.children;
assert.equal(pages.length,3);
assert.deepEqual(pages[0].children,[hero,headline,stats],'Summary must retain key session statistics');
assert.deepEqual(pages[1].children,[usage,bars,braking],'Driving must retain all control statistics');
assert.deepEqual(pages[2].children,[laps,sectors,legend,insight],'Laps must retain detailed sector rows and report reading');
const next=actions.querySelector('[data-a="report-next"]');
const back=actions.querySelector('[data-a="report-back"]');
assert.ok(next&&!next.hidden&&next.textContent.includes('CONDUCCIÓN'));
assert.ok(exitBtn.hidden,'Exit must NOT be offered as the default action on first page');
assert.ok(!exportBtn.hidden,'Export remains available from summary');
next.click();
assert.equal(nav.getPage(),1);assert.equal(scroll.scrollTop,0);
assert.ok(exitBtn.hidden);assert.ok(exportBtn.hidden);
assert.ok(!back.hidden);
assert.ok(next.textContent.includes('VUELTAS'));
next.click();
assert.equal(nav.getPage(),2);
assert.ok(next.hidden);assert.ok(!exitBtn.hidden&&!exportBtn.hidden,'Exit is visible once complete report is reached');
assert.ok(!continueBtn.hidden,'Manual reports retain resume option');
assert.ok(actions.classList.contains('tdr-report-three-actions'));
const topNav=modal.children[0];assert.equal(topNav.tagName,'NAV');
assert.equal(topNav.children.length,3);
topNav.children[0].click();
assert.equal(nav.getPage(),0,'Users can jump directly between explicitly labelled sections');
assert.ok(exitBtn.hidden);
assert.equal(installSessionReportNavigation(root),null,'Navigator installation must be idempotent');
const styles=root.children.at(-1).textContent;
assert.ok(styles.includes('.tdr-report-paged .scroll'),'The body scrolls independently of fixed navigation');
assert.ok(styles.includes('overflow:hidden!important;'),'Full modal must not fake a finished report by clipping data');
assert.ok(styles.includes('min-height:40px'),'Landscape mobile buttons remain finger-sized');
const scene=readFileSync('src/game/scenes/RaceSessionReportScene.js','utf8');
assert.ok(scene.includes('installSessionReportNavigation(root);'));
assert.ok(scene.includes('this._exportSessionReport(r)'),'Export action remains intact');
assert.ok(scene.includes("this.scene.start('menu')"),'Exit action stays available on final page');
const pit=readFileSync('src/game/scenes/RaceKartingTenerifePitReportScene.js','utf8');
assert.ok(pit.includes('_openFinalSessionReport()'),'Karting post-race report stays connected');
console.log('Session report: three visible tabs, summary/driving/laps content retained, clear next actions, no premature exit, sticky navigation, manual continue and F1 sector report OK');
