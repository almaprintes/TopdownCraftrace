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
const modes=read('src/game/scenes/MenuGameModeSnapScene.js');
const main=read('src/main.js');
const index=read('index.html');
const sw=read('sw.js');
const stats=read('src/game/stats/playerStats.js');
const htmlText=read('src/game/ui/htmlTextRuntime.js');
const lobby=read('src/game/ui/LobbyPublishPolish.js');
const preview=read('.github/workflows/build-pages.yml');

// Core gameplay must never be sacrificed by a graphics/performance layer.
forbid(gfx,'this._completedLapCheck=()=>{}','iOS graphics layer must not disable completed-lap timing');
forbid(gfx,'this._recordGhostSample=()=>{}','iOS graphics layer must not disable ghost recording');

// rAF is the default shipping clock. setTimeout remains an explicit diagnostic fallback only.
forbid(game,'const forceSetTimeOut=iosDevice;','all iOS devices must not be forced onto setTimeout');
requireText(game,"tdr2:forceTimeoutLoop",'explicit timeout-loop diagnostic flag is missing');

// Mobile scene imports stay truly lazy; race must not be warmed in the lobby.
requireText(game,'if(isMobileDevice())return;','mobile automatic scene warmup must stay disabled');
requireText(game,"def.exportName!=='RaceScene'",'desktop warmup must exclude the race bundle');

// Do not reintroduce per-frame monkey-patching in safe mode.
forbid(safe,'patchMethod(','safe mode must not monkey-patch Phaser methods per frame');

// Mode cards must be ready before the user swipes; starting Phaser Loader inside
// the carousel interaction was a source of menu stalls on iPhone.
requireText(modes,'preload(){','game-mode card preload is missing');
forbid(modes,'this.load.start()','game-mode carousel must not start Loader during interaction');

// Exactly one service-worker registration authority: index.html.
if(count(main,'serviceWorker.register')!==0)fail('src/main.js must not register the service worker');
if(count(index,"serviceWorker.register('./sw.js')")!==1)fail('index.html must own exactly one service-worker registration');
forbid(index,"dispatchEvent(new Event('resize'))",'viewport normalizer must not recursively synthesize resize');
forbid(index,'carFactoryModal','dead Car Factory modal must not return to the shipping shell');

// Online navigation must prefer the current HTML while static assets can remain cached.
requireText(sw,"fetch(req, { cache: 'no-store' })",'service worker network freshness path is missing');

// Stats writes during racing must not rebuild every TT history index.
requireText(stats,'export function loadPlayerStatsPersisted()','lightweight persistent stats read is missing');
forbid(stats,'return overlayTiming(next);','stat writes must not rescan TT histories');
requireText(lobby,'loadPlayerStatsPersisted','lobby mastery must not scan all TT histories');

// HTML text mirroring is global, so mobile must stay throttled and its Phaser
// prototype/factory patches must be restored when the game is destroyed.
requireText(htmlText,'isMobileDevice()?33:16','mobile HTML text synchronization throttle is missing');
forbid(htmlText,'[...entries]','HTML text sync must not clone the full entry map every frame');
requireText(htmlText,'proto.destroy=originalDestroy','HTML text destroy monkey-patch must be restored');
requireText(htmlText,'factory.text=originalFactoryText','HTML text factory monkey-patch must be restored');

// Preview and production must compile the same application shell.
forbid(preview,'source-index.html','preview must not replace the real index.html');

console.log('[stability-smoke] OK — mobile stability invariants preserved');
