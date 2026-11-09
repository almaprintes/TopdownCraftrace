// DEV version is the previous SUCCESSFULLY PUBLISHED version + 1.
// Read it directly from the live GitHub Pages HTML. Failed/cancelled workflow
// runs do not advance versions; no branch commits or GitHub write permissions.
// The last verified version before this change was DEV 1.4.83.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const DEV_VERSION_FLOOR=83;
const LIVE_VERSION_PATTERN=/<meta\s+name="tdr-dev-version"\s+content="DEV 1\.4\.(\d+)"\s*\/?\s*>/g;

export function publishedDevVersionFromHtml(html){
  if(typeof html!=='string')throw Error('The live DEV HTML must be text.');
  const matches=[...html.matchAll(LIVE_VERSION_PATTERN)];
  if(matches.length!==1)throw Error('Cannot determine exactly one DEV version from live GitHub Pages HTML.');
  const patch=Number(matches[0][1]);
  if(!Number.isSafeInteger(patch)||patch<DEV_VERSION_FLOOR)
    throw Error('Live DEV version is older than the last confirmed DEV 1.4.83; refusing to skip or reuse versions.');
  return patch;
}
export function nextVersionFromPublishedHtml(html){
  return 'DEV 1.4.'+(publishedDevVersionFromHtml(html)+1);
}
export function stampDevHtml(html,version){
  if(typeof html!=='string'||!/^DEV 1\.4\.[1-9]\d*$/.test(version))
    throw Error('Unexpected DEV version.');
  const pattern=/<meta name="tdr-dev-version" content="DEV \d+\.\d+\.\d+"\s*\/>/g;
  const matches=[...html.matchAll(pattern)];
  if(matches.length!==1)throw Error('Expected exactly one source DEV meta version (found '+matches.length+').');
  return html.replace(pattern,'<meta name="tdr-dev-version" content="'+version+'" />');
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(process.argv[2]!=='--from-live'||!process.argv[3])
    throw Error('Usage: node scripts/stamp-dev-version.mjs --from-live PATH_TO_LIVE_DEV_HTML');
  const live=readFileSync(resolve(process.argv[3]),'utf8');
  const previous=publishedDevVersionFromHtml(live);
  const version='DEV 1.4.'+(previous+1);
  const file=resolve('index.html');
  writeFileSync(file,stampDevHtml(readFileSync(file,'utf8'),version));
  console.info('Stamped '+version+' (previous LIVE DEV 1.4.'+previous+
    ', source '+String(process.env.GITHUB_SHA||'unknown').slice(0,12)+')');
}
