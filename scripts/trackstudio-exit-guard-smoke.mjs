import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installTrackStudioExitGuard } from '../src/game/studio/trackStudioExitGuard.js';

const handlers=new Map(), callbacks=new Map();
let responses=[],saves=0,navigations=0,backs=0,historyPushes=0;
const history={
  state:null,
  pushState(value){this.state=value;historyPushes++},
  back(){backs++;this.state=null}
};
globalThis.window={
  location:{href:'https://example.test/dev/'},history,
  confirm(){return responses.shift()??false},
  addEventListener(type,fn){handlers.set(type,fn)},
  removeEventListener(type){handlers.delete(type)}
};
const scene={
  events:{once(key,fn){callbacks.set(key,fn)}},
  _autosaveRecovery(){saves++},
  _destroyGuideInput(){},
  _destroyProjectInput(){},
  scene:{start(key){assert.equal(key,'admin-hub');navigations++}}
};
installTrackStudioExitGuard(scene);
assert.equal(historyPushes,1);
assert.ok(handlers.has('beforeunload'));
assert.ok(handlers.has('popstate'));
responses=[false];assert.equal(scene._requestExitTrackStudio(),false);
assert.equal(navigations,0,'Cancelar debe mantener TrackStudio abierto');
const unload={prevented:false,preventDefault(){this.prevented=true}};
handlers.get('beforeunload')(unload);
assert.equal(unload.prevented,true);
assert.ok(saves>0,'Salir o recargar genera copia de recuperación');
responses=[true];assert.equal(scene._requestExitTrackStudio(),true);
assert.equal(navigations,1);
assert.equal(backs,1,'La flecha elimina el guard de historial');
callbacks.get('shutdown')();
assert.equal(handlers.size,0,'No deben persistir listeners fuera de TrackStudio');
assert.equal(typeof scene._requestExitTrackStudio,'undefined');

const scene2={...scene,events:{once(key,fn){callbacks.set(key,fn)}},scene:{start(key){assert.equal(key,'admin-hub');navigations++}}};
installTrackStudioExitGuard(scene2);
history.state=null;responses=[false];handlers.get('popstate')();
assert.equal(navigations,1);
assert.equal(history.state?.tdrTrackStudioExit?.startsWith('ts-'),true,'Back cancelado se protege de nuevo');
history.state=null;responses=[true];handlers.get('popstate')();
assert.equal(navigations,2);
callbacks.get('shutdown')();
const source=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
assert.ok(source.includes("back.on('pointerup', () => this._requestExitTrackStudio?.())"));
assert.ok(source.includes("_restoreLastTrackStudioRecovery()"));
assert.ok(source.includes("choice === '4'"));
console.log('TrackStudio: exit confirm/cancel, Back, beforeunload, recovery menu, cleanup: OK');
