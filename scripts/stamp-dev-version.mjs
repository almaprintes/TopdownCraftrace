// GitHub Pages DEV version is derived from its immutable Actions run number.
// The repository carries DEV 1.4.10 as a local preview fallback; the deployed
// HTML is stamped inside the CI checkout AFTER the isolated production check.
// This never edits or commits the source branch (no recursive CI triggering).
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const DEV_RUN_ANCHOR=5675; // Actions run number observed while source DEV showed 1.4.9
export const DEV_PATCH_AT_ANCHOR=9;

export function versionFromRunNumber(runNumber){
  const value=Number(runNumber);
  if(!Number.isSafeInteger(value)||value<=DEV_RUN_ANCHOR)
    throw Error('Invalid GitHub Pages workflow run number for DEV version');
  return 'DEV 1.4.'+(DEV_PATCH_AT_ANCHOR+value-DEV_RUN_ANCHOR);
}

export function stampDevHtml(html,version){
  if(typeof html!=='string'||!/^DEV 1\.4\.[1-9]\d*$/.test(version))
    throw Error('Unexpected DEV version');
  const pattern=/<meta name="tdr-dev-version" content="DEV \d+\.\d+\.\d+"\s*\/>/g;
  const count=[...html.matchAll(pattern)].length;
  if(count!==1)throw Error('Expected exactly one DEV meta version (found '+count+')');
  return html.replace(pattern,'<meta name="tdr-dev-version" content="'+version+'" />');
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const run=process.env.GITHUB_RUN_NUMBER;
  const version=versionFromRunNumber(run);
  const file=resolve('index.html');
  const current=readFileSync(file,'utf8');
  writeFileSync(file,stampDevHtml(current,version));
  console.info('Stamped '+version+' for Pages run #'+run+
    ' (source '+String(process.env.GITHUB_SHA||'unknown').slice(0,10)+')');
}
