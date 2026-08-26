import Phaser from 'phaser';
import '../safe-area.css';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuGameModeSnapScene.js';
import { SeasonScene } from './scenes/SeasonScene.js';
import { RaceScene } from './scenes/RaceMobilePerformanceScene.js';
import { installExactRuntimeBeautyPass } from './scenes/raceExactRuntimeBeautyPass.js';
import { UpgradeShopScene } from './scenes/UpgradeWorkshopCarUnlockScene.js';
import { GarageScene } from './scenes/GarageLazyCardsScene.js';
import { SettingsScene } from './scenes/SettingsAudioMusicScene.js';
import { StatsScene } from './scenes/StatsScene.js';
import { GarageDetailScene } from './scenes/GarageDetailSpeedConsistencyScene.js';
import { AdminHubScene } from './scenes/AdminHubScene.js';
import { CarEditorScene } from './scenes/CarEditorSpeedConsistencyScene.js';
import { TrackEditorScene } from './scenes/TrackEditorScene.js';
import { TrackGarageScene } from './scenes/TrackGarageHideSpecialScene.js';
import { TrackStudioScene } from './scenes/TrackStudioScene.js';
import { EnvironmentBuilderScene } from './scenes/EnvironmentBuilderAssetPointerUpScene.js';
import { installMenuMusic } from './audio/MenuMusic.js';
import { installRuntimeCrashDiagnostics } from './dev/runtimeCrashDiagnostics.js';
import { installSeasonRewardCelebrations } from './seasons/seasonRewardCelebrationTouchSafe.js';
import { initLanguage } from './i18n/index.js';
import { localizeLegacyText } from './i18n/legacyUiText.js';
import { installDomUiEnglishBridge } from './i18n/domUiEnglishBridge.js';
import { installSafeAreaRuntime } from './ui/safeArea.js';
import { installOrientationViewportSettle } from './ui/orientationViewportSettle.js';
import './tracks/trackPublicNames.js';

installExactRuntimeBeautyPass(RaceScene);

class MenuAliasScene extends Phaser.Scene { constructor(){super('MenuScene');} create(){this.scene.start('menu');} }
function videoPrefs(){try{const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');return{quality:String(s?.video?.quality||'high'),targetFps:Number(s?.video?.targetFps||60),renderScale:String(s?.video?.renderScale||'normal')};}catch{return{quality:'high',targetFps:60,renderScale:'normal'};}}
function isIOSDevice(){try{const ua=String(navigator?.userAgent||'');const platform=String(navigator?.platform||'');return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);}catch{return false;}}
function isLegacyIOSPhone(){try{if(!isIOSDevice())return false;const sw=Math.max(Number(screen?.width||0),Number(screen?.height||0));const sh=Math.min(Number(screen?.width||0),Number(screen?.height||0));const phoneLike=Math.max(sw,sh)<=900;const iPhone12Class=phoneLike&&Math.max(sw,sh)<=844;const crashSafe=localStorage.getItem('tdr2:forceIosSafeMode')==='1';return iPhone12Class||crashSafe;}catch{return false;}}
function renderResolution(vp,ios,dpr,safeMode){if(safeMode)return 0.72;const qualityScale=vp.quality==='low'?0.80:vp.quality==='medium'?0.92:1.00;const userScale=vp.renderScale==='eco'?0.90:vp.renderScale==='sharp'?1.15:1.00;const wanted=qualityScale*userScale;const platformCap=ios?1.0:Math.min(Number(dpr||1),1.5);return Math.max(0.70,Math.min(platformCap,wanted));}
function localizePhaserValue(value){return localizeLegacyText(value);}
function installCleanTextFactory(){
  const factory=Phaser.GameObjects?.GameObjectFactory?.prototype;
  if(factory&&!factory.__tdrCleanTextInstalled&&typeof factory.text==='function'){
    const original=factory.text;
    factory.text=function(x,y,text,style={}){
      const clean={...(style||{})};
      if(/Orbitron/i.test(String(clean.fontFamily||''))){clean.fontFamily='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';if(clean.fontStyle==='900')clean.fontStyle='bold';}
      if(Number(clean.strokeThickness)>2)clean.strokeThickness=2;
      return original.call(this,x,y,localizePhaserValue(text),clean);
    };
    factory.__tdrCleanTextInstalled=true;
  }
  const textProto=Phaser.GameObjects?.Text?.prototype;
  if(textProto&&!textProto.__tdrLegacyLocalizationInstalled&&typeof textProto.setText==='function'){
    const originalSetText=textProto.setText;
    textProto.setText=function(value){return originalSetText.call(this,localizePhaserValue(value));};
    textProto.__tdrLegacyLocalizationInstalled=true;
  }
}
export function createGame(parentId='app'){
  installSafeAreaRuntime();
  initLanguage();
  installDomUiEnglishBridge();
  installSeasonRewardCelebrations();
  installCleanTextFactory();
  const vp=videoPrefs();const dpr=window.devicePixelRatio||1;const ios=isIOSDevice();const safeMode=isLegacyIOSPhone();try{window.__tdrIosSafeMode=safeMode;}catch{}const resolution=renderResolution(vp,ios,dpr,safeMode);const antialias=safeMode?false:vp.quality!=='low';const targetFps=safeMode?30:(Number(vp.targetFps)===30?30:60);
  const game=new Phaser.Game({type:Phaser.AUTO,parent:parentId,backgroundColor:'#0b1020',resolution,fps:{target:targetFps,min:safeMode?15:20,forceSetTimeOut:false},scene:[BootScene,MenuScene,MenuAliasScene,SeasonScene,GarageScene,SettingsScene,StatsScene,GarageDetailScene,RaceScene,AdminHubScene,UpgradeShopScene,CarEditorScene,TrackGarageScene,TrackStudioScene,EnvironmentBuilderScene,TrackEditorScene],dom:{createContainer:true},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{debug:false}},render:{pixelArt:false,antialias,antialiasGL:antialias,roundPixels:safeMode,powerPreference:'low-power',batchSize:safeMode?1024:4096}});
  try{const canvas=game.canvas;if(canvas?.style){canvas.style.imageRendering='auto';canvas.style.webkitFontSmoothing='antialiased';canvas.style.textRendering='optimizeLegibility';}}catch(_){}
  installOrientationViewportSettle(game);
  installRuntimeCrashDiagnostics(game);
  installMenuMusic(game);
  return game;
}
