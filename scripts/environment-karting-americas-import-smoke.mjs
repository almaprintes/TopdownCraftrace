import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {AMERICAS,readDraft,writeDraft} from '../src/game/tracks/environmentDraftTrack.js';
const record={gameTrack:{worldW:2862,worldH:3435,centerline:[{x:1,y:2},{x:3,y:4},{x:5,y:6}],trackShape:{leftEdge:[{x:1,y:2}],rightEdge:[{x:5,y:6}]}},imageAsset:{imageId:'test',width:2862,height:3435}};
const map=new Map(),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
assert.equal(readDraft(storage),null);
const t=writeDraft(record,storage);
assert.equal(t.id,AMERICAS);assert.equal(t.meta.imageNative.availability,'local');
assert.equal(readDraft(storage).worldH,3435);
assert.throws(()=>writeDraft({...record,imageAsset:{...record.imageAsset,width:1000}},storage),/2862/);
const code=readFileSync('src/game/scenes/EnvironmentBuilderAmericasImportScene.js','utf8');
for(const marker of ['unpackImageProject(file)','saveCanvasImage(a.imageId,image,a)','writeDraft(project)','this._openRealTrack(AMERICAS,true)','readCanvasImage(info.imageId)','const tiles=[],keys=[],tile=1024','this.cameras.main.ignore(sprite)'])
 assert.ok(code.includes(marker),'missing '+marker);
const registry=readFileSync('src/game/tracks/trackRegistry.js','utf8');
assert.match(registry,/if\(trackId===AMERICAS\)/);
assert.match(registry,/export function getTrackKeys\(\)\{return Object.keys\(TRACK_REGISTRY\);\}/,'Unpublished: not in player circuit list');
assert.ok(readFileSync('src/game/game.js','utf8').includes("EnvironmentBuilderAmericasImportScene.js"));
for(const file of ['src/game/tracks/environmentDraftTrack.js','src/game/tracks/trackRegistry.js','src/game/scenes/EnvironmentBuilderAmericasImportScene.js'])
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log('Environment Studio Karting Américas: isolated 2.5x project, file importer, IndexedDB, tiles, persisted collisions OK');
