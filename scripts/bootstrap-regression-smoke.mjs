import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {verifyAndroidAssets} from './android-assets-smoke.mjs';
const html=fs.readFileSync('index.html','utf8');
const code=html.match(/<script id="tdr-startup-diagnostics">([\s\S]*?)<\/script>/)[1];
function boot(){
  const events=new Map(), logs=[],timers=[];
  const window={addEventListener:(key,fn)=>{if(!events.has(key))events.set(key,[]);events.get(key).push(fn);},dispatchEvent:event=>(events.get(event.type)||[]).forEach(fn=>fn(event))};
  const context={window,document:{addEventListener:window.addEventListener},performance:{now:()=>100},console:{info:line=>logs.push(line)},Set,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},setTimeout:fn=>(timers.push(fn),timers.length),clearTimeout:()=>{}};
  vm.runInNewContext(code,context);
  return {window,logs,timers,emit:(type,detail)=>window.dispatchEvent({type,detail})};
}
let b=boot();b.timers[0]();assert.equal(b.window.__tdrStartupState.failure,'main-js-missing');
b=boot();b.window.dispatchEvent({type:'error',target:{tagName:'SCRIPT'},message:'secret-token'});assert.equal(b.window.__tdrStartupState.failure,'script-load');assert(!b.logs.join().includes('secret'));
b=boot();b.window.__tdrStartupMark('main-js');b.timers[0]();assert.equal(b.window.__tdrStartupState.failure,'startup-timeout');
b=boot();b.window.__tdrBootLast={phase:'menu-ready'};b.emit('tdr:bootphase',{phase:'menu-ready'});b.emit('tdr:bootready');b.timers[0]();assert.equal(b.window.__tdrStartupState.ready,true);assert.equal(b.window.__tdrStartupState.failure,'');
// Existing canvas-only fallback must not certify an unfinished lobby.
b=boot();b.window.__tdrBootLast={phase:'menu-ready'};b.emit('tdr:bootready');assert.equal(b.window.__tdrStartupState.ready,false);
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tdr-assets-'));
try{
 fs.mkdirSync(path.join(root,'assets'));fs.writeFileSync(path.join(root,'assets/main.js'),'');
 fs.writeFileSync(path.join(root,'index.html'),'<script src="/top-down-race-2/assets/main.js"></script>');assert.throws(()=>verifyAndroidAssets(root),/relative/);
 fs.writeFileSync(path.join(root,'index.html'),'<script src="./assets/missing.js"></script>');assert.throws(()=>verifyAndroidAssets(root),/missing/);
 fs.writeFileSync(path.join(root,'index.html'),'<script src="./assets/main.js"></script>');verifyAndroidAssets(root);
}finally{fs.rmSync(root,{recursive:true,force:true});}
console.log('Bootstrap regression: missing entry, script error, timeout, lobby readiness, invalid/missing APK URLs verified');
// Execute the real startup scheduling with an advertising module that never resolves.
const main=fs.readFileSync('src/main.js','utf8');
const startup=main.slice(main.indexOf('// Advertising is optional:')).replace("import('./game/monetization/installNativeRewardedBridge.js')",'pendingAdvertisingModule()');
let gameStarts=0;
vm.runInNewContext(startup,{__tickOrientation:()=>gameStarts++,window:{addEventListener:()=>{}},pendingAdvertisingModule:()=>new Promise(()=>{})});
assert.equal(gameStarts,1,'Phaser must start even when advertising module loading never resolves');
console.log('Bootstrap independence: unresolved advertising module does not gate game startup');
