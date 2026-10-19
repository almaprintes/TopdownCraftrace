import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {withRaceControlCreatorBadges} from '../src/game/online/raceControlOnline.js';
const read=p=>readFileSync(p,'utf8');
const sql=read('supabase/migrations/20261019_018_race_control_creator_badges.sql');
const online=read('src/game/online/raceControlOnline.js');
const board=read('src/game/scenes/StatsBroadcastScene.js');
assert.match(sql,/tr\.record_ref,p\.nick,res\.badge/,'identity-bound proof');
assert.match(sql,/join public\.profiles p on p\.user_id=tr\.user_id/);
assert.match(sql,/r\\.badge|'CREADOR'/,'creator only');
assert.match(sql,/res\.display_name collate "C"=p\.nick collate "C"/);
assert.match(sql,/auth\.uid\(\) is not null/);
assert.match(sql,/revoke all on function public\.get_track_creator_badges\(text\) from public, anon, authenticated/);
assert.match(sql,/grant execute on function public\.get_track_creator_badges\(text\) to authenticated/);
assert.match(online,/getRaceControlTrackCreatorBadges/);
assert.match(online,/\/rest\/v1\/rpc\/get_track_creator_badges/);
assert.match(online,/return applyRaceControlCreatorBadges\(id,ranking\)/);
const badgeRef='aaa-bbb-ccc';
const winners=[
 {scope:'global',record_ref:badgeRef,nick:'JUANFRIKAZO_DEV',rank:1,ghost_available:true,is_me:true},
 {scope:'country',record_ref:badgeRef,nick:'JUANFRIKAZO_DEV',rank:1,ghost_available:true,is_me:true},
 {scope:'global',record_ref:'other',nick:'MERCHITA',rank:2,ghost_available:false,is_me:false}
];
const verified=[{record_ref:badgeRef,nick:'JUANFRIKAZO_DEV',badge:'CREADOR'}];
const enriched=withRaceControlCreatorBadges(winners,verified);
assert.equal(enriched[0].creator_badge,'CREADOR');
assert.equal(enriched[1].creator_badge,'CREADOR');
assert.equal(enriched[2].creator_badge,null);
assert.ok(enriched.every(r=>r.creator_badge_checked===true));
assert.ok(enriched[0].ghost_available&&enriched[0].is_me,'existing ghost ownership untouched');
const impostor=withRaceControlCreatorBadges([{record_ref:'other',nick:'JUANFRIKAZO_DEV'}],verified);
assert.equal(impostor[0].creator_badge,null,'nick alone never authenticates RPC rows');
assert.equal(withRaceControlCreatorBadges([{record_ref:badgeRef,nick:'FAKE'}],verified)[0].creator_badge,null);
const publicSnapshot=withRaceControlCreatorBadges([{record_ref:null,nick:'JUANFRIKAZO_DEV'},{record_ref:null,nick:'MERCHITA'}],verified);
assert.equal(publicSnapshot[0].creator_badge,'CREADOR');
assert.equal(publicSnapshot[1].creator_badge,null);
assert.equal(withRaceControlCreatorBadges([{record_ref:null,nick:'JUANFRIKAZO_DEV'}],
 [{record_ref:badgeRef,nick:'JUANFRIKAZO_DEV',badge:'VERIFICADO'}])[0].creator_badge,null);
assert.match(board,/r\.creator_badge==='CREADOR'/,'only server-verified badge is drawn');
assert.match(board,/✓ CREADOR/);
assert.match(board,/getRaceControlTrackCreatorBadges\(selected\.trackId\)/,'legacy cached rows auto-hydrate');
assert.match(board,/this\._raceControlBadgeRequests=new Set\(\)/,'bounded one request per track');
assert.match(board,/saveCloudSnapshot\(selected\.trackId,withRaceControlCreatorBadges\(latest,badges\)\)/);
assert.match(board,/br-creator-badge/,'badge has distinct visual treatment');
for(const f of ['src/game/online/raceControlOnline.js','src/game/scenes/StatsBroadcastScene.js'])
 execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
console.log('Race Control: owner-authenticated creator badge, ref matching, public fallback, cached rankings, no false nick badge OK');
