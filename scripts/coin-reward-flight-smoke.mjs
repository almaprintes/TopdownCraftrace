import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewardAmountLabel,stageToClient,rewardFlightFrames,playCoinRewardFlight,playDomCoinRewardFlight,animateDomCoinBalance} from '../src/game/ui/coinRewardFlight.js';
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
assert.equal(await playDomCoinRewardFlight(null,{amount:100}),false,'No DOM is harmless');
assert.equal(await animateDomCoinBalance(null,{from:0,to:100}),false,'No DOM is harmless');
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
assert.match(store,/rewardModal===this\._storeModal/,'do not reopen a modal after screen switch');
assert.match(store,/_animateStoreCoinBalance\(Number\(result\.state\?\.coins\)-result\.amount/,'animate from pre-grant total');
assert.match(store,/this\.tweens\.addCounter/,'animate existing Phaser header number');
assert.match(store,/targets:icon/,'pulse existing store coin');
assert.match(store,/document\.hidden/,'hidden page skips optional visual count-up');
assert.match(store,/root\.once\('destroy'/,'stop tweens on store close');

// The shipping store is DOM: legacy Phaser-only checks cannot prove visibility.
const currentMenu=read('src/game/scenes/MenuDuelModeScene.js');
assert.match(currentMenu,/return openStoreDom\(this\)/,'real store uses DOM');
const domStore=read('src/game/ui/StoreDomUi.js');
const verified=domStore.indexOf('if(!verifiedReward(ad))');
const awarded=domStore.indexOf('const result=isVideo?claimRewardedCoins(100):claimDailyCoins(250)');
const flown=domStore.indexOf('await playDomCoinRewardFlight(scene');
const counted=domStore.indexOf('await animateDomCoinBalance(root');
assert.ok(verified>=0&&awarded>verified&&flown>awarded&&counted>flown,
  'SHIPPING DOM: verified ad -> durable award -> flight -> animated wallet');
assert.match(domStore,/if\(busy\|\|!root\.isConnected\)return/,'prevent duplicate taps in real store');
assert.match(domStore,/button\.disabled=busy\|\|!status\.available/,'do not reenable while playing ad');
assert.match(domStore,/root\.dispatchEvent\(new Event\('tdr:store-closed'\)\)/,'dismiss active flight');
const fx=read('src/game/ui/coinRewardFlight.js');
const shared=read('src/game/ui/TdrAppHeader.js');
assert.match(shared,/assets\/ui\/moneda-tdr\.webp/,'coin asset shared');
assert.match(shared,/export function createAppHeader/,'header factory');
assert.match(shared,/export function createAppWallet/,'wallet factory');
assert.match(domStore,/createAppHeader\(\{title:/,'store mounts shared header');
assert.match(read('src/game/ui/LobbyDomUi.js'),/createAppWallet\(\{className:'tdr-lobby-wallet'/,'lobby mounts shared wallet');
assert.match(read('src/game/garage/garageStore.js'),/tdr:garage-saved/,'broadcast on persisted grant');
assert.match(fx,/root\.appendChild\(layer\)/,'flight must stack within fullscreen store');
assert.match(fx,/zIndex:'70'/,'flight above shell');
assert.match(domStore,/root\.dataset\.tdrWalletPending='1'/,'freeze count during flight');

assert.match(domStore,/finally\{[\s\S]*?refreshBalance\(root\);update\(\)/,'always refresh wallet after interruptions');
assert.match(fx,/assets\/ui\/moneda-tdr\.webp/);
assert.match(fx,/a\.mute/,'honor mute');
assert.match(fx,/a\.effects/,'honor effect volume');
assert.match(fx,/prefers-reduced-motion/);
assert.match(fx,/Promise\.race/,'WebKit cancellation must not hang award');
assert.match(fx,/layer\.remove\(\)/,'dispose effect');
assert.doesNotMatch(fx,/localStorage\.setItem/,'visual effect must not grant currency');
console.log('Coin reward flight smoke: verified 100, daily 250, safe grants and header timing');

const header=read('src/game/ui/TdrAppHeader.js');
assert.match(header,/export function observeAppHeader/,'screens replace their DOM header safely');
assert.match(header,/export function mountSceneAppHeader/,'Phaser screens own a stable DOM header');
for(const p of ['src/game/scenes/StatsScene.js','src/game/scenes/SettingsDomScene.js','src/game/scenes/SeasonScene.js'])assert.match(read(p),/observeAppHeader\(/,'shared header on '+p);
for(const p of ['src/game/scenes/GarageScene.js','src/game/scenes/TrackGarageScene.js','src/game/scenes/UpgradeWorkshopCarUnlockScene.js'])assert.match(read(p),/mountSceneAppHeader\(/,'Phaser header on '+p);
assert.match(read('src/game/ui/WorkshopMobileDom.js'),/createAppWallet\(/,'factory mobile uses official coin');

assert.match(read('src/game/scenes/GarageDetailScene.js'),/mountSceneAppHeader\(/,'car details reuse the common header');
assert.match(read('src/game/ui/app-header.css'),/\.tdr-phaser-header\.tdr-app-header/,'Phaser header stays DOM fixed');
assert.match(read('src/game/ui/store-dom.css'),/z-index:2147482500/,'store stacking context is explicit');
const flightSegment=fx.slice(fx.indexOf('export async function playDomCoinRewardFlight'),fx.indexOf('export async function animateDomCoinBalance'));
assert.ok(flightSegment.indexOf('root.appendChild(layer)')>flightSegment.indexOf("zIndex:'70'"),'render overlay inside top store layer');
assert.doesNotMatch(flightSegment,/document\.body\.appendChild\(layer\)/,'never hide coins behind fullscreen store');

/* Verify player DOM paths, not just old Phaser scene headers. */
const playerGarage=read('src/game/scenes/GarageLazyCardsScene.js');
const playerSelector=read('src/game/scenes/TrackGarageProgressionScene.js');
assert.match(playerGarage,/const header=createAppHeader\(/,'live Garage DOM header');
assert.match(playerGarage,/root\.prepend\(header\)/,'Garage header inserted inside overlay');
assert.match(playerGarage,/disposeAppWallets\(this\._playerGarageDom\)/,'Garage wallet cleanup');
assert.match(playerSelector,/const header=createAppHeader\(/,'live Tracks DOM header');
assert.match(playerSelector,/classList\.add\('tdr-ts-back'\)/,'Android back target retained');
assert.match(playerSelector,/disposeAppWallets\(root\)/,'selector refresh cleans wallet');
assert.match(read('src/game/scenes/TrackGarageAndroidTouchScene.js'),/action\.matches\('\.tdr-ts-back'\)/,'Android pointer handler retained');
assert.match(shared,/export const appBackLabel/,'localized back text');
assert.match(shared,/back\.textContent=backLabel/,'word label in new header');
assert.match(shared,/back\.textContent=appBackLabel\(\)/,'word label in existing headers');
assert.doesNotMatch(shared,/backLabel:'←'/,'avoid oversized arrow only labels');
assert.match(read('src/game/ui/app-header.css'),/font:900 clamp\(9px,1\.08vw,11px\)/,'compact back font');
assert.match(read('src/game/ui/WorkshopMobileDom.js'),/button\(appBackLabel\(\)/,'factory back text');
