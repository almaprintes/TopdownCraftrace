import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuGameModesScene.js';
import { RaceScene } from './scenes/RaceReplayDroneExportScene.js';
import { UpgradeShopScene } from './scenes/UpgradeWorkshopCraftAssetsScene.js';
import { GarageScene } from './scenes/GarageUiStabilityScene.js';
import { SettingsScene } from './scenes/SettingsAVOptionsScene.js';
import { GarageDetailScene } from './scenes/GarageDetailSpeedConsistencyScene.js';
import { AdminHubScene } from './scenes/AdminHubScene.js';
import { CarEditorScene } from './scenes/CarEditorSpeedConsistencyScene.js';
import { TrackEditorScene } from './scenes/TrackEditorScene.js';
import { TrackGarageScene } from './scenes/TrackGarageUnifiedStyleScene.js';
import { TrackStudioScene } from './scenes/TrackStudioScene.js';
import { installMenuMusic } from './audio/MenuMusic.js';

class MenuAliasScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  create() { this.scene.start('menu'); }
}

function videoPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return {quality:String(s?.video?.quality||'high'),targetFps:Number(s?.video?.targetFps||60),renderScale:String(s?.video?.renderScale||'normal')};
  }catch{return {quality:'high',targetFps:60,renderScale:'normal'};}
}

export function createGame(parentId = 'app') {
  const vp=videoPrefs();
  const dpr=window.devicePixelRatio||1;
  const scaleCap=vp.renderScale==='eco'?1:vp.renderScale==='sharp'?2:1.5;
  const qualityCap=vp.quality==='low'?1:vp.quality==='medium'?1.5:2;
  const resolution=Math.min(dpr,scaleCap,qualityCap);
  const antialias=vp.quality!=='low';

  const game=new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: '#0b1020',
    resolution,
    fps:{target:vp.targetFps,min:20},
    scene: [BootScene, MenuScene, MenuAliasScene, GarageScene, SettingsScene, GarageDetailScene, RaceScene, AdminHubScene, UpgradeShopScene, CarEditorScene, TrackGarageScene, TrackStudioScene, TrackEditorScene],
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    render: { pixelArt: false, antialias, antialiasGL: antialias, roundPixels: false }
  });
  installMenuMusic(game);
  return game;
}
