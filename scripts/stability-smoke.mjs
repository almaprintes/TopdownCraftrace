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
const raceCore=read('src/game/scenes/RaceHandbrakeFrontAxleFixScene.js');
const raceExperience=read('src/game/scenes/RaceExperienceScene.js');
const raceSessionUi=read('src/game/ui/raceSessionUi.js');
const mileage=read('src/game/scenes/RaceMileageStatsScene.js');
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
const pages=read('.github/workflows/pages.yml');

forbid(gfx,'this._completedLapCheck=()=>{}','iOS graphics layer must not disable completed-lap timing');
forbid(gfx,'this._recordGhostSample=()=>{}','iOS graphics layer must not disable ghost recording');

requireText(game,'const forceSetTimeOut=iosDevice&&!forceRafLoop();','iOS timeout scheduling baseline is missing');
requireText(game,"tdr2:forceRafLoop",'iOS rAF diagnostic override is missing');
requireText(game,'if(isMobileDevice())return;','mobile automatic scene warmup must stay disabled');
requireText(game,"def.exportName!=='RaceScene'",'desktop warmup must exclude the race bundle');

// Shipping race has one named UX authority. Temporary hotfix/bridge wrappers must
// never be reintroduced at the lazy-load boundary.
requireText(game,"import('./scenes/RaceExperienceScene.js')",'shipping race must load RaceExperienceScene directly');
forbid(game,'RacePauseButtonRestoreFixScene','shipping race must not route through pause hotfix facade');
forbid(game,'RaceLapHistoryBridgeScene','shipping race must not route through synthetic lap-history bridge');
requireText(raceExperience,"from './RaceHandbrakeFrontAxleFixScene.js'",'race experience must sit directly above the current physics/core boundary');
forbid(raceExperience,'RaceLapHistoryBridgeScene','race experience must never synthesize timing history');
requireText(raceExperience,'mountRaceSessionRewards','race experience must delegate reward presentation to DOM composition');
requireText(raceSessionUi,'assets/season/reward_cards/free_${tone}.svg','session reward UI must use the canonical Season Pass card art');
forbid(raceSessionUi,'daily_gift.webp','shipping session reward UI must not use the legacy gift chest');

forbid(safe,'patchMethod(','safe mode must not monkey-patch Phaser methods per frame');
requireText(adaptive,'if(safeMode&&beautyKeys.has(k)) return this;','iOS safe mode must suppress full-resolution Beauty tiles');
requireText(adaptive,'if(window.__tdrIosSafeMode===true)','iOS safe mode Beauty activation guard is missing');

// Pause remains a complete simulation/UI freeze at the current core boundary.
requireText(raceCore,'this._tdrPauseMenuOpen=true;','pause modal must set the race pause guard');
requireText(raceCore,'this._hidePauseHud();','pause modal must hide the full race HUD');
requireText(raceCore,"document.querySelector('.tdr-race-hud')",'pause must explicitly hide the DOM instrument HUD');
requireText(raceCore,"hud.style.setProperty('display','none','important')",'DOM instrument HUD must be force-hidden while paused');
requireText(raceCore,"document.querySelectorAll('[data-tdr-race-ui=\"1\"]')",'pause must hide other DOM race UI');
requireText(raceCore,'if(Number(obj?.depth||0)>=1000)hideObj(obj);','pause must hide high-depth Phaser HUD objects');
requireText(raceCore,'this.uiCam.setVisible?.(false);','pause must disable the dedicated Phaser UI camera');
requireText(raceCore,'if(this._tdrPauseMenuOpen){','race update chain must be blocked while paused');
requireText(raceCore,'this.physics?.world?.pause?.();','opening pause menu must pause the physics world');
requireText(raceCore,'this._restorePauseHud();','continue must restore the pre-pause HUD');

// Reward fallback remains idempotent until timing/economy are consolidated in the
// next refactor phase. It must compare delivered laps before granting anything.
requireText(raceCore,'_guardCompletedLapRewards()','race core must guard device-specific missed valid-lap rewards');
requireText(raceCore,'getRaceLootSessionSummary','reward guard must compare against delivered economy laps');
requireText(raceCore,'grantRaceLoot','reward guard must fill only missing grants');

// Mastery unlocks may be earned mid-race but must never interrupt live driving.
forbid(mileage,'showMasteryUnlockModal','race mileage layer must not display mastery modal during live play');
forbid(mileage,'physics?.world?.pause?.()','mastery progression must not pause an active race');
requireText(mileage,'_queueMasteryUnlock','race mileage layer must defer mastery unlock presentation');
requireText(lobby,'showMasteryUnlockModal','lobby must remain the post-race mastery presentation owner');

// Game-mode selector must stay DOM-native on mobile; no Phaser card preload/tween lock.
requireText(modes,"className='tdr-mode-dom-root'",'game-mode selector must use the DOM renderer');
requireText(modes,'scroll-snap-type:x mandatory','game-mode selector must use native horizontal snap');
forbid(modes,'this.tweens.add(','game-mode selector must not depend on Phaser tween completion');
forbid(modes,'_modeSnapAnimating','game-mode selector must not use a global animation input lock');
forbid(modes,'this.load.image(','game-mode cards must not be duplicated into Phaser textures');

// Player garage must never fall back to the legacy Phaser renderer.
requireText(garage,"if(this._mode!=='admin')return;",'player garage must skip Phaser card texture preload');
requireText(garage,'BaseScene.prototype.create.call(this);','player garage must bypass legacy Phaser scene construction');
forbid(garage,'if(!this._fullAccess())','player DOM garage must not depend on development unlock state');
forbid(garage,"'PLAYER'",'player-facing garage must not expose the legacy PLAYER label');

// Player track selector is DOM-only too.
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
forbid(pages,'source-index.html','GitHub Pages must not replace the real index.html');
requireText(pages,'npm run build -- --base=/TopdownCraftrace/','GitHub Pages must build with the repository base path');

console.log('[stability-smoke] OK — clean mobile architecture invariants preserved');
