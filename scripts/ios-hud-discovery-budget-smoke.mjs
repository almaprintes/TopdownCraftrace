import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const fixed=readFileSync('src/game/scenes/RaceFixedScene.js','utf8');
const styled=readFileSync('src/game/scenes/RaceStyledHudScene.js','utf8');
// UI-camera translation and minimap/camera follow still execute every frame.
// Only full display-list discovery is throttled, with bounded delay for new UI.
assert.match(fixed,/time >= this\._fixedHudNextDiscoveryAt/);
assert.match(fixed,/this\._fixedHudNextDiscoveryAt = time \+ 400;/);
assert.match(fixed,/this\._pinHudToScreen\?\.\(\);\s*this\._pinMinimapMarker\?\.\(\);\s*this\._pinRaceInfoHud\?\.\(\);/);
// Do not turn the hidden legacy panel into 3 texture uploads per frame.
assert.match(fixed,/this\._raceHudTelemetry = \{ speedText, gearText: gear, surfaceText \};/);
assert.match(fixed,/if \(c\.visible === false\) return;/);
assert.match(styled,/const data = this\._raceHudTelemetry;/);
assert.match(styled,/data\?\.speedText \?\? src\._speedText\?\.text/);
assert.match(fixed,/c\._surfaceText\._tdrSurfaceColor !== surfaceColor/);
// Preserve dynamic dashboard & timer update, car physics and camera follow.
assert.match(fixed,/super\.update\(time, delta\)/);
assert.match(fixed,/this\._updateRaceInfoHud\?\.\(\)/);
console.log('PASS: UI discovery throttled and hidden v1 text uploads avoided');
