import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [procedural,sampled,main,music,bridge,ads]=await Promise.all([
  read('src/game/scenes/RaceProceduralAudioScene.js'),
  read('src/game/audio/CarEngineSampleRuntime.js'),
  read('src/main.js'),
  read('src/game/audio/MenuMusic.js'),
  read('src/game/monetization/installNativeRewardedBridge.js'),
  read('src/game/monetization/RewardedAdsProvider.js')
]);

// Race procedural oscillators have their own AudioContext, so Phaser.pauseAll
// alone can never stop the motor. Both race engines need both ad signals.
for(const [name,source] of [['procedural',procedural],['sampled',sampled]]){
  assert.match(source,/addEventListener\('tdr:rewarded-ad-state'/,name+' missing request signal');
  assert.match(source,/addEventListener\('tdr:rewardedfullscreen'/,name+' missing native ad signal');
  assert.match(source,/removeEventListener\('tdr:rewarded-ad-state'/,name+' leaks request listener');
  assert.match(source,/removeEventListener\('tdr:rewardedfullscreen'/,name+' leaks native listener');
  assert.match(source,/\.suspend\(\)/,name+' must suspend its own AudioContext');
  assert.match(source,/\.resume\(\)/,name+' must recover audio');
  assert.match(source,/\.gain\?\.setValueAtTime\(0,now\)|\.gain\.setValueAtTime\(0,now\)/,name+' must mute immediately');
}
assert.match(procedural,/if\(this\._iosAudioDisabled\|\|this\._proceduralAudioBlocked\(\)\)return;/);
assert.match(procedural,/_updateProceduralAudio\(delta\)\{\s*if\(this\._iosAudioDisabled\|\|this\._proceduralAudioBlocked\(\)\)return;/);
assert.match(procedural,/this\._tdrFocusWork=this\._tdrFocusWork/, 'serialize resume/suspend to avoid ad-close race');
assert.match(sampled,/_audioBlocked\(\)\s*\{[\s\S]*?_nativeRewardedFullscreen[\s\S]*?_nativeAppPaused/, 'native fullscreen and app pause must block sample engine');
assert.match(sampled,/_focusTransition=this\._focusTransition/, 'sample engine must serialize suspend/resume');
assert.match(main,/const blocked=__tdrAdRequested\|\|__tdrAdFullscreen/, 'Phaser audio must wait for BOTH request and native close');
assert.match(main,/sound\.pauseAll\(\)/);
assert.match(main,/sound\.resumeAll\(\)/);
assert.match(music,/this\.adPending/, 'menu music must respect pending ads');
assert.match(music,/this\.adVisible/, 'menu music must respect real fullscreen');
assert.match(bridge,/CustomEvent\('tdr:rewardedfullscreen'/,'native fullscreen listener must relay to WebView');
assert.match(ads,/setRewardedOverlay\(true\)/, 'rewarded request must suspend audio before native show');
assert.match(ads,/setRewardedOverlay\(false\)/, 'rewarded completion must release request audio lock');

console.log('rewarded audio focus smoke: procedural + sample + Phaser + menu independently muted');
