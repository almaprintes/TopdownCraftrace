import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const physics=readFileSync('src/game/scenes/RaceWeightTransferScene.js','utf8');
const base=readFileSync('src/game/scenes/RaceScene.js','utf8');
const settings=readFileSync('src/game/scenes/SettingsWheelModeScene.js','utf8');
const hud=readFileSync('src/game/scenes/RaceHandbrakeScene.js','utf8');
const clean=readFileSync('src/game/scenes/RaceCleanLapScene.js','utf8');
const ghost=readFileSync('src/game/scenes/RaceGhostModeScene.js','utf8');
const rewards=readFileSync('src/game/scenes/RaceSessionRewardsScene.js','utf8');

// Verify comparison modifies ONLY the already-existing neutral tyre lateral
// deceleration. It never rotates car yaw, teleports it or follows a road.
assert.match(physics,/stableSurface && Math\.abs\(steer\) < 0\.055 && trueKmh > 5/);
assert.match(physics,/const stableTestB=this\._physicsABPractice===true/);
assert.match(physics,/!this\._tdrHandbrake && this\._onTrack!==false/);
assert.match(physics,/this\.track\?\.closed!==false && this\.track\?\.meta\?\.raceType!=='stage'/);
assert.match(physics,/const alignRate = \(1\.8 \+ 2\.6 \* alignLoad\) \* \(stableTestB \? 1\.45 : 1\)/);
assert.match(physics,/vL \*= Math\.exp\(-alignRate \* dt\)/);
const baseRate=1.8+2.6*.7,dt=1/60,slip=72,forward=220;
const a=slip*Math.exp(-baseRate*dt);
const b=slip*Math.exp(-baseRate*1.45*dt);
assert.ok(b<a&&a<slip,'B reduces sideways slide more than A');
assert.ok(b>slip*.85,'B does not snap sideways velocity to zero in one frame');
const f=Math.cos(.5),g=Math.sin(.5),r=-g,h=f;
const vxBefore=f*forward+r*slip,vyBefore=g*forward+h*slip;
const vxB=f*forward+r*b,vyB=g*forward+h*b;
const afterForward=vxB*f+vyB*g;
assert.ok(Math.abs(afterForward-forward)<1e-9,'Forward speed component stays unchanged');
assert.ok(Math.hypot(vxB,vyB)<Math.hypot(vxBefore,vyBefore),'Only lateral slip dissipates');

assert.match(base,/this\._physicsABMode='A'/);
assert.match(base,/if\(selected==='B'/);
assert.match(base,/this\._physicsABPractice=this\._physicsABMode==='B'/);
assert.match(base,/const abPracticePrefix=\`tdr2:physicsAB:B:/);
assert.match(base,/this\\.ttHistKey = this\\._physicsABPractice/);
assert.match(base,/this\\.ttKey = this\\._physicsABPractice/);
assert.match(base,/\\$\\{abPracticePrefix\\}:laps/);
assert.match(base,/\\$\\{abPracticePrefix\\}:best/);
assert.doesNotMatch(base,/ab-practice-b:/);
assert.match(base,/!this\._testMode && !this\._physicsABPractice/);
assert.match(settings,/data-physics-ab/);
assert.match(settings,/c\.physicsAB=b\.dataset\.physics==='B'\?'B':'A'/);
assert.match(hud,/tdr-physics-ab-practice-label/);
assert.match(hud,/FÍSICA B · PRUEBA · SIN RÉCORDS/);
assert.match(clean,/if\(this\._physicsABPractice\)/);
assert.match(ghost,/if\(this\._physicsABPractice\)/);
assert.match(rewards,/if\(this\._physicsABPractice\)/);
console.log('PASS: Physics A/B neutral stability only; A same as production, B dissipates lateral slip 45% faster; official PB/ghost/clean missions isolated');
