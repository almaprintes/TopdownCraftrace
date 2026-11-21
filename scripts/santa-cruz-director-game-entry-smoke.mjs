import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAiLineGuides} from '../src/game/studio/trackAiLineGuides.js';
const source=JSON.parse(readFileSync(
 'src/game/tracks/library/santa-cruz/source/santa-cruz-ai-line-guides.json','utf8'));
const official=JSON.parse(readFileSync(
 'src/game/tracks/library/santa-cruz/track.json','utf8'));
const actual=official.meta?.aiLineGuides;
assert.equal(official.meta?.sourceFile,'Santa-Cruz-x3-nitido.tdrtrack');
assert.equal(official.meta?.imageNative?.availability,'published');
assert.equal(official.worldW,3072);
assert.equal(official.worldH,4608);
assert.equal(official.meta?.imageNative?.assetPath,
 'assets/tracks/santa-cruz/santa-cruz-official.webp');
assert.deepEqual(actual,normalizeAiLineGuides(source));
assert.equal(actual.points.length,10);
assert.ok(actual.points.every(p=>p.direction==='forward'));
const registry=readFileSync('src/game/tracks/trackRegistry.js','utf8');
assert.ok(registry.includes('meta:{...(json.meta||{})'), 'Registry must preserve author guides');
const installer=readFileSync('scripts/install-santa-cruz-source.mjs','utf8');
assert.ok(installer.includes("aiLineGuides,aiGuideSource:"));
const paddock=readFileSync('src/game/ui/adminPaddockView.js','utf8');
const hub=readFileSync('src/game/scenes/AdminHubScene.js','utf8');
const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
const preview=readFileSync('src/game/online/craftraceDirectorPreview.js','utf8');
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
for(const key of ['REALIZADOR GUIADO · SANTA CRUZ','handlers.santaCruzGuidedDirector'])
 assert.ok(paddock.includes(key));
for(const key of ["santaCruzGuidedDirector:()=>","trackKey:'santa-cruz'",
 "gameMode:'director',directorPreview:true","directorFromPaddock:true",
 "testMode:true","directorAiDifficulty:3"])
 assert.ok(hub.includes(key));
assert.ok(hub.includes("window.location.pathname.includes('/dev/')"));
assert.ok(race.includes('fromPaddockDirector:true'));
assert.ok(preview.includes('scene._returnSceneData?.fromPaddockDirector'));
assert.ok(preview.includes("bots.previewGuidedProfile?'G':'B'"));
assert.ok(director.includes('if(preview&&scene.track?.meta?.aiLineGuides?.points?.length)'));
assert.ok(director.includes('if(!this.preview||this.raceStarted'));
const room=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
assert.ok(!room.includes('previewGuidedProfile'));
assert.ok(!room.includes('santaCruzGuidedDirector'));
console.log('PASS Santa Cruz built-in photo and 10 author tips available to DEV Paddock Realizador; online untouched');
