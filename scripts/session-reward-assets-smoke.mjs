import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=message=>{throw new Error(`[session-reward-assets] ${message}`);};
const ui=read('src/game/ui/raceSessionUi.js');
const css=read('src/game/ui/raceSessionUi.css');
const experience=read('src/game/scenes/RaceExperienceScene.js');
const catalog=read('src/game/garage/partsCatalog.js');

if(!ui.includes('tdr-session-item-asset'))fail('session rewards must render material image assets');
if(!ui.includes('row.asset'))fail('session rewards must consume the canonical asset supplied by the catalog');
if(ui.includes("row.icon||'◆'"))fail('generic reward glyph fallback must not return');
if(ui.includes('class=\"mark\"'))fail('fake diamond/chest marker must not return');
if(!ui.includes('assets/season/reward_cards/free_${tone}.svg'))fail('official Season reward-card frame must remain the chest presentation');
if(!ui.includes('assets/store/daily_gift.webp'))fail('session chest must include the existing official chest/gift artwork');
if(!fs.existsSync(path.join(root,'public/assets/store/daily_gift.webp')))fail('official chest/gift artwork is missing');
if(!ui.includes("<h2>${doubleEnabled?'¡BUEN TRABAJO!':'BOTÍN DE LA SESIÓN'}</h2>"))fail('session reward title must distinguish the x2 offer without changing the base-loot state');
if(!ui.includes("${hasChest?'is-closed':'is-open'}"))fail('session chest must use explicit closed/open layout states');
if(!ui.includes('tdr-session-chest-stage'))fail('chest state must live inside the common session body');
if(!ui.includes('tdr-session-footer'))fail('session reward states must share one footer');
if(!css.includes('width:max-content;max-width:92vw'))fail('session result card must use intrinsic content width with a viewport cap');
if(!css.includes('.tdr-session-card.is-closed .tdr-session-reward-body{display:none}'))fail('closed chest must remove hidden rewards from layout flow');
if(!css.includes('.tdr-session-card.is-open .tdr-session-chest-stage{display:none}'))fail('opened chest must remove the chest stage from layout flow');
const cssRule=name=>css.split('.'+name+'{')[1]?.split('}')[0]||'';
const cardRule=cssRule('tdr-session-card');
const mainRule=cssRule('tdr-session-main');
const footerRule=cssRule('tdr-session-footer');
const headerRule=cssRule('tdr-session-header');
if(!cardRule.includes('display:flex;flex-direction:column;min-height:0')||!cardRule.includes('overflow:hidden'))
  fail('modal must use a height-capped flex column and must not scroll or clip its footer');
if(!mainRule.includes('flex:1 1 auto')||!mainRule.includes('min-height:0')||!mainRule.includes('overflow-y:auto'))
  fail('only the material list may scroll; its flex child must shrink inside the viewport');
if(!mainRule.includes('touch-action:pan-y')||!mainRule.includes('-webkit-overflow-scrolling:touch'))
  fail('the material region must support touch scrolling on Android/iOS');
if(!css.includes('touch-action:manipulation;overscroll-behavior:none'))
  fail('overlay must not block a scroll gesture by using touch-action:none');
if(!footerRule.includes('flex:0 0 auto')||!headerRule.includes('flex:0 0 auto'))
  fail('header and rewarded ad footer must remain visible when item rows overflow');
if(!ui.includes('class="tdr-session-main" tabindex="0"'))
  fail('scrollable reward region must be keyboard accessible');
const mainPosition=ui.indexOf('<main class="tdr-session-main"'),footerPosition=ui.indexOf('<footer class="tdr-session-footer"');
if(mainPosition<0||footerPosition<mainPosition||ui.indexOf('${rewardRows}',mainPosition)>footerPosition)
  fail('material rows belong to the scrolling main, above the pinned reward actions');
if(ui.indexOf('${doubleButton}',footerPosition)<0||ui.indexOf('data-a="next"',footerPosition)<0)
  fail('both rewarded x2 and decline/next must remain together in the pinned footer');
if(!ui.includes('entries.map((row,i)=>'))
  fail('all material types must be rendered; no rows may be dropped for long sessions');
if(!css.includes('max-height:calc(100dvh - 8px);overflow:hidden;padding:6px 10px 8px}'))
  fail('short Android landscape must not make the whole reward card scroll');
if(!css.includes('@media(orientation:landscape) and (max-height:650px)'))fail('landscape phone compact layout guard is missing');
if(!experience.includes('asset:GARAGE_ITEMS[id]?.asset||null'))fail('RaceExperience must pass GARAGE_ITEMS canonical assets into the session UI');
for(const file of ['chatarra.webp','aleacion.webp','goma.webp','disco_metalico.webp','muelle.webp','engranaje.webp','compuesto.webp','electronica.webp']){
  if(!catalog.includes(file))fail(`canonical material asset missing from GARAGE_ITEMS: ${file}`);
  if(!fs.existsSync(path.join(root,'public/assets/crafting/materials',file)))fail(`canonical material file missing: ${file}`);
}

console.log('[session-reward-assets] OK — full reward list scrolls independently; header and verified x2/continue footer stay visible in short Android landscape; artwork and chest intact');
