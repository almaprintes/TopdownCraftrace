import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installEnvironmentStudioExitGuard} from '../src/game/environment/environmentStudioExitGuard.js';

const handlers=new Map(),shutdown=[],store=new Map();
let response=[],pushes=0,backs=0,leaves=0;
const history={
  state:null,
  pushState(value){this.state=value;pushes++;},
  back(){backs++;this.state=null;}
};
globalThis.window={
  location:{href:'https://example.test/dev/'},history,
  confirm(){return response.shift()??false;},
  addEventListener(k,fn){handlers.set(k,fn);},
  removeEventListener(k){handlers.delete(k);}
};
globalThis.localStorage={
  getItem(k){return store.get(k)||null;},
  setItem(k,v){store.set(k,v);}
};
const solid={id:'tree',points:[{x:0,y:0},{x:50,y:0},{x:50,y:50},{x:0,y:50}],solid:true};
const pen={nodes:[{x:0,y:0,in:{x:0,y:0},out:{x:0,y:0}},
                   {x:75,y:45,in:{x:75,y:45},out:{x:75,y:45}}]};
const scene={
  _trackId:'karting-tenerife',_penDraft:pen,
  _zoneDraft:[{x:4,y:5},{x:12,y:13}],
  _zoneStrokeStarts:[0],
  _project(){return {trackId:this._trackId,collisionLines:[],collisionZones:[solid]};},
  _hasUnsavedChanges(){return false;},
  _builderToast(){},
  scene:{start(id){assert.equal(id,'admin-hub');leaves++;}},
  events:{once(k,fn){if(k==='shutdown')shutdown.push(fn);}}
};
const guard=installEnvironmentStudioExitGuard(scene);
assert.equal(pushes,1);
assert.ok(handlers.has('popstate')&&handlers.has('beforeunload')&&handlers.has('pagehide'));
response=[false];
assert.equal(scene._requestExitEnvironmentStudio(),false,'Cancel must stay in the editor');
assert.equal(leaves,0);
const backedUp=JSON.parse(store.get('tdr2:environment-exit-recovery:karting-tenerife'));
assert.equal(backedUp.project.collisionZones.length,1,'Backup preserves solid collision zones');
assert.equal(backedUp.penDraft.nodes.length,2,'Backup preserves UNFINISHED pen');
assert.equal(backedUp.zoneDraft.length,2,'Backup preserves unfinished freehand trace');
assert.ok(!store.has('tdr2:environmentBuilder:v1:karting-tenerife'),
  'Emergency recovery must never overwrite the manually saved project');

const event={prevented:false,preventDefault(){this.prevented=true;}};
handlers.get('beforeunload')(event);
assert.ok(event.prevented);
assert.equal(JSON.parse(store.get('tdr2:environment-exit-recovery:karting-tenerife')).reason,'beforeunload');
response=[true];
assert.equal(scene._requestExitEnvironmentStudio(),true);
assert.equal(leaves,1);assert.equal(backs,1);
shutdown.pop()();
assert.equal(handlers.size,0,'All browser navigation listeners must be removed');
assert.equal(typeof scene._requestExitEnvironmentStudio,'undefined');

const scene2={...scene,events:{once(k,fn){if(k==='shutdown')shutdown.push(fn);}},scene:{start(id){assert.equal(id,'admin-hub');leaves++;}}};
installEnvironmentStudioExitGuard(scene2);
history.state=null;response=[false];
handlers.get('popstate')();
assert.equal(leaves,1);
assert.ok(history.state?.tdrEnvironmentExit,'Cancelled browser Back must restore navigation sentinel');
history.state=null;response=[true];
handlers.get('popstate')();
assert.equal(leaves,2);
shutdown.pop()();

const src=readFileSync('src/game/scenes/EnvironmentBuilderSafeWorkflowScene.js','utf8');
const dom=readFileSync('src/game/scenes/EnvironmentBuilderAssetPointerUpScene.js','utf8');
const materials=readFileSync('src/game/scenes/EnvironmentBuilderMaterialStudioScene.js','utf8');
for(const marker of [
  'installEnvironmentStudioExitGuard(this)',
  'e.stopImmediatePropagation()',
  '_requestExitEnvironmentStudio?.()',
  '_recoverEnvironmentSession(){',
  '_protectPenSwitch(){',
  '_startFreehandZones(){',
  '_activateCollisionPen(){',
  'this._penDraft=draft',
  'this._exitGuard?.backup(\'touch-edit\')',
  'this._penGesture=null;this._zoneGesture=null',
  'RECUPERAR SESIÓN INTERRUMPIDA'
])assert.ok(src.includes(marker),'Environment Studio safe tool/exit path missing: '+marker);
assert.ok(!dom.includes('data-act="asphalt"'),'obsolete ASF button must be absent');
assert.ok(!dom.includes('class="es-surface"'),'obsolete surface controls must be absent');
assert.ok(!dom.includes("['ASFALTO',()=>this._chooseAsphalt"),'No legacy asphalt entry in tools');
assert.ok(materials.includes('_mountMaterialPanel(){return;}'),'Old texture panel must not render');
assert.ok(materials.includes('async _restoreMaterialBlobs(){return;}'),'No legacy background texture reload');
assert.ok(materials.includes('p.materials={}'),'Old material metadata should remain import/export compatible');
const game=readFileSync('src/game/game.js','utf8');
assert.ok((game.includes("import('./scenes/EnvironmentBuilderAmericasImportScene.js')") && readFileSync('src/game/scenes/EnvironmentBuilderAmericasImportScene.js','utf8').includes("from './EnvironmentBuilderSafeWorkflowScene.js'")));
console.log('Environment Studio exit: confirm/cancel, Back, beforeunload, draft+zones backup, cleanup, no ASF/texture tools, safe pen switching OK');
