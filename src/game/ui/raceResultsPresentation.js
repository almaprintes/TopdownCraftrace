// Shared results presentation. No persistence, ranking, physics, rewards or network.
import './raceResultsPresentation.css';
const images=import.meta.glob('../../../studio/assets/avatars/avatar_*.webp',{eager:true,query:'?url',import:'default'});
const catalog=Object.fromEntries(Object.entries(images).map(([path,url])=>[path.split('/').pop(),url]));
// Fixed, local assignment: identity, never seat or finishing position.
// Curated by inspecting the original artwork, not by catalog order.
const AI_PORTRAITS=Object.freeze({
  falcon:7,comet:1,viper:2,storm:4,blaze:5,apex:8,orbit:6,sprint:13,
  grip:12,vector:17,drift:18,pulse:11,racer:16,spark:3,rookie:19,nova:9
});
const aiAvatars=Object.freeze(Object.fromEntries(Object.entries(AI_PORTRAITS).map(([id,n])=>[id,'avatar_'+String(n).padStart(4,'0')+'.webp'])));
let ownPortrait='';
export function rememberResultPlayerAvatar(url){
  ownPortrait=typeof url==='string'&&(/^https:\/\/almaprintes\.github\.io\/TopdownCraftrace\/studio-assets\/avatars\/[a-z0-9_]+\.webp$/.test(url)||
    /^https:\/\/raw\.githubusercontent\.com\/almaprintes\/TopdownCraftrace\/main\/studio\/assets\/avatars\/[a-z0-9_]+\.webp$/.test(url)||
    /^https:\/\/juukbnkjboiazqggqcyv\.supabase\.co\/storage\/v1\/object\/public\/craft-avatars\/[a-z0-9-]+\/pilot\.(webp|png|jpg)$/.test(url))?url:'';
}
export function resultAvatarUrl({human=false,aiId=null,name=''}={}){
  if(human){const file=ownPortrait.split('/').pop();return catalog[file]||ownPortrait;}
  const id=aiId;
  return catalog[id==='generic-cpu'?'avatar_0020.webp':aiAvatars[id]]||'';
}
export function resultPortrait(driver){
  const wrap=document.createElement('span');wrap.className='tdr-result-portrait';
  const initials=document.createElement('span');initials.className='tdr-result-initials';
  initials.textContent=String(driver.name||'—').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'—';
  wrap.append(initials);
  const url=resultAvatarUrl(driver);
  if(url){const img=document.createElement('img');img.alt='';img.decoding='async';img.draggable=false;
    img.addEventListener('error',()=>img.remove(),{once:true});img.src=url;wrap.append(img);}
  return wrap;
}
export function resultHero(drivers,{solo=false}={}){
  const root=document.createElement('section');root.className='tdr-result-hero';root.dataset.count=String(Math.min(3,drivers.length));
  const ranked=drivers.slice(0,3).map((driver,index)=>({...driver,rank:driver.rank??index+1}));
  const ordered=ranked.length===3?[ranked[1],ranked[0],ranked[2]]:ranked;
  for(const driver of ordered){
    const card=document.createElement('article');card.className='tdr-result-hero-card';
    if(!solo&&Number.isInteger(driver.rank))card.dataset.rank=String(driver.rank);
    card.append(resultPortrait(driver));
    const plaque=document.createElement('div');plaque.className='tdr-result-plaque';
    const badge=document.createElement('b');badge.textContent=solo?'🏁':driver.rank?driver.rank+'º':'—';
    const copy=document.createElement('div'),name=document.createElement('strong'),time=document.createElement('small');
    name.textContent=driver.name;time.textContent=driver.time||'';copy.append(name,time);plaque.append(badge,copy);card.append(plaque);root.append(card);
  }
  return root;
}
export function dressResultPanel(panel){panel?.classList.add('tdr-result-premium');}
