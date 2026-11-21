// LIVE 4 DEV result sheet must preserve touch scroll & open dice disclosure.
// The room may post results multiple times; do not rerender unchanged DOM.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bridge=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
const css=readFileSync('src/game/ui/craftraceLiveV2Lobby.css','utf8');
const render=bridge.slice(bridge.indexOf('const showResults=()=>{'),
 bridge.indexOf('const finishCheck=now=>{'));
assert.ok(render.length>1000);
const guard=render.indexOf("if(snapshot===lastResultsSnapshot&&results.querySelector('.cr4-result-panel'))return;");
const capture=render.indexOf("const savedScrollTop=previousPanel?.scrollTop||0;");
const captureDie=render.indexOf("const diceWasOpen=previousPanel?.querySelector('details')?.open===true;");
const replace=render.indexOf('results.replaceChildren();');
const restored=render.indexOf('dice.open=diceWasOpen;');
const scroll=render.indexOf('panel.scrollTop=Math.min(savedScrollTop,');
assert.ok(guard>=0&&guard<replace,
 'Do not replace results DOM when only a duplicate sync event arrives');
assert.ok(capture>=0&&captureDie>=0&&capture<replace&&captureDie<replace,
 'Capture scroll and open state before any network-result DOM update');
assert.ok(restored>replace&&scroll>replace,
 'Restore dice and scroll position after actual results change');
assert.ok(render.includes('bezierDieHistory'),
 'Dice history must be part of the result snapshot');
assert.ok(render.includes('localFinishPosted')&&render.includes('linkReady'),
 'Real persistence and connection updates must remain visible');
assert.ok(css.includes('overscroll-behavior:contain;')&&
 css.includes('-webkit-overflow-scrolling:touch;')&&
 css.includes('touch-action:pan-y;'),
 'iPhone scroll must remain contained in the result sheet');
assert.ok(bridge.includes("saveResult=(seat,data,attemptAt)=>"),
 'Do not alter result posting or online room semantics');
console.log('PASS LIVE 4 iOS result sheet: stable DOM on duplicate sync, dice toggle and scroll restored on change');
