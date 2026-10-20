import fs from 'node:fs';
import path from 'node:path';
const scan=root=>{
  if(!fs.existsSync(root))throw Error('Missing built payload '+root);
  const files=[];
  const visit=p=>{for(const f of fs.readdirSync(p,{withFileTypes:true})){
    const name=path.join(p,f.name);
    if(f.isDirectory())visit(name);
    else if(/\.(js|html|css)$/i.test(name))files.push(name);
  }};
  visit(root);
  const text=files.map(p=>fs.readFileSync(p,'utf8')).join('\n');
  const forbidden=['mountRaceDevFrameDiagnostics','installFinalRaceFrameDiagnosticUpdate',
    'TEXTO PHASER','PROBAR WEBGL SYNC (REINICIA)'];
  // "Pulsa MEDIR" now belongs to the opt-in support overlay that is retained
  // in production intentionally. Its presence in bundle bytes does NOT
  // mean the button appears for normal players: check the source guard below.
  for(const token of forbidden)if(text.includes(token))throw Error('DEV MEDIR leaked in '+root+': '+token);
  for(const token of ['post_race_double_loot','race_control_publish_record','car_engine_start.wav'])
    if(!text.includes(token))throw Error('Missing essential game feature in '+root+': '+token);
  console.log('QA ANDROID OK:',root,files.length,'files, DEV controls absent, support diagnostics opt-in, game content present');
};
scan('dist');
scan('android/app/src/main/assets/public');
const diagnostics=fs.readFileSync('src/game/dev/iosRaceFrameDiagnostics.js','utf8');
const support=fs.readFileSync('src/game/support/supportRaceDiagnostics.js','utf8');
const settings=fs.readFileSync('src/game/scenes/SettingsGraphicsQualityScene.js','utf8');
if(!diagnostics.includes('!supportDiagnosticsEnabled(sessionStorage))return null'))
  throw Error('Production diagnostics must remain hidden without temporary support unlock');
if(!diagnostics.includes('if(!IS_PROD_BUILD&&isIos()){'))
  throw Error('DEV-only graphics/audio experiment controls must never appear in Android production');
if(!diagnostics.includes('if(!state.active)return;'))
  throw Error('No sampling should occur until MEDIR is pressed');
if(!support.includes('SUPPORT_TAP_COUNT=7') || !support.includes('SUPPORT_DIAGNOSTICS_DURATION_MS=30*60*1000'))
  throw Error('Support unlock must be deliberate and expire');
if(!settings.includes('advanceSupportUnlockTap(supportTapState)'))
  throw Error('Support must only be unlocked via the hidden graphics settings gesture');
console.log('ANDROID QA build PASS; TEST package only, not a Play update');
