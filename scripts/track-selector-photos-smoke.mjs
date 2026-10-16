// Integration check: six authentic circuit photos, selectable DOM cards,
// hidden locked assets and lightweight image decoding on mobile.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import sharp from 'sharp';
import {TRACK_SELECTOR_PHOTO_PATHS,selectorPhotoUrl,selectorPhotoPath,selectorTrackKind} from '../src/game/tracks/trackSelectorPhotos.js';
const expected=[
  'circuito-atlantico','santa-cruz','karting-tenerife',
  'karting-canarias','karting-americas','rally-arafo-los-loros'
];
assert.deepEqual(Object.keys(TRACK_SELECTOR_PHOTO_PATHS),expected);
for(const id of expected){
  const local=selectorPhotoPath(id),f='public/'+local;
  assert.ok(existsSync(f),'Missing generated real circuit photo: '+f);
  const m=await sharp(f).metadata();
  assert.deepEqual([m.width,m.height,m.format],[900,600,'webp'],'Bad selector thumbnail: '+id);
  assert.ok(statSync(f).size<700000,'Image too heavy for mobile selector: '+id);
  assert.equal(selectorPhotoUrl(id,false,'/TopdownCraftrace/dev/'),
    '/TopdownCraftrace/dev/'+local);
  assert.equal(selectorPhotoUrl(id,true,'/TopdownCraftrace/dev/'),null);
  assert.equal(selectorPhotoPath(id,true),null);
}
assert.equal(selectorPhotoPath('unpublished-track'),null);
assert.equal(selectorTrackKind({id:'rally-arafo-los-loros'}),'RALLY');
assert.equal(selectorTrackKind({id:'karting-americas'}),'CIRCUIT');
assert.equal(selectorTrackKind({id:'karting-americas'},true),'LOCKED');
const source=readFileSync('src/game/scenes/TrackGarageProgressionScene.js','utf8');
assert.match(source,/selectorPhoto\(t,l\)/,'Rail cards must display the matching image');
assert.match(source,/selectorPhoto\(track,locked,true\)/,'Hero must show selected circuit photo');
assert.match(source,/selectorTrackKind\(track,locked\)/,'Rally styling must be scoped');
assert.match(source,/tdr-ts-card[^\n]*data-index/,'Cards must retain selection targets');
assert.match(source,/\.tdr-ts-select[^\n]*addEventListener\('click',\(\)=>this\._launchSelected\(\)\)/,
  'Original selection behavior must remain in place');
assert.match(source,/createAppHeader\(/,'Header/back/wallet remains intact');
assert.match(source,/this\._lockedTrack\(t\)/,'Do not reveal locked tracks');
assert.match(source,/disposeAppWallets\(root\)/,'Header wallet cleanup must remain intact');
const skin=readFileSync('src/game/ui/trackSelectorPhoto.css','utf8');
assert.match(skin,/#tdr-track-selector-dom \.tdr-ts-photo/);
assert.match(skin,/\.tdr-ts-preview\.has-photo/);
assert.match(skin,/@media\(max-width:760px\)/);
assert.match(skin,/@media\(max-height:510px\)/);
console.log('Selector photography OK: six matching 900x600 low-memory WebPs, locked concealed, rally styling, active preview, existing selection and responsive layouts.');
