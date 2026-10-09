import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { androidFrameBudget } from '../src/game/performance/androidFrameBudget.js';
assert.deepEqual(androidFrameBudget('performance',true),{targetFps:30,limit:30});
assert.deepEqual(androidFrameBudget('medium',true),{targetFps:45,limit:45});
assert.deepEqual(androidFrameBudget('high',true),{targetFps:60,limit:60});
assert.deepEqual(androidFrameBudget('ultra',true),{targetFps:60,limit:60});
assert.deepEqual(androidFrameBudget('garbage',true),{targetFps:60,limit:60});
for(const preset of ['performance','medium','high','ultra']){
  assert.deepEqual(androidFrameBudget(preset,false),{targetFps:60,limit:0},
    'iPhone and non-Android web unaffected');
}
const game=readFileSync(new URL('../src/game/game.js',import.meta.url),'utf8');
assert.match(game,/androidFrameBudget\(preset,android\)\.targetFps/);
assert.match(game,/limit:frameLimit/);
assert.match(game,/frameLimit=androidDevice\?targetFps:0/);
assert.match(game,/powerPreference:'high-performance'/,
  'GPU renderer policy stays unchanged for A/B profiling');
console.log('Android battery frame-limit smoke: OK (30/45/60 FPS; iOS unchanged)');
