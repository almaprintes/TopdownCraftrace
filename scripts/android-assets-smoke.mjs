import fs from 'node:fs';
import path from 'node:path';

export function verifyAndroidAssets(root){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs=[...html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]);
  if(!refs.some(ref=>/\.js(?:\?|$)/.test(ref)))throw new Error('Android payload has no JavaScript entry');
  for(const ref of refs){
    if(/^(?:data:|https?:)/.test(ref))continue;
    if(!ref.startsWith('./'))throw new Error(`Android asset must be relative: ${ref}`);
    const file=path.resolve(root,ref.split(/[?#]/)[0]);
    if(!file.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(file))throw new Error(`Android asset missing: ${ref}`);
  }
  console.log('Android local asset URLs resolve: '+refs.length);
}
if(process.argv[1]===new URL(import.meta.url).pathname)verifyAndroidAssets(process.argv[2]||'dist');
