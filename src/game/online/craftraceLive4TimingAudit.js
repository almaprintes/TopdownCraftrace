// LIVE 4 diagnostic: wall-clock frame delta versus the controller's applied
// dt. Reporting is strictly observational and cannot alter physics, pacing,
// room results or the race clock. Frame-time hitches may explain inflated laps.
export function makeLive4TimingAudit(){
 return{wallMs:0,appliedMs:0,droppedMs:0,hitches:0,maxFrameMs:0,frames:0};
}
export function observeLive4Timing(audit,frameDeltaMs){
 if(!audit||!Number.isFinite(frameDeltaMs)||frameDeltaMs<0)return audit;
 const frame=Math.max(0,frameDeltaMs);
 const applied=Math.max(1,Math.min(50,frame||16.667));
 audit.frames++;
 audit.wallMs+=frame;
 audit.appliedMs+=applied;
 audit.droppedMs+=Math.max(0,frame-applied);
 if(frame>50)audit.hitches++;
 audit.maxFrameMs=Math.max(audit.maxFrameMs,frame);
 return audit;
}
export function summarizeLive4Timing(audit){
 const frames=Number(audit?.frames)||0;
 return{frames,wallSeconds:+((Number(audit?.wallMs)||0)/1000).toFixed(2),
  appliedSeconds:+((Number(audit?.appliedMs)||0)/1000).toFixed(2),
  droppedSeconds:+((Number(audit?.droppedMs)||0)/1000).toFixed(2),
  hitches:Number(audit?.hitches)||0,maxFrameMs:+(Number(audit?.maxFrameMs)||0).toFixed(1)};
}
