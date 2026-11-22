// DEV regression: catalog grouping, duplicate names, reversed IDs,
// mobile picker wiring, per-track persistence, and geometry-safe recovery.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAiTrackCatalog,filterAiTrackCatalog,readAiTrackDraft,
 saveAiTrackDraft,aiTrackStatus,circuitSignature} from
 '../src/game/studio/trackStudioGameTrackCatalog.js';
import {openTrackStudioGameTrackCatalog} from
 '../src/game/studio/trackStudioGameTrackPicker.js';

const data={
 'karting-canarias-4096':{name:'KARTING CANARIAS',group:'Karting'},
 'karting-canarias-4096-inverso':{name:'KARTING CANARIAS INVERSO',
  meta:{reverseOf:'karting-canarias-4096',variant:'inverse'}},
 'karting-canarias-inverso':{name:'KARTING CANARIAS INVERSO',
  meta:{reverseOf:'karting-canarias',hiddenFromTrackSelect:true,variant:'inverse'}},
 'santa-cruz':{name:'SANTA CRUZ'},
 'imola':{name:'IMOLA'},
 'area-de-pruebas':{name:'ÁREA DE PRUEBAS'},
 'karting-tenerife-horario':{name:'KARTING TENERIFE',
  meta:{reverseOf:'karting-tenerife',variant:'clockwise'}}
};
const points=[{x:100,y:50},{x:220,y:50},{x:200,y:180},{x:100,y:50}];
const make=id=>({id,key:id,...data[id],centerline:points,worldW:400,
 worldH:300,trackWidth:90,closed:true,raceDirection:'forward'});
const keys=Object.keys(data);
const entries=buildAiTrackCatalog(keys,make);
assert.equal(entries.length,keys.length);
assert.equal(entries.find(e=>e.id==='imola').group,'FormulaRace');
assert.equal(entries.find(e=>e.id==='santa-cruz').group,'CraftRace');
assert.equal(entries.find(e=>e.id==='area-de-pruebas').group,'Pruebas');
assert.equal(entries.find(e=>e.id==='karting-tenerife-horario').direction,'Horario');
const duplicates=entries.filter(e=>e.name==='KARTING CANARIAS INVERSO');
assert.equal(duplicates.length,2);
assert.notEqual(duplicates[0].displayName,duplicates[1].displayName);
assert.equal(filterAiTrackCatalog(entries,{query:'inverso'}).length,1,
 'Hide retired technical duplicate by default');
assert.equal(filterAiTrackCatalog(entries,{query:'inverso',showHidden:true}).length,2);
assert.equal(filterAiTrackCatalog(entries,{group:'FormulaRace'}).length,1);
assert.equal(filterAiTrackCatalog(entries,{query:'SANTA cruz'}).length,1);

const map=new Map();
const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
const circuit=entries.find(e=>e.id==='santa-cruz');
assert.equal(aiTrackStatus(storage,circuit),'pending');
const guides=[{id:'g1',x:130,y:72,strength:.7,radiusPx:35}];
const bezier={version:1,closed:true,nodes:[{x:120,y:80},{x:220,y:80},{x:180,y:180}]};
saveAiTrackDraft(storage,circuit.id,circuit.signature,guides,bezier);
assert.equal(aiTrackStatus(storage,circuit),'editing');
saveAiTrackDraft(storage,circuit.id,circuit.signature,guides,bezier,{validated:true});
assert.equal(aiTrackStatus(storage,circuit),'validated');
saveAiTrackDraft(storage,circuit.id,circuit.signature,guides,bezier);
assert.equal(aiTrackStatus(storage,circuit),'validated','Same content retains validation');
saveAiTrackDraft(storage,circuit.id,circuit.signature,[...guides,{...guides[0],id:'g2'}],bezier);
assert.equal(aiTrackStatus(storage,circuit),'editing','Updated nodes invalidate status');
assert.equal(readAiTrackDraft(storage,circuit.id).guides.points.length,2);
assert.equal(readAiTrackDraft(storage,'imola'),null);
assert.throws(()=>saveAiTrackDraft(storage,circuit.id,'changed',guides,bezier),
 /otra geometría/);
const different=make('santa-cruz');different.centerline=[...points,{x:99,y:48}];
assert.notEqual(circuitSignature(different),circuit.signature);

const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const picker=readFileSync('src/game/studio/trackStudioGameTrackPicker.js','utf8');
assert.ok(scene.includes('openTrackStudioGameTrackCatalog(this,getTrackKeys(),id=>TRACK_REGISTRY[id],createTrack)'));
assert.ok(scene.includes('installAiTrackCatalogPersistence(this)'));
assert.ok(scene.includes('catalogTrackId: this._catalogTrackId || null'));
assert.ok(scene.includes('this._closeGameTrackCatalog?.()'));
assert.ok(!scene.includes("window.prompt(\`CIRCUITOS DEL JUEGO"));
assert.ok(picker.includes("input.type='search'"));
assert.ok(picker.includes('draft.signature!==entry.signature'));
assert.ok(picker.includes('scene._catalogHydrating=true'));
assert.ok(picker.includes("scene._autosaveRecovery?.()"));
assert.equal(typeof openTrackStudioGameTrackCatalog,'function');
console.log('PASS Track Studio AI catalog: unique IDs, filter, variants, local draft isolation, validation invalidation, source safety and mobile selector.');
