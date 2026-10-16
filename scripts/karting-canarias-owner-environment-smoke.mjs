// Karting Canarias: latest owner-exported invisible barriers on the 2048x3072 native photo.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validCollisionLine,sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';
import {validCollisionZone,compileCollisionZone,pointInsidePolygon} from '../src/game/environment/FreehandCollisionZones.js';

const path='src/game/tracks/library/karting-canarias/karting-canarias.environment.json';
const bytes=readFileSync(path);
const env=JSON.parse(bytes);
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias/track.json','utf8'));
const digest=createHash('sha256').update(bytes).digest('hex');
assert.equal(digest,'8ee5ca3f1b6e71baa3f87fd6d420e1d9c3c95e92101831c89c1455a535d59654',
  'The original Environment Studio export must not be edited or rescaled');
assert.equal(env.version,7);
assert.equal(env.trackId,'karting-canarias');
assert.equal(env.baseTrack?.id,env.trackId);
assert.equal(env.baseTrack?.locked,true);
assert.equal(env.repositoryPath,path);
for(const key of ['environment','surfaces','linearBarriers'])assert.deepEqual(env[key],[],key);
assert.deepEqual(env.materials,{});
assert.equal(track.meta?.renderMode,'image-native');
assert.equal(track.meta?.imageNative?.availability,'published');
assert.deepEqual([track.worldW,track.worldH],[2048,3072]);

assert.equal(env.collisionLines.length,5,'Owner exported five pen barriers');
assert.equal(env.collisionZones.length,1,'Owner exported one solid zone');
assert.equal(env.collisionLines.reduce((sum,l)=>sum+l.nodes.length,0),19);
assert.equal(env.collisionZones[0].points.length,17);
assert.equal(new Set(env.collisionLines.map(l=>l.id)).size,5);

function distanceToSegment(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;
  const t=len2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/len2)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
const route=track.centerline;
for(const l of env.collisionLines){
  assert.equal(l.type,'collision');
  assert.equal(l.halfThickness,9);
  assert.ok(validCollisionLine(l),'Invalid authored pen: '+l.id);
  const points=sampleCollisionLine(l,18);
  assert.ok(points.length>l.nodes.length,'Spline must compile to physics segments');
  assert.ok(points.every(p=>p.x>=0&&p.x<2048&&p.y>=0&&p.y<3072),
    'Pen nodes must remain in native image pixel space');
  let nearest=Infinity;
  for(const p of route){
    for(let i=1;i<points.length;i++)
      nearest=Math.min(nearest,distanceToSegment(p,points[i-1],points[i]));
  }
  assert.ok(nearest>35,'Pen blocks the racing centerline, nearest '+nearest+': '+l.id);
}
const zone=env.collisionZones[0];
assert.equal(zone.solid,true);
assert.ok(validCollisionZone(zone),'Owner solid zone must be a simple polygon');
assert.ok(compileCollisionZone(zone),'Solid collision zone must compile');
assert.ok(zone.points.every(p=>p.x>=0&&p.x<2048&&p.y>=0&&p.y<3072));
for(const [i,p] of route.entries())
  assert.ok(!pointInsidePolygon(zone.points,p),'Solid zone blocks route at point '+i);
const gateMid=g=>({x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2});
for(const p of [track.start,gateMid(track.finishLine),...track.checkpoints.map(gateMid)])
  assert.ok(!pointInsidePolygon(zone.points,p),'Solid zone must not block the start or race gates');

const race=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.match(race,/isImageNativeTrackScene\(scene\)[\s\S]*?'karting-canarias'[\s\S]*?\.includes\(normalizeTrackKey\(scene\?\.trackKey\)\)/,
  'Only official photo-native Karting Canarias may install authored collisions');
assert.match(race,/for\(const line of env\.collisionLines\|\|\[\]\)/);
assert.match(race,/const solidZones=\(env\.collisionZones\|\|\[\]\)\.map\(compileCollisionZone\)/);
assert.match(race,/resolveBodyAgainstColliders\(scene,player,scene\.carRig\)/);
assert.match(race,/resolveBodyAgainstSolidZones\(scene,player\)/);
assert.match(race,/resolveBodyAgainstSolidZones\(scene,ai\?\.body\)/);
const wide=readFileSync('src/game/scenes/RaceWideCameraPreviewScene.js','utf8');
assert.match(wide,/if \(this\.track\?\.meta\?\.renderMode !== 'image-native'\) \{[\s\S]*?installKartingCanariasDividers\(this\)/,
  'Legacy 2000x4300 dividers must stay disabled over the new collision environment');
console.log('Karting Canarias owner environment OK: 5 pens, 19 nodes, 1 valid 17-vertex solid zone, no racing-line obstruction, native-photo runtime collisions enabled.');
