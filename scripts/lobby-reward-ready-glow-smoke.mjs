// A ready gift/video is indicated by an external beveled glow; only the
// existing storeEconomy cooldown status is allowed to switch that glow on.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync('src/game/ui/LobbyDomUi.js','utf8');
const css=readFileSync('src/game/ui/lobby-dom.css','utf8');
assert.match(ui,/const status=kind==='daily'\?dailyStatus\(\):rewardedStatus\(\)/);
assert.match(ui,/button\.classList\.toggle\('is-ready',ready\)/);
assert.match(ui,/button\.parentElement\?\.classList\.toggle\('is-ready',ready\)/);
assert.match(ui,/button\.parentElement\?\.classList\.toggle\('is-cooling',!ready\)/);
assert.match(ui,/slot\.append\(button\)/);
assert.match(ui,/return slot;\n}\nconst ctaCountdown/);
assert.match(ui,/button\.addEventListener\('click',\(\)=>scene\._openStoreModal\?\.\('rewards'\)\)/);
assert.match(css,/\.tdr-lobby-dom \.tdr-lobby-reward-slot\{/);
assert.match(css,/\.tdr-lobby-reward-slot--video\{--tdr-halo-color:#70dcff\}/);
assert.match(css,/--tdr-halo-color:#ffd45b/);
assert.match(css,/\.tdr-lobby-reward-slot\.is-ready::before\{/);
assert.match(css,/\.tdr-lobby-reward-slot\.is-ready::after\{/);
assert.match(css,/@keyframes tdr-lobby-ready-aura/);
assert.match(css,/@keyframes tdr-lobby-ready-edge/);
assert.match(css,/\.tdr-lobby-reward-slot::before,.tdr-lobby-reward-slot::after\{[\s\S]*?pointer-events:none/);
assert.match(css,/\.tdr-lobby-reward-slot--daily::before,.tdr-lobby-reward-slot--daily::after/);
assert.match(css,/\.tdr-lobby-reward-slot--video::before,.tdr-lobby-reward-slot--video::after/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(css,/\.tdr-lobby-reward-slot\.is-ready::before\{animation:none;opacity:.58\}/);
assert.match(css,/\.tdr-lobby-reward-slot\.is-ready::after\{animation:none;opacity:1\}/);
assert.match(ui,/button\.classList\.toggle\('is-cooling',!ready\)/);
assert.ok(!css.includes('.tdr-lobby-reward-slot.is-cooling::before'));
console.log('Lobby reward buttons: independent gold/blue ready-only contour, reduced-motion fallback and existing store actions verified.');
