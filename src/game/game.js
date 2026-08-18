import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuAdminLogoRestoreScene.js';
import { RaceScene } from './scenes/RaceAuthoredEnvironmentScene.js';
import { UpgradeShopScene } from './scenes/UpgradeWorkshopUnifiedStyleScene.js';
import { GarageScene } from './scenes/GarageCleanTypographyScene.js';
import { SettingsScene } from './scenes/SettingsHelpTutorialScene.js';
import { GarageDetailScene } from './scenes/GarageDetailSpeedConsistencyScene.js';
import { AdminHubScene } from './scenes/AdminHubScene.js';
import { CarEditorScene } from './scenes/CarEditorSpeedConsistencyScene.js';
import { TrackEditorScene } from './scenes/TrackEditorScene.js';
import { TrackGarageScene } from './scenes/TrackGarageCleanTypographyScene.js';
import { TrackStudioScene } from './scenes/TrackStudioScene.js';
import { EnvironmentBuilderScene } from './scenes/EnvironmentBuilderGuardrailScene.js';
import { installMenuMusic } from './audio/MenuMusic.js';
import './tracks/trackPublicNames.js';

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

function installCleanTextFactory(){
  const proto=Phaser.GameObjects?.GameObjectFactory?.prototype;
  if(!proto||proto.__tdrCleanTextInstalled||typeof proto.text!=='function')return;
  const original=proto.text;
  proto.text=function(x,y,text,style={}){
    const clean={...(style||{})};
    if(/Orbitron/i.test(String(clean.fontFamily||''))){
      clean.fontFamily='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      if(clean.fontStyle==='900') clean.fontStyle='bold';
    }
    if(Number(clean.strokeThickness)>2) clean.strokeThickness=2;
    return original.call(this,x,y,text,clean);
  };
  proto.__tdrCleanTextInstalled=true;
}

export function createGame(parentId = 'app') {
  installCleanTextFactory();

  const vp=videoPrefs();
  const dpr=window.devicePixelRatio||1;
  const requestedScale=vp.renderScale==='eco'?1:vp.renderScale==='sharp'?2:1.5;
  const requestedQuality=vp.quality==='low'?1:vp.quality==='medium'?1.5:2;
  const requested=Math.min(requestedScale,requestedQuality);
  const resolution=Math.min(dpr,Math.max(2,requested));

  const game=new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: '#0b1020',
    resolution,
    fps:{target:vp.targetFps,min:20},
    scene: [BootScene, MenuScene, MenuAliasScene, GarageScene, SettingsScene, GarageDetailScene, RaceScene, AdminHubScene, UpgradeShopScene, CarEditorScene, TrackGarageScene, TrackStudioScene, EnvironmentBuilderScene, TrackEditorScene],
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    render: { pixelArt: false, antialias:true, antialiasGL:true, roundPixels:false }
  });

  try{
    const canvas=game.canvas;
    if(canvas?.style){
      canvas.style.imageRendering='auto';
      canvas.style.webkitFontSmoothing='antialiased';
      canvas.style.textRendering='optimizeLegibility';
    }
  }catch(_){}

  installMenuMusic(game);
  return game;
}
