import Phaser from 'phaser';
import '../safe-area.css';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuGameModeSnapScene.js';
import { installMenuMusic } from './audio/MenuMusic.js';
import { installRuntimeCrashDiagnostics } from './dev/runtimeCrashDiagnostics.js';
import { installSeasonRewardCelebrations } from './seasons/seasonRewardCelebrationTouchSafe.js';
import { initLanguage } from './i18n/index.js';
import { localizeLegacyText } from './i18n/legacyUiText.js';
import { installDomUiEnglishBridge } from './i18n/domUiEnglishBridge.js';
import { installSafeAreaRuntime } from './ui/safeArea.js';
import { installOrientationViewportSettle } from './ui/orientationViewportSettle.js';
import './tracks/trackPublicNames.js';

class MenuAliasScene extends Phaser.Scene { constructor(){super('MenuScene');} create(){this.scene.start('menu');} }

const LAZY_SCENES={
  GarageScene:{load:()=>import('./scenes/GarageLazyCardsScene.js'),exportName:'GarageScene',warm:10},
  'upgrade-shop':{load:()=>import('./scenes/UpgradeWorkshopCarUnlockScene.js'),exportName:'UpgradeShopScene',warm:20},
  SettingsScene:{load:()=>import('./scenes/SettingsGraphicsQualityScene.js'),exportName:'SettingsScene',warm:30},
  StatsScene:{load:()=>import('./scenes/StatsMasteryScene.js'),exportName:'StatsScene',warm:40},
  season:{load:()=>import('./scenes/SeasonScene.js'),exportName:'SeasonScene',warm:50},
  TrackGarageScene:{load:()=>import('./scenes/TrackGarageHideSpecialScene.js'),exportName:'TrackGarageScene',warm:60},
  race:{
    load:async()=>{
      const [{RaceScene},{installExactRuntimeBeautyPass},{installIosAtlanticoProceduralOnlyAB}]=await Promise.all([
        import('./scenes/RaceGraphicsPresetScene.js'),
        import('./scenes/raceExactRuntimeBeautyPass.js'),
        import('./scenes/raceIosProceduralOnlyAB.js')
      ]);
      installExactRuntimeBeautyPass(RaceScene);
      installIosAtlanticoProceduralOnlyAB(RaceScene);
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
function scheduleSceneWarmup(){
  const warm=Object.entries(LAZY_SCENES).filter(([,def])=>Number.isFinite(def.warm)&&!def.admin).sort((a,b)=>a[1].warm-b[1].warm);
  const run=async()=>{await new Promise(r=>setTimeout(r,250));for(const [key] of warm){await ensureLazyScene(key);await new Promise(r=>setTimeout(r,70));}};
  window.addEventListener('tdr:bootready',()=>{run().catch(()=>{});},{once:true});
}
function videoPrefs(){
  try{const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}'),v=s?.video||{};return{quality:String(v.quality||'high'),targetFps:[30,45,60].includes(Number(v.targetFps))?Number(v.targetFps):60,antialias:typeof v.antialias==='boolean'?v.antialias:String(v.quality||'high')!=='low'};}catch{return{quality:'high',targetFps:60,antialias:true};}
}
function isIOSDevice(){try{const ua=String(navigator?.userAgent||''),platform=String(navigator?.platform||'');return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);}catch{return false;}}
function isLegacyIOSPhone(){try{if(!isIOSDevice())return false;const sw=Math.max(Number(screen?.width||0),Number(screen?.height||0)),sh=Math.min(Number(screen?.width||0),Number(screen?.height||0)),phoneLike=Math.max(sw,sh)<=900,iPhone12Class=phoneLike&&Math.max(sw,sh)<=844,crashSafe=localStorage.getItem('tdr2:forceIosSafeMode')==='1';return iPhone12Class||crashSafe;}catch{return false;}}
function localizePhaserValue(value){return localizeLegacyText(value);}
function installCleanTextFactory(){
  const factory=Phaser.GameObjects?.GameObjectFactory?.prototype;if(factory&&!factory.__tdrCleanTextInstalled&&typeof factory.text==='function'){const original=factory.text;factory.text=function(x,y,text,style={}){const clean={...(style||{})};if(/Orbitron/i.test(String(clean.fontFamily||''))){clean.fontFamily='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';if(clean.fontStyle==='900')clean.fontStyle='bold';}if(Number(clean.strokeThickness)>2)clean.strokeThickness=2;return original.call(this,x,y,localizePhaserValue(text),clean);};factory.__tdrCleanTextInstalled=true;}
  const textProto=Phaser.GameObjects?.Text?.prototype;if(textProto&&!textProto.__tdrLegacyLocalizationInstalled&&typeof textProto.setText==='function'){const originalSetText=textProto.setText;textProto.setText=function(value){return originalSetText.call(this,localizePhaserValue(value));};textProto.__tdrLegacyLocalizationInstalled=true;}
}
export function createGame(parentId='app'){
  installSafeAreaRuntime();initLanguage();installDomUiEnglishBridge();installSeasonRewardCelebrations();installCleanTextFactory();
  const vp=videoPrefs(),iosDevice=isIOSDevice(),safeMode=isLegacyIOSPhone();try{window.__tdrIosSafeMode=safeMode;}catch{}const antialias=iosDevice?false:!!vp.antialias,targetFps=safeMode?30:vp.targetFps;
  const batchSize=iosDevice?1024:4096;
  const forceSetTimeOut=iosDevice;
  const game=new Phaser.Game({type:Phaser.AUTO,parent:parentId,backgroundColor:'#0b1020',fps:{target:targetFps,min:safeMode?15:20,forceSetTimeOut},scene:[BootScene,MenuScene,MenuAliasScene],dom:{createContainer:true},scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{debug:false}},render:{pixelArt:false,antialias,antialiasGL:antialias,desynchronized:iosDevice,roundPixels:safeMode,powerPreference:'high-performance',batchSize}});
  installLazySceneNavigation(game);scheduleSceneWarmup();try{window.__tdrEnsureScene=ensureLazyScene;}catch{}
  try{const canvas=game.canvas;if(canvas?.style){canvas.style.imageRendering='auto';canvas.style.webkitFontSmoothing='antialiased';canvas.style.textRendering='optimizeLegibility';}}catch(_){}
  installOrientationViewportSettle(game);installRuntimeCrashDiagnostics(game);installMenuMusic(game);return game;
}
