// Environment Studio 2.0 smoke: real button routing, categories and saved schema.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('src/game/scenes/EnvironmentBuilderScene.js','utf8');
const shell=fs.readFileSync('src/game/environment/environmentStudioChrome.js','utf8');
const css=fs.readFileSync('src/game/environment/environmentStudioChrome.css','utf8');
const paddock=fs.readFileSync('src/game/ui/adminPaddockView.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert.ok(html.includes('name="tdr-dev-version" content="DEV 1.3.63"'));
assert.ok(paddock.includes("title:'ENVIRONMENT STUDIO'"));
assert.ok(paddock.includes("color:'#19e58e'"));
assert.ok(source.includes("mountEnvironmentStudioChrome(this,CATALOG,BASE)"));
assert.ok(source.includes("_storageKey(){return`tdr2:environmentBuilder:v1:${this._trackId}`;}"));
assert.ok(source.includes("return{version:1,trackId:this._trackId,environment:"));
assert.ok(source.includes("this._catalogRoot?.setVisible?.(false)"));
assert.ok(source.includes("if(!window.confirm('¿Cargar el entorno guardado?"));
assert.ok(css.includes('--env-panel:#0b251c'));
assert.ok(css.includes('--env-accent:#19e58e'));
assert.ok(css.includes('pointer-events:none'));
assert.ok(css.includes('.env2__library{'));
assert.ok(css.includes('overflow-y:auto'));
assert.ok(css.includes('.env2__stage-bar{'));

const catalogBody=source.slice(source.indexOf('const CATALOG=['),source.indexOf('];',source.indexOf('const CATALOG=['))+2);
const CATALOG=new Function(catalogBody+';return CATALOG;')();
const groups=['VEGETACIÓN','BARRERAS','PROPS','ESTRUCTURAS'];
assert.ok(CATALOG.length>=24);
assert.deepEqual([...new Set(CATALOG.map(a=>a.cat))],groups);

class El{
  constructor(tag){
    this.tag=tag;this.className='';this.children=[];this.textContent='';
    this.parent=null;this.hidden=false;this.disabled=false;this.events={};
    this.attrs={};this.isConnected=true;this.value='';
    this.style={cssText:'',setProperty(k,v){this[k]=v;}};
  }
  append(...xs){for(const x of xs){x.parent=this;this.children.push(x);}}
  appendChild(x){this.append(x);return x;}
  replaceChildren(...xs){this.children.forEach(x=>x.parent=null);this.children=[];this.append(...xs);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.parent=null;this.removed=true;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k];}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
  click(){for(const fn of this.events.click||[])fn({preventDefault(){},stopPropagation(){}});}
  set innerHTML(v){this._html=v;}
  querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...c.querySelectorAll(tag)]);}
}
const document={body:new El('body'),createElement:t=>new El(t),
  querySelector:()=>({content:'DEV 1.3.63'})};
const listeners={};
const window={
  confirm:()=>true,
  addEventListener(k,fn){(listeners[k]??=[]).push(fn);},
  removeEventListener(k,fn){listeners[k]=(listeners[k]||[]).filter(f=>f!==fn);}
};
const calls=[];
const eventBus={};
const scene={
  game:{canvas:{getBoundingClientRect(){return{left:3,top:9,width:1160,height:480};}}},
  scale:{width:1024,height:415,on(){},off(){}},
  _top:70,_vx:123,_right:310,_trackId:'karting-tenerife',
  _objects:[],_surfaces:[],_selected:null,_mode:'select',
  _category:'ESTRUCTURAS',_surfacePhysics:'grass',_surfaceWidth:120,
  _editCam:{zoom:.22,centerOn(...a){calls.push(['center',...a]);}},
  _save(){calls.push('save')},_load(){calls.push('load');return true},
  _export(){calls.push('export')},_pickGuide(){calls.push('photo')},
  _changeTrackId(){calls.push('change-track')},
  _status(){calls.push('mode-'+this._mode)},
  _refreshCatalog(){calls.push('catalog')},
  _zoom(v){this._editCam.zoom*=v;calls.push('zoom')},
  _spawn(a){
    const o={scene:true,_env:{asset:a.id}};
    this._objects.push(o);this._selected=o;calls.push('spawn:'+a.id);
    return o;
  },
  _rotate(v){calls.push('rotate:'+v)},
  _scale(v){calls.push('scale:'+v)},
  _flip(v){calls.push('flip:'+v)},
  _duplicate(){calls.push('duplicate')},
  _delete(){calls.push('delete');this._objects=[];this._selected=null;},
  _updateSurfaceInfo(){calls.push('surface-info')},
  scene:{start(key){calls.push('exit:'+key)}},
  events:{once(event,fn){(eventBus[event]??=[]).push(fn)}}
};
const mount=new Function('document','window',
 shell.replace(/^import .*$/gm,'').replace('export function mountEnvironmentStudioChrome','function mountEnvironmentStudioChrome')+
 '\nreturn mountEnvironmentStudioChrome;')(document,window);
const s=mount(scene,CATALOG,'/');
const descend=e=>[e,...e.children.flatMap(descend)];
assert.ok(s?.root&&s?.refresh&&s.notify);
s.notify('EXPORTACIÓN LISTA');
assert.ok(descend(s.root).some(e=>e.className==='env2__stage-message'&&e.textContent==='EXPORTACIÓN LISTA'));
assert.ok(s.root.style['--env-left'].endsWith('px'));

const findButton=(label)=>descend(s.root).find(e=>e.tag==='button'&&e.textContent===label);
for(const name of ['GUARDAR','ABRIR','EXPORTAR JSON','CARGAR FOTO','VOLVER A PADDOCK','SELECCIÓN','DESPLAZAR','PINTAR ASFALTO'])
  assert.ok(findButton(name),'No button '+name);
findButton('GUARDAR').click();findButton('ABRIR').click();
findButton('EXPORTAR JSON').click();findButton('CARGAR FOTO').click();
findButton('DESPLAZAR').click();assert.equal(scene._mode,'pan');
findButton('PINTAR ASFALTO').click();assert.equal(scene._mode,'surface');
findButton('SELECCIÓN').click();assert.equal(scene._mode,'select');
findButton('+').click();findButton('−').click();
for(const action of ['save','load','export','photo','mode-pan','mode-surface','mode-select'])
  assert.ok(calls.includes(action),'Missing callback '+action);
const library=descend(s.root).find(e=>e.className==='env2__library');
assert.ok(library);
for(const name of groups){
  const selected=findButton(name);
  assert.ok(selected);
  selected.click();
  assert.equal(scene._category,name);
  assert.equal(library.children.length,CATALOG.filter(a=>a.cat===name).length,
    'Every asset must remain accessible in '+name);
}
const first=library.children[0];first.click();
assert.equal(scene._objects.length,1);
const transform=descend(s.root).find(e=>e.className==='env2__selection-tools');
assert.ok(transform&&transform.children.length===8);
findButton('↷ 15°').click();findButton('ESC +').click();findButton('↔ X').click();
findButton('DUPLICAR').click();findButton('BORRAR').click();
for(const action of ['rotate:15','scale:1.1','flip:x','duplicate','delete'])
  assert.ok(calls.includes(action),'Missing transform '+action);
assert.ok(transform.children.every(e=>e.disabled),'Disabled without selection');
findButton('FÍSICA').click();
assert.equal(scene._surfacePhysics,'asphalt');
findButton('ANCHO +').click();assert.equal(scene._surfaceWidth,140);
findButton('ANCHO −').click();assert.equal(scene._surfaceWidth,120);
findButton('VOLVER A PADDOCK').click();assert.ok(calls.includes('exit:admin-hub'));
assert.equal((listeners.resize||[]).length,1);
for(const fn of eventBus.shutdown||[])fn();
assert.ok(s.root.removed);
assert.equal((listeners.resize||[]).length,0);
assert.equal((listeners.orientationchange||[]).length,0);
console.log('PASS Environment Studio 2.0: all four categories, full catalog, save/load/export, mode/zoom, transforms, surface settings, exit and cleanup.');
