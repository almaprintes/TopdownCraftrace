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

function installCrispTextFactory(){
  const proto=Phaser.GameObjects?.GameObjectFactory?.prototype;
  if(!proto||proto.__tdrCrispTextInstalled||typeof proto.text!=='function')return;
  const original=proto.text;
  proto.text=function(x,y,text,style={}){
    const clean={...(style||{})};
    // Thick canvas strokes become visibly blocky on Retina when the game is scaled.
    // Keep outlines subtle and let the high-resolution glyph texture do the work.
    if(Number(clean.strokeThickness)>3) clean.strokeThickness=3;
    const obj=original.call(this,x,y,text,clean);
    try{
      const dpr=Math.max(2,Math.min(3,window.devicePixelRatio||1));
      obj.setResolution?.(dpr);
      obj.updateText?.();
      if(obj.canvas?.style) obj.canvas.style.imageRendering='auto';
    }catch(_){}
    return obj;
  };
  proto.__tdrCrispTextInstalled=true;
}

export function createGame(parentId = 'app') {
  installCrispTextFactory();

  const vp=videoPrefs();
  const dpr=window.devicePixelRatio||1;
  const requestedScale=vp.renderScale==='eco'?1:vp.renderScale==='sharp'?2:1.5;
  const requestedQuality=vp.quality==='low'?1:vp.quality==='medium'?1.5:2;

  // UI must never fall back to a 1x canvas on Retina displays. That was the
  // source of the chunky/pixelated typography seen in menus and track cards.
  // Performance presets can still reduce particles/effects, but the final UI
  // surface remains high density and clean.
  const requested=Math.min(requestedScale,requestedQuality);
  const resolution=Math.min(dpr,Math.max(2,requested));
  const antialias=true;

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

  // Avoid browser-side nearest-neighbour scaling of the Phaser canvas.
  try{
    const canvas=game.canvas;
    if(canvas?.style){
      canvas.style.imageRendering='auto';
      canvas.style.webkitFontSmoothing='antialiased';
    }
  }catch(_){}

  installMenuMusic(game);
  return game;
}
