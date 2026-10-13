// DEV 1.2.160: lobby car nameplate and Settings share the opened
// paddock silhouette without mutating any control/audio/video state.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const lobby=read('src/game/ui/lobby-dom.css');
const settings=read('src/game/scenes/SettingsDomScene.js');
const css=read('src/game/ui/settings-premium.css');
const html=read('index.html');
assert.match(lobby,/\.tdr-lobby-dom \.tdr-car-card\{/,
  'Selected car receives a dedicated open-wing visual style');
assert.match(lobby,/\.tdr-lobby-dom \.tdr-car-card\{[\s\S]*?clip-path:polygon\(0 0,calc\(100% - 22px\)/);
assert.match(lobby,/\.tdr-lobby-dom \.tdr-car-card::before\{/,
  'Car panel top accent matches the open side panel geometry');
assert.match(lobby,/\.tdr-lobby-dom \.tdr-car-card::after\{/);
assert.match(lobby,/\.tdr-lobby-dom \.tdr-car-card-row em\{/,
  'Keep STARTER badge while upgrading its bevel');
assert.match(lobby,/\.tdr-lobby-dom \.tdr-lobby-car-platform\{/,
  'Original vehicle platform remains visible and untouched');
assert.match(lobby,/\.tdr-lobby-dom \.tdr-event-card\{/);
assert.match(lobby,/\.tdr-lobby-dom \.tdr-track-card\{/);
assert.match(settings,/import settingsPremiumCss from '\.\.\/ui\/settings-premium\.css\?inline'/);
assert.ok(settings.includes("style.textContent += '\\n' + settingsPremiumCss;"),
  'Premium skin must be appended after the original Settings rules');
assert.match(settings,/root\.querySelectorAll\('\[data-tab\]'\)\.forEach\(b=>b\.onclick=\(\)=>this\._renderTab\(b\.dataset\.tab\)\)/,
  'Settings existing tab navigation remains functional');
assert.match(settings,/data-tab="controls"/);
assert.match(settings,/data-tab="video"/);
assert.match(settings,/data-tab="audio"/);
assert.match(settings,/data-tab="legal"/);
assert.match(settings,/defaultControlLayout\(c\)/,
  'Spatial calibration must still derive from live game control positions');
assert.match(settings,/saveControlLayout\(this\._calLayout,c\)/,
  'Control layout save operation must remain intact');
assert.match(settings,/this\._closeCalibration\(\)/);
assert.match(settings,/window\.location\.reload\(\)/,
  'Graphics changes continue using the original Apply / Restart semantics');
assert.match(settings,/save\(this\.settings\)/,
  'Existing controls/video/audio choice persistence must remain intact');
assert.match(css,/#tdr-settings2 \.s2tabs\{/);
assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.match(css,/#tdr-settings2 \.s2card\{/);
assert.match(css,/#tdr-settings2 \.s2card\.wide\{/);
assert.match(css,/#tdr-settings2 \.s2choice\.on\{/);
assert.match(css,/#tdr-settings2 \.s2tab\.on\{/);
assert.match(css,/#tdr-settings2 \.s2body\{/);
assert.match(css,/overflow:auto;/,
  'Landscape settings must retain independently scrollable content');
assert.match(css,/#tdr-control-cal \.cctop\{/,
  'Control calibration tool chrome uses the same visual system');
assert.doesNotMatch(css,/\.cccontrol\{/,
  'Visual CSS must not move game HUD control markers or their hitboxes');
assert.match(css,/@media\(max-height:450px\)/);
assert.match(css,/@media\(max-width:500px\)/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(html,/content="DEV 1\.2\.160"/);
console.log('DEV 1.2.160 open car banner + premium settings skin with original settings behavior contract OK');
