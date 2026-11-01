import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEV_RUN_ANCHOR,versionFromRunNumber,stampDevHtml} from './stamp-dev-version.mjs';

const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.equal(DEV_RUN_ANCHOR,5675);
assert.equal(versionFromRunNumber(5676),'DEV 1.4.10');
assert.equal(versionFromRunNumber(5677),'DEV 1.4.11');
assert.equal(versionFromRunNumber(5680),'DEV 1.4.14');
assert.throws(()=>versionFromRunNumber(5675));
assert.throws(()=>versionFromRunNumber('not-a-run'));
assert.throws(()=>versionFromRunNumber(7.25));

const stamped=stampDevHtml(source,versionFromRunNumber(5676));
assert.match(stamped,/<meta name="tdr-dev-version" content="DEV 1\.4\.10"\s*\/>/);
assert.equal((stamped.match(/name="tdr-dev-version"/g)||[]).length,1);
assert.equal(stampDevHtml(stamped,'DEV 1.4.11').includes('DEV 1.4.11'),true,
  'Can re-stamp same checked-out HTML without duplicates');
assert.throws(()=>stampDevHtml(source+'<meta name="tdr-dev-version" content="DEV 1.4.10" />','DEV 1.4.12'));
assert.throws(()=>stampDevHtml(source,'DEV 1.5.1'));
assert.throws(()=>stampDevHtml('<head></head>','DEV 1.4.12'));
console.log('DEV version auto-stamp OK: monotonic workflow runs, no extra meta tags, no production mutation.');
