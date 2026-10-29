import assert from 'node:assert/strict';
import fs from 'node:fs';

// Self-contained DOM interaction smoke; does not need a browser or Phaser.
// The source is loaded without its Vite CSS/import.meta envelope for this test.
const viewSource=fs.readFileSync('src/game/ui/adminPaddockView.js','utf8');
const sceneSource=fs.readFileSync('src/game/scenes/AdminHubScene.js','utf8');
const css=fs.readFileSync('src/game/ui/adminPaddock.css','utf8');
assert.match(viewSource,/import '\.\/adminPaddock\.css'/);
assert.match(sceneSource,/mountAdminPaddock\(host,/);
assert.match(sceneSource,/mountAdminWebpTool\(this\._adminDomRoot\)/);
assert.match(sceneSource,/this\._showMasteryPreview\(\)/);
assert.match(sceneSource,/this\._grantHomologationKit\(\)/);
assert.match(sceneSource,/this\._navigate\('TrackStudioScene'\)/);
assert.match(sceneSource,/this\._navigate\('EnvironmentBuilderScene'\)/);
assert.match(sceneSource,/this\._navigate\('TrackEditorScene'\)/);
assert.match(css,/@media\(max-height:520px\)/);
assert.match(css,/@media\(max-width:700px\)/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/env\(safe-area-inset-left/);

class MockElement {
  constructor(tag) {
    this.tag=tag;this.children=[];this.events={};this.dataset={};
    this.attrs={};this.hidden=false;this.textContent='';this.className='';
    this.style={setProperty:(key,value)=>{this.style[key]=value;}};
  }
  append(...children){for(const child of children){this.children.push(child);child.parent=this;}}
  appendChild(child){this.append(child);return child;}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(type,cb){this.events[type]=cb;}
  querySelector(tag){
    for(const c of this.children){if(c.tag===tag)return c;const nested=c.querySelector(tag);if(nested)return nested;}
    return null;
  }
  click(){assert.ok(this.events.click,'No click handler for '+this.className);this.events.click();}
  focus(){}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
}
const document={createElement:tag=>new MockElement(tag),querySelector:selector=>selector==='meta[name="tdr-dev-version"]'?{content:'DEV 1.3.50'}:null};
const executable=viewSource.replace(/^import .*$/gm,'').replace('import.meta.env.BASE_URL',"'/'")
  .replace('export function mountAdminPaddock','function mountAdminPaddock');
const mount=new Function('document',executable+'\nreturn mountAdminPaddock;')(document);
const events=[];
let allCars=false;
const callbacks={
  track:()=>events.push('track'),environment:()=>events.push('environment'),
  cars:()=>events.push('cars'),images:()=>events.push('images'),
  diagnostics:()=>events.push('diagnostics'),garage:()=>events.push('garage'),
  isFullCars:()=>allCars,toggleCars:()=>{allCars=!allCars;events.push('cars-dev');},
  kit:()=>events.push('kit'),mastery:()=>events.push('mastery'),
  legacy:()=>events.push('legacy'),exit:()=>events.push('exit')
};
const host=new MockElement('div');
const {root,toast}=mount(host,callbacks);
assert.equal(host.children[0],root);
assert.equal(toast.attrs.role,'status');
const walk=(node,test,out=[])=>{
  if(test(node))out.push(node);
  for(const child of node.children)walk(child,test,out);
  return out;
};
const tiles=walk(root,e=>e.className==='tdr-paddock__tile');
const auxiliary=walk(root,e=>e.className==='tdr-paddock__aux');
assert.equal(tiles.length,4);
assert.equal(auxiliary.length,3);
assert.equal(walk(root,e=>e.className==='tdr-paddock__dev')[0].textContent,'DEV 1.3.50');
assert.deepEqual(tiles.map(t=>t.dataset.kind),['track','environment','car','image']);
assert.ok(tiles.every(t=>walk(t,e=>e.tag==='img').length===1));
tiles.forEach(t=>t.click());
auxiliary[0].click();auxiliary[1].click();
const qaTools=walk(root,e=>e.className==='tdr-paddock__tool');
qaTools.find(t=>t.children[0].textContent==='GARAJE JUGADOR').click();
qaTools.find(t=>t.children[0].textContent.startsWith('COCHES DEV')).click();
assert.ok(allCars);
assert.ok(qaTools.some(t=>t.children[0].textContent==='COCHES DEV · ON'));
qaTools.find(t=>t.children[0].textContent==='KIT DE HOMOLOGACIÓN').click();
assert.ok(!events.includes('kit'),'Kit must not change inventory before approval');
const dialog=walk(root,e=>e.attrs.role==='dialog')[0];
assert.ok(dialog,'A confirmation dialog is required');
walk(dialog,e=>e.tag==='button').find(b=>b.textContent==='CONFIRMAR').click();
assert.ok(events.includes('kit'));
qaTools.find(t=>t.children[0].textContent==='9 INSIGNIAS DE MAESTRÍA').click();
walk(root,e=>e.className==='tdr-paddock__back')[0].click();
auxiliary[2].click();
qaTools.find(t=>t.children[0].textContent.startsWith('EDITAR PISTAS')).click();
walk(root,e=>e.className==='tdr-paddock__exit')[0].click();
for(const action of ['track','environment','cars','images','diagnostics','garage','cars-dev','kit','mastery','legacy','exit'])
  assert.ok(events.includes(action),'Missing action '+action);
assert.ok(!viewSource.includes('fetch('),'Dashboard must not issue network requests');
console.log('PADDOCK: 4 primary cards, 3 secondary cards, 11 wired actions, QA confirmation, accessible navigation and compact CSS OK.');
