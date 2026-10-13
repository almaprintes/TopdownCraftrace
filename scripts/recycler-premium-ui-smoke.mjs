// DEV recycler visual contract: guard the original exchange/dismantling
// mechanics while ensuring the store and both screens use one premium skin.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
assert.match(exchange,/slider\.addEventListener\('input'/);
assert.ok(exchange.includes('<output class="rx-slider-value" aria-label="${C.receive}">${receive}</output>'),
  'Right-hand number must show received amount, not spent amount');
assert.ok(exchange.includes('const previewQuote=quoteMaterialExchange(fromId,toId,val);'),
  'Live preview uses canonical quote function');
assert.ok(exchange.includes('sliderValue.textContent=String(previewReceive);'),
  'Received quantity refreshes on slider drag');
assert.ok(exchange.includes('exact.value=String(val);'),
  'Source input stays synchronized');
assert.ok(exchange.includes('summaryValue.textContent='),
  'Summary uses the same live quote');
assert.ok(exchange.includes('if(submit)submit.disabled=true;'),
  'Stale amount cannot be confirmed mid-drag');
const exchangeEconomy=read('src/game/store/materialExchange.js');
const valueOf=id=>{
  const fragment=exchangeEconomy.match(/MATERIAL_EXCHANGE_VALUE=\\{([\\s\\S]*?)\\}/)?.[1]||'';
  const entry=fragment.match(new RegExp('(?:^|[,\\\\s])'+id+':([0-9.]+)'));
  return Number(entry?.[1]);
};
const factor=Number(exchangeEconomy.match(/MATERIAL_EXCHANGE_EFFICIENCY=([0-9.]+)/)?.[1]);
assert.equal(factor,.75,'A 25% fee must be sourced from canonical economy');
assert.equal(Math.floor(112*valueOf('scrap')*factor/valueOf('compound')),10,
  '112 scrap converts to 10 compound after the canonical fee');
assert.equal(Math.floor(8*valueOf('scrap')*factor/valueOf('compound')),0,
  'Small input is not enough to produce one compound');
assert.ok(exchange.includes('class="rx-fee-notice" role="note"'),
  'Commission disclosure must be visible near the sticky confirmation area');
assert.ok(exchange.includes('Math.round((1-MATERIAL_EXCHANGE_EFFICIENCY)*100)'),
  'Fee shown is always computed from the real exchange efficiency');
assert.ok(exchange.includes("t('recycler.feeDisclaimer',{percent:Math.round(MATERIAL_EXCHANGE_EFFICIENCY*100)})"),
  'Notice must explain that the fee applies to exchange VALUE, not unit count');
assert.ok(exchange.includes('class="rx-daily-rule"'),
  'Daily rules remain visible alongside the restored fee notice');
const themeCss=read('src/game/ui/recycler-premium.css');
assert.match(themeCss,/#tdr-material-exchange-dom \.rx-fee-notice\{/);
assert.match(themeCss,/#tdr-material-exchange-dom \.rx-fee-notice strong\{/);
assert.match(themeCss,/#tdr-material-exchange-dom \.rx-note\{/);
const locales=read('src/game/i18n/playerUiExtra.js');
assert.ok(locales.includes("'recycler.feeDisclaimer':'Se aprovecha el {percent}% del valor entregado'"));
assert.ok(locales.includes("'recycler.feeDisclaimer':'Conversion uses {percent}% of the material value you give'"));
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
