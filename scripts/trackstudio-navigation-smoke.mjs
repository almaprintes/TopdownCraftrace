// Navigation-first Track Studio QA: mobile layout, real source modal clicks,
// on-screen shape actions, scene transitions and unsaved-work protection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {trackStudioToolbarLayout,trackStudioShapeToolbarLayout}
  from '../src/game/studio/trackStudioNavigationLayout.js';
import {openTrackStudioSourceMenu,SOURCE_ACTIONS}
  from '../src/game/studio/trackStudioSourceMenu.js';

assert.equal(SOURCE_ACTIONS.length,5);
// Seven physical form factors, including the screenshot's approximate
// 1024 logical-pixel iPhone landscape and short 600px layouts.
for(const [width,panel,height] of [
  [1536,280,820],[1024,250,490],[920,250,550],
  [812,250,460],[740,250,390],[700,250,390],[600,250,370]
]){
  const top=trackStudioToolbarLayout(width,panel);
  assert.equal(top.x.length,8);
  assert.equal(top.y.length,8);
  assert.ok(top.width>=46 && top.height>=30);
  assert.ok(top.x.every(x=>x-top.width/2>=120 && x+top.width/2<=width-panel),
    'Toolbar overlaps title or inspector at '+width);
  assert.ok(top.y.every(y=>y-top.height/2>=0 && y+top.height/2<=82),
    'Toolbar vertically clipped at '+width);
  // Cards must not overlap, even after captions are added INSIDE them.
  for(let a=0;a<8;a++)for(let b=0;b<a;b++){
    const separated=Math.abs(top.x[a]-top.x[b])>=top.width+3 ||
      Math.abs(top.y[a]-top.y[b])>=top.height+2;
    assert.ok(separated,'Overlapping toolbar cards '+a+' and '+b+' at '+width);
  }
  const left=height<720?(width>=760?110:96):88;
  const bar=height<720?76:82;
  const right=width-panel;
  if(height<720)assert.ok(left-24-20>=52,'Navigation exposed to Dynamic Island '+width);
  const viewW=width-left-panel-16;
  const shape=trackStudioShapeToolbarLayout(left+8,bar+8,viewW);
  assert.equal(shape.points.length,5);
  assert.ok(shape.points.every(p=>p.x+p.width<=right-5),
    'Shape card overlaps inspector at '+width);
  assert.ok(shape.points.every(p=>p.y+p.height<height-14),
    'Shape card clipped at '+width);
}
assert.equal(trackStudioShapeToolbarLayout(80,80,700).rows,1);
assert.equal(trackStudioShapeToolbarLayout(80,80,480).rows,2);
assert.equal(trackStudioShapeToolbarLayout(80,80,300).rows,3);

const scene=fs.readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const shape=fs.readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const src=fs.readFileSync('src/game/studio/trackStudioSourceMenu.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('name="tdr-dev-version" content="DEV 1.3.57"'));
assert.ok(scene.includes('trackStudioToolbarLayout(width,this._rightPanelW)'));
assert.equal(scene.split('_makeTopActionButton(...toolPos(),').length-1,8);
assert.ok(scene.includes("return {bg,txt,cap,x:cx,y:cy}"));
assert.ok(!scene.includes("const caption = (x, label)"));
assert.ok(scene.includes("this._leftBarW = compactH ? (width>=760?110:96) : 88"));
assert.ok(scene.includes("this._emptyHelp = this.add.text("));
assert.ok(shape.includes("const container=s.add.container("));
assert.ok(shape.includes("s._editCam.ignore(container)"));
assert.ok(shape.includes("s._emptyHelp?.setVisible("));
assert.ok(scene.includes("this.events.once('shutdown',()=>{"));
assert.ok(scene.includes('this._destroyGuideInput?.()'));
assert.ok(scene.includes('this._destroyProjectInput?.()'));
assert.ok(shape.includes('trackStudioShapeToolbarLayout(s._viewX,s._viewY,s._viewW)'));
assert.ok(shape.includes('const container=s.add.container('));
assert.ok(shape.includes('s._editCam.ignore(container)'));
assert.ok(shape.includes('s._emptyHelp?.setVisible('));
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
  _restoreLastTrackStudioRecovery:()=>log.push('recovery'),
  _openReferenceTools:()=>log.push('reference')
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
openTrackStudioSourceMenu(sceneMock);getButton('5').click();
for(const s of ['game','file','recovery','reference'])assert.ok(log.includes(s));
openTrackStudioSourceMenu(sceneMock);
for(const fn of [...listeners.keydown])fn({key:'Escape',preventDefault(){}});
assert.ok(!document.body.children.some(x=>x.id==='tdr-trackstudio-source-menu'));
assert.equal(listeners.keydown.length,0);
console.log('PASS Track Studio 2.0 NAV: 7 screen widths, 8 non-overlapping labeled toolbar cards, 5 shaped tool cards, safe island rail, 5 modal routes, Escape/cleanup and autosave.');