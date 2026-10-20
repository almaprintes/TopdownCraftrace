import assert from 'node:assert/strict';
import fs from 'node:fs';

const native = fs.readFileSync('src/game/tracks/imageNativeRaceLoader.js', 'utf8');
const visual = fs.readFileSync('src/game/ui/griplineNativeLoading.js', 'utf8');

for (const path of [
  'public/assets/ui/loading/gripline-loader-body.webp',
  'public/assets/ui/loading/gripline-loader-wheel.webp'
]) {
  const file = fs.readFileSync(path);
  assert.ok(file.length > 500 && file.length < 20000, path + ' is missing or oversized');
  assert.equal(file.toString('ascii', 0, 4), 'RIFF', path);
  assert.equal(file.toString('ascii', 8, 12), 'WEBP', path);
}
assert.match(native, /mountGriplineNativeLoading\(panel\)/);
assert.match(native, /CARGANDO CIRCUITO/);
assert.doesNotMatch(native, /title\.textContent='CARGANDO FOTOGRAFÍA'/);
assert.match(native, /tdr-native-gate-error/);
assert.match(native, /RECUPERAR FOTOGRAFÍA/);
assert.match(native, /repairImageNativePhoto\(desc,file\)/);
assert.match(native, /gate\.close\(\)/);
assert.match(visual, /gripline-loader-body\.webp/);
assert.match(visual, /gripline-loader-wheel\.webp/);
assert.match(visual, /tdr-gripline-wheel-spin/);
assert.match(visual, /tdr-gripline-road-left/);
assert.match(visual, /tdr-gripline-wheel-spin \.26s linear infinite/,'Tires should rotate three times faster to suggest speed');
assert.match(visual, /tdr-gripline-road-left \.24s linear infinite/,'Road moves fast to the left');
assert.match(visual, /tdr-gripline-trail-left \.31s linear infinite/,'Air streaks behind the car convey acceleration');
assert.match(visual, /rig\.append\(road, speed, wheel\('rear'\), wheel\('front'\), car\)\)/,'Visual layers under the stationary body');
assert.match(visual, /tdr-native-gripline-speed:before,#tdr-native-gate \.tdr-native-gripline-speed:after\{animation:none/,'Reduced-motion preference covers all motion layers');
assert.doesNotMatch(visual, /tdr-native-gripline-car\{[^}]*animation/,'Car stays fixed and centered');
assert.match(visual, /prefers-reduced-motion/);
assert.doesNotMatch(visual, /requestAnimationFrame|setInterval|setTimeout|new Phaser\.Scene/);
console.log('Gripline photo loading gate smoke: OK');
