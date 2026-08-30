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
if(!ui.includes("${hasChest?'is-closed':'is-open'}"))fail('session chest must use explicit closed/open layout states');
if(!css.includes('.tdr-session-card.is-closed .tdr-session-reward-body{display:none}'))fail('closed chest must remove hidden rewards from layout flow');
if(!css.includes('.tdr-session-card.is-open .tdr-session-pass-wrap{display:none}'))fail('opened chest must remove the large card preview from layout flow');
if(!css.includes('@media(orientation:landscape) and (max-height:650px)'))fail('landscape phone compact layout guard is missing');
if(!experience.includes('asset:GARAGE_ITEMS[id]?.asset||null'))fail('RaceExperience must pass GARAGE_ITEMS canonical assets into the session UI');
for(const file of ['chatarra.webp','aleacion.webp','goma.webp','disco_metalico.webp','muelle.webp','engranaje.webp','compuesto.webp','electronica.webp']){
  if(!catalog.includes(file))fail(`canonical material asset missing from GARAGE_ITEMS: ${file}`);
  if(!fs.existsSync(path.join(root,'public/assets/crafting/materials',file)))fail(`canonical material file missing: ${file}`);
}

console.log('[session-reward-assets] OK — session chest and materials use repository art; closed/open layouts do not reserve hidden height');
