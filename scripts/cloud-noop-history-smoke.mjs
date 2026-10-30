// Offline, synthetic-data experiment. NOT a production backup format.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';

const sql=readFileSync('supabase/migrations/20261030_032_skip_identical_cloud_progress_writes.sql','utf8');
for(const pattern of [
  /player_progress\.revision=p_expected_revision/,
  /player_progress\.progress->'data' is distinct from excluded\.progress->'data'/,
  /player_progress\.schema_version is distinct from excluded\.schema_version/,
  /p\.revision=p_expected_revision and p\.schema_version=v_format/,
  /p\.progress->'data' = p_progress->'data'/,
  /coalesce\(v_unchanged,false\)/,
  /md5\(pg_get_functiondef\(/
])assert.match(sql,pattern);
assert.doesNotMatch(sql,/delete from|truncate table|alter table|create table|create index/i);

// Candidate tuple dictionary. Safe for optional and unknown fields; no truncation.
const size=x=>Buffer.byteLength(JSON.stringify(x),'utf8');
function pack(history){
  if(!history.length)return null;
  const fields=[...new Set(history.flatMap(row=>Object.keys(row)))];
  if(fields.length>29)return null;
  const rows=history.map(row=>{
    let mask=0;const values=[];
    fields.forEach((key,i)=>{if(Object.hasOwn(row,key)){mask+=2**i;values.push(row[key]);}});
    return [mask,...values];
  });
  return {codec:'tuple-mask-1',fields,rows};
}
function unpack(packet){
  if(packet.codec!=='tuple-mask-1'||!Array.isArray(packet.fields)||!Array.isArray(packet.rows)||
     packet.fields.length>29||new Set(packet.fields).size!==packet.fields.length)
    throw new Error('Invalid dictionary');
  return packet.rows.map(row=>{
    const [mask,...values]=row;
    if(!Number.isSafeInteger(mask)||mask<0||mask>=2**packet.fields.length)throw new Error('Invalid row mask');
    const restored={};let index=0;
    packet.fields.forEach((key,i)=>{
      if(Math.floor(mask/2**i)%2===1){
        if(index>=values.length)throw new Error('Missing value');
        restored[key]=values[index++];
      }
    });
    if(index!==values.length)throw new Error('Extra value');
    return restored;
  });
}
const history=Array.from({length:184},(_,i)=>{
  const r={t:'2026-10-30T10:00:00.000Z',s1:11111+i,s2:15555+i,carId:'avenir_gripline',
    lapMs:32888+i,s1Tick:1111+i,s2Tick:2255+i,lapTick:3333+i};
  if(i%4!==0)r.tdrCleanLap={clean:i%2===0,valid:true,note:'💚'};
  if(i===6)r.futureMetric={nested:[0,null,{},'á😀'],allowed:true};
  return r;
});
const v2={format:2,createdAt:'2026-10-30T11:40:00Z',data:{
  'tdr2:ttHist:karting-tenerife':{v:1,history},
  'tdr2:raceRecords:v1':{version:1,tracks:{a:{time:13588}},cloud:{},updatedAt:1},
  'tdr2:garageFusion:v1':{coins:12},'tdr2:carId':'avenir_gripline'
}};
const original=JSON.parse(JSON.stringify(v2));
const packet=pack(history);
const v3Candidate={...v2,format:3,data:{...v2.data,
  'tdr2:ttHist:karting-tenerife':{v:1,history:packet}}};
assert.deepEqual(unpack(packet),history,'All laps and optional fields must roundtrip unchanged');
assert.deepEqual(v2,original,'Experiment cannot mutate original save');
assert.throws(()=>unpack({codec:'tuple-mask-1',fields:['a'],rows:[[0,'extra']]}),/Extra/);
assert.throws(()=>unpack({codec:'unknown',fields:[],rows:[]}),/Invalid/);
const raw=Buffer.from(JSON.stringify(v2));
assert.deepEqual(JSON.parse(gunzipSync(gzipSync(raw)).toString('utf8')),v2);
const sizes={json_v2:size(v2),json_v3_candidate:size(v3Candidate),
  gzip_v2:gzipSync(raw).byteLength,
  gzip_v3_candidate:gzipSync(Buffer.from(JSON.stringify(v3Candidate))).byteLength};
assert.ok(sizes.json_v3_candidate<sizes.json_v2,'Candidate should help fixture raw JSON');
console.log('PASS: no-op SQL guard; lossless synthetic packing, optional fields, UTF-8 and gzip');
console.log('Only synthetic fixtures; NOT actual player savings:',JSON.stringify(sizes));
