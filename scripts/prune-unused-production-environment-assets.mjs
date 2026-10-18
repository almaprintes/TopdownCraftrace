// Preserve full editable asset library in public/. Trim only compiled production output.
// The runtime loads authored environment art lazily; explicit references in built JS,
// CSS, HTML, JSON and environment project files always win over any space savings.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const IMAGE_EXT=new Set(['.webp','.png','.jpg','.jpeg','.avif','.svg','.gif']);
const CODE_EXT=new Set(['.js','.mjs','.css','.json','.html','.webmanifest']);
const MB=1024*1024;
const walk=dir=>{
  if(!fs.existsSync(dir))return [];
  const all=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const abs=path.join(dir,e.name);
    if(e.isDirectory())all.push(...walk(abs));
    else if(e.isFile())all.push(abs);
  }
  return all;
};
const slash=p=>p.split(path.sep).join('/');
const knownEnvironmentReferences=(libraryDir)=>{
  const refs=new Set();
  for(const f of walk(libraryDir).filter(f=>f.endsWith('.environment.json')||path.basename(f)==='environment.json')){
    // An imported owner project might exist even before its scene is playable.
    // Preserve it in production to avoid breaking later activation on this build.
    let data;
    try{data=JSON.parse(fs.readFileSync(f,'utf8'));}catch{continue;}
    for(const o of [...(data.environment||[]),...(data.linearBarriers||[])]){
      if(typeof o?.path==='string')refs.add(o.path.replace(/^\/?(?:assets\/)?/,''));
    }
  }
  return refs;
};
export function pruneUnusedProductionEnvironmentAssets({
  distDir=path.join(ROOT,'dist'),
  libraryDir=path.join(ROOT,'src/game/tracks/library'),
  dryRun=false
}={}){
  const entry=path.join(distDir,'index.html');
  if(!fs.existsSync(entry))throw Error('Cannot prune: production dist/index.html is missing');
  if(fs.existsSync(path.join(distDir,'tool')))throw Error('Cannot prune: dist/tool suggests non-production/editor payload');
  const assetsRoot=path.join(distDir,'assets/environment');
  const allImages=walk(assetsRoot).filter(f=>IMAGE_EXT.has(path.extname(f).toLowerCase()));
  const code=walk(distDir).filter(f=>CODE_EXT.has(path.extname(f).toLowerCase())&&!f.startsWith(assetsRoot+path.sep))
    .map(f=>fs.readFileSync(f,'utf8')).join('\n');
  const refs=knownEnvironmentReferences(libraryDir);
  let removed=0,removedBytes=0,kept=0,keptBytes=0;
  const removedNames=[];
  for(const f of allImages){
    const relative=slash(path.relative(assetsRoot,f));
    const ref='environment/'+relative;
    const name=path.basename(relative);
    // The filename-only fallback protects runtime-composed URLs such as
    // BASE + 'environment/props/' + assetName + '.webp'.
    const required=refs.has(ref)||refs.has('assets/'+ref)||
      code.includes(ref)||code.includes(name);
    const size=fs.statSync(f).size;
    if(required){kept++;keptBytes+=size;continue;}
    removed++;removedBytes+=size;removedNames.push(ref);
    if(!dryRun)fs.unlinkSync(f);
  }
  const result={checked:allImages.length,kept,removed,keptBytes,removedBytes,removedNames,dryRun};
  console.log('[environment-production-prune] '+(dryRun?'DRY RUN ':'')+
    'kept='+kept+' removed='+removed+' saved='+(removedBytes/MB).toFixed(2)+
    ' MiB; public/ originals unchanged');
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  pruneUnusedProductionEnvironmentAssets({dryRun:process.argv.includes('--dry-run')});
}
