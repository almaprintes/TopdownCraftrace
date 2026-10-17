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
    'TEXTO PHASER','PROBAR WEBGL SYNC (REINICIA)','Pulsa MEDIR, oculta el panel'];
  for(const token of forbidden)if(text.includes(token))throw Error('DEV MEDIR leaked in '+root+': '+token);
  for(const token of ['post_race_double_loot','race_control_publish_record','car_engine_start.wav'])
    if(!text.includes(token))throw Error('Missing essential game feature in '+root+': '+token);
  console.log('QA ANDROID OK:',root,files.length,'files, MEDIR absent, game content present');
};
scan('dist');
scan('android/app/src/main/assets/public');
if(!fs.readFileSync('src/game/dev/iosRaceFrameDiagnostics.js','utf8').includes('if(IS_PROD_BUILD||!isIos()'))
  throw Error('iOS diagnostic production guard removed');
console.log('ANDROID QA build PASS; TEST package only, not a Play update');
