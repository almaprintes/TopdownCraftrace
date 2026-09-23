import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const assetUrl = new URL('../public/assets/audio/engine/ignition/car_engine_start.wav', import.meta.url);
const asset = await readFile(assetUrl);
const assetStat = await stat(assetUrl);
assert.ok(assetStat.size > 100_000, 'local ignition WAV must be present and non-trivial');
assert.equal(asset.subarray(0, 4).toString('ascii'), 'RIFF');
assert.equal(asset.subarray(8, 12).toString('ascii'), 'WAVE');

const scene = await readFile(new URL('../src/game/scenes/RaceEmbeddedReplaySceneV2.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../src/game/audio/CarEngineSampleRuntime.js', import.meta.url), 'utf8');

assert.match(scene, /IGNITION_TO_LIGHTS_MS/, 'common race scene must own the ignition-to-lights transition');
assert.match(scene, /if\(!embeddedRequested&&!this\._tdrEmbeddedReplay\)/, 'embedded replays must not install ignition audio');
assert.equal((scene.match(/_tdrEngineSample\?\.startEngine\?\.\(\)/g) || []).length, 1, 'race ignition button must be the only startEngine trigger');

const handlerStart = scene.indexOf('const start=(ev)=>');
const handlerEnd = scene.indexOf("btn.addEventListener('pointerup',start", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'ARRANCAR MOTOR handler must remain installed');
const handler = scene.slice(handlerStart, handlerEnd);
const disabledAt = handler.indexOf('btn.disabled=true');
const vibrationAt = handler.indexOf('navigator.vibrate');
const engineAt = handler.indexOf('_tdrEngineSample?.startEngine?.()');
const timerAt = handler.indexOf('this.time.delayedCall(IGNITION_TO_LIGHTS_MS');
const lightsAt = handler.indexOf('this._tdrBeginLights()');
assert.ok(disabledAt >= 0 && disabledAt < vibrationAt && vibrationAt < engineAt, 'button must lock before vibration and engine start');
assert.ok(engineAt < timerAt && timerAt < lightsAt, 'lights must begin after the ignition event');

assert.match(runtime, /assets\/audio\/engine\/ignition\/car_engine_start\.wav/);
assert.match(runtime, /audio\.master \* audio\.engine/, 'ignition must respect the game master and engine levels');
assert.match(runtime, /IGNITION_ENGINE_FADE_START_MS/);
assert.match(runtime, /IGNITION_ENGINE_FADE_END_MS/);
assert.match(runtime, /_ignitionSource\?\.stop/, 'ignition audio must be cleaned up with the race runtime');
assert.doesNotMatch(runtime, /new Audio\s*\(/, 'ignition must use the shared WebAudio runtime, not a fixed-volume HTML audio element');

console.log(`ignition audio smoke: verified · ${assetStat.size} bytes`);
