import { getPilotProfile } from './pilotProfile.js';

export const SHARED_LAP_INDEX_KEY='tdr2:sharedLapIndex:v1';

export function makeSharedLapPackage(ghost){
  const pilot=getPilotProfile();
  return {format:'TDRLAP',version:1,kind:'tester-lap',pilot:{id:pilot.id,name:pilot.name},trackId:String(ghost?.trackKey||'track01'),carId:String(ghost?.carId||'stock'),lapMs:Number(ghost?.lapMs)||0,recordedAt:Number(ghost?.recordedAt)||Date.now(),replay:{samples:Array.isArray(ghost?.samples)?ghost.samples:[],cameraSamples:Array.isArray(ghost?.cameraSamples)?ghost.cameraSamples:[],viewport:ghost?.viewport||null}};
}
