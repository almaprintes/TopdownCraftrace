import Phaser from 'phaser';
import '../safe-area.css';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuStoreCloseFixScene.js';
import { installMenuMusic } from './audio/MenuMusic.js';
import { installRuntimeCrashDiagnostics } from './dev/runtimeCrashDiagnostics.js';
import { installSeasonRewardCelebrations } from './seasons/seasonRewardCelebrationTouchSafe.js';
import { initLanguage } from './i18n/index.js';
import { localizeLegacyText } from './i18n/legacyUiText.js';
import { installDomUiEnglishBridge } from './i18n/domUiEnglishBridge.js';
import { installSafeAreaRuntime } from './ui/safeArea.js';
import { installOrientationViewportSettle } from './ui/orientationViewportSettle.js';
import { installHtmlTextRuntime } from './ui/htmlTextRuntime.js';
import './tracks/trackPublicNames.js';

class MenuAliasScene extends Phaser.Scene { constructor(){super('MenuScene');} create(){this.scene.start('menu');} }

const LAZY_SCENES={
  GarageScene:{load:()=>import('./scenes/GarageSelectionCenterScene.js'),exportName:'GarageScene',warm:10},
  'upgrade-shop':{load:()=>import('./scenes/UpgradeWorkshopCarUnlockScene.js'),exportName:'UpgradeShopScene',warm:20},
  SettingsScene:{load:()=>import('./scenes/SettingsGraphicsQualityScene.js'),exportName:'SettingsScene',warm:30},
  StatsScene:{load:()=>import('./scenes/StatsMasteryScene.js'),exportName:'StatsScene',warm:40},
  season:{load:()=>import('./scenes/SeasonSafeDockScene.js'),exportName:'SeasonScene',warm:50},
  TrackGarageScene:{load:()=>import('./scenes/TrackGarageAndroidTouchScene.js'),exportName:'TrackGarageScene',warm:60},
  race:{
    load:async()=>{
      const [{RaceScene},{installExactRuntimeBeautyPass}]=await Promise.all([
        import('./scenes/RaceResultScene.js'),
        import('./scenes/raceExactRuntimeBeautyPass.js')
      ]);
      installExactRuntimeBeautyPass(RaceScene);
      return {RaceScene};
    },
    exportName:'RaceScene',warm:70
  },
  GarageDetailScene:{load:()=>import('./scenes/GarageDetailSpeedConsistencyScene.js'),exportName:'GarageDetailScene',warm:80},
  'admin-hub':{load:()=>import('./scenes/AdminHubScene.js'),exportName:'AdminHubScene',admin:true},
  CarEditorScene:{load:()=>import('./scenes/CarEditorSpeedConsistencyScene.js'),exportName:'CarEditorScene',admin:true},
  TrackEditorScene:{load:()=>import('./scenes/TrackEditorScene.js'),exportName:'TrackEditorScene',admin:true},
  TrackStudioScene:{load:()=>import('./scenes/TrackStudioScene.js'),exportName:'TrackStudioScene',admin:true},
  EnvironmentBuilderScene:{load:()=>import('./scenes/EnvironmentBuilderAssetPointerUpScene.js'),exportName:'EnvironmentBuilderScene',admin:true}
};

const lazyPromises=new Map();
let lazyGame=null;
function sceneExists(game,key){try{return !!game?.scene?.keys?.[key];}catch{return false;}}
async function ensureLazyScene(key){
  const game=lazyGame,def=LAZY_SCENES[key];if(!game||!def)return false;if(sceneExists(game,key))return true;if(lazyPromises.has(key))return lazyPromises.get(key);
  const p=(async()=>{try{const mod=await def.load(),SceneClass=mod?.[def.exportName];if(typeof SceneClass!=='function')throw new Error(`Missing scene export ${def.exportName}`);if(!sceneExists(game,key))game.scene.add(key,SceneClass,false);return true;}catch(err){console.error(`[lazy-scene] ${key} failed`,err);return false;}finally{lazyPromises.delete(key);}})();
  lazyPromises.set(key,p);return p;
}
function installLazySceneNavigation(game){
  lazyGame=game;const proto=Phaser.Scenes.ScenePlugin?.prototype;if(!proto||proto.__tdrLazyStartInstalled)return;const originalStart=proto.start;
  proto.start=function(key,data){const target=String(key||'');if(LAZY_SCENES[target]&&!sceneExists(game,target)){ensureLazyScene(target).then(ok=>{if(ok){try{originalStart.call(this,target,data);}catch(err){console.error(`[lazy-scene] start ${target} failed`,err);}}});return this;}return originalStart.call(this,key,data);};
  proto.__tdrLazyStartInstalled=true;
}
function isIOSDevice(){try{const ua=String(navigator?.userAgent||''),platform=String(navigator?.platform||'');return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);}catch{return false;}}
function isMobileDevice(){try{return /Android|iPhone|iPad|iPod/i.test(String(navigator?.userAgent||''))||(Number(navigator?.maxTouchPoints||0)>1&&Math.min(Number(screen?.width||0),Number(screen?.height||0))<1100);}catch{return false;}}
function scheduleSceneWarmup(){
  if(isMobileDevice())return;
  const warm=Object.entries(LAZY_SCENES).filter(([,def])=>Number.isFinite(def.warm)&&!def.admin&&def.exportName!=='RaceScene').sort((a,b)=>a[1].warm-b[1].warm);
  let cancelled=false;
  const cancel=()=>{cancelled=true;window.removeEventListener('pointerdown',cancel,true);window.removeEventListener('keydown',cancel,true);};
  const run=async()=>{
    await new Promise(resolve=>{
      if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(()=>resolve(),{timeout:2500});
      else setTimeout(resolve,1800);
    });
    for(const [key] of warm){
      if(cancelled||document.hidden)break;
      await ensureLazyScene(key);
      await new Promise(resolve=>{
        if(typeof window.requestIdleCallback==='function')window.requestIdleCallback(()=>resolve(),{timeout:700});
        else setTimeout(resolve,180);
      });
    }
    cancel();
  };
  window.addEventListener('pointerdown',cancel,true);
  window.addEventListener('keydown',cancel,true);
  window.addEventListener('tdr:bootready',()=>{run().catch(()=>cancel());},{once:true});
}
function videoPrefs(){
  try{const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}'),v=s?.video||{};return{quality:String(v.quality||'high'),targetFps:[30,45,60].includes(Number(v.targetFps))?Number(v.targetFps):60,antialias:typeof v.antialias==='boolean'?v.antialias:String(v.quality||'high')!=='low'};}catch{return{quality:'high',targetFps:60,antialias:true};}
}
function isLegacyIOSPhone(){
  try{
    if(!isIOSDevice())return false;
    const maxSide=Math.max(Number(screen?.width||0),Number(screen?.height||0));
    const phoneLike=maxSide<=900;
    const olderPhoneClass=phoneLike&&maxSide<=844;
    const manualSafe=localStorage.getItem('tdr2:forceIosSafeMode')==='1';
    const autoSafeUntil=Number(localStorage.getItem('tdr2:autoIosSafeModeUntil')||0);
    const autoSafe=Number.isFinite(autoSafeUntil)&&autoSafeUntil>Date.now();
    return olderPhoneClass||manualSafe||autoSafe;
  }catch{return false;}
}
function forceRafLoop(){try{return localStorage.getItem('tdr2:forceRafLoop')==='1';}catch{return false;}}
function localizePhaserValue(value){return localizeLegacyText(value);}
function installCleanTextFactory(){
  const factory=Phaser.GameObjects?.GameObjectFactory?.prototype;if(factory&&!factory.__tdrCleanTextInstalled&&typeof factory.text==='function'){const original=factory.text;factory.text=function(x,y,text,style={}){const clean={...(style||{})};if(/Orbitron/i.test(String(clean.fontFamily||''))){clean.fontFamily='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';if(clean.fontStyle==='900')clean.fontStyle='bold';}if(Number(clean.strokeThickness)>2)clean.strokeThickness=2;return original.call(this,x,y,localizePhaserValue(text),clean);};factory.__tdrCleanTextInstalled=true;}
  const textProto=Phaser.GameObjects?.Text?.prototype;if(textProto&&!textProto.__tdrLegacyLocalizationInstalled&&typeof textProto.setText==='function'){const originalSetText=textProto.setText;textProto.setText=function(value){return originalSetText.call(this,localizePhaserValue(value));};textProto.__tdrLegacyLocalizationInstalled=true;}
}
function installSafeTextureGuard(){
  const classes=[Phaser.GameObjects?.Image,Phaser.GameObjects?.Sprite,Phaser.GameObjects?.TileSprite].filter(Boolean);
  for(const Klass of classes){
    const proto=Klass?.prototype;
    if(!proto||proto.__tdrSafeTextureGuard||typeof proto.setTexture!=='function')continue;
    const original=proto.setTexture;
    proto.setTexture=function(...args){
      if(!this?.scene?.sys?.textures)return this;
      return original.apply(this,args);
    };
    proto.__tdrSafeTextureGuard=true;
  }
}
export function createGame(parentId='app'){
  installSafeAreaRuntime();initLanguage();installDomUiEnglishBridge();installSeasonRewardCelebrations();installCleanTextFactory();installSafeTextureGuard();
  const vp=videoPrefs(),iosDevice=isIOSDevice(),safeMode=isLegacyIOSPhone();try{window.__tdrIosSafeMode=safeMode;}catch{}const antialias=iosDevice?false:!!vp.antialias,targetFps=safeMode?30:vp.targetFps;
  const batchSize=iosDevice?1024:4096;
  // Retain the measured 2026-08-28 iOS scheduling baseline: WebKit rAF had
  // captured long gaps, so Phaser uses its supported timeout driver on iOS.
  // A manual diagnostic flag can still force rAF without changing source.
  const forceSetTimeOut=iosDevice&&!forceRafLoop();
  const game=new Phaser.Game({type:Phaser.AUTO,parent:parentId,backgroundColor:'#0b1020',fps:{target:targetFps,min:safeMode?15:20,forceSetTimeOut},scene:[BootScene,MenuScene,MenuAliasScene],dom:{createContainer:true},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{debug:false}},render:{pixelArt:false,antialias,antialiasGL:antialias,desynchronized:iosDevice,roundPixels:safeMode,powerPreference:'high-performance',batchSize}});
  installHtmlTextRuntime(game);
  installLazySceneNavigation(game);scheduleSceneWarmup();try{window.__tdrEnsureScene=ensureLazyScene;}catch{}
  try{const canvas=game.canvas;if(canvas?.style){canvas.style.imageRendering='auto';canvas.style.webkitFontSmoothing='antialiased';canvas.style.textRendering='optimizeLegibility';}}catch(_){}
  installOrientationViewportSettle(game);installRuntimeCrashDiagnostics(game);installMenuMusic(game);return game;
}
