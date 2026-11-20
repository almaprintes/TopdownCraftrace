// DEV-only physical AI pilot director. ONLY the room host owns bot physics.
// All levels use the player's car parameters and the same Arcade integration;
// easy/medium simply choose less ambitious pace, expert has no extra grip/power.
import {buildTrackRacingLineModel} from '../ai/trackRacingLinePlanner.js';
import {buildTrackSpeedProfile} from '../ai/trackSpeedProfilePlanner.js';
import {buildTrackManeuverPlan} from '../ai/trackManeuverPlanner.js';
import {updateRacePhysicalBot} from '../ai/raceAiController.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const TINTS=[0xffc35b,0x73d7ff,0xee81ce,0x9affbb];
export const LIVE4_AI_LEVELS=Object.freeze({
  1:Object.freeze({title:'Principiante',pace:0.70,cornerRisk:0}),
  2:Object.freeze({title:'Competitivo',pace:0.86,cornerRisk:0.13}),
  3:Object.freeze({title:'Experto',pace:1,cornerRisk:0.34})
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
  if(ai.length===0){this.profile=null;return;}
  if(scene.track?.closed===false||scene.track?.meta?.closed===false)
    throw Error('Live AI currently requires a closed circuit');
  const centerline=scene.track?.meta?.raceCenterline||scene.track?.meta?.centerline;
  const width=Number(scene.track?.meta?.trackWidth||140);
  const line=buildTrackRacingLineModel({
    raceCenterline:centerline,trackWidth:width,offsetScale:1,apexCommitment:.20
  });
  const profile=buildTrackManeuverPlan(buildTrackSpeedProfile(line,{
    lateralAccel:1500,minCornerSpeed:125
  }));
  if(!profile.valid||!Array.isArray(profile.samples)||profile.samples.length<12)
    throw Error('No se puede preparar IA física para este circuito');
  this.profile=profile;this.spacing=Number(line.spacing||10);
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
   const visual=scene.add.sprite(0,0,sprite.texture.key);
   visual.setOrigin(sprite.originX,sprite.originY);
   visual.setScale(sprite.scaleX,sprite.scaleY);
   visual.setTint(TINTS[item.seat]);
   const rig=scene.add.container(x,y,[visual]).setDepth(29);
   rig.rotation=grid.r+(scene._carVisualRotOffset||0);
   let best=0,bd=Infinity;
   for(let i=0;i<profile.samples.length;i++){
    const p=profile.samples[i],dist=(p.x-x)**2+(p.y-y)**2;
    if(dist<bd){best=i;bd=dist;}
   }
   const bot={seat:item.seat,difficulty:item.difficulty,
     plannerBody:body,rig,visual,_plannerSampleIndex:best,
     lastIndex:best,sampleProgress:0,completedLaps:0,
     finished:false,finishAt:null,lapTimes:[],lastLapAt:null,
     lastPoseAt:0,lastPose:null};
   this.bots.push(bot);
  }
 }
 update(deltaMs,now,started){
  if(!this.bots.length||!started)return [];
  const startedCpu=performance.now();
  const scene=this.scene,profile=this.profile;
  const dt=clamp((Number(deltaMs)||16.667)/1000,.001,.05),packets=[];
  const maxSpeed=Math.max(80,Number(scene.maxFwd||scene.carParams?.maxFwd||420));
  for(const bot of this.bots){
   if(bot.finished)continue;
   const settings=LIVE4_AI_LEVELS[bot.difficulty];
   const control=updateRacePhysicalBot(bot,profile,{
     dt,spacing:this.spacing,maxFwd:maxSpeed*settings.pace,
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
  this.bots=[];this.scene=null;
 }
}
