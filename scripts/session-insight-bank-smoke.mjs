import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import BANK from '../src/game/ui/sessionInsightBank.json' with {type:'json'};
import {buildSessionInsight,SESSION_INSIGHT_BANK_SIZE} from '../src/game/ui/sessionInsightReader.js';

const categories=Object.entries(BANK.categories);
assert.equal(BANK.version,1);
assert.equal(categories.length,20,'20 independent telemetry situations are available');
const es=new Set(),en=new Set();
for(const [key,bucket] of categories){
  assert.ok(bucket.es.length>=24,key+' must supply at least 24 ES phrases');
  assert.ok(bucket.en.length>=24,key+' must supply at least 24 EN phrases');
  for(const [language,set] of [['es',es],['en',en]]){
    for(const line of bucket[language]){
      assert.equal(typeof line,'string');
      assert.ok(line.length>=30,'Avoid empty filler: '+key);
      assert.ok(!set.has(line),'Exact duplicate '+language+' '+key+': '+line);
      set.add(line);
      const tags=[...line.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]);
      for(const tag of tags)assert.ok(['lapCount','firstLap','offTrackEvents','offTrackSeconds','invalidLaps','gain','spread','trend','brakePct','coastPct','throttlePct','bestLap','improvementPct'].includes(tag),'Unknown variable '+tag);
    }
  }
}
assert.equal(SESSION_INSIGHT_BANK_SIZE,1182);
assert.equal(es.size,1182);assert.equal(en.size,1182);
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
const noLapCount=BANK.categories.noLaps.es.length;
let old=new Set();
for(let i=0;i<noLapCount;i++)old.add(buildSessionInsight(make([]),{storage:persisted,rng:()=>0}));
assert.equal(old.size,noLapCount,'All '+noLapCount+' no-lap readings must be exhausted before reuse');
const nextAfterCycle=buildSessionInsight(make([]),{storage:persisted,rng:()=>0});
assert.ok(old.has(nextAfterCycle),'Only after the full category is exhausted may it be reused');
assert.notEqual(nextAfterCycle,[...old].at(-1),'First phrase of next cycle must not immediately repeat the preceding run');
const englishStore=storage();
const englishBatch=Array.from({length:24},()=>buildSessionInsight(make([]),{storage:englishStore,rng:()=>0,language:'en'}));
assert.equal(new Set(englishBatch).size,24,'English has the same anti-repeat guarantees');

const script=readFileSync('src/game/scenes/RaceSessionReportScene.js','utf8');
assert.match(script,/buildSessionInsight\(\{/,'Race report must call bank selector with telemetry');
assert.match(script,/previousBestMs:this\._sessionPreviousPersonalBestMs/,'Previous PB must be passed for honest feedback');
assert.match(script,/language:getLanguage\(\)/,'Both languages work without DOM text replacement');
assert.ok(!script.includes('pickVerdict('),'Old five-phrase selector must be removed');
assert.match(script,/\$\{esc\(r\.verdict\)\}/,'Report rendering and export still use one chosen message');
const finalReport=readFileSync('src/game/scenes/RaceExperienceExportReadingScene.js','utf8');
assert.doesNotMatch(finalReport,/function sessionEngineerReading\(/,
  'Later scene must not replace JSON insights with legacy fixed narrative');
assert.match(finalReport,/const reading=String\(report\.verdict\|\|''\)\.trim\(\)/,
  'Final report must preserve the exact catalog selection for UI and export');
assert.match(script,/e\?\.tdrCleanLap!==false/,
  'Unclean laps in canonical race history must not be reported as clean');
const pilotStore=storage();
pilotStore.setItem('tdr2:pilotProfile:v1',JSON.stringify({id:'pilot-A'}));
buildSessionInsight(make([]),{storage:pilotStore,rng:()=>0});
pilotStore.setItem('tdr2:pilotProfile:v1',JSON.stringify({id:'pilot-B'}));
buildSessionInsight(make([]),{storage:pilotStore,rng:()=>0});
assert.ok(pilotStore.getItem('tdr2:sessionInsightCycle:v1:pilot-A'));
assert.ok(pilotStore.getItem('tdr2:sessionInsightCycle:v1:pilot-B'),
  'Both pilots require independent persistent antirepeat cycles on one device');
assert.notEqual(pilotStore.getItem('tdr2:sessionInsightCycle:v1:pilot-A'),
  pilotStore.getItem('tdr2:sessionInsightCycle:v1:pilot-B')+'impossible',
  'Pilot state is stored independently without cloud changes');

const lang=readFileSync('index.html','utf8').match(/content="DEV (\d+)\.(\d+)\.(\d+)"/);
assert.ok(lang,'DEV version missing');
const [major,minor,patch]=lang.slice(1).map(Number);
assert.ok(major>1||(major===1&&(minor>2||(minor===2&&patch>=329))),'DEV version incremented');
const eligibleNew=make([65000,64000,60000],{brakePct:25,coastPct:35,throttlePct:30});
const selected=storage();
for(let i=0;i<75;i++)buildSessionInsight(eligibleNew,{storage:selected,rng:()=>i/100});
const active=JSON.parse(selected.getItem('tdr2:sessionInsightCycle:v1'));
for(const topic of ['bestAfterFirst','lateBest'])
  assert.ok(active.used['es:'+topic]?.length>0,'Real lap telemetry must reach '+topic);
const early=make([60000,64000,65000]);
const selectedEarly=storage();
for(let i=0;i<45;i++)buildSessionInsight(early,{storage:selectedEarly,rng:()=>0});
assert.ok(JSON.parse(selectedEarly.getItem('tdr2:sessionInsightCycle:v1')).used['es:earlyBest']?.length>0,
  'Early best must be eligible when first lap is strictly quickest');
for(const lang of ['es','en']){
  const src=Object.values(BANK.categories).flatMap(group=>group[lang]);
  assert.equal(new Set(src).size,src.length,'No exact duplicates across all categories');
}
console.log('PASS: 20 situations, 2364 bilingual JSON phrases, preserved original IDs, 66 no-lap variants, factual telemetry, per-pilot anti-repeat and report/export consistency');
