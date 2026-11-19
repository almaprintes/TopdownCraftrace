// LIVE identity cards are display metadata, never authoritative ranking proofs.
import {getPilotProfile} from '../social/pilotProfile.js';
import {loadPlayerStats} from '../stats/playerStats.js';
import {masteryLevelForMeters} from '../stats/carMastery.js';

export function localLivePilot(carId){
 const car=typeof carId==='string'&&/^[a-z0-9_-]{1,64}$/i.test(carId)?carId:'';
 const saved=getPilotProfile().name;
 const nick=typeof saved==='string'&&saved.trim().length>=3?saved.trim().slice(0,16):null;
 let meters=0;
 try{meters=Math.max(0,Number(loadPlayerStats().cars?.[car]?.meters)||0);}catch{}
 return {nick,carId:car||null,masteryLevel:masteryLevelForMeters(meters)};
}

export function parseLivePilot(raw){
 if(!raw||typeof raw!=='object')return null;
 const nick=typeof raw.nick==='string'&&raw.nick.trim().length>=3&&raw.nick.trim().length<=16
  ?raw.nick.trim().replace(/[\u0000-\u001f\u007f]/g,''):null;
 const masteryLevel=Number.isInteger(raw.masteryLevel)&&raw.masteryLevel>=0&&raw.masteryLevel<=9?raw.masteryLevel:null;
 const carId=typeof raw.carId==='string'&&/^[a-z0-9_-]{1,64}$/i.test(raw.carId)?raw.carId:null;
 return {nick,masteryLevel,carId};
}

export function pilotName(pilot,fallback='PILOTO'){
 return pilot?.nick||fallback;
}
export function pilotMastery(pilot){
 return Number.isInteger(pilot?.masteryLevel)?'MAESTRÍA '+pilot.masteryLevel+'/9':'MAESTRÍA PENDIENTE';
}
export function livePilotHandshake(room,pilot){
 return {trackId:room.track_id,physicsVersion:room.physics_version,direction:room.direction,laps:room.laps,
  nick:pilot?.nick||'',carId:pilot?.carId||'',masteryLevel:pilot?.masteryLevel??null};
}
