import { getPilotProfile } from './pilotProfile.js';
import { saveSharedLap } from './sharedLapStore.js';

export const SHARED_LAP_INDEX_KEY='tdr2:sharedLapIndex:v1';
const PREFIX='TDRLAP1:';

export function makeSharedLapPackage(ghost){
  const pilot=getPilotProfile();
  if(!pilot.name)throw new Error('Primero debes crear tu nombre de piloto.');
  const samples=Array.isArray(ghost?.samples)?ghost.samples:[];
  const lapMs=Number(ghost?.lapMs)||0;
  if(samples.length<5||lapMs<=0)throw new Error('Esta vuelta no tiene una repetición válida.');
  return {format:'TDRLAP',version:1,kind:'tester-lap',pilot:{id:pilot.id,name:pilot.name},trackId:String(ghost?.trackKey||ghost?.trackId||'track01'),carId:String(ghost?.carId||'stock'),lapMs:Math.round(lapMs),recordedAt:Number(ghost?.recordedAt)||Date.now(),replay:{samples,cameraSamples:Array.isArray(ghost?.cameraSamples)?ghost.cameraSamples:[],viewport:ghost?.viewport||null}};
}

export function encodeSharedLap(pkg){
  const bytes=new TextEncoder().encode(JSON.stringify(pkg));
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return PREFIX+btoa(binary);
}

export function decodeSharedLap(code){
  const raw=String(code||'').trim();
  if(!raw.startsWith(PREFIX))throw new Error('Código de vuelta no válido.');
  const binary=atob(raw.slice(PREFIX.length));
  const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
  const pkg=JSON.parse(new TextDecoder().decode(bytes));
  return saveSharedLap(pkg);
}

export async function shareLapCode(ghost){
  const pkg=makeSharedLapPackage(ghost),code=encodeSharedLap(pkg);
  const text=`Top Down RACE · ${pkg.pilot.name} · ${pkg.trackId} · ${pkg.lapMs} ms\n${code}`;
  if(navigator.share){await navigator.share({title:'Top Down RACE · Vuelta de tester',text});return 'share';}
  await navigator.clipboard.writeText(code);return 'clipboard';
}
