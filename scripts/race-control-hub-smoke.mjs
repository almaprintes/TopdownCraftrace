// Focused static smoke for RACE CONTROL 2.0 DEV integration.
// This protects entry routing and shipped asset paths, not visual/mobile quality.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const exists=p=>fs.existsSync(new URL('../'+p,import.meta.url));
const game=read('src/game/game.js');
const scene=read('src/game/scenes/StatsRaceControlHubScene.js');
const hub=read('src/game/ui/raceControlHub.js');
const css=read('src/game/ui/raceControlHub.css');
assert.match(game,/StatsScene:\{load:\(\)=>IS_PROD_BUILD\?import\('\.\/scenes\/StatsTesterExchangeScene\.js'\):import\('\.\/scenes\/StatsRaceControlHubScene\.js'\)/,
  'Production must still load untouched StatsTesterExchangeScene');
assert.match(scene,/data\?\.onlineFromLobby===true/,'Lobby entry must be explicit');
assert.match(scene,/raceControlTrackId:''/,'Must suppress inherited delayed direct ranking render');
assert.match(scene,/this\._rc2PreferredTrack/,'Must preserve selected circuit from lobby');
assert.match(scene,/this\._showRaceControlHub\(\)/,'Lobby must open the new hub');
assert.match(scene,/this\._renderBroadcastRecords\(this\._rc2PreferredTrack\|\|null\)/,'Ranking must still use existing leaderboard');
assert.match(scene,/event\.stopImmediatePropagation\(\)/,'Back click handler must stop legacy navigation');
assert.match(scene,/this\.scene\.start\('season'\)/,'Seasons must navigate to the existing scene');
assert.doesNotMatch(hub,/supabase|createClient|fetch\(|WebSocket|setInterval|requestAnimationFrame/i,'Hub must not initiate background network or animation loops');
for(const action of ['rankings','ghosts','multiplayer','events','pilots','cars','seasons','exit'])
  assert.match(hub,new RegExp('(?:action:|data-rc2-action=)[\\x27\\x22]?'+action),'Missing '+action+' action');
for(const file of [
  'public/assets/logo.webp',
  'public/assets/tracks/karting-tenerife/beauty/karting-tenerife-beauty-preview.webp',
  'public/assets/tracks/karting-canarias/beauty/karting-canarias-beauty-preview.webp',
  'public/assets/tracks/santa-cruz/beauty/santa-cruz-beauty-preview.webp',
  'public/assets/tracks/track01/beauty/track01-beauty-preview.webp',
  'public/assets/cars/lobby/veloce_photon.webp',
  'public/assets/cars/lobby/avenir_gripline.webp',
  'public/assets/cars/lobby/helix_vortex.webp',
  'public/assets/cars/lobby/crown_axis.webp'
])assert.ok(exists(file),'Missing real game asset: '+file);
assert.match(css,/\.rc2-board\s*\{[^}]*grid-template-columns:/s,'Hub must retain asymmetric columns');
assert.match(css,/env\(safe-area-inset-/,'Hub must respect screen cutouts');
assert.match(css,/prefers-reduced-motion/,'Hub must respect reduced motion');
console.log('OK RACE CONTROL 2.0 static routing/assets smoke (not device E2E).');
