// Supabase record identity is (player, physical edition), not the display name.
// Keep historic unsuffixed records intact. Bump edition on the next road redraw.
const CURRENT_EDITIONS=Object.freeze({
  'circuito-atlantico':'g2-20261023',
  'santa-cruz':'g2-20261023'
});
const EDITION_SUFFIX=/^(.*)@g[0-9]+-[0-9]{8}$/;
export const raceControlCurrentEdition=id=>CURRENT_EDITIONS[String(id||'').trim()]||null;
export function raceControlServerTrackId(trackId){
  const id=String(trackId||'').trim();
  if(!id||EDITION_SUFFIX.test(id))return id;
  const edition=raceControlCurrentEdition(id);
  return edition?`${id}@${edition}`:id;
}
export function decodeRaceControlServerTrackId(serverId){
  const id=String(serverId||'').trim();
  const match=id.match(EDITION_SUFFIX);
  if(!match)return {trackId:id,currentLayout:false,historical:Boolean(CURRENT_EDITIONS[id])};
  const trackId=match[1];
  // Refuse ghosts from other historic or future geometry revisions.
  if(raceControlServerTrackId(trackId)!==id)return null;
  return {trackId,currentLayout:true,historical:false};
}
