import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installSessionReportNavigation,sessionReportSection} from '../src/game/ui/sessionReportNavigation.js';
import {resolveSessionReportTrackName} from '../src/game/ui/sessionReportTrackIdentity.js';

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
        selector.startsWith('[data-report-')?!!n.dataset.reportPage:
        n.tagName===selector.toUpperCase();
      const visit=n=>{for(const child of n.children){if(check(child))return child;const found=visit(child);if(found)return found;}return null;};
      return visit(this);
    }
  };
  return node;
}
// Track metadata may retain another circuit name after a scene transition;
// the active key must win for the visible report and exported filename/title.
const publicNames={
  'karting-tenerife':'KARTING TENERIFE',
  'circuito-atlantico':'CIRCUITO ATLÁNTICO'
};
const publicName=key=>publicNames[key]||key;
assert.equal(resolveSessionReportTrackName({trackKey:'karting-tenerife',track:{meta:{name:'CIRCUITO ATLÁNTICO'}}},publicName),'KARTING TENERIFE',
  'Real Karting Tenerife session must never inherit the Atlantic label');
assert.equal(resolveSessionReportTrackName({trackKey:'circuito-atlantico',track:{meta:{name:'KARTING TENERIFE'}}},publicName),'CIRCUITO ATLÁNTICO',
  'Atlantic reports must likewise follow the active key');
assert.equal(resolveSessionReportTrackName({trackKey:'karting-tenerife-studio',track:{meta:{name:'PRUEBA LOCAL'}}},publicName),'PRUEBA LOCAL',
  'Non-public TrackStudio previews keep their own authored name');
assert.equal(resolveSessionReportTrackName({track:{meta:{name:'CIRCUITO MANUAL'}}},publicName),'CIRCUITO MANUAL',
  'Unnamed manual reports retain a readable fallback');
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
const heroCopy=element('div');
const originalTrack=element('h2','CIRCUITO ATLÁNTICO');
const originalCar=element('p','HÉLIX Spark · 45 s');
const heroBadge=element('div','1 VUELTAS');heroBadge.className='badge';
heroCopy.append(originalTrack,originalCar);hero.append(heroCopy,heroBadge);
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
assert.equal(pages[1].children[0].className,'hero tdr-report-section-hero');
assert.deepEqual(pages[1].children.slice(1),[usage,bars,braking],'Driving must retain all control statistics');
for(const [i,heading] of [[1,'CONDUCCIÓN'],[2,'VUELTAS Y SECTORES']]){
  const sectionHero=pages[i].children[0];
  assert.equal(sectionHero.querySelector('h2')?.textContent,heading,'Section title must identify its content');
  assert.equal(sectionHero.querySelector('p')?.textContent,'HÉLIX Spark · 45 s',
    'Subsections keep only car and duration, not the circuit name');
  assert.ok(!sectionHero.querySelector('p').textContent.includes('CIRCUITO ATLÁNTICO'),
    'Circuit name must appear in summary, not be repeated on every tab');
  assert.equal(sectionHero.querySelector('.badge')?.textContent,'1 VUELTAS',
    'Existing lap count pill is preserved');
}
assert.equal(pages[0].querySelector('h2')?.textContent,'CIRCUITO ATLÁNTICO',
  'Summary keeps the real track name');
assert.equal(pages[2].children[0].className,'hero tdr-report-section-hero');
assert.deepEqual(pages[2].children.slice(1),[continueBtn,laps,sectors,legend,insight],'Laps must retain complete sector report and manual resume');
const next=actions.querySelector('[data-a="report-next"]');
const back=actions.querySelector('[data-a="report-back"]');
assert.ok(next&&!next.hidden&&next.textContent==='SIGUIENTE →');
assert.ok(!back.hidden&&back.disabled,'Previous action stays in the same left slot, disabled only on summary');
assert.ok(exitBtn.hidden,'Exit must NOT be offered as the default action on first page');
assert.ok(!exportBtn.hidden,'Export remains available from summary');
assert.equal(exportBtn.parentNode,modal.children[0],'Export is a persistent header utility, never a footer navigation action');
assert.deepEqual(actions.children,[back,next,exitBtn],'Two-column footer keeps one stable DOM order across tabs');
next.click();
assert.equal(nav.getPage(),1);assert.equal(scroll.scrollTop,0);
assert.ok(exitBtn.hidden);assert.ok(!exportBtn.hidden,'Export is available from driving without replacing Previous');
assert.ok(actions.children.includes(back),'Backward button remains mounted in fixed footer');
assert.ok(!back.hidden&&!back.disabled);
assert.equal(next.textContent,'SIGUIENTE →');
assert.equal(actions.children.indexOf(next)>=0,true,'Next must keep its footer DOM position');
next.click();
assert.equal(nav.getPage(),2);
assert.ok(next.hidden);assert.ok(!exitBtn.hidden&&!exportBtn.hidden,'Exit takes the right navigation slot, Export stays in the header');
assert.ok(!back.hidden&&!back.disabled,'Previous must also be visible on final page');
back.click();assert.equal(nav.getPage(),1,'Previous from laps always navigates to driving');
nav.show(2);
assert.ok(!continueBtn.hidden,'Manual reports retain resume option, outside the footer');
assert.ok(!actions.children.includes(continueBtn),'Footer must remain exactly two columns on all tabs');
assert.ok(pages[2].children.includes(continueBtn),'Manual resume remains visible in laps page');
const topNav=modal.children[0];assert.equal(topNav.tagName,'NAV');
assert.ok(modal.children.some(x=>x.className==='tdr-report-scroll-hint'),'Scroll hint must be above footer');
assert.equal(topNav.children.length,4);
assert.equal(topNav.children[3],exportBtn,'Header utility stays attached on all pages');
for(let i=0;i<3;i++)assert.equal(topNav.children[i].getAttribute('aria-controls'),pages[i].id);
topNav.children[0].click();
assert.equal(nav.getPage(),0,'Users can jump directly between explicitly labelled sections');
assert.ok(exitBtn.hidden);
assert.ok(back.disabled,'Back remains disabled only on first page after returning');
assert.equal(installSessionReportNavigation(root),null,'Navigator installation must be idempotent');
const styles=root.children.at(-1).textContent;
assert.ok(styles.includes('.tdr-report-paged .scroll'),'The body scrolls independently of fixed navigation');
assert.ok(styles.includes('overflow:hidden!important;'),'Full modal must not fake a finished report by clipping data');
assert.ok(styles.includes('min-height:40px'),'Landscape mobile buttons remain finger-sized');
assert.ok(styles.includes('height:calc(100dvh - 24px'),'Fixed modal height must be identical across tabs');
assert.ok(styles.includes('grid-column:2!important;grid-row:1!important'),
  'Next and Exit must stay on the right in every tab');
assert.ok(styles.includes('grid-column:1!important;grid-row:1!important'),
  'Previous must occupy the left footer slot on every tab');
assert.ok(styles.includes('grid-template-columns:repeat(3,minmax(0,1fr)) minmax(96px,auto)'),
  'Three tabs and Export share one stable header grid');
assert.ok(styles.includes('.tdr-report-export'),'Export has stable independent header styling');
assert.ok(styles.includes('.actions [data-a="report-back"]:disabled'),
  'Disabled Previous never disappears or reflows the footer');
assert.ok(styles.includes('tdr-report-section-hero'),'Every tab must retain the same title layout');
assert.ok(styles.includes('tdr-report-scroll-hint'),'Overflow must have a visible scroll affordance');
const hint=modal.children.find(x=>x.className==='tdr-report-scroll-hint');
scroll.scrollHeight=500;scroll.clientHeight=120;
nav.show(1);assert.ok(!hint.hidden,'Hint appears when current page needs scroll');
scroll.scrollTop=380;scroll.events.scroll();assert.ok(hint.hidden,'Hint disappears at the bottom');
nav.show(2);assert.equal(scroll.scrollTop,0);assert.ok(!hint.hidden,'Hint updates on page change');
nav.show(0);scroll.scrollHeight=120;scroll.clientHeight=120;scroll.events.scroll();
assert.ok(hint.hidden,'No hint when the page fits');
const scene=readFileSync('src/game/scenes/RaceSessionReportScene.js','utf8');
assert.ok(scene.includes('installSessionReportNavigation(root);'));
assert.ok(scene.includes('resolveSessionReportTrackName(this,getTrackPublicName)'),
  'Both in-app report and HTML export must use the same active-track identity');
assert.ok(scene.includes('this._exportSessionReport(r)'),'Export action remains intact');
assert.ok(scene.includes("this.scene.start('menu')"),'Exit action stays available on final page');
const pit=readFileSync('src/game/scenes/RaceKartingTenerifePitReportScene.js','utf8');
assert.ok(pit.includes('_openFinalSessionReport()'),'Karting post-race report stays connected');
console.log('Session report: three visible tabs, summary/driving/laps content retained, clear next actions, no premature exit, sticky navigation, manual continue and F1 sector report OK');
