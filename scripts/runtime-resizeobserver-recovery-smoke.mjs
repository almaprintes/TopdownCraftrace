import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isBenignResizeObserverWarning,mayReplaceStartupScreen} from '../src/game/dev/runtimeErrorPolicy.js';

const read=path=>readFileSync(path,'utf8');
const browserWarning='ResizeObserver loop completed with undelivered notifications.';
assert.equal(isBenignResizeObserverWarning(browserWarning),true);
assert.equal(isBenignResizeObserverWarning('ResizeObserver loop limit exceeded'),true);
assert.equal(isBenignResizeObserverWarning('ResizeObserver loop limit exceeded.'),true);
assert.equal(isBenignResizeObserverWarning('ResizeObserver sizing API not available'),false);
assert.equal(isBenignResizeObserverWarning('TypeError: cannot draw track'),false);
assert.equal(isBenignResizeObserverWarning('Unexpected promise rejection'),false);
const root=(hasCanvas)=>{
  let markup='original game';
  return {
    hasCanvas,
    querySelector:selector=>selector==='canvas'&&hasCanvas?{tagName:'CANVAS'}:null,
    get innerHTML(){return markup;},
    set innerHTML(value){markup=value;}
  };
};
assert.equal(mayReplaceStartupScreen(root(true)),false);
assert.equal(mayReplaceStartupScreen(root(false)),true);

const main=read('src/main.js');
const diagnostics=read('src/game/dev/runtimeCrashDiagnostics.js');
assert.match(diagnostics,/isBenignResizeObserverWarning\(event\?\.message\)/);
assert.match(diagnostics,/if\(isBenignResizeObserverWarning\(event\?\.message\)\)\{event\?\.preventDefault\?\.\(\);return;\}/);
assert.match(main,/if \(!mayReplaceStartupScreen\(el\)\) return;/);

// Execute exactly the startup error handlers with browser-like mock events.
// Live canvas must remain untouched even if a real JavaScript error occurs.
const beginning=main.slice(0,main.indexOf('let __game = null;'))
  .replace(/^import .*;\s*$/gm,'');
function harness(hasCanvas){
  const app=root(hasCanvas),listeners=new Map();
  const window={
    __tdrStartupMark:()=>{},
    addEventListener:(kind,handler)=>listeners.set(kind,handler)
  };
  vm.runInNewContext(beginning,{
    window,document:{getElementById:id=>id==='app'?app:null},
    isBenignResizeObserverWarning,mayReplaceStartupScreen,
    // The runtime bootstrap now initialises a read-only November promo flag.
    // Stub it when isolating crash handlers; no network or game state is needed.
    installAdFreePromoControl:()=>{}
  });
  return {
    app,
    emit:(kind,props={})=>{
      let prevented=false;
      const e={preventDefault:()=>{prevented=true;},...props};
      listeners.get(kind)(e);
      return prevented;
    }
  };
}
const race=harness(true);
assert.equal(race.emit('error',{message:browserWarning}),true);
assert.equal(race.app.innerHTML,'original game','ResizeObserver warning must never blank race');
assert.equal(race.emit('error',{message:'TypeError: race callback failed'}),false);
assert.equal(race.app.innerHTML,'original game','Genuine JS errors must not erase active Phaser canvas');
race.emit('unhandledrejection',{reason:new Error('Real network error')});
assert.equal(race.app.innerHTML,'original game','Promise rejection must not erase Phaser canvas');
const boot=harness(false);
assert.equal(boot.emit('error',{message:browserWarning}),true);
assert.equal(boot.app.innerHTML,'original game','Benign warning must not break boot');
boot.emit('error',{message:'Real boot error'});
assert.match(boot.app.innerHTML,/Pantalla en blanco: error detectado/,'Pre-canvas boot errors still visible');
console.log('iPhone ResizeObserver recovery: ignore benign delivery notice, preserve Phaser canvas for live runtime errors, preserve pre-canvas boot diagnostics OK');
