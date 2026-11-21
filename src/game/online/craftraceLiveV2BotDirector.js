// DEV-only physical AI pilot director. ONLY the room host owns bot physics.
// All levels use the player's car parameters and the same Arcade integration;
// easy/medium simply choose less ambitious pace, expert has no extra grip/power.
import {buildTrackRacingLineModel} from '../ai/trackRacingLinePlanner.js';
import {buildGuidedTrackRacingLineModel} from '../ai/trackGuidedRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../ai/trackManeuverPlanner.js';
import {updateRacePhysicalBot} from '../ai/raceAiController.js';
import {syncLive4CarVisual} from './craftraceLiveV2CarVisual.js';
import {makeLive4LapGates,advanceLive4PhysicalLap} from './craftraceLive4LapGates.js';
import {measureLateralUse} from './craftraceRacingLineTelemetry.js';
import {summarizePlannedLateral,samplePlannedVsReal} from './craftraceLive4LineTrackingAudit.js';
import {makeLive4TimingAudit,observeLive4Timing,summarizeLive4Timing} from './craftraceLive4TimingAudit.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const TINTS=[0xffc35b,0x73d7ff,0xee81ce,0x9affbb];
export const LIVE4_AI_LEVELS=Object.freeze({
  1:Object.freeze({title:'Principiante',pace:0.70,cornerRisk:0,plannerLateralAccel:1050,plannerDrive:.58,plannerBrake:.67}),
  2:Object.freeze({title:'Competitivo',pace:0.86,cornerRisk:0.17,plannerLateralAccel:1450,plannerDrive:.80,plannerBrake:.85}),
  3:Object.freeze({title:'Experto',pace:1,cornerRisk:0.35,plannerLateralAccel:2050,plannerDrive:1,plannerBrake:1})
});
const speedOf=body=>Math.hypot(body?.body?.velocity?.x||0,body?.body?.velocity?.y||0);

export class CrafRaceLive4BotDirector{
 constructor(scene,{roster,hostId,localId,startingGrid,laps=3,preview=false}={}){
  if(!scene?.physics?.add?.sprite||!Array.isArray(roster)||hostId!==localId)
    throw Error('Only a physics-ready host can drive LIVE AI');
  const ai=roster.filter(x=>x.kind==='ai');
  // Four AI may run only in this device's off-grid director preview.
  // The authenticated LIVE 4 room keeps its original 1-3 bot restriction.
  if((preview&&scene?._crafRaceDirectorPreview!==true)||
     ai.length>(preview?4:3)||
     ai.some(x=>!LIVE4_AI_LEVELS[x.difficulty]||x.owner_id!==hostId))
    throw Error('Invalid AI assignment');
  this.scene=scene;this.bots=[];this.laps=clamp(Math.floor(laps),1,30);
  this.lastUpdated=0;this.lastCpuMs=0;this.cpuTotalMs=0;this.cpuSamples=0;
  this.profiles=new Map();
  this.preview=preview===true;this.raceStarted=false;
  this.timingAudit=makeLive4TimingAudit();
  if(ai.length===0){this.profile=null;return;}
  if(scene.track?.closed===false||scene.track?.meta?.closed===false)
    throw Error('Live AI currently requires a closed circuit');
  const centerline=scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline;
  const width=Number(scene.track?.meta?.trackWidth||140);
  this.lapGates=makeLive4LapGates({
    centerline,trackWidth:width,
    finishLine:scene.track?.meta?.finishLine||scene.track?.meta?.finish,
    checkpoints:scene.track?.meta?.checkpoints
  });
  const trackGeometry={raceCenterline:centerline,trackWidth:width};
  const line=buildTrackRacingLineModel(trackGeometry);
  const expertLine=buildTrackRacingLineModel(trackGeometry,{apexCommitment:.22});
  this.standardExpertLine=expertLine;
  this.previewExpertLine=preview?buildTrackRacingLineModel(trackGeometry,{
    apexCommitment:.22,racecraftPreview:true
  }):null;
  this.previewGuidedLine=null;this.previewGuidedProfile=null;this.previewGuideReport=null;
  this.previewMode='A';
  if(preview&&scene.track?.meta?.aiLineGuides?.points?.length){
    const result=buildGuidedTrackRacingLineModel(
      this.previewExpertLine,scene.track.meta.aiLineGuides,
      scene.track.meta.trackShape,{
        worldW:scene.track.meta.worldW,worldH:scene.track.meta.worldH
      },{carRadius:Math.max(8,Math.round(14*Number(scene.track.meta.carScale||1)))});
    this.previewGuideReport=result.report;
    if(result.report.active)this.previewGuidedLine=result.model;
  }
  if(!expertLine.valid||expertLine.racingLine.length!==line.racingLine.length||
     (preview&&(!this.previewExpertLine?.valid||
       this.previewExpertLine.racingLine.length!==line.racingLine.length)))
    throw Error('Expert racing line invalid');
  // Previously the planner assumed 520px/s while the actual car was limited
  // to ~420px/s. The controller normalized twice and drove every bot too slowly.
  // Plan against the host's actual car envelope; never grant extra physics.
  const maxFwd=Math.max(80,Number(scene.maxFwd||scene.carParams?.maxFwd||420));
  const driveAccel=Math.max(20,Number(scene.accel||scene.carParams?.accel||520));
  const brakeDecel=Math.max(20,Number(scene.brakeForce||scene.carParams?.brakeForce||720));
  // Steering physics limits speed in tight corners; lateral grip alone
  // overestimates hairpin entry speed. LIVE4-only expert envelope.
  // Planner uses the nominal steering bound. Physical steering continues
  // respecting speed-dependent grip and turn factors inside the controller.
  const yawAtSpeed=Math.max(.1,Number(scene.turnRate||scene.carParams?.turnRate||2.4));
  for(const [level,settings] of Object.entries(LIVE4_AI_LEVELS)){
    const expert=Number(level)===3;
    const profile=buildTrackManeuverPlan(buildTrackSpeedProfile(expert?expertLine:line,{
      maxSpeed:maxFwd,lateralAccel:settings.plannerLateralAccel,
      minCornerSpeed:expert?80:125,
      ...(expert?{maxYawRate:yawAtSpeed,curvatureSmoothWindow:21}:{}),
      driveAccel:driveAccel*settings.plannerDrive,
      brakeDecel:brakeDecel*settings.plannerBrake
    }));
    if(expert)profile.live4CurveComplexity=expertLine.metrics.meanAbsCurvature;
    if(!profile.valid||!Array.isArray(profile.samples)||profile.samples.length<12)
      throw Error('No se puede preparar IA física para este circuito');
    this.profiles.set(Number(level),profile);
  }
  this.standardExpertProfile=this.profiles.get(3);
  this.previewExpertProfile=null;this.previewRacecraft=false;
  if(preview){
    this.previewExpertProfile=buildTrackManeuverPlan(buildTrackSpeedProfile(
      this.previewExpertLine,{
        maxSpeed:maxFwd,lateralAccel:LIVE4_AI_LEVELS[3].plannerLateralAccel,
        minCornerSpeed:80,maxYawRate:yawAtSpeed,curvatureSmoothWindow:21,
        driveAccel,brakeDecel
      }));
    if(!this.previewExpertProfile.valid)throw Error('Preview racecraft plan invalid');
    this.previewExpertProfile.live4CurveComplexity=
      this.previewExpertLine.metrics.meanAbsCurvature;
    if(this.previewGuidedLine){
      const guidedProfile=buildTrackManeuverPlan(buildTrackSpeedProfile(
        this.previewGuidedLine,{
          maxSpeed:maxFwd,lateralAccel:LIVE4_AI_LEVELS[3].plannerLateralAccel,
          minCornerSpeed:80,maxYawRate:yawAtSpeed,curvatureSmoothWindow:21,
          driveAccel,brakeDecel
        }));
      if(guidedProfile.valid&&guidedProfile.samples?.length>=12){
        guidedProfile.live4CurveComplexity=this.previewGuidedLine.metrics.meanAbsCurvature;
        this.previewGuidedProfile=guidedProfile;
      }else{
        this.previewGuideReport={...this.previewGuideReport,active:false,
          reason:'invalid-guided-speed-profile'};
        this.previewGuidedLine=null;
      }
    }
  }
  this.profile=this.profiles.get(3);this.spacing=Number(line.spacing||10);
  const sprite=scene.carRig?.list?.find?.(item=>item?.texture?.key);
  if(!sprite)throw Error('Player car visuals unavailable');
  for(const item of ai){
   const profile=this.profiles.get(item.difficulty);
   const grid=startingGrid?.positions?.[item.seat];
   if(!grid)throw Error('Missing AI start position');
   const spawnBack=startingGrid.trackAligned?0:44;
   const x=grid.x-Math.cos(grid.r)*spawnBack,
     y=grid.y-Math.sin(grid.r)*spawnBack;
   const body=scene.physics.add.sprite(x,y,'__BODY__');
   body.setVisible(false);
   body.setCircle(Math.max(7,Math.round(14*Number(scene.track?.meta?.carScale||1))));
   body.setCollideWorldBounds(true);body.setBounce(0);body.setDrag(0,0);
   body.rotation=grid.r;body.setVelocity(0,0);
   // The player's real skin may not be loaded yet. Hide the placeholder
   // until a verified texture exists, then follow any async skin/fit changes.
   const visual=scene.add.sprite(0,0,'__DEFAULT').setVisible(false);
   const rig=scene.add.container(x,y,[visual]).setDepth(29);
   syncLive4CarVisual(scene,visual,TINTS[item.seat]);
   rig.rotation=grid.r+(scene._carVisualRotOffset||0);
   let best=0,bd=Infinity;
   for(let i=0;i<profile.samples.length;i++){
    const p=profile.samples[i],dist=(p.x-x)**2+(p.y-y)**2;
    if(dist<bd){best=i;bd=dist;}
   }
   const bot={seat:item.seat,difficulty:item.difficulty,
     plannerBody:body,rig,visual,style:(item.seat*2+1)%3,
     _plannerSampleIndex:best,
     lastIndex:best,sampleProgress:0,completedLaps:0,
     gatePhase:0,lastPhysicalPosition:{x,y},
     finished:false,finishAt:null,lapTimes:[],lastLapAt:null,
     lastPoseAt:0,lastPose:null,
     cornerDiagnostics:{samples:0,sumError:0,maxError:0,overWide:0,lastAimSteps:null,
       lateralCount:0,lateralSum:0,lateralMax:0,lateralNearEdge:0,
       targetSum:0,followErrorSum:0,followErrorMax:0}};
   this.bots.push(bot);
  }
 }
 // A/B/G selection is locked on green; hosted LIVE 4 never enters this path.
 previewActiveLine(){
  return this.preview&&this.previewMode==='G'&&this.previewGuidedLine
    ?this.previewGuidedLine
    :this.preview&&this.previewMode==='B'
      ?this.previewExpertLine:this.standardExpertLine;
 }
 setPreviewLineMode(mode){
  if(!this.preview||this.raceStarted||!['A','B','G'].includes(mode))return false;
  const chosen=mode==='A'?this.standardExpertProfile
    :mode==='B'?this.previewExpertProfile:this.previewGuidedProfile;
  if(!chosen)return false;
  this.previewMode=mode;
  this.previewRacecraft=mode!=='A'; // backwards-compatible A/B diagnostics
  this.profiles.set(3,chosen);this.profile=chosen;
  return true;
 }
 setPreviewRacecraft(enabled){
  return this.setPreviewLineMode(enabled?'B':'A');
 }
 diagnosticLines(){
  const line=this.previewActiveLine();
  return{centerline:line?.centerline||[],target:line?.racingLine||[]};
 }
 update(deltaMs,now,started){
  if(!this.bots.length)return [];
  const scene=this.scene;
  // Refresh even during countdown, after the host's skin promise resolves.
  for(const bot of this.bots)syncLive4CarVisual(scene,bot.visual,TINTS[bot.seat]);
  if(!started)return [];
  this.raceStarted=true;
  observeLive4Timing(this.timingAudit,Number(deltaMs));
  const startedCpu=performance.now();
  const dt=clamp((Number(deltaMs)||16.667)/1000,.001,.05),packets=[];
  const maxSpeed=Math.max(80,Number(scene.maxFwd||scene.carParams?.maxFwd||420));
  for(const bot of this.bots){
   if(bot.finished)continue;
   const settings=LIVE4_AI_LEVELS[bot.difficulty];
   const profile=this.profiles.get(bot.difficulty);
   // Deterministic driving styles break up the three-car clone procession.
   // Bias only lowers the chosen pace; none exceeds the player's own car.
   const paceBias=[1,.985,.97][bot.style];
   const control=updateRacePhysicalBot(bot,profile,{
     dt,spacing:this.spacing,maxFwd:maxSpeed*settings.pace*paceBias,
     live4PrecisionCornering:bot.difficulty===3,
     cornerRisk:settings.cornerRisk,
     accel:Number(scene.accel||scene.carParams?.accel||520),
     brakeForce:Number(scene.brakeForce||scene.carParams?.brakeForce||720),
     linearDrag:Number(scene.linearDrag||scene.carParams?.linearDrag||.004),
     turnRate:Number(scene.turnRate||scene.carParams?.turnRate||2.4),
     steering:scene.carParams?.steering||{}
   });
   const body=bot.plannerBody;
   bot.rig.setPosition(body.x,body.y).setRotation(body.rotation+(scene._carVisualRotOffset||0));
   if(!control.valid)continue;
   // Record real cross-track errors, not just nominal plan speed. Useful for
   // identifying overrun sectors on devices without an intrusive debug HUD.
   if(bot.difficulty===3&&(!bot._cornerDiagnosticAt||now-bot._cornerDiagnosticAt>=125)){
     bot._cornerDiagnosticAt=now;
     const d=bot.cornerDiagnostics;
     d.samples++;d.sumError+=control.distanceToLine;
     d.maxError=Math.max(d.maxError,control.distanceToLine);
     if(control.distanceToLine>this.spacing*6)d.overWide++;
     d.lastAimSteps=control.precisionAimSteps;
     // Compare physical cars to the CURRENT CENTERLINE, independent of their
     // chosen race line. This is how we detect centerline hugging in practice.
     const candidate=this.previewActiveLine();
     const occupied=measureLateralUse(candidate,body.x,body.y,control.nearestIndex);
     if(occupied){
       d.lateralCount++;
       d.lateralSum+=occupied.absoluteFraction;
       d.lateralMax=Math.max(d.lateralMax,occupied.absoluteFraction);
       if(occupied.absoluteFraction>=.70)d.lateralNearEdge++;
       const follow=samplePlannedVsReal(candidate,occupied);
       if(follow){
         d.targetSum+=Math.abs(follow.targetFraction);
         d.followErrorSum+=follow.errorFraction;
         d.followErrorMax=Math.max(d.followErrorMax,follow.errorFraction);
       }
     }
   }
   if(bot.lastLapAt===null)bot.lastLapAt=now;
   const n=profile.samples.length,next=control.nearestIndex;
   let step=next-bot.lastIndex;
   if(step< -n/2)step+=n;
   if(step>n/2)step-=n;
   if(step>0&&step<Math.min(50,n*.12))bot.sampleProgress+=step;
   bot.lastIndex=next;
   // Sample progress remains telemetry only. Require swept physical crossings
   // of both checkpoints and the REAL finish gate, in race direction.
   advanceLive4PhysicalLap(bot,this.lapGates,now,this.laps);
   const pose={x:body.x,y:body.y,angle:body.rotation,
     speed:speedOf(body),lap:bot.completedLaps,
     tick:Math.max(0,Math.floor(scene.simTick||0))};
   bot.lastPose=pose;
   if(now-bot.lastPoseAt>=150){bot.lastPoseAt=now;packets.push({seat:bot.seat,pose});}
  }
  this.lastCpuMs=performance.now()-startedCpu;
  this.cpuTotalMs+=this.lastCpuMs;this.cpuSamples++;
  return packets;
 }
 results(){
  return this.bots.filter(bot=>bot.finished).map(bot=>({
   seat:bot.seat,lapTimes:bot.lapTimes.slice(),
   elapsedMs:bot.lapTimes.reduce((sum,ms)=>sum+ms,0),difficulty:bot.difficulty
  }));
 }
 stats(){return {
  count:this.bots.length,botCpuMeanMs:this.cpuSamples?this.cpuTotalMs/this.cpuSamples:0,
  botCpuLastMs:this.lastCpuMs,finished:this.bots.filter(x=>x.finished).length,
  timing:summarizeLive4Timing(this.timingAudit),
  plan:summarizePlannedLateral(this.previewActiveLine()),
  ...(this.preview?{guided:this.previewGuideReport,previewMode:this.previewMode}:{}),
  cornerDiagnostics:this.bots.filter(b=>b.difficulty===3).map(b=>({
   seat:b.seat,samples:b.cornerDiagnostics.samples,
   meanError:b.cornerDiagnostics.samples
     ?b.cornerDiagnostics.sumError/b.cornerDiagnostics.samples:0,
   maxError:b.cornerDiagnostics.maxError,wideSamples:b.cornerDiagnostics.overWide,
   aimSteps:b.cornerDiagnostics.lastAimSteps,
   lateralSamples:b.cornerDiagnostics.lateralCount,
   lateralMeanPct:b.cornerDiagnostics.lateralCount
     ?Math.round(b.cornerDiagnostics.lateralSum/b.cornerDiagnostics.lateralCount*100):0,
   lateralMaxPct:Math.round(b.cornerDiagnostics.lateralMax*100),
   targetMeanPct:b.cornerDiagnostics.lateralCount
     ?Math.round(b.cornerDiagnostics.targetSum/b.cornerDiagnostics.lateralCount*100):0,
   followMeanErrorPct:b.cornerDiagnostics.lateralCount
     ?Math.round(b.cornerDiagnostics.followErrorSum/b.cornerDiagnostics.lateralCount*100):0,
   followMaxErrorPct:Math.round(b.cornerDiagnostics.followErrorMax*100),
   lateralNearEdgePct:b.cornerDiagnostics.lateralCount
     ?Math.round(b.cornerDiagnostics.lateralNearEdge/b.cornerDiagnostics.lateralCount*100):0
  }))
 };}
 destroy(){
  for(const bot of this.bots){bot.rig?.destroy?.();bot.plannerBody?.destroy?.();}
  this.bots=[];this.profiles.clear();this.scene=null;
 }
}
