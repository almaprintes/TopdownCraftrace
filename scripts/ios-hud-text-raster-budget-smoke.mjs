import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(path, 'utf8');
const sector = read('src/game/scenes/RaceCompetitionHudScene.js');
const styled = read('src/game/scenes/RaceStyledHudScene.js');
assert.ok(sector.includes("if (obj._tdrSectorVisualState === state) return;"),
  'Sector TextStyle must update only when a sector state changes');
assert.ok(sector.includes("if (hud._delta.text !== label) hud._delta.setText(label);"),
  'DELTA text must not be redrawn for unchanged values');
assert.ok(sector.includes("if (hud._delta._tdrPaintColor !== color)"),
  'DELTA color must be changed only at transitions');
assert.ok(styled.includes("if (label?.scene && label._tdrPaintColor !== color)"),
  'Surface color must be changed only at transitions');
assert.ok(!sector.includes("hud._delta.setText('Δ --.--').setColor"),
  'Unconditional DELTA text style churn must not return');
assert.ok(!styled.includes("dst._surfaceText?.setColor"),
  'Unconditional surface color churn must not return');
console.log('PASS: competition + surface HUD avoid redundant TextStyle redraws');
