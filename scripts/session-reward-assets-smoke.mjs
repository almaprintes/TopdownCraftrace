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
if(!ui.includes('<h2>BOTÍN DE LA SESIÓN</h2>'))fail('all session reward states must share the same title');
if(!ui.includes("${hasChest?'is-closed':'is-open'}"))fail('session chest must use explicit closed/open layout states');
if(!ui.includes('tdr-session-chest-stage'))fail('chest state must live inside the common session body');
if(!ui.includes('tdr-session-footer'))fail('session reward states must share one footer');
if(!css.includes('.tdr-session-card.is-closed .tdr-session-reward-body{display:none}'))fail('closed chest must remove hidden rewards from layout flow');
if(!css.includes('.tdr-session-card.is-open .tdr-session-chest-stage{display:none}'))fail('opened chest must remove the chest stage from layout flow');
if(!css.includes('grid-template-rows:auto minmax(0,1fr) auto'))fail('session card must use a shared header/body/footer frame');
if(!css.includes('overflow:hidden'))fail('session result card must not require internal scrolling');
if(!css.includes('@media(orientation:landscape) and (max-height:650px)'))fail('landscape phone compact layout guard is missing');
if(!experience.includes('asset:GARAGE_ITEMS[id]?.asset||null'))fail('RaceExperience must pass GARAGE_ITEMS canonical assets into the session UI');
for(const file of ['chatarra.webp','aleacion.webp','goma.webp','disco_metalico.webp','muelle.webp','engranaje.webp','compuesto.webp','electronica.webp']){
  if(!catalog.includes(file))fail(`canonical material asset missing from GARAGE_ITEMS: ${file}`);
  if(!fs.existsSync(path.join(root,'public/assets/crafting/materials',file)))fail(`canonical material file missing: ${file}`);
}

console.log('[session-reward-assets] OK — chest/no-chest states share one compact session result frame and canonical repository art');
