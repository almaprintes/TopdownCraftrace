// DEV 1.3.59: real editor must show ONE UI shell, without disabling
// collisions, canopy painting, materials, camera or saved project schema.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(p,'utf8');
const base=get('src/game/scenes/EnvironmentBuilderScene.js');
const dom=get('src/game/scenes/EnvironmentBuilderAssetPointerUpScene.js');
const css=get('src/game/environment/environmentStudioUnified.css');
const canopy=get('src/game/scenes/EnvironmentBuilderCanopyOcclusionScene.js');
const pen=get('src/game/scenes/EnvironmentBuilderCollisionPenScene.js');
const zone=get('src/game/scenes/EnvironmentBuilderFreehandCollisionScene.js');
const workflow=get('src/game/scenes/EnvironmentBuilderCollisionWorkflowScene.js');
const exit=get('src/game/scenes/EnvironmentBuilderSafeWorkflowScene.js');
const html=get('index.html');
assert.match(html,/name="tdr-dev-version" content="DEV 1\.3\.59"/);
assert.match(base,/typeof this\._mountDomShell==='function'\s*\? null : mountEnvironmentStudioChrome\(this,CATALOG,BASE\)/,
 'Advanced scene must never mount simple premium shell in parallel');
assert.match(dom,/import '\.\.\/environment\/environmentStudioUnified\.css';/);
assert.match(dom,/_installDomStyles\(\)\{\s*\/\//,
 'Old inline stylesheet must no longer override premium layout');
assert.ok(!dom.includes("s.textContent=`#tdr-environment-studio-dom"),'Old flat theme must be absent');
for(const key of ['save','load','export','photo','fit','zoomIn','zoomOut','pan','select','exit','back','down','up','front','rotL','rotR','scaleD','scaleU','flipX','flipY','dup','delete','clearAll']){
  assert.ok(dom.includes('data-act="'+key+'"'),'Missing active UI action '+key);
}
assert.match(dom,/this\._fitRealTrack\?\.\(\)/,'TODO frames real track with existing camera');
assert.match(dom,/this\._pickGuide\?\.\(\)/,'Photo loading remains supported');
for(const act of ['surface','data-surface-visual','data-surface-physics','data-surface-width'])assert.ok(dom.includes(act),'Lost terrain UI '+act);
for(const material of ['asphalt','grass','dirt','gravel'])assert.ok(dom.includes('data-surface-visual="'+material+'"'),'Lost terrain '+material);
assert.ok(dom.includes("this._surfaceVisual=b.dataset.surfaceVisual"),'Terrain visual selection must act on Phaser model');
assert.ok(dom.includes("this._surfacePhysics=b.dataset.surfacePhysics"),'Terrain physics selection must act on Phaser model');
assert.ok(dom.includes("this._surfaceWidth=Math.max(40,Math.min(400"),'Terrain width changes must reach existing renderer');
assert.ok(dom.includes("_flash(message)"),'Status messages must remain legible without Phaser popups');
assert.ok(css.includes('safe-area-inset-left'),'iPhone island must not block header');
assert.match(dom,/--es-header/);assert.match(dom,/--es-left/);assert.match(dom,/--es-right/);
assert.match(dom,/getBoundingClientRect/,'DOM must match actual Phaser canvas');
assert.match(css,/#tdr-environment-studio-dom \.es-head\{/);
assert.match(css,/#tdr-environment-studio-dom \.es-left\{/);
assert.match(css,/#tdr-environment-studio-dom \.es-right\{/);
assert.match(css,/top:var\(--es-header\)/);
assert.match(css,/width:var\(--es-left\)/);
assert.match(css,/width:var\(--es-right\)/);
assert.match(css,/overflow-y:auto/,'Advanced tools can scroll locally');
assert.match(css,/pointer-events:none/,'No DOM overlay intercepts map canvas');
assert.match(css,/pointer-events:auto/,'Controls remain touchable');
assert.match(dom,/this\._disableLegacyPhaserUi\(\)/,'Inherited Phaser UI hidden');
assert.ok(dom.includes('disableInteractive'),'Inherited Phaser UI cannot steal touch');
assert.ok(dom.includes('this._environmentDom?.remove?.()'),'Scene exit removes DOM shell');
assert.ok(dom.includes("window.removeEventListener('resize'"),'Resize listeners removed');
for(const [name,code,selector] of [
  ['Copas 2.5D',canopy,'data-canopy'],
  ['Pluma de colisiones',pen,'data-pen'],
  ['Zonas de colisión',zone,'data-zone'],
  ['Continuar / deshacer',workflow,'data-workflow']]){
  assert.ok(code.includes(selector),name+' buttons retained');
  assert.ok(code.includes("document.createElement('details')"),name+' collapses instead of crowding the screen');
  assert.ok(code.includes("aside.prepend(group)"),name+' stays inside one canonical sidebar');
}
assert.ok(canopy.includes('data-canopy="import-copas"'),'Canopy import kept');
assert.ok(canopy.includes('this._canopyToggleCount=count'),'Canopy count visible when closed');
assert.ok(exit.includes("querySelector('[data-act=\"exit\"]')"),'Safe exit button preserved');
assert.ok(base.includes('_storageKey(){return`tdr2:environmentBuilder:v1:${this._trackId}`;}'),
  'No changed persistent project namespace');
assert.ok(canopy.includes('normalizedCanopyZones(this._canopyZones'),'Canopy JSON export preserved');
// The three editor tools must keep their independent colour identities on
// completed, selected and in-progress traces, without changing saved data.
const palette=get('src/game/environment/environmentStudioZoneColors.js');
assert.match(palette,/canopy:Object\.freeze\(\{line:0x38e99a,selected:0x95ffcf/);
assert.match(palette,/pen:Object\.freeze\(\{line:0xf1f6ff,selected:0xffffff/);
assert.match(palette,/zone:Object\.freeze\(\{line:0xffcf45,selected:0xffee97/);
assert.ok(pen.includes('const palette=ENVIRONMENT_ZONE_COLORS.pen;'),'Pluma base path must be white');
assert.ok(pen.includes('selected?palette.selected:palette.line'),'Pluma selection must remain white');
assert.ok(pen.includes('palette.shadow'),'White stroke must have contrast on bright photos');
assert.ok(!pen.includes('0xffdd75'),'Pen vertices must never turn yellow on selection');
assert.ok(zone.includes('unfinished?colors.draft:colors.line'),'Solid zones and drafts must remain yellow');
assert.ok(canopy.includes('unfinished?colors.draft:colors.line'),'Canopy contours and drafts must remain green');
assert.ok(zone.includes("es-advanced-group es-zone-details"),'Zone menu must have own accent');
assert.ok(pen.includes("es-advanced-group es-pen-details"),'Pen menu must have own accent');
assert.ok(canopy.includes("es-canopy-details"),'Canopy menu must have own accent');
for(const cls of ['es-canopy-details','es-pen-details','es-zone-details'])assert.ok(css.includes('details.'+cls),'Missing CSS colour section '+cls);
assert.ok(css.includes('background:var(--es-zone)'),'Menus must include colour swatches');
assert.ok(base.includes('_storageKey(){return`tdr2:environmentBuilder:v1:${this._trackId}`;}'),'Persisted editor key unchanged');
console.log('PASS Environment Studio 1.3.59: canopy green, pen white, solid zones yellow (draft/selected), matching menus, saved JSON untouched');

console.log('PASS Environment Studio single premium shell: layout, iPhone dimensions, scroll, all callbacks, canopy/collisions, cleanup and saved data.');
