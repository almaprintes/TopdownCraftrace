// Protect Race Control's navigation labels from old single-line ellipsis CSS.
// All official normal/inverse track names must be readable without tapping
// or hovering; time and detailed metadata have separate grid areas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
const compact=readFileSync('src/game/scenes/StatsBroadcastCompactScene.js','utf8');
const names=readFileSync('src/game/tracks/trackPublicNames.js','utf8');
const gameModes=readFileSync('src/game/scenes/MenuGameModesScene.js','utf8');

assert.match(ui,/<strong class="br-circuit-name">\$\{esc\(trackName\(r\.trackId,lang\)\)\}<\/strong>/,
  'The COMPLETE public name, not shortened trackKey, should render in navigation');
assert.match(ui,/<small class="br-circuit-meta">/,'statistics must move to a separate row');
assert.match(ui,/<time class="br-circuit-best">/,'PB must not compete with the title horizontally');
assert.match(ui,/aria-pressed="\$\{r\.trackId===selected\.trackId\?'true':'false'\}"/,
  'keyboard/touch navigation should expose the selected circuit');
assert.match(ui,/data-br-track="\$\{esc\(r\.trackId\)\}"/,
  'record selection must preserve its exact normal/inverse identity');

assert.match(compact,/grid-template-areas:'number name name' 'number metadata best'/,
  'the name must span the entire right-hand width of the list row');
assert.match(compact,/\.br-grid\.br-grid-online \.br-circuit \.br-circuit-name\{[^}]*white-space:normal!important;overflow:visible!important;text-overflow:clip!important/,
  'compact CSS must override its old ellipsis rule for real circuit names');
assert.match(compact,/grid-template-columns:clamp\(246px,29vw,345px\) minmax\(0,1fr\)!important/,
  'wider navigation should keep the right-side board responsive');
assert.match(compact,/@media\(max-width:950px\)/,'small landscape layouts need a fallback');
assert.match(compact,/\.br-circuit\.active \.br-circuit-name/,'selected row stays visibly highlighted');
assert.ok(!ui.includes('trackName(r.trackId,lang).slice('),
  'names must never be cut in JavaScript');
for(const [id,name] of [
  ['karting-tenerife','KARTING TENERIFE INVERSO'],
  ['karting-tenerife-horario','KARTING TENERIFE'],
  ['karting-americas-inverso','KARTING AMÉRICAS INVERSO'],
  ['karting-canarias-4096-inverso','KARTING CANARIAS INVERSO'],
  ['santa-cruz-inverso','SANTA CRUZ INVERSO'],
  ['circuito-atlantico-inverso','CIRCUITO ATLÁNTICO INVERSO']
]) assert.ok(names.includes("'"+id+"':'"+name+"'"),'public label must remain complete: '+id);
assert.match(gameModes,/selectedCircuitRaceId\(trackKey,localStorage\)/,
  'navigation only changes layout, not timing or race direction');
console.log('PASS: Race Control circuit list exposes full Normal/Inverso names, independent metadata and best laps, accessible selected row and narrow-screen styling.');
