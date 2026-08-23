import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuDuelModeScene.js';
import { RaceScene } from './scenes/RaceSustainedPerformanceScene.js';
import { UpgradeShopScene } from './scenes/UpgradeWorkshopInventorySizingScene.js';
import { GarageScene } from './scenes/GarageCleanTypographyScene.js';
import { SettingsScene } from './scenes/SettingsHelpTutorialScene.js';
import { GarageDetailScene } from './scenes/GarageDetailSpeedConsistencyScene.js';
import { AdminHubScene } from './scenes/AdminHubScene.js';
import { CarEditorScene } from './scenes/CarEditorSpeedConsistencyScene.js';
import { TrackEditorScene } from './scenes/TrackEditorScene.js';
import { TrackGarageScene } from './scenes/TrackGarageCleanTypographyScene.js';
import { TrackStudioScene } from './scenes/TrackStudioScene.js';
import { EnvironmentBuilderScene } from './scenes/EnvironmentBuilderAssetPointerUpScene.js';
import { installMenuMusic } from './audio/MenuMusic.js';
import { installRuntimeCrashDiagnostics } from './dev/runtimeCrashDiagnostics.js';
import './tracks/trackPublicNames.js';

class MenuAliasScene extends Phaser.Scene { constructor(){super('MenuScene');} create(){this.scene.start('menu');} }
function videoPrefs(){try{const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');return{quality:String(s?.video?.quality||'high'),targetFps:Number(s?.video?.targetFps||60),renderScale:String(s?.video?.renderScale||'normal')};}catch{return{quality:'high',targetFps:60,renderScale:'normal'};}}
function isIOSDevice(){
  try{
    const ua=String(navigator?.userAgent||'');
    const platform=String(navigator?.platform||'');
    return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);
  }catch{return false;}
}
function renderResolution(vp,ios,dpr){
  // La resolución interna debe reflejar de verdad el preset. Antes iOS quedaba
  // siempre en 1x y el resto de dispositivos tenía un mínimo accidental de 2x,
  // haciendo que BAJA apenas redujera fill-rate.
  const qualityScale=vp.quality==='low'?0.80:vp.quality==='medium'?0.92:1.00;
  const userScale=vp.renderScale==='eco'?0.90:vp.renderScale==='sharp'?1.15:1.00;
  const wanted=qualityScale*userScale;

  // En iOS conservamos el techo 1x que ya nos protegía de presión GPU/memoria.
  // En otras plataformas permitimos algo más en ALTA/SHARP, pero nunca forzamos
  // una resolución superior a la solicitada por el preset.
  const platformCap=ios?1.0:Math.min(Number(dpr||1),1.5);
  return Math.max(0.70,Math.min(platformCap,wanted));
}
function installCleanTextFactory(){const proto=Phaser.GameObjects?.GameObjectFactory?.prototype;if(!proto||proto.__tdrCleanTextInstalled||typeof proto.text!=='function')return;const original=proto.text;proto.text=function(x,y,text,style={}){const clean={...(style||{})};if(/Orbitron/i.test(String(clean.fontFamily||''))){clean.fontFamily='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';if(clean.fontStyle==='900')clean.fontStyle='bold';}if(Number(clean.strokeThickness)>2)clean.strokeThickness=2;return original.call(this,x,y,text,clean);};proto.__tdrCleanTextInstalled=true;}
export function createGame(parentId='app'){installCleanTextFactory();const vp=videoPrefs();const dpr=window.devicePixelRatio||1;const ios=isIOSDevice();const resolution=renderResolution(vp,ios,dpr);const antialias=vp.quality!=='low';const game=new Phaser.Game({type:Phaser.AUTO,parent:parentId,backgroundColor:'#0b1020',resolution,fps:{target:vp.targetFps,min:20},scene:[BootScene,MenuScene,MenuAliasScene,GarageScene,SettingsScene,GarageDetailScene,RaceScene,AdminHubScene,UpgradeShopScene,CarEditorScene,TrackGarageScene,TrackStudioScene,EnvironmentBuilderScene,TrackEditorScene],dom:{createContainer:true},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{debug:false}},render:{pixelArt:false,antialias,antialiasGL:antialias,roundPixels:false}});try{const canvas=game.canvas;if(canvas?.style){canvas.style.imageRendering='auto';canvas.style.webkitFontSmoothing='antialiased';canvas.style.textRendering='optimizeLegibility';}}catch(_){}installRuntimeCrashDiagnostics(game);installMenuMusic(game);return game;}
