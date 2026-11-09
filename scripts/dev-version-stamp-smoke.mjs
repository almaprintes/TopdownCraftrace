import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEV_VERSION_FLOOR,publishedDevVersionFromHtml,nextVersionFromPublishedHtml,stampDevHtml} from './stamp-dev-version.mjs';

const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sample=n=>'<html><head><meta name="tdr-dev-version" content="DEV 1.4.'+n+'" /></head></html>';
assert.equal(DEV_VERSION_FLOOR,83,'Latest confirmed published version before the change');
assert.equal(publishedDevVersionFromHtml(sample(83)),83);
assert.equal(nextVersionFromPublishedHtml(sample(83)),'DEV 1.4.84');
assert.equal(nextVersionFromPublishedHtml(sample(84)),'DEV 1.4.85');
assert.equal(nextVersionFromPublishedHtml(sample(85)),'DEV 1.4.86');
assert.throws(()=>publishedDevVersionFromHtml(sample(82)),/older than/);
assert.throws(()=>publishedDevVersionFromHtml('not DEV html'),/Cannot determine/);
assert.throws(()=>publishedDevVersionFromHtml(sample(84)+sample(85)),/Cannot determine/);
assert.throws(()=>publishedDevVersionFromHtml(123),/text/);
const stamped=stampDevHtml(source,nextVersionFromPublishedHtml(sample(83)));
assert.match(stamped,/<meta name="tdr-dev-version" content="DEV 1\.4\.84"\s*\/>/);
assert.equal((stamped.match(/<meta name="tdr-dev-version"/g)||[]).length,1);
assert.ok(stampDevHtml(stamped,'DEV 1.4.85').includes('DEV 1.4.85'),
  'Can restamp locally without duplicate meta tags');
assert.throws(()=>stampDevHtml(source+sample(84),'DEV 1.4.85'));
assert.throws(()=>stampDevHtml(source,'DEV 1.5.1'));
assert.throws(()=>stampDevHtml('<head></head>','DEV 1.4.84'));
console.log('DEV version: published 1.4.83 -> 1.4.84, one increment per successful live deploy; failed/cancelled Actions runs ignored.');
