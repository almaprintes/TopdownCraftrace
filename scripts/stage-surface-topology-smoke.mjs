import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTrackRibbon } from '../src/game/tracks/TrackBuilder.js';

// Execute the real decorative pass with a recording Graphics sink. No copied
// geometry algorithm: a finish-to-start line emitted by create() fails this test.
const sourcePath = process.env.TDR_SURFACE_SOURCE || 'src/game/scenes/RaceSurfaceLongitudinalScene.js';
const source = fs.readFileSync(sourcePath, 'utf8').replace(/^import .*;\n/gm, '')
  .replace('export class RaceScene', 'class RaceScene');
const Scene = new Function('MaterialRaceScene', 'addCircuitEnvironment', 'console', `${source}\nreturn RaceScene;`)(
  class { create() {} }, () => {},
  { warn(...args) { throw new Error(args.join(' ')); } }
);
function render(meta, Renderer = Scene) {
  const scene = new Renderer();
  scene.track = { meta, closed: meta.closed !== false, geom: buildTrackRibbon(meta) };
  const before = JSON.stringify(scene.track, (_, value) => value instanceof Map ? [...value] : value);
  scene._rng = () => () => 0.5;
  scene.add = { graphics() {
    const g = { segments: [], paths: [], commands: [] };
    for (const method of ['setDepth', 'setScrollFactor', 'lineStyle', 'fillStyle', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'fillPath']) {
      g[method] = (...args) => {
        g.commands.push([method, ...args]);
        if (method === 'beginPath') { g.point = null; g.path = []; }
        if (method === 'moveTo' || method === 'lineTo') {
          if (method === 'lineTo' && g.point) g.segments.push([g.point, args]);
          g.point = args; g.path.push(args);
        }
        if (method === 'strokePath' || method === 'fillPath') g.paths.push(g.path);
        return g;
      };
    }
    return g;
  } };
  scene.create();
  assert.equal(JSON.stringify(scene.track, (_, value) => value instanceof Map ? [...value] : value), before,
    'decoration must not mutate route, gates, spawn, or surface geometry');
  return scene;
}
const arafo = JSON.parse(fs.readFileSync('src/game/tracks/library/rally-arafo-los-loros/track.json', 'utf8'));
const scene = render(arafo);
for (const key of ['_premiumShoulder', '_edgeProbe', '_cornerCurbs']) {
  const segments = scene[key].segments;
  assert(segments.length > 0, `${key} must still render`);
  const longest = Math.max(...segments.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])));
  console.log(`[stage-surface] ${key}: ${segments.length} segments, longest ${longest.toFixed(2)} px`);
  assert(longest < 150, `${key} draws a shortcut across Arafo (${longest} px)`);
}
assert.equal(scene._premiumShoulder.segments.length, scene.track.geom.center.length - 1);
const first = scene.track.geom.center[0], last = scene.track.geom.center.at(-1);
assert.deepEqual(scene._premiumShoulder.paths[0][0], [first.x, first.y]);
assert.deepEqual(scene._premiumShoulder.paths[0].at(-1), [last.x, last.y]);

// A closed circuit must retain its closing edge and all its surface decoration.
const circuit = JSON.parse(fs.readFileSync('src/game/tracks/library/karting-canarias/track.json', 'utf8'));
const closedScene = render(circuit);
const shoulder = closedScene._premiumShoulder;
assert.deepEqual(shoulder.paths[0][0], shoulder.paths[0].at(-1));
assert.equal(shoulder.segments.length, closedScene.track.geom.center.length);
if (process.env.TDR_SURFACE_CAPTURE) fs.writeFileSync(process.env.TDR_SURFACE_CAPTURE, JSON.stringify(
  ['_premiumShoulder', '_edgeProbe', '_cornerCurbs', '_longitudinalAsphaltWear'].map(key => closedScene[key].commands)));
console.log('[stage-surface] open Arafo has no closing decoration; authored geometry unchanged; closed circuit preserved');

if (process.env.TDR_SURFACE_BASELINE) {
  const oldSource = fs.readFileSync(process.env.TDR_SURFACE_BASELINE, 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export class RaceScene', 'class RaceScene');
  const OldScene = new Function('MaterialRaceScene', 'addCircuitEnvironment', `${oldSource}\nreturn RaceScene;`)(class { create() {} }, () => {});
  const oldCircuit = render(circuit, OldScene);
  for (const key of ['_premiumShoulder', '_edgeProbe', '_cornerCurbs', '_longitudinalAsphaltWear']) {
    assert.deepEqual(closedScene[key].commands, oldCircuit[key].commands, `${key}: closed circuit changed`);
  }
  console.log('[stage-surface] closed circuit draw commands exactly match pre-fix renderer');
}
