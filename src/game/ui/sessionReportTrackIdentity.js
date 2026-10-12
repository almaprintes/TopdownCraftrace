// The selected race identity is authoritative for session reports and exports.
// Metadata from older TrackStudio projects or a previous scene may be stale.
export function resolveSessionReportTrackName(scene, getPublicName=()=> ''){
  const key=String(scene?.trackKey||scene?.selectedTrackKey||scene?.track?.id||scene?.track?.key||scene?.trackId||'').trim();
  const canonical=key?String(getPublicName(key)||'').trim():'';
  if(canonical&&canonical!==key)return canonical;
  const meta=scene?.track?.meta;
  return String(meta?.publicName||scene?.track?.name||meta?.name||scene?.trackId||key||'Circuito').trim();
}
