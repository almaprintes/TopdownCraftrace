// Real control-routing smoke for the Track Studio Image Lab visual shell.
// No Safari installation or external network calls required.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const chrome=fs.readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
const css=fs.readFileSync('src/game/studio/trackStudioLabChrome.css','utf8');
const scene=fs.readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const shape=fs.readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const gateSource=fs.readFileSync('src/game/studio/trackStudioGateControls.js','utf8');
const index=fs.readFileSync('index.html','utf8');

const expectedDevVersion=index.match(/name="tdr-dev-version" content="([^"]+)"/)?.[1];
assert.ok(expectedDevVersion?.startsWith('DEV '));
assert.ok(scene.includes("import '../studio/trackStudioLabChrome.css'"));
assert.ok(scene.includes('mountTrackStudioLabChrome(this,gate)'));
assert.ok(scene.includes("const gate=installTrackStudioGateControls(this)"));
assert.ok(shape.includes('s._studioShapeButtons={create:createBtn'));
assert.ok(shape.includes('container.run=callback'));
assert.ok(shape.includes('const nativeVisible=!s._studioChromeMounted'));
assert.ok(gateSource.includes('mountInto(host){'));
assert.ok(css.includes('--ts-teal:#19e5a0'));
assert.ok(css.includes('pointer-events:none'));
assert.ok(css.includes('pointer-events:auto'));
assert.ok(css.includes('.ts-lab__tool-host'));
assert.ok(css.includes('.ts-lab__guide-panel'));

class FakeEl{
  constructor(tag){
    this.tag=tag;this.className='';this.textContent='';this.children=[];
    this.listeners={};this.attrs={};this.parent=null;this.dataset={};
    this.hidden=false;
    this.style={cssText:'',setProperty(k,v){this[k]=v}};
  }
  append(...items){for(const el of items){el.parent=this;this.children.push(el)}}
  appendChild(child){this.append(child);return child;}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);this.parent=null;this.removed=true}
  setAttribute(k,v){this.attrs[k]=String(v)}
  getAttribute(k){return this.attrs[k]}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  click(){for(const cb of this.listeners.click||[])cb({preventDefault(){},stopPropagation(){}})}
  querySelector(tag){for(const c of this.children){if(c.tag===tag)return c;const got=c.querySelector(tag);if(got)return got}return null}
  querySelectorAll(tag){return this.children.flatMap(e=>[...(e.tag===tag?[e]:[]),...e.querySelectorAll(tag)])}
  set innerHTML(v){this._html=v}
  get isConnected(){return true}
}
const body=new FakeEl('body');
const document={body,createElement:tag=>new FakeEl(tag),
  querySelector:sel=>sel.startsWith('meta')?{content:expectedDevVersion}:null};
const wListeners={};
const window={
  confirm:()=>true,
  setTimeout:()=>1,clearTimeout:()=>{},
  addEventListener(k,fn){(wListeners[k]??=[]).push(fn)},
  removeEventListener(k,fn){wListeners[k]=(wListeners[k]||[]).filter(x=>x!==fn)}
};
const eventBus={};
const calls=[];
const s={
  game:{canvas:{getBoundingClientRect(){return{left:4,top:12,width:1130,height:540}}}},
  scale:{width:1024,height:490,on:()=>{},off:()=>{}},
  _topBarH:76,_viewX:118,_rightPanelW:250,
  _nodes:[],_pianos:[],_checkpoints:[],
  _tool:'edit',_trackWidth:140,_widthStep:5,_showStartingGrid:true,
  _guideVisible:true,_guideLocked:true,_selectedNode:-1,_selectedPiano:-1,
  _editorWorldW:8000,_editorWorldH:5000,_undoStack:[],_redoStack:[],
  _editCam:{zoom:.28,centerOn(...a){calls.push(['center',...a])}},
  _frameTrackView(){calls.push('frame');return true;},
  _getNudgeStep:()=>5,
  _redrawEditor(){calls.push('redraw')},
  _updatePanel(){calls.push('update')},
  _flashMessage(t){calls.push(t)},
  _saveProject(){calls.push('save')},
  _openProjectSourceMenu(){calls.push('open')},
  _newProject(){calls.push('new');this._nodes=[]},
  _pushHistory(){calls.push('history')},
  _autosaveRecovery(){calls.push('recover')},
  _requestExitTrackStudio(){calls.push('exit')},
  _toggleClosed(){this._isClosed=!this._isClosed;this._updatePanel()},
  _trackWidthStep:()=>5,
  _changeTrackWidth(n){this._trackWidth+=n;this._updatePanel();calls.push('width')},
  _undo(){calls.push('undo')},_redo(){calls.push('redo')},
  _applyZoomAtViewportCenter(n){this._editCam.zoom*=n;calls.push(n>1?'zoom-in':'zoom-out');this._updatePanel()},
  _openCanvasImagePicker(){calls.push('master-file')},
  _openGuidePicker(){calls.push('guide-file')},
  _toggleGuideVisibility(){this._guideVisible=!this._guideVisible;calls.push('guide-toggle')},
  _changeGuideScale(){calls.push('guide-size')},
  _changeGuideAlpha(){calls.push('guide-opacity')},
  _cycleNudgeStep(){calls.push('step')},
  _nudgeSelectedNode(x,y){calls.push(['nudge',x,y])},
  _moveSelectedNodeOnScreen(x,y){this._nudgeSelectedNode(x,y);this._nodes[this._selectedNode].x+=x;this._nodes[this._selectedNode].y+=y;return true;},
  _emptyHelp:{setVisible(v){calls.push(['empty-help',v])}},
  events:{once:(name,fn)=>{(eventBus[name]??=[]).push(fn)}},
  _studioShapeButtons:Object.fromEntries(['create','edit','add','gridOn','gridOff','preview'].map(key=>[key,{
    run(){calls.push('shape-'+key);if(key==='gridOn'||key==='gridOff')s._showStartingGrid=!s._showStartingGrid},
    setVisible(v){calls.push(['shape-visible',key,v])}
  }]))
};
const gateRoot=new FakeEl('div');gateRoot.className='tdr-trackstudio-gate-actions';
const gate={mountInto(host){host.append(gateRoot);calls.push('gate-mounted');return true}};
const helper=new Function('document','window','studioInspectorCopy','shapeInspectorCopy','shapeIsValid',
 chrome.replace(/^import .*$/gm,'').replace('export function mountTrackStudioLabChrome','function mountTrackStudioLabChrome')+
 ';return mountTrackStudioLabChrome;');
const mount=helper(document,window,()=> 'Sin selección · TRAZADO',()=> 'Ajuste de bordes',()=>false);
const controller=mount(s,gate);
assert.ok(controller?.root,'Shell must mount');
assert.ok(s._studioChromeMounted);
assert.ok(calls.includes('gate-mounted'));
assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='shape-visible'));
assert.ok(controller.root.style['--ts-header'].endsWith('px'));
const all=(node)=>[node,...node.children.flatMap(all)];
const buttons=all(controller.root).filter(n=>n.tag==='button');
const click=(label)=>{const b=buttons.find(n=>n.textContent===label);assert.ok(b,'Missing '+label);b.click()};
click('GUARDAR');click('ABRIR');click('NUEVO');click('ANCHO −');click('ANCHO +');
click('↶');click('↷');click('VOLVER A PADDOCK');click('CREAR PISTA');
click('AJUSTAR');click('+ NODO');click('▶ PROBAR');
assert.ok(!buttons.some(x=>x.textContent==='IMG'),'Redundant IMG must be removed');
click('TODO');assert.ok(calls.includes('frame'),'TODO frames the track');
click('MAP');
s._openReferenceTools?.(); // Reference controls remain reachable from ABRIR.
click('CARGAR');click('TAMAÑO +');click('OPACIDAD −');
const zoomBefore=s._editCam.zoom;
click('+');assert.ok(s._editCam.zoom>zoomBefore,'Plus must increase zoom');
const zoomIn=s._editCam.zoom;
click('−');assert.ok(s._editCam.zoom<zoomIn,'Minus must reduce zoom');
s._flashMessage('No se puede probar: El proyecto no tiene imagen maestra');
const alert=all(controller.root).find(n=>n.className==='ts-lab__notice');
assert.ok(alert&&!alert.hidden,'Error visible above Phaser canvas');
assert.equal(alert.getAttribute('data-error'),'true');
assert.ok(alert.textContent.includes('pulsa MAP'),'Actionable master image guidance');
for(const label of ['save','open','new','undo','redo','exit','shape-create','shape-edit',
  'shape-add','shape-preview','guide-file','guide-size','guide-opacity',
  'master-file','zoom-in','zoom-out'])
  assert.ok(calls.includes(label),'Missing routing: '+label);
const empty=all(controller.root).find(n=>n.className==='ts-lab__empty');
assert.ok(empty&&!empty.hidden);
s._nodes=[{x:100,y:200}];s._selectedNode=0;s._updatePanel();
assert.ok(empty.hidden,'Empty state must vanish on track input');
const stage=all(controller.root).find(n=>n.className==='ts-lab__workspace');
assert.ok(stage);
const nudger=buttons.find(n=>n.getAttribute('aria-label')==='Mover selección ←');
assert.ok(nudger);
nudger.click();
assert.ok(calls.some(x=>Array.isArray(x)&&x[0]==='nudge'&&x[1]===-5));
const right=buttons.find(x=>x.getAttribute('aria-label')==='Mover selección →');
assert.ok(right);
const beforeX=s._nodes[s._selectedNode].x;
right.click();
assert.ok(s._nodes[s._selectedNode].x>beforeX,'Right arrow must increase X');
for(const done of eventBus.shutdown||[])done();
assert.ok(controller.root.removed);
assert.ok(!s._studioChromeMounted);
assert.equal((wListeners.resize||[]).length,0);
console.log('PASS Track Studio 2.0 shell: IMAGE LAB styling, live controls, photo options, node movement, all shape actions, resize and exit cleanup');
