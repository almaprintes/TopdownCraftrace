import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LIVE4_G_REPORT_KEY,LIVE4_G_REPORT_LIMIT,
 buildLive4CalibrationReport,readLive4CalibrationHistory,
 saveLive4CalibrationReport,formatLive4CalibrationHistory,
 copyLive4CalibrationText} from '../src/game/online/craftraceLive4CalibrationReport.js';

const storageMap=new Map();
const storage={
 getItem:key=>storageMap.get(key)||null,
 setItem:(key,val)=>storageMap.set(key,val)
};
const bots=[{
 seat:1,aiPilotName:'Eva Pulso',aiPilotElo:1150,
 bezierDieHistory:[
  {lap:1,face:4,plannedVariationPx:7.2},
  {lap:2,face:1,plannedVariationPx:20.8},
  {lap:3,face:6,plannedVariationPx:0}],
 bezierLapTelemetry:[
  {lap:1,samples:1610,meanLineErrorPx:11.4,maxLineErrorPx:26.7,
   meanSpeedPxS:440,meanBrake:.001,brakeActivePct:.5,peakBrake:.1,meanAbsSteer:.12},
  {lap:2,samples:1570,meanLineErrorPx:11.2,maxLineErrorPx:27.7,
   meanSpeedPxS:456,meanBrake:0,brakeActivePct:0,peakBrake:0,meanAbsSteer:.16},
  {lap:3,samples:1551,meanLineErrorPx:10.9,maxLineErrorPx:24.4,
   meanSpeedPxS:457,meanBrake:0,brakeActivePct:0,peakBrake:0,meanAbsSteer:.17}]
}];
const entries=[
 {seat:0,name:'JUANFRIKAZO_DEV',kind:'human',elapsedMs:77837,
  lapTimes:[26166,26369,25302]},
 {seat:1,name:'Eva Pulso',kind:'ai',elapsedMs:81787,
  lapTimes:[28165,26854,26768]}
];
const report=buildLive4CalibrationReport({
 trackId:'karting-canarias-4096',carId:'avenir',laps:3,
 direction:'forward',physicsVersion:205,aiDifficulty:3,
 generatedAt:'2026-11-23T08:04:00.000Z',
 entries,bots,diagnostics:{
  timing:{hitches:0,droppedSeconds:0},
  cornerDiagnostics:[{seat:1,targetMeanPct:66,lateralMeanPct:64,followMeanErrorPct:62}]
 }
});
assert.equal(report.formato,'CRAFT_RACE_LIVE4_G_V1');
assert.equal(report.pilotoDatos.length,2);
assert.equal(report.pilotoDatos[0].totalMs,77837);
assert.deepEqual(report.pilotoDatos[0].vueltas.map(x=>x.ms),[26166,26369,25302]);
assert.deepEqual(report.pilotoDatos[1].vueltas.map(x=>x.dado),[4,1,6]);
assert.equal(report.pilotoDatos[1].vueltas[1].desvioPrevistoPx,20.8);
assert.equal(report.pilotoDatos[1].vueltas[0].fotogramasFrenandoPct,.5);
assert.equal(report.pilotoDatos[1].vueltas[0].frenadaMaximaPct,10);
assert.equal(report.pilotoDatos[1].vueltas[2].errorObjetivoMedioPx,10.9);
assert.equal(report.diagnostico.iaHitches,0);
assert.equal(report.diagnostico.pilotos[0].errorSeguimientoPct,62);
assert.equal(report.circuito,'karting-canarias-4096');
const exported=JSON.stringify(report);
for(const secret of ['room_id','host_id','player_id','invitation','uuid','access_token'])
 assert.ok(!exported.includes(secret),'Never export room/account secrets');
assert.equal(readLive4CalibrationHistory(storage).length,0);

for(let i=0;i<12;i++){
 const r=buildLive4CalibrationReport({...{
 trackId:'karting-canarias-4096',carId:'avenir',laps:3,entries,bots},
 generatedAt:'2026-11-23T08:'+String(i).padStart(2,'0')+':00.000Z'});
 const saved=saveLive4CalibrationReport(storage,'room-private-'+i,r);
 assert.equal(saved.persisted,true);
}
assert.equal(readLive4CalibrationHistory(storage).length,LIVE4_G_REPORT_LIMIT);
assert.equal(readLive4CalibrationHistory(storage)[0].key,'room-private-2');
const same=saveLive4CalibrationReport(storage,'room-private-11',report);
assert.equal(same.history.length,10,'Rerender must not duplicate same room');
const text=formatLive4CalibrationHistory(same.history);
const decoded=JSON.parse(text);
assert.equal(decoded.totalCarreras,10);
assert.equal(decoded.carreras.at(-1).fechaUTC,'2026-11-23T08:04:00.000Z');
assert.ok(!text.includes('room-private-'));
assert.ok(!text.includes(LIVE4_G_REPORT_KEY));
assert.ok(!text.includes('undefined'));
assert.ok(text.length<85000,'Clipboard report stays under mobile-friendly limit');
let copied='';
const ok=await copyLive4CalibrationText(text,{
 clipboard:{writeText:async t=>{copied=t;}}
});
assert.equal(ok,true);assert.equal(copied,text);
let fallbackCopied=false;
const doc={
 body:{append(el){this.el=el;}},
 createElement:()=>({
  value:'',style:{},setAttribute(){},focus(){},select(){},remove(){}
 }),
 execCommand(command){fallbackCopied=command==='copy';return fallbackCopied;}
};
assert.equal(await copyLive4CalibrationText('x',{
 clipboard:{writeText:async()=>{throw Error('denied');}},doc
}),true);
assert.equal(fallbackCopied,true);
const readonly={getItem(){throw Error('storage blocked')},setItem(){throw Error('storage blocked')}};
assert.equal(saveLive4CalibrationReport(readonly,'demo',report).persisted,false);
assert.equal(saveLive4CalibrationReport(readonly,'demo',report).history.length,1);
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
assert.ok(bridge.includes("if(allFinished&&guidedGTrial&&isHost&&director)"),
 'Never export incomplete/offline/guest result as a complete G calibration');
assert.ok(bridge.includes('COPIAR INFORME IA'));
assert.ok(bridge.includes('saveLive4CalibrationReport(store,roomId,report)'));
assert.ok(bridge.includes('formatLive4CalibrationHistory(notebook)'));
assert.ok(bridge.includes('Abre ChatGPT y pega el texto'));
assert.ok(bridge.includes('room.physics_version'));
console.log('PASS LIVE 4 G race notebook: ten runs, dedup, accurate lap/dice/telemetry, privacy, clipboard, iPhone fallback.');
