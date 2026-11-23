import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
assert.ok(race.includes('// --- A) Tiempo principal (top-center)'),
 'Clock location must be accounted for in FPS positioning');
assert.ok(bridge.includes("perfHud.dataset.cr4PerfHud='true'"));
assert.ok(bridge.includes("'top:48%'"));
assert.ok(bridge.includes("'left:max(4px,env(safe-area-inset-left))'"));
assert.ok(!bridge.includes("'bottom:max(5px,env(safe-area-inset-bottom))'"),
 'Do not occupy landscape racing bottom touch-control zone');
assert.ok(!bridge.includes("'right:max(5px,env(safe-area-inset-right))'"));
assert.ok(bridge.includes("perfCompact=frameCount?fps+' FPS':'FPS · —';"));
assert.ok(bridge.includes('perfExpanded?perfDetails:perfCompact'));
assert.ok(bridge.includes("perfHud.addEventListener('click'"));
assert.ok(bridge.includes("perfHud.setAttribute('aria-expanded',String(perfExpanded))"));
assert.ok(bridge.includes("perfHud.title=perfDetails"));
assert.ok(bridge.includes('renderPerfHud();'));
assert.ok(bridge.includes("if(now-lastReport>=5000)"));
assert.ok(bridge.includes("console.info('[LIVE 4 PERF]',record)"));
assert.ok(bridge.includes('perfHud.remove()'));
console.log('PASS: compact FPS moves to left-middle, expands on tap, and 5-s telemetry persists without covering top stopwatch.');
