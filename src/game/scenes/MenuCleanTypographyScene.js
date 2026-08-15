import { MenuScene as CurrentMenuScene } from './MenuGameModesScene.js';

const SPECIAL={
  'track01':'Custom Track',
  'offroad-raven-hollow':'Raven Hollow',
  'f1-baku':'Baku',
  'f1-monte-carlo':'Monte Carlo',
  'chicane-vale':'Chicane Vale'
};

function humanizeTrackKey(key){
  const raw=String(key||'').trim();
  if(!raw)return '—';
  if(SPECIAL[raw])return SPECIAL[raw];
  return raw
    .replace(/^(?:f1|offroad|karting)[-_]/i,'')
    .replace(/[-_]+/g,' ')
    .replace(/\b\w/g,c=>c.toUpperCase());
}

export class MenuScene extends CurrentMenuScene{
  _trackTitle(key){ return humanizeTrackKey(key); }
}
