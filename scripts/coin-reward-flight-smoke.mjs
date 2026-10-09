import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewardAmountLabel,stageToClient,rewardFlightFrames,playCoinRewardFlight} from '../src/game/ui/coinRewardFlight.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(rewardAmountLabel(100),'+100 MONEDAS');
assert.equal(rewardAmountLabel(250,true),'+250 COINS');
const scene={scale:{width:800,height:400},game:{canvas:{getBoundingClientRect:()=>({left:25,top:50,width:400,height:200})}}};
assert.deepEqual(stageToClient(scene,400,200),{x:225,y:150});
assert.equal(stageToClient(null,400,200),null);
for(let i=0;i<10;i++){
  const frames=rewardFlightFrames({x:120,y:220},{x:650,y:50},i,10);
  assert.deepEqual(frames.map(x=>x.offset),[0,.18,.57,1]);
  assert.match(frames[3].transform,/translate\(530\.0px,-170\.0px\)/);
  assert.ok(frames.every(f=>!f.transform.includes('NaN')));
}
assert.equal(await playCoinRewardFlight(null,{amount:100}),false,'No DOM is harmless');
const store=read('src/game/scenes/MenuRewardedAdsScene.js');
assert.match(store,/const result=isVideo\?claimRewardedCoins\(100\):claimDailyCoins\(250\)/);
const verify=store.indexOf('if(!verifiedReward(ad))');
const persist=store.indexOf('const result=isVideo?claimRewardedCoins(100):claimDailyCoins(250)');
const animate=store.indexOf('await playCoinRewardFlight(this');
const refresh=store.indexOf("this._openStoreModal?.('rewards');",animate);
assert.ok(verify>=0&&persist>verify&&animate>persist&&refresh>animate,
  'ad verification -> durable grant -> flight -> header update');
assert.match(store,/hit\.removeAllListeners\('pointerup'\)/,'remove original claim');
assert.match(store,/hit\.removeAllListeners\('pointerdown'\)/,'remove duplicate ad trigger');
assert.match(store,/if\(busy\)return/,'ignore repeated taps');
assert.match(store,/if\(!result\.ok\)/,'do not animate a refused claim');
assert.match(store,/finally\{\s*busy=false/,'reset state even after failure');
const fx=read('src/game/ui/coinRewardFlight.js');
assert.match(fx,/assets\/ui\/moneda-tdr\.webp/);
assert.match(fx,/a\.mute/,'honor mute');
assert.match(fx,/a\.effects/,'honor effect volume');
assert.match(fx,/prefers-reduced-motion/);
assert.match(fx,/Promise\.race/,'WebKit cancellation must not hang award');
assert.match(fx,/layer\.remove\(\)/,'dispose effect');
assert.doesNotMatch(fx,/localStorage\.setItem/,'visual effect must not grant currency');
console.log('Coin reward flight smoke: verified 100, daily 250, safe grants and header timing');
