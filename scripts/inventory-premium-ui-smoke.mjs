// DEV 1.2.161 — Both inventory entry points use the same lightweight
// bevel design without changing their equipment economy or touch targets.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inventoryChamferPoints,drawInventorySurface} from '../src/game/ui/inventoryPremiumDraw.js';
const read=path=>readFileSync(path,'utf8');
const lobby=read('src/game/scenes/MenuInventoryAssetsScene.js');
const factory=read('src/game/scenes/UpgradeWorkshopInventoryAccessScene.js');
const graphics=read('src/game/ui/inventoryPremiumDraw.js');
const html=read('index.html');
const pts=inventoryChamferPoints(10,20,200,80,15);
assert.equal(pts.length,8,'Cutaway inventory panels have eight straight edges');
assert.ok(pts.every(({x,y})=>x>=10&&x<=210&&y>=20&&y<=100),
  'The panel silhouette stays within its original bounds');
assert.equal(pts[0].x,25,'The outer corner is chamfered inward');
assert.equal(pts[0].y,20);
assert.equal(pts.at(-1).x,10);
const calls=[];
const ctx=Object.fromEntries([
 'fillStyle','fillPoints','lineStyle','strokePoints','fillRect','lineBetween'
].map(name=>[name,(...args)=>{calls.push([name,args]);return ctx}]));
const created=[];
const fakeScene={add:{graphics(){created.push(ctx);return ctx}}};
const mount=g=>g;
for(const kind of ['shell','card','tab']){
  const shape=drawInventorySurface(fakeScene,mount,{x:0,y:0,w:200,h:120,kind,accent:0x6ae8ff,active:true});
  assert.equal(shape,ctx);
}
const pooled=drawInventorySurface(fakeScene,mount,{x:2,y:2,w:160,h:70,kind:'card'},ctx);
assert.equal(pooled,ctx,'the same Graphics may draw further cards');
assert.equal(created.length,3,'a shared decorative batch allocates no new Graphics');
assert.equal(created.length,3,'Each premium shape is one graphics object, no bitmap texture');
assert.ok(calls.filter(c=>c[0]==='fillPoints').length>=3);
assert.ok(calls.some(c=>c[0]==='lineBetween'),'Shell retains a thin technical divider');
assert.doesNotMatch(graphics,/requestAnimationFrame|setInterval|setTimeout|blur\(/,
  'No per-frame effects or texture-costly blur');
for(const [name,src] of [['lobby',lobby],['factory',factory]]){
  assert.match(src,/import \{ drawInventorySurface \} from '\.\.\/ui\/inventoryPremiumDraw\.js'/,
    name+' must load shared modern panels');
  for(const kind of ["kind:'shell'","kind:'tab'","kind:'card'"]){
    assert.ok(src.includes(kind),name+' uses styled '+kind+' surfaces');
  }
  assert.match(src,/const sharedInventoryGraphics=A\(this\.add\.graphics\(\)\)/,
    name+' must allocate exactly one shared decoration graphics');
  assert.match(src,/drawInventorySurface\(this,A,options,sharedInventoryGraphics\)/,
    name+' must send all bevel geometry to shared graphics');
  assert.doesNotMatch(src,/\bdrawInventorySurface\(this,A,\{/,
    name+' cannot allocate per-card graphics');
  assert.match(src,/\.setInteractive\(\{useHandCursor:true\}\)/,
    name+' must retain original Phaser touch targets');
  assert.match(src,/page=\s*Math\.max\(0,Math\.min\(page,pages-1\)\)/,
    name+' must still clamp inventory pagination');
  assert.match(src,/active\?0:tier/,
    name+' must preserve four-tier on/off filtering');
  assert.match(src,/veil\.on\('pointerup',\(\)=>\{\}\)/,
    name+' must not close the modal when touching a card');
  assert.ok(!src.includes('this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.998)'),
    name+' must no longer draw the old heavy opaque rectangle');
}
assert.match(lobby,/getEquippedForCar\(garage,carId\)/);
assert.match(lobby,/inventoryTextResolution=isIOS\(\)\?1\.5:2/);
assert.match(lobby,/inventoryOpenMark\('drawn',tab,language\)/);
assert.match(lobby,/inventoryOpenMark\('frame',tab,language\)/);
assert.ok(lobby.includes("inventory.title"),'Spanish/English header retains i18n');
assert.ok(factory.includes("t('inventory.title')"),'factory title is bilingual');
assert.ok(factory.includes("t('inventory.materials')"),'factory tabs are bilingual');
assert.ok(factory.includes("t('inventory.parts')"),'factory tabs are bilingual');
assert.match(factory,/tierFilter\?t\('inventory.noTierParts'/,'tier-specific no-parts message only with a filter');
assert.match(lobby,/this\._installInventoryPart\(garage,carId,id\)/);
assert.match(lobby,/this\._unequipInventoryPart\(garage,carId,id\)/);
assert.match(lobby,/saveGarage\(garage\)/);
assert.match(lobby,/this\._openLobbyInventoryModal\(tab,\(page\+1\)%pages,tierFilter\)/);
assert.match(factory,/getEquippedForCar\(this\.state,this\.car\)/);
assert.match(factory,/this\._installFromInventory\(id\)/);
assert.match(factory,/this\._unequipFromInventory\(id\)/);
assert.match(factory,/saveGarage\(this\.state\)/);
assert.match(factory,/this\._openFactoryInventoryModal\(tab,\(page\+1\)%pages,tierFilter\)/);
const devVersion=html.match(/content="DEV (\d+)\.(\d+)\.(\d+)"/);
assert.ok(devVersion,'Canonical DEV version missing');
const [major,minor,patch]=devVersion.slice(1).map(Number);
assert.ok(major>1||(major===1&&(minor>2||(minor===2&&patch>=161))),
  'Inventory premium style must remain in subsequent DEV versions');
console.log('Inventory premium bevels and preserved touch/equipment operations: OK');
