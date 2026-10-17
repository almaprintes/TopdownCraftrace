// Integration check: six authentic circuit photos, selectable DOM cards,
// hidden locked assets and lightweight image decoding on mobile.
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
// No retired /beauty/ images for these three. Both official photos must be
// byte-exact to the photograph embedded in the latest TrackStudio source.
const builder=readFileSync('scripts/build-track-selector-photos.mjs','utf8');
for(const id of ['karting-tenerife','santa-cruz']){
  const source=id==='karting-tenerife'
    ?'src/game/tracks/library/karting-tenerife/source/Karting Tenerife.tdrtrack'
    :'src/game/tracks/library/santa-cruz/source/Santa-Cruz-x3-nitido.tdrtrack';
  const master='public/assets/tracks/'+id+'/'+id+'-official.webp';
  const archive=readFileSync(source);
  const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\\n');
  assert.ok(archive.subarray(0,magic.length).equals(magic),'Invalid latest .tdrtrack source: '+id);
  const index=archive.indexOf(10,magic.length),size=Number(archive.toString('ascii',magic.length,index));
  assert.ok(index>0&&size>100);
  const embedded=archive.subarray(index+1+size);
  const image=readFileSync(master);
  const sha=b=>createHash('sha256').update(b).digest('hex');
  assert.equal(sha(image),sha(embedded),'Selector must use current TrackStudio image: '+id);
  const published=JSON.parse(readFileSync('src/game/tracks/library/'+id+'/track.json','utf8'));
  assert.equal(published.meta?.renderMode,'image-native',id+' must use the current authored photo');
  assert.equal(published.meta?.sourceImageSha256,sha(image));
  assert.ok(builder.includes("'"+id+"':'assets/tracks/"+id+"/"+id+"-official.webp'"),
    'Selector source must match runtime image, not an old beauty preview: '+id);
  assert.ok(!builder.includes("'"+id+"':'assets/tracks/"+id+"/beauty/"),
    'Outdated beauty preview may not be shown: '+id);
}
assert.ok(builder.includes("'circuito-atlantico':'assets/tracks/track01/beauty/track01-beauty-preview.webp'"),
  'Leave Atlántico current selector thumbnail as-is until the owner supplies his prepared photo');
assert.ok(!builder.includes("renderAtlantico("),
  'No temporary replacement image should be created for Atlántico');
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
