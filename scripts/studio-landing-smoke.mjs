import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
const root=process.cwd();
const source=resolve(root,"studio");
const output=process.argv[2]?resolve(process.argv[2]):null;
const read=path=>readFileSync(path,"utf8");
const pages=[
 ["index.html","CraftRace Studio"],
 ["top-down-race/index.html","Top Down RACE: CrafRace"],
 ["slotrace/index.html","Top Down RACE: SlotRace"],
 ["cuenta/index.html","Mi cuenta"],
 ["privacidad/index.html","Privacidad"]
];
for(const [file,title] of pages){
 const text=read(resolve(source,file));
 assert.ok(text.toLowerCase().includes(title.toLowerCase()),file+" missing title");
 assert.match(text,/name="viewport"/,file+" viewport");
 assert.match(text,/name="description"/,file+" description");
 assert.match(text,/rel="canonical"/,file+" canonical");
 assert.match(text,/class="site-header"/,file+" shared navigation");
 assert.match(text,/class="site-footer"/,file+" shared footer");
 assert.match(text,/studio-assets\/studio\.css"/,file+" stylesheet");
 assert.match(text,/studio-assets\/site\.js"/,file+" navigation JS");
 assert.doesNotMatch(text,/content="https?:\/\/localhost/i,file+" must not use a local canonical URL");
 if(output){
  assert.ok(existsSync(resolve(output,file)),file+" deployed path");
  assert.equal(read(resolve(output,file)),text,file+" deployed bytes");
 }
}
// Official game identities: CraftRace Studio is the STUDIO name, not a
// substitute for either of the two game titles.
const GAME_CRAFRACE="Top Down RACE: CrafRace";
const GAME_SLOTRACE="Top Down RACE: SlotRace";
for(const [file] of pages){
 const html=read(resolve(source,file));
 for(const name of [GAME_CRAFRACE,GAME_SLOTRACE]){
  assert.ok(html.includes(name),file+" must name "+name);
 }
 assert.match(html,/<a href="\/TopdownCraftrace\/top-down-race\/"[^>]*>Top Down RACE: CrafRace<\/a>/,
  file+" desktop menu must use the full game name");
 assert.match(html,/<a href="\/TopdownCraftrace\/slotrace\/"[^>]*>Top Down RACE: SlotRace<\/a>/,
  file+" desktop menu must use the full game name");
 assert.match(html,/aria-label="CraftRace Studio, inicio"/,
  "The publisher brand must remain CraftRace Studio");
}
const landing=read(resolve(source,"index.html"));
assert.match(landing,/CRAFT<b>RACE<\/b>/);
assert.match(landing,/href="\/TopdownCraftrace\/top-down-race\/"/);
assert.match(landing,/href="\/TopdownCraftrace\/slotrace\/"/);
assert.match(landing,/href="\/TopdownCraftrace\/cuenta\/"/);
assert.match(landing,/https:\/\/almaprintes\.github\.io\/SlotRace\//);
const slot=read(resolve(source,"slotrace/index.html"));
assert.match(slot,/CONSTRUCCIÓ[N]/i);
assert.match(slot,/prototipo web en desarrollo/i);
assert.match(slot,/<title>Top Down RACE: SlotRace \| CraftRace Studio<\/title>/);
assert.match(slot,/SLOTRACE\.<\/span>/);
assert.doesNotMatch(slot,/<title>SlotRace LAB/);
const tdr=read(resolve(source,"top-down-race/index.html"));
assert.match(tdr,/Google Play/);
assert.match(tdr,/<title>Top Down RACE: CrafRace \| CraftRace Studio<\/title>/);
assert.match(tdr,/CRAFRACE\.<\/span>/);
assert.doesNotMatch(tdr,/<title>Top Down RACE \|/);
assert.match(tdr,/\/TopdownCraftrace\/dev\//);
const portal=read(resolve(source,"cuenta/index.html"));
for(const id of ["studioAuthApp","formLogin","formRegister","profileClaim","linkGoogle","linkApple","profileReady","authNotice","signOut"]){
 assert.match(portal,new RegExp('id="'+id+'"'),"missing portal element "+id);
}
const auth=read(resolve(source,"assets/account.mjs"));
assert.match(auth,/auth\.signUp\(/,"New Studio accounts need a real Auth signup");
assert.match(auth,/auth\.signInWithOAuth\(/,"OAuth uses Supabase Auth");
assert.match(auth,/auth\.signInWithPassword\(/,"Existing accounts can log in");
assert.match(auth,/auth\.linkIdentity\(/,"Linked Google and Apple keep the existing UUID");
assert.match(auth,/current\.id!==user\.id/,"Linking fails on an unexpected identity");
assert.match(auth,/from\("craft_accounts"\)/,"Universal Studio nick from DB");
assert.match(auth,/\.is\("nickname",null\)/,"Cannot overwrite reserved nick silently");
assert.match(auth,/storageKey:STORAGE_KEY/,"Independent browser session is isolated from TDR game");
assert.doesNotMatch(auth,/service_role|sb_secret_|supabase_service/i,"No privileged key in browser");
assert.doesNotMatch(auth,/localStorage\.(?:setItem|removeItem)\(\s*["'](?:tdr2:|slotrace-)/,
 "The account portal must not change saved game progress");
const styles=read(resolve(source,"assets/studio.css"));
assert.match(styles,/@media\(max-width:530px\)/);
assert.match(styles,/prefers-reduced-motion:reduce/);
assert.match(styles,/:focus-visible/);
assert.match(styles,/h3\.game-full-title/);
assert.match(styles,/h1\.official-game-title/);
assert.match(styles,/@media\(max-width:1120px\)/);
for(const file of ["assets/site.js","assets/account.mjs"]){
 const full=resolve(source,file);
 const check=spawnSync(process.execPath,["--check",full],{encoding:"utf8"});
 assert.equal(check.status,0,file+" JS syntax: "+check.stderr);
 if(output)assert.equal(read(resolve(output,"studio-assets",file.split("/").at(-1))),
  read(full),"deployed JS differs");
}
if(output){
 assert.ok(existsSync(resolve(output,"studio-assets/studio.css")));
 assert.ok(existsSync(resolve(output,"dev/index.html")),"Never delete the TDR DEV PWA");
}
console.log("PASS CraftRace Studio: official game titles, 5 pages, shared identity, OAuth, responsive CSS, no local save mutations.");
if(output)console.log("PASS GitHub Pages stage: studio routes and resources served without altering /dev.");
