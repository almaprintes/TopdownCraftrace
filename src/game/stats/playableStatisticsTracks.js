// Exactly the player-selectable, published and currently unlocked circuits.
// Registry entries may contain editor prototypes, retired variants or test layouts;
// their times remain in storage but must never become player-facing tabs.
export function playableStatisticsTrackIds(registry,publishedIds,isUnlocked){
  const official=Array.isArray(publishedIds)?publishedIds:[];
  if(typeof isUnlocked!=='function')return [];
  const seen=new Set(),result=[];
  for(const raw of official){
    const id=String(raw||'').trim();
    if(!id||seen.has(id))continue;
    seen.add(id);
    const track=registry?.[id];
    if(!track||track.meta?.hiddenFromTrackSelect===true||isUnlocked(id)!==true)continue;
    result.push(id);
  }
  return result;
}
