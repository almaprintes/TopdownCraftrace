import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const fail=(msg)=>{throw new Error(`[stability-smoke] ${msg}`);};
const requireText=(text,needle,msg)=>{if(!text.includes(needle))fail(msg);};
const forbid=(text,needle,msg)=>{if(text.includes(needle))fail(msg);};
const count=(text,needle)=>text.split(needle).length-1;

const game=read('src/game/game.js');
const gfx=read('src/game/scenes/RaceGraphicsPresetScene.js');
const safe=read('src/game/scenes/RaceSafeModeRuntimeScene.js');
const adaptive=read('src/game/scenes/RaceAdaptiveStartScene.js');
const raceFinal=read('src/game/scenes/RaceHandbrakeFrontAxleFixScene.js');
const modes=read('src/game/scenes/MenuGameModeSnapScene.js');
const garage=read('src/game/scenes/GarageLazyCardsScene.js');
const trackSelector=read('src/game/scenes/TrackGaragePlayerLightScene.js');
const trackTouch=read('src/game/scenes/TrackGarageAndroidTouchScene.js');
const main=read('src/main.js');
const index=read('index.html');
const sw=read('sw.js');
const stats=read('src/game/stats/playerStats.js');
const htmlText=read('src/game/ui/htmlTextRuntime.js');
const lobby=read('src/game/ui/LobbyPublishPolish.js');
const preview=read('.github/workflows/build-pages.yml');

forbid(gfx,'this._completedLapCheck=()=>{}','iOS graphics layer must not disable completed-lap timing');
forbid(gfx,'this._recordGhostSample=()=>{}','iOS graphics layer must not disable ghost recording');

requireText(game,'const forceSetTimeOut=iosDevice&&!forceRafLoop();','iOS timeout scheduling baseline is missing');
requireText(game,"tdr2:forceRafLoop",'iOS rAF diagnostic override is missing');

requireText(game,'if(isMobileDevice())return;','mobile automatic scene warmup must stay disabled');
requireText(game,"def.exportName!=='RaceScene'",'desktop warmup must exclude the race bundle');

forbid(safe,'patchMethod(','safe mode must not monkey-patch Phaser methods per frame');
requireText(adaptive,'if(safeMode&&beautyKeys.has(k)) return this;','iOS safe mode must suppress full-resolution Beauty tiles');
requireText(adaptive,'if(window.__tdrIosSafeMode===true)','iOS safe mode Beauty activation guard is missing');

// Pause modal is authoritative for the live session clock. It must stop feeding
// delta into the clock and hide both timer label/value until live play resumes.
requireText(raceFinal,'this._tdrPauseMenuOpen=true;','pause modal must set the final race pause guard');
requireText(raceFinal,'this._setPauseClockVisible(false);','pause modal must hide the session clock');
requireText(raceFinal,'if(this._tdrPauseMenuOpen){','session clock update must be blocked while paused');
requireText(raceFinal,'this.physics?.world?.pause?.();','opening pause menu must pause the physics world');

requireText(modes,'preload(){','game-mode card preload is missing');
forbid(modes,'this.load.start()','game-mode carousel must not start Loader during interaction');

// Player garage must never fall back to the legacy Phaser renderer because of a
// development unlock flag. It also must not duplicate all card images in Phaser textures.
requireText(garage,"if(this._mode!=='admin')return;",'player garage must skip Phaser card texture preload');
requireText(garage,'BaseScene.prototype.create.call(this);','player garage must bypass legacy Phaser scene construction');
forbid(garage,'if(!this._fullAccess())','player DOM garage must not depend on development unlock state');
forbid(garage,"'PLAYER'",'player-facing garage must not expose the legacy PLAYER label');

// The player track selector follows the same rule: DOM only. Hidden Phaser preview
// canvases and async generated-preview rebuilds must not run under the player overlay.
requireText(trackSelector,'BaseScene.prototype.create.call(this);','player track selector must bypass legacy Phaser construction');
requireText(trackSelector,"localStorage.removeItem('tdr2:trackKey')",'stale hidden track keys must be cleared');
requireText(trackSelector,"this.scene.start('menu');",'valid player track selection must return through the lobby');
requireText(trackTouch,"./TrackGaragePlayerLightScene.js",'shipping selector must route through the lightweight player scene');

if(count(main,'serviceWorker.register')!==0)fail('src/main.js must not register the service worker');
if(count(index,"serviceWorker.register('./sw.js')")!==1)fail('index.html must own exactly one service-worker registration');
forbid(index,"dispatchEvent(new Event('resize'))",'viewport normalizer must not recursively synthesize resize');
forbid(index,'carFactoryModal','dead Car Factory modal must not return to the shipping shell');

requireText(sw,"fetch(req, { cache: 'no-store' })",'service worker network freshness path is missing');

requireText(stats,'export function loadPlayerStatsPersisted()','lightweight persistent stats read is missing');
forbid(stats,'return overlayTiming(next);','stat writes must not rescan TT histories');
requireText(lobby,'loadPlayerStatsPersisted','lobby mastery must not scan all TT histories');

requireText(htmlText,'isMobileDevice()?33:16','mobile HTML text synchronization throttle is missing');
forbid(htmlText,'[...entries]','HTML text sync must not clone the full entry map every frame');
requireText(htmlText,'proto.destroy=originalDestroy','HTML text destroy monkey-patch must be restored');
requireText(htmlText,'factory.text=originalFactoryText','HTML text factory monkey-patch must be restored');

forbid(preview,'source-index.html','preview must not replace the real index.html');

console.log('[stability-smoke] OK — mobile stability invariants preserved');
