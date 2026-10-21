import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import BANK from '../src/game/ui/sessionInsightBank.json' with {type:'json'};
import {buildSessionInsight,SESSION_INSIGHT_BANK_SIZE} from '../src/game/ui/sessionInsightReader.js';

const categories=Object.entries(BANK.categories);
assert.equal(BANK.version,1);
assert.equal(categories.length,16,'16 independent telemetry situations are available');
const es=new Set(),en=new Set();
for(const [key,bucket] of categories){
  assert.equal(bucket.es.length,24,key+' must supply 24 ES phrases');
  assert.equal(bucket.en.length,24,key+' must supply 24 EN phrases');
  for(const [language,set] of [['es',es],['en',en]]){
    for(const line of bucket[language]){
      assert.equal(typeof line,'string');
      assert.ok(line.length>=30,'Avoid empty filler: '+key);
      assert.ok(!set.has(line),'Exact duplicate '+language+' '+key+': '+line);
      set.add(line);
      const tags=[...line.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]);
      for(const tag of tags)assert.ok(['lapCount','firstLap','offTrackEvents','offTrackSeconds','invalidLaps','gain','spread','trend','brakePct','coastPct','throttlePct'].includes(tag),'Unknown variable '+tag);
    }
  }
}
assert.equal(SESSION_INSIGHT_BANK_SIZE,384);
assert.equal(es.size,384);assert.equal(en.size,384);
const storage=()=>{
  const map=new Map();
  return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
};
const make=(times=[61000,60500,60800,60400],extra={})=>({
  laps:times.map(lapMs=>({lapMs,valid:true})),offTrackEvents:0,offTrackSec:0,
  brakePct:13,coastPct:15,throttlePct:72,...extra
});
function sampled(base,opts={}){
  const store=storage();
  return Array.from({length:24},()=>buildSessionInsight(base,{storage:store,rng:()=>0,language:'es',...opts}));
}
for(const [name,report] of [
  ['empty',make([])],
  ['one lap',make([65000])],
  ['multiple exits',make(undefined,{offTrackEvents:5,offTrackSec:18.3})],
  ['invalid laps',make(undefined,{laps:[{lapMs:60000,valid:false},{lapMs:62000,valid:true}]})],
  ['clean stable',make()]
]){
  const result=sampled(report);
  assert.equal(new Set(result).size,24,'24 consecutive '+name+' runs must never repeat a phrase');
  assert.ok(result.every(x=>!/\{[a-zA-Z]+\}/.test(x)),'All runtime placeholders must be resolved');
}
const noLaps=sampled(make([]));
assert.ok(noLaps.every(x=>!/mejor marca personal|personal best|salidas de pista|recorta/.test(x)),
  'Empty runs cannot claim improvements or track exits');
const sampleEs=buildSessionInsight(make(undefined,{offTrackEvents:5}),{storage:storage(),rng:()=>0});
const sampleEn=buildSessionInsight(make(undefined,{offTrackEvents:5}),{storage:storage(),language:'en',rng:()=>0});
assert.ok(!/[áéíóúñ¿¡]/.test(sampleEn),'English bank must be English');
assert.ok(sampleEs!==sampleEn);
const noPb=sampled(make(undefined,{brakePct:4,coastPct:8,throttlePct:40}),{previousBestMs:null});
assert.ok(noPb.every(s=>!s.includes('Marca personal superada')&&!s.includes('Nuevo mejor tiempo personal')));
const persisted=storage();
let old=new Set();
for(let i=0;i<24;i++)old.add(buildSessionInsight(make([]),{storage:persisted,rng:()=>0}));
assert.equal(old.size,24,'Persistent anti-repeat survives repeated calls');
const script=readFileSync('src/game/scenes/RaceSessionReportScene.js','utf8');
assert.match(script,/buildSessionInsight\(\{/,'Race report must call bank selector with telemetry');
assert.match(script,/previousBestMs:this\._sessionPreviousPersonalBestMs/,'Previous PB must be passed for honest feedback');
assert.match(script,/language:getLanguage\(\)/,'Both languages work without DOM text replacement');
assert.ok(!script.includes('pickVerdict('),'Old five-phrase selector must be removed');
assert.match(script,/\$\{esc\(r\.verdict\)\}/,'Report rendering and export still use one chosen message');
const lang=readFileSync('index.html','utf8').match(/content="DEV 1\.2\.(\d+)"/);
assert.ok(lang&&Number(lang[1])>=329,'DEV version incremented');
console.log('PASS: 16 situations, 768 bilingual JSON phrases, telemetry guards, 24 unique repeated sessions, persisted anti-repeat, unchanged report contract');
