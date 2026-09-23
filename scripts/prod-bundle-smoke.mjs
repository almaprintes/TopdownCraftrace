import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('dist');
if(!fs.existsSync(root))throw new Error('dist/ is missing; run the production build first');

const files=[];
const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else files.push(file);}};
walk(root);

const relative=files.map(file=>path.relative(root,file).replaceAll('\\','/'));
if(relative.some(file=>file==='tool'||file.startsWith('tool/')))throw new Error('Production bundle contains public/tool');

const text=files.filter(file=>/\.(?:js|html|css|json|webmanifest)$/i.test(file)).map(file=>fs.readFileSync(file,'utf8')).join('\n');
const forbidden=[
  'AdminHubScene','CarEditorScene','TrackEditorScene','TrackStudioScene','EnvironmentBuilderScene',
  'tdr2:admin','tdr2:devFullCarAccess','tdr2:devFullTrackAccess','KIT HOMOLOGACIÓN'
];
for(const token of forbidden)if(text.includes(token))throw new Error(`Production bundle contains forbidden DEV token: ${token}`);

const required=['activate_shipaton_judge_access','post_race_double_loot','store_coins_100_4h'];
for(const token of required)if(!text.includes(token))throw new Error(`Production bundle is missing required public feature: ${token}`);

console.log(`PROD BUNDLE SMOKE OK · ${relative.length} files · Admin/tools excluded · Judge/rewarded retained`);
