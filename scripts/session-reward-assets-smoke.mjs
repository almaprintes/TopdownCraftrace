import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=message=>{throw new Error(`[session-reward-assets] ${message}`);};
const ui=read('src/game/ui/raceSessionUi.js');
const experience=read('src/game/scenes/RaceExperienceScene.js');
const catalog=read('src/game/garage/partsCatalog.js');

if(!ui.includes('tdr-session-item-asset'))fail('session rewards must render material image assets');
if(!ui.includes('row.asset'))fail('session rewards must consume the canonical asset supplied by the catalog');
if(ui.includes("row.icon||'◆'"))fail('generic reward glyph fallback must not return');
if(ui.includes('class=\"mark\"'))fail('fake diamond/chest marker must not return');
if(!ui.includes('assets/season/reward_cards/free_${tone}.svg'))fail('official Season reward-card frame must remain the chest presentation');
if(ui.includes('daily_gift.webp'))fail('legacy daily gift must not be repurposed as session chest art');
if(!experience.includes('asset:GARAGE_ITEMS[id]?.asset||null'))fail('RaceExperience must pass GARAGE_ITEMS canonical assets into the session UI');
for(const file of ['chatarra.webp','aleacion.webp','goma.webp','disco_metalico.webp','muelle.webp','engranaje.webp','compuesto.webp','electronica.webp']){
  if(!catalog.includes(file))fail(`canonical material asset missing from GARAGE_ITEMS: ${file}`);
  if(!fs.existsSync(path.join(root,'public/assets/crafting/materials',file)))fail(`canonical material file missing: ${file}`);
}

console.log('[session-reward-assets] OK — final-session rewards use canonical material art and no fabricated chest glyph');
