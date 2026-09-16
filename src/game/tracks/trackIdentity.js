import { TRACK_REGISTRY } from './trackRegistry.js';

// Production identities. Development-era names are intentionally not accepted:
// pre-release test records/ghosts may be discarded instead of becoming permanent debt.
export const CANONICAL_TRACK_IDS=Object.freeze({
  ATLANTICO:'circuito-atlantico'
});

export function canonicalTrackId(trackOrId){
  return String(typeof trackOrId==='string'?trackOrId:(trackOrId?.key||trackOrId?.id||'')).trim();
}

export function resolveTrack(trackOrId){
  return TRACK_REGISTRY[canonicalTrackId(trackOrId)]||null;
}

export { TRACK_REGISTRY };
