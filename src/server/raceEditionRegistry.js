// Authority-side-only contract for official editions. Never import this module
// into a browser/mobile bundle. This pilot does NOT mark any record verified.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildTenerifeJudgeGeometry,reviewTenerifeGhost}
  from '../game/online/serverGeometryJudge.js';

const TRUSTED_IDS=Object.freeze([
  'karting-tenerife','karting-tenerife-horario'
]);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validHash=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const fileJson=url=>JSON.parse(readFileSync(url,'utf8'));
const repoFile=path=>new URL('../../'+path,import.meta.url);

/**
 * Pin geometry to an explicitly approved edition. CI MUST FAIL if a track
 * changes without a deliberate manifest revision. A caller can NEVER supply
 * a "verified" geometry hash; it is loaded from a trusted server checkout.
 *
 * trackJson + manifest parameters are solely for deterministic unit tests.
 */
export function buildTrustedEditionRegistry({
  trackJson=fileJson(repoFile('src/game/tracks/library/karting-tenerife/track.json')),
  manifest=fileJson(repoFile('config/online-trusted-editions.json'))
}={}){
  if(manifest?.schema!==1||manifest.authority!=='server-controlled-repository-manifest'
    ||manifest.scope!=='SHADOW_ONLY_NO_PRODUCTION_HOMOLOGATION')
    throw Error('Unrecognized official edition manifest');
  if(!same(Object.keys(manifest.editions||{}).sort(),[...TRUSTED_IDS].sort()))
    throw Error('Unexpected track editions: approval required before publishing');
  const editions={};
  for(const id of TRUSTED_IDS){
    const approved=manifest.editions[id];
    if(!approved||approved.status!=='shadow'||approved.physicsRevision!==null||
      !validHash(approved.geometrySha256)||
      !/^tenerife-(legacy|clockwise)-geometry-[0-9]{8}$/.test(approved.edition))
      throw Error('Edition '+id+' is not approved for shadow testing');
    const geometry=buildTenerifeJudgeGeometry(trackJson,{trackId:id});
    if(geometry.geometrySha256!==approved.geometrySha256)
      throw Error('OFFICIAL GEOMETRY DRIFT '+id+
        ': preserve historic records and approve a NEW edition; do not silently reuse the ID');
    const expectedOrder=id==='karting-tenerife'
      ?['CP1','CP2','FINISH']:['CP2','CP1','FINISH'];
    if(!same(approved.checkpointOrder,expectedOrder))
      throw Error('Official checkpoint order altered: '+id);
    editions[id]=Object.freeze({
      id,edition:approved.edition,
      geometrySha256:geometry.geometrySha256,
      physicsRevision:approved.physicsRevision,
      status:'shadow',judgeGeometry:geometry
    });
  }
  return Object.freeze(editions);
}

/**
 * A diagnostic, NOT authoritative adjudication. Returning "shadow-pass"
 * never means official/verified; even a perfect ghost can be fabricated.
 * Existing records have no server-authenticated edition provenance.
 */
export function shadowReviewOfficialRace({
  registry,trackId,ghost,claimedGeometrySha256=null,historical=false
}={}){
  const id=String(trackId||'');
  const entry=registry?.[id];
  if(!entry)return {status:'unsupported',reasons:['unapproved_edition']};
  if(entry.status!=='shadow'||entry.physicsRevision!==null)
    return {status:'unsupported',reasons:['unexpected_authority_state']};
  const base={trackId:id,edition:entry.edition,
    geometrySha256:entry.geometrySha256,physicsRevision:null};
  // No version proof in previously published ghosts. Treat as historical
  // regardless of any attacker-provided revision string, even if it matches.
  if(historical)return {...base,status:'historical-unversioned',
    reasons:['server_authenticated_edition_missing']};
  if(!ghost)return {...base,status:'unverified-no-ghost',
    reasons:['ghost_required_for_geometric_audit']};
  const result=reviewTenerifeGhost(ghost,entry.judgeGeometry);
  // Ignore claimedGeometrySha256 entirely: an attacker can copy the hash.
  void claimedGeometrySha256;
  return {...base,status:result.status==='pass'?'shadow-pass':
    result.status==='review'?'shadow-review':result.status,
    reasons:result.reasons||[],diagnostics:result.diagnostics||null};
}
