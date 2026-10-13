// DEV recycler visual contract: guard the original exchange/dismantling
// mechanics while ensuring the store and both screens use one premium skin.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteMaterialExchange} from '../src/game/store/materialExchange.js';
const read=path=>readFileSync(path,'utf8');
const exchange=read('src/game/ui/MaterialExchangeDom.js');
const dismantle=read('src/game/ui/PartDismantleDom.js');
const store=read('src/game/ui/StoreDomUi.js');
const style=read('src/game/ui/recycler-premium.css');
const module=read('src/game/ui/recyclerPremiumTheme.js');
const storeCss=read('src/game/ui/store-dom.css');
assert.match(store,/const recycler=el\('button','tdr-store-recycler'/);
assert.match(store,/recycler\.addEventListener\('click',\(\)=>openMaterialExchangeDom\(scene/);
assert.match(storeCss,/\.tdr-store-header \.tdr-store-recycler\{/);
assert.match(storeCss,/clip-path:polygon\(10px 0,calc\(100% - 8px\)/);
assert.match(module,/import css from '\.\/recycler-premium\.css\?inline'/);
assert.match(module,/document\.head\.appendChild\(style\)/);
assert.match(exchange,/ensureStyle\(\);applyRecyclerPremiumTheme\(\)/);
assert.match(dismantle,/ensure\(\);applyRecyclerPremiumTheme\(\)/);
assert.match(exchange,/mode\.className='rx-mode'/);
assert.match(exchange,/class="rx-materials-tab is-active" disabled/);
assert.match(exchange,/class="rx-parts-tab"/);
assert.doesNotMatch(exchange,/mode\.style\.cssText=/);
assert.match(style,/#tdr-material-exchange-dom \.rx-mode button\.is-active/);
assert.match(style,/#tdr-part-dismantle-dom \.pd-mode button\.on/);
assert.match(style,/#tdr-material-exchange-dom \.rx-cup/);
assert.match(style,/#tdr-material-exchange-dom \.rx-swap/);
assert.match(style,/#tdr-material-exchange-dom \.rx-slider/);
assert.match(style,/#tdr-material-exchange-dom \.rx-foot\{/);
assert.match(style,/#tdr-material-exchange-dom \.rx-submit/);
assert.match(style,/#tdr-part-dismantle-dom \.pd-go/);
assert.match(style,/@media\(max-height:540px\)/);
assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
// Don't alter the actual exchange economics or ad verification.
assert.match(exchange,/materialExchangeStatus\(\)/);
assert.match(exchange,/quoteMaterialExchange\(fromId,toId,amount\)/);
assert.match(exchange,/executeMaterialExchange\(fromId,toId,amount\)/);
assert.match(exchange,/if\(!verifiedReward\(ad\)\)/);
assert.match(exchange,/recyclerRewardedPlacement\(ordinal\)/);
assert.match(exchange,/requiresVideo=status\.used>=1/);
assert.match(exchange,/status\.remaining\}\/3/);
assert.match(exchange,/slider\\.addEventListener\\('input'/);
assert.match(exchange,/<output class="rx-slider-value" aria-label="\\$\\{C\\.receive\\}">\\$\\{receive\\}<\\/output>/,
  'Right-hand amount shows received materials, not the source slider count');
assert.match(exchange,/const previewQuote=quoteMaterialExchange\\(fromId,toId,val\\)/,
  'Touch preview must derive its value from the canonical exchange quote');
assert.match(exchange,/sliderValue\\.textContent=String\\(previewReceive\\)/,
  'Received quantity must refresh while sliding');
assert.match(exchange,/exact\\.value=String\\(val\\)/,
  'Exact source quantity remains synchronized while sliding');
assert.match(exchange,/summaryValue\\.textContent=/,
  'Summary must preview the same amount as the right-hand value');
assert.match(exchange,/if\\(submit\\)submit\\.disabled=true/,
  'Do not allow a stale saved amount to execute while the user is dragging');
assert.equal(quoteMaterialExchange('scrap','compound',112).receive,10,
  '112 scrap converts to 10 compound after the existing 25% fee');
assert.equal(quoteMaterialExchange('scrap','compound',8).receive,0,
  'Too-small amounts must display zero rather than a false reward');
assert.match(exchange,/slider\.addEventListener\('change'/);
assert.match(exchange,/exact\?\.addEventListener\('change'/);
assert.match(exchange,/confirmExchange\(root,C/);
assert.match(exchange,/mode\.querySelector\('\.rx-parts-tab'\)/);
assert.match(dismantle,/quotePartDismantle\(selectedId,count,garage\)/);
assert.match(dismantle,/executePartDismantle\(selectedId,count\)/);
assert.match(dismantle,/root\.querySelector\('\.pd-materials'\)/);
assert.match(dismantle,/root\.querySelector\('\.pd-go'\)/);
assert.match(dismantle,/window\.confirm\(/);
console.log('Recycler premium visual contract OK: header, exchange, parts, touch geometry and unchanged economic/ad operations.');
