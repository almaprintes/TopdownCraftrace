import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pruneUnusedProductionEnvironmentAssets as prune} from './prune-unused-production-environment-assets.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tdr-environment-prune-'));
const dist=path.join(root,'dist'),library=path.join(root,'library');
const file=(p,body)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);};
const asset=name=>path.join(dist,'assets/environment',name);
try{
  file(path.join(dist,'index.html'),'<html><body>Top Down RACE</body></html>');
  file(path.join(dist,'assets/index-bundle.js'),\"const active='assets/environment/props/used.webp'; const dynamicName='special-filename.webp';\");
  file(path.join(library,'test','test.environment.json'),JSON.stringify({
    environment:[{asset:'authored',path:'environment/structures/authored.webp'}],
    linearBarriers:[{asset:'barrier',path:'environment/barriers/authored-barrier.webp'}]
  }));
  for(const f of ['props/used.webp','structures/authored.webp','barriers/authored-barrier.webp',
    'props/special-filename.webp','props/orphan.webp','structures/unused.png'])
    file(asset(f),Buffer.alloc(4096,123));
  file(path.join(dist,'assets/tracks/official/photo-0-0.webp'),Buffer.alloc(4096,92));
  const preview=prune({distDir:dist,libraryDir:library,dryRun:true});
  assert.equal(preview.checked,6);assert.equal(preview.removed,2);
  assert.ok(fs.existsSync(asset('props/orphan.webp')),'dry run must not remove files');
  const actual=prune({distDir:dist,libraryDir:library});
  assert.equal(actual.removed,2);assert.equal(actual.removedBytes,8192);
  for(const f of ['props/used.webp','structures/authored.webp','barriers/authored-barrier.webp','props/special-filename.webp'])
    assert.ok(fs.existsSync(asset(f)),'used environment image lost: '+f);
  for(const f of ['props/orphan.webp','structures/unused.png'])
    assert.ok(!fs.existsSync(asset(f)),'orphan environment image not excluded: '+f);
  assert.ok(fs.existsSync(path.join(dist,'assets/tracks/official/photo-0-0.webp')),
    'the racing photographs must remain byte-identical');
  assert.equal(fs.readFileSync(path.join(dist,'assets/tracks/official/photo-0-0.webp')).byteLength,4096);
  file(path.join(dist,'tool/index.html'),'Editor');
  assert.throws(()=>prune({distDir:dist,libraryDir:library}),/dist\/tool/,'do not prune development tools');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.ok(pkg.scripts['build:prod'].includes('node scripts/prune-unused-production-environment-assets.mjs'));
  assert.ok(!pkg.scripts.build.includes('prune-unused-production-environment-assets'),
    'ordinary development build must retain full library');
  console.log('ENVIRONMENT PRUNER SMOKE: runtime URLs, authored projects, byte-preserving photo assets and DEV safety OK');
}finally{fs.rmSync(root,{recursive:true,force:true});}
