// DEV-only physical AI pilot director. ONLY the room host owns bot physics.
// All levels use the player's car parameters and the same Arcade integration;
// easy/medium simply choose less ambitious pace, expert has no extra grip/power.
import {buildTrackRacingLineModel} from '../ai/trackRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../ai/trackManeuverPlanner.js';
import {updateRacePhysicalBot} from '../ai/raceAiController.js';
import {syncLive4CarVisual} from './craftraceLiveV2CarVisual.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const TINTS=[0xffc35b,0x73d7ff,0xee81ce,0x9affbb];
export const LIVE4_AI_LEVELS=Object.freeze({
  1:Object.freeze({title:'Principiante',pace:0.70,cornerRisk:0,plannerLateralAccel:1050,plannerDrive:.58,plannerBrake:.67}),
  2:Object.freeze({title:'Competitivo',pace:0.86,cornerRisk:0.17,plannerLateralAccel:1450,plannerDrive:.80,plannerBrake:.85}),
  3:Object.freeze({title:'Experto',pace:1,cornerRisk:0.35,plannerLateralAccel:1800,plannerDrive:.95,plannerBrake:.95})
});
const speedOf=body=>Math.hypot(body?.body?.velocity?.x||0,body?.body?.velocity?.y||0);

export class CrafRaceLive4BotDirector{
 constructor(scene,{roster,hostId,localId,startingGrid,laps=3}={}){
  if(!scene?.physics?.add?.sprite||!Array.isArray(roster)||hostId!==localId)
    throw Error('Only a physics-ready host can drive LIVE AI');
  const ai=roster.filter(x=>x.kind==='ai');
  if(ai.length>3||ai.some(x=>!LIVE4_AI_LEVELS[x.difficulty]||x.owner_id!==hostId))
    throw Error('Invalid AI assignment');
  this.scene=scene;this.bots=[];this.laps=clamp(Math.floor(laps),1,30);
  this.lastUpdated=0;this.lastCpuMs=0;this.cpuTotalMs=0;this.cpuSamples=0;
  this.profiles=new Map();
  if(ai.length===0){this.profile=null;return;}
  if(scene.track?.closed===false||scene.track?.meta?.closed===false)
    throw Error('Live AI currently requires a closed circuit');
  const centerline=scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline;
  const width=Number(scene.track?.meta?.trackWidth||140);
  const line=buildTrackRacingLineModel({
    raceCenterline:centerline,trackWidth:width,offsetScale:1,apexCommitment:.20
  });
  // Previously the planner assumed 520px/s while the actual car was limited
  // to ~420px/s. The controller normalized twice and drove every bot too slowly.
  // Plan against the host's actual car envelope; never grant extra physics.
  const maxFwd=Math.max(80,Number(scene.maxFwd||scene.carParams?.maxFwd||420));
  const driveAccel=Math.max(20,Number(scene.accel||scene.carParams?.accel||520));
  const brakeDecel=Math.max(20,Number(scene.brakeForce||scene.carParams?.brakeForce||720));
  for(const [level,settings] of Object.entries(LIVE4_AI_LEVELS)){
    const profile=buildTrackManeuverPlan(buildTrackSpeedProfile(line,{
      maxSpeed:maxFwd,lateralAccel:settings.plannerLateralAccel,
      minCornerSpeed:125,driveAccel:driveAccel*settings.plannerDrive,
      brakeDecel:brakeDecel*settings.plannerBrake
    }));
    if(!profile.valid||!Array.isArray(profile.samples)||profile.samples.length<12)
      throw Error('No se puede preparar IA física para este circuito');
    this.profiles.set(Number(level),profile);
  }
  this.profile=this.profiles.get(3);this.spacing=Number(line.spacing||10);
  const sprite=scene.carRig?.list?.find?.(item=>item?.texture?.key);
  if(!sprite)throw Error('Player car visuals unavailable');
  for(const item of ai){
   const grid=startingGrid?.positions?.[item.seat];
   if(!grid)throw Error('Missing AI start position');
   const x=grid.x-Math.cos(grid.r)*44,y=grid.y-Math.sin(grid.r)*44;
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
     finished:false,finishAt:null,lapTimes:[],lastLapAt:null,
     lastPoseAt:0,lastPose:null};
   this.bots.push(bot);
  }
 }
 update(deltaMs,now,started){
  if(!this.bots.length)return [];
  const scene=this.scene;
  // Refresh even during countdown, after the host's skin promise resolves.
  for(const bot of this.bots)syncLive4CarVisual(scene,bot.visual,TINTS[bot.seat]);
  if(!started)return [];
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
   if(bot.lastLapAt===null)bot.lastLapAt=now;
   const n=profile.samples.length,next=control.nearestIndex;
   let step=next-bot.lastIndex;
   if(step< -n/2)step+=n;
   if(step>n/2)step-=n;
   if(step>0&&step<Math.min(50,n*.12))bot.sampleProgress+=step;
   bot.lastIndex=next;
   const lap=Math.min(this.laps,Math.floor(bot.sampleProgress/n));
   while(bot.completedLaps<lap){
     bot.completedLaps++;
     const lapMs=Math.round(now-bot.lastLapAt);
     if(lapMs>=500)bot.lapTimes.push(lapMs);
     bot.lastLapAt=now;
   }
   if(bot.completedLaps>=this.laps&&bot.lapTimes.length===this.laps){
     bot.finished=true;bot.finishAt=now;body.setVelocity(0,0);
   }
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
  botCpuLastMs:this.lastCpuMs,finished:this.bots.filter(x=>x.finished).length
 };}
 destroy(){
  for(const bot of this.bots){bot.rig?.destroy?.();bot.plannerBody?.destroy?.();}
  this.bots=[];this.profiles.clear();this.scene=null;
 }
}
