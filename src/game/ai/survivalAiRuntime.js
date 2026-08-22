// src/game/ai/survivalAiRuntime.js
// Infraestructura de migración. No cambia la conducción mientras PLANNER_READY sea false.

export const SURVIVAL_AI_MODES=Object.freeze({
  LEGACY:'legacy',
  PLANNER_V1:'planner_v1'
});

export const SURVIVAL_AI_PLANNER_READY=false;

const MODE_KEY='tdr2:survivalAiMode';
const DEBUG_KEY='tdr2:survivalAiDebug';
const MAX_SAMPLES=1200;

function safeStorageGet(key){
  try{return localStorage.getItem(key);}catch{return null;}
}

export function readSurvivalAiRuntime(){
  const requested=safeStorageGet(MODE_KEY)===SURVIVAL_AI_MODES.PLANNER_V1
    ?SURVIVAL_AI_MODES.PLANNER_V1
    :SURVIVAL_AI_MODES.LEGACY;
  const effective=requested===SURVIVAL_AI_MODES.PLANNER_V1&&SURVIVAL_AI_PLANNER_READY
    ?SURVIVAL_AI_MODES.PLANNER_V1
    :SURVIVAL_AI_MODES.LEGACY;
  const debug=safeStorageGet(DEBUG_KEY)==='1';

  return{requested,effective,debug,plannerReady:SURVIVAL_AI_PLANNER_READY};
}

export function createSurvivalAiTelemetry(meta={}){
  const state={
    schemaVersion:1,
    createdAt:new Date().toISOString(),
    mode:meta.mode||SURVIVAL_AI_MODES.LEGACY,
    requestedMode:meta.requestedMode||SURVIVAL_AI_MODES.LEGACY,
    trackKey:meta.trackKey||null,
    samples:[],
    events:[]
  };

  const pushSample=(sample)=>{
    state.samples.push(sample);
    if(state.samples.length>MAX_SAMPLES)state.samples.splice(0,state.samples.length-MAX_SAMPLES);
  };
  const pushEvent=(event)=>{
    state.events.push(event);
    if(state.events.length>240)state.events.splice(0,state.events.length-240);
  };

  // Consola de inspección voluntaria. No persiste ni se envía fuera del juego.
  try{window.__TDR_SURVIVAL_AI__=state;}catch{}

  return{state,pushSample,pushEvent};
}
