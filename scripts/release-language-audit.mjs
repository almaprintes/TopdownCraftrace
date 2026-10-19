// Pre-release Spanish/English static key and live Account copy audit.
// Remaining free-form legacy literals are listed in docs/release.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {t} from '../src/game/i18n/index.js';
import {translateAccountRuntimeText} from '../src/game/i18n/accountUiTranslation.js';

const read=p=>readFileSync(p,'utf8');
const keyList=s=>[...s.matchAll(/'([^']+)'\s*:/g)].map(x=>x[1]);
const supplemental=read('src/game/i18n/playerUiExtra.js');
const split=supplemental.indexOf('  en:Object.freeze({');
assert.ok(split>0);
const es=new Set(keyList(supplemental.slice(0,split)));
const en=new Set(keyList(supplemental.slice(split)));
const base=read('src/game/i18n/index.js');
const enStart=base.indexOf('  en:Object.freeze({');
const baseEs=new Set(keyList(base.slice(base.indexOf('  es:Object.freeze({'),enStart)));
const baseEn=new Set(keyList(base.slice(enStart,base.indexOf('\n});',enStart))));
assert.deepEqual([...es].filter(k=>!en.has(k)),[],'Missing EN supplemental keys');
assert.deepEqual([...en].filter(k=>!es.has(k)),[],'Missing ES supplemental keys');
assert.deepEqual([...baseEs].filter(k=>!baseEn.has(k)),[],'Missing base EN keys');
assert.deepEqual([...baseEn].filter(k=>!baseEs.has(k)),[],'Missing base ES keys');
const all=new Set([...es,...baseEs]);const invalid=[];
for(const key of all){
 const a=t(key,null,'es'),b=t(key,null,'en');
 const tokens=s=>[...String(s).matchAll(/\{([a-z_][a-z_0-9]*)\}/gi)].map(x=>x[1]).sort().join(',');
 if(a===key||b===key||!a||!b||tokens(a)!==tokens(b))
  invalid.push({key,es:a,en:b});
}
if(invalid.length)console.error('I18N_DECLARED_INVALID',JSON.stringify(invalid.slice(0,50)));
assert.equal(invalid.length,0,'All declared player keys must resolve in both languages with equal placeholders');
assert.equal(t('replay.lap',null,'es'),'VUELTA');
assert.equal(t('replay.lap',null,'en'),'LAP');
assert.equal(t('replay.analysis',null,'en'),'ANALYSIS');
for(const [es,en] of [
 ['MI CUENTA','MY ACCOUNT'],['Partida guardada en la nube','Save backed up to cloud'],
 ['✓ CREADOR','✓ CREATOR'],['RECUPERAR PARTIDA DE LA NUBE','RESTORE CLOUD SAVE'],
 ['ACCESO ANTIGUO (CORREO)','LEGACY EMAIL ACCESS']
])assert.equal(translateAccountRuntimeText(es),en,'Account translation '+es);
const account=read('src/game/social/cloudAccountUi.js');
assert.match(account,/localizeDomTree\(root\)/);
assert.match(account,/date\.toLocaleString\(getLanguage\(\)==='en'\?'en-GB':'es-ES'\)/);
assert.match(account,/const accountConfirm=value=>window\.confirm\(localText\(value\)\)/);
assert.ok(!read('src/game/i18n/canonicalRuntimeText.js').includes('eval('));
for(const f of ['src/game/social/cloudAccountUi.js','src/game/i18n/canonicalRuntimeText.js','src/game/i18n/accountUiTranslation.js'])
 execFileSync(process.execPath,['--check',f],{stdio:'pipe'});
let scan=0,missing=new Map();
function walk(d){for(const item of readdirSync(d,{withFileTypes:true})){
 const loc=path.join(d,item.name);
 if(item.isDirectory()){if(item.name==='i18n')continue;walk(loc);}
 else if(item.name.endsWith('.js')){
  const src=read(loc);
  for(const [,q,key] of src.matchAll(/\bt\s*\(\s*(['"])([^'"]+)\1/g)){
   scan++;if(t(key,null,'es')===key||t(key,null,'en')===key)missing.set(key,(missing.get(key)||0)+1);
  }
 }
}}
walk('src');
console.log('I18N_RELEASE_AUDIT declared='+all.size+' base='+baseEs.size+
 ' supplemental='+es.size+' staticRefs='+scan+' missingStaticKeys='+missing.size);
if(missing.size)console.warn('I18N_LEGACY_UNRESOLVED_REFERENCES',JSON.stringify([...missing].slice(0,50)));
// Legacy dynamic strings are NOT magically validated by catalog parity;
// iPhone/Android ES/EN manual playthrough remains mandatory before Play.
