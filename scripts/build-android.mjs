import {spawnSync} from 'node:child_process';
import {verifyAndroidAssets} from './android-assets-smoke.mjs';
const run=(command,args)=>{
  const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,BASE:'./'},shell:process.platform==='win32'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
};
run('npm',['run','build:prod']);
verifyAndroidAssets('dist');
run('npx',['cap','sync','android']);
verifyAndroidAssets('android/app/src/main/assets/public');
