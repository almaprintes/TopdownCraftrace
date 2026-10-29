// Navigation-first Track Studio QA: mobile layout, real source modal clicks,
// on-screen shape actions, scene transitions and unsaved-work protection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {trackStudioToolbarLayout,trackStudioShapeToolbarLayout}
  from '../src/game/studio/trackStudioNavigationLayout.js';
import {openTrackStudioSourceMenu,SOURCE_ACTIONS}
  from '../src/game/studio/trackStudioSourceMenu.js';

assert.equal(SOURCE_ACTIONS.length,4);
for(const [width,panel] of [[1536,280],[1024,250],[920,250],[812,250],[740,250],[700,250],[600,250]]){
  const layout=trackStudioToolbarLayout(width,panel);
  assert.equal(layout.x.length,8);
  assert.ok(layout.x.every(x=>x>=130&&x+20<width-panel+2),'Toolbar action outside reachable top area at '+width);
  const compact=width<1040;
  assert.equal(layout.compact,compact);
  if(layout.twoRows)assert.ok(layout.y===19);
  const bar=layout.twoRows?76:width<1040?72:82;
  assert.ok(layout.y+20<=bar);
  if(layout.twoRows)assert.ok(52+20<=bar);
  const left=width<1200?70:76;
  const viewW=width-left-panel-16;
  const shape=trackStudioShapeToolbarLayout(left+8,bar+8,viewW);
  assert.equal(shape.points.length,5);
  assert.ok(shape.points.every(p=>p.x+85<=left+8+viewW),'Shape action spills into the inspector '+width);
  assert.ok(shape.points.every(p=>p.y>=bar+8&&p.y+32<600),'Shape action outside short phone screen '+width);
}
assert.equal(trackStudioShapeToolbarLayout(80,80,476).points[3].y,
  trackStudioShapeToolbarLayout(80,80,476).points[4].y);
assert.ok(trackStudioShapeToolbarLayout(80,80,260).points[4].y >
  trackStudioShapeToolbarLayout(80,80,260).points[3].y);

const scene=fs.readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const shape=fs.readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const src=fs.readFileSync('src/game/studio/trackStudioSourceMenu.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('name="tdr-dev-version" content="DEV 1.3.52"'));
assert.ok(scene.includes('trackStudioToolbarLayout(width,this._rightPanelW)'));
assert.equal(scene.match(/_makeIconButton\(\.\.\.toolPos\(\),/g)?.length,8);
assert.ok(scene.includes("this.events.once('shutdown',()=>{"));
assert.ok(scene.includes('this._destroyGuideInput?.()'));
assert.ok(scene.includes('this._destroyProjectInput?.()'));
assert.ok(shape.includes('trackStudioShapeToolbarLayout(s._viewX,s._viewY,s._viewW)'));
assert.ok(shape.includes("s._autosaveRecovery?.();\n      s._flashMessage('Circuito listo."));
assert.ok(scene.includes("if (!window.confirm('¿Abrir el proyecto guardado?"));
assert.ok(scene.includes("return false;"));
assert.ok(src.includes("document.addEventListener('keydown',onKeyDown)"));
assert.ok(src.includes("document.removeEventListener('keydown',onKeyDown)"));

class El {
  constructor(tag){this.tag=tag;this.children=[];this.events={};this.style={};this.dataset={};this.attrs={};this.parent=null;this.textContent='';}
  append(...items){for(const item of items){this.children.push(item);item.parent=this;}}
  appendChild(item){this.append(item);return item;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
  removeEventListener(type,fn){this.events[type]=(this.events[type]||[]).filter(f=>f!==fn);}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;}}
  click(){for(const fn of this.events.click||[])fn();}
  focus(){this.focused=true;}
  querySelector(tag){for(const child of this.children){if(child.tag===tag)return child;const nested=child.querySelector(tag);if(nested)return nested;}return null;}
}
const listeners={};
const document={
  body:new El('body'),
  createElement:tag=>new El(tag),
  addEventListener:(type,fn)=>((listeners[type]??=[]).push(fn)),
  removeEventListener:(type,fn)=>{listeners[type]=(listeners[type]||[]).filter(f=>f!==fn);}
};
globalThis.document=document;
const log=[];
let returnSaved=false;
const sceneMock={
  events:{once:()=>{},off:()=>{}},
  _loadProject:()=>{log.push('local-open');return returnSaved;},
  _flashMessage:s=>log.push(s),
  _openGameTrackSourceMenu:()=>log.push('game'),
  _openProjectPicker:()=>log.push('file'),
  _restoreLastTrackStudioRecovery:()=>log.push('recovery')
};
const getButton=action=>{
  const modal=document.body.children.find(x=>x.id==='tdr-trackstudio-source-menu');
  assert.ok(modal,'source dialog is not open');
  const descend=(el)=>[el,...el.children.flatMap(descend)];
  return descend(modal).find(e=>e.dataset?.sourceAction===action);
};
openTrackStudioSourceMenu(sceneMock);
assert.ok(getButton('1'));
assert.ok(listeners.keydown?.length===1);
getButton('2').click();
assert.ok(log.includes('local-open'));
assert.ok(!log.some(m=>String(m).includes('cargado')),'False saved-project success toast');
assert.equal(listeners.keydown.length,0);
returnSaved=true;
openTrackStudioSourceMenu(sceneMock);
getButton('2').click();
assert.ok(log.some(m=>String(m).includes('Proyecto local cargado')));
openTrackStudioSourceMenu(sceneMock);getButton('1').click();
openTrackStudioSourceMenu(sceneMock);getButton('3').click();
openTrackStudioSourceMenu(sceneMock);getButton('4').click();
for(const s of ['game','file','recovery'])assert.ok(log.includes(s));
openTrackStudioSourceMenu(sceneMock);
for(const fn of [...listeners.keydown])fn({key:'Escape',preventDefault(){}});
assert.ok(!document.body.children.some(x=>x.id==='tdr-trackstudio-source-menu'));
assert.equal(listeners.keydown.length,0);
console.log('PASS Track Studio NAV: 7 screen widths, 8 toolbar links, 5 shape tools, 4 modal routes, Escape/cleanup, honest load status, preview autosave.');