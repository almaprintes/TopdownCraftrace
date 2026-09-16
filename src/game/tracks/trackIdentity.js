import { TRACK_REGISTRY as RAW_TRACK_REGISTRY } from './trackRegistry.js';

// Canonical circuit identities live here. Legacy ids stay readable so old
// saves, ghosts, records and environment data keep working during migration.
export const CANONICAL_TRACK_IDS=Object.freeze({
  ATLANTICO:'circuito-atlantico'
});

const LEGACY_TO_CANONICAL=Object.freeze({
  track01:CANONICAL_TRACK_IDS.ATLANTICO
});
const CANONICAL_TO_LEGACY=Object.freeze(Object.fromEntries(
  Object.entries(LEGACY_TO_CANONICAL).map(([legacy,canonical])=>[canonical,legacy])
));

export function canonicalTrackId(trackOrId){
  const raw=String(typeof trackOrId==='string'?trackOrId:(trackOrId?.key||trackOrId?.id||'')).trim();
  return LEGACY_TO_CANONICAL[raw]||raw;
}

export function legacyTrackId(trackOrId){
  const canonical=canonicalTrackId(trackOrId);
  return CANONICAL_TO_LEGACY[canonical]||canonical;
}

export function trackIdAliases(trackOrId){
  const canonical=canonicalTrackId(trackOrId);
  const legacy=CANONICAL_TO_LEGACY[canonical];
  return legacy?[canonical,legacy]:[canonical];
}

// Phase 1 of the Atlántico migration: expose the canonical id immediately,
// while both ids resolve to the exact same track object. Keeping the object's
// current key/id untouched is deliberate: existing storage keys remain valid
// until every persistence consumer has been migrated to alias-aware reads.
for(const [legacy,canonical] of Object.entries(LEGACY_TO_CANONICAL)){
  const track=RAW_TRACK_REGISTRY[legacy];
  if(!track)continue;
  RAW_TRACK_REGISTRY[canonical]=track;
  track.meta={...(track.meta||{}),canonicalId:canonical,legacyIds:[legacy]};
}

export function resolveTrack(trackOrId){
  for(const id of trackIdAliases(trackOrId)){
    if(RAW_TRACK_REGISTRY[id])return RAW_TRACK_REGISTRY[id];
  }
  return null;
}

export const TRACK_REGISTRY=RAW_TRACK_REGISTRY;
