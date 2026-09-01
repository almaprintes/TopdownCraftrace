import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES, findStripRecipe, statDeltaForPart } from '../garage/partsCatalog.js';
import { qty, getEquippedForCar } from '../garage/garageStore.js';

const ROOT_ID='tdr-workshop-mobile-dom';
const STYLE_ID='tdr-workshop-mobile-dom-style';
const MODAL_ID='tdr-workshop-quick-modal';
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const FAMILY_ORDER=['engine','transmission','tires','suspension','brakes'];
const TIERS=['street','sport','racing','prototype'];
const TIER_LABEL={street:'STREET',sport:'SPORT',racing:'RACING',prototype:'PROTOTYPE'};
const TIER_COLOR={1:'#66c6ff',2:'#4ee1a0',3:'#bf7cff',4:'#ffc64d'};
const STATS=[['speed','VELOCIDAD'],['accel','ACELERACIÓN'],['grip','AGARRE'],['control','CONTROL']];
const MATERIAL_FILES={scrap:'chatarra.webp',alloy:'aleacion.webp',rubber:'goma.webp',compound:'compuesto.webp',disc:'disco_metalico.webp',spring:'muelle.webp',gear:'engranaje.webp',ecu:'electronica.webp'};
const PART_FILES={
 engine_street:'engine/engine_street.webp',engine_sport:'engine/engine_sport.webp',engine_racing:'engine/engine_racing.webp',engine_prototype:'engine/engine_prototype.webp',
 brakes_street:'brakes/brakes_street.webp',brakes_sport:'brakes/brakes_sport.webp',brakes_racing:'brakes/brakes_racing.webp',brakes_prototype:'brakes/brakes_prototype.webp',
 tires_street:'tires/tires_street.webp',tires_sport:'tires/tires_sport.webp',tires_racing:'tires/tires_racing_t3.webp',tires_prototype:'tires/tires_prototype_t4.webp',
 suspension_street:'suspension/suspension_street_t1.webp',suspension_sport:'suspension/suspension_sport_t2.webp',suspension_racing:'suspension/suspension_racing_t3.webp',suspension_prototype:'suspension/suspension_prototype_t4.webp',
 transmission_street:'transmission/transmission_street_t1.webp',transmission_sport:'transmission/transmission_sport_t2.webp',transmission_racing:'transmission/transmission_racing_t3.webp',transmission_prototype:'transmission/transmission_prototype_t4.webp'
};
const base=()=>String(import.meta.env.BASE_URL||'./');
const asset=(item)=>{if(!item)return'';if(item.kind==='material'){const f=MATERIAL_FILES[item.id];return f?`${base()}assets/crafting/materials/${f}`:'';}const f=PART_FILES[item.id];return f?`${base()}assets/crafting/parts/${f}`:'';};
const carAsset=id=>`${base()}assets/cars/workshop/${id}.webp`;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};
const button=(label,cls,onClick)=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',onClick);return b;};
const clamp99=n=>Math.max(1,Math.min(99,Math.round(Number(n)||0)));

function baseStats(spec){
 if(spec?.designStats){const d=spec.designStats;return{speed:clamp99(d.VEL??55),accel:clamp99(d.ACC??55),grip:clamp99(((d.EST??55)+(d.GIR??55))/2),control:clamp99(((d.GIR??55)+(d.FRN??55))/2)};}
 return{speed:clamp99(((Number(spec?.maxFwd)||520)-400)/3.2+45),accel:clamp99(((Number(spec?.accel)||650)-500)/5+45),grip:clamp99(((Number(spec?.gripCoast)||.23)-.16)*260+50),control:clamp99(((Number(spec?.turnRate)||3.4)-2.7)*28+50)};
}

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=el('style');s.id=STYLE_ID;s.textContent=`
#${ROOT_ID}{position:absolute;inset:0;z-index:23000;display:grid;grid-template-rows:48px minmax(0,1fr) 58px;background:radial-gradient(circle at 22% 46%,#12364b55,transparent 38%),radial-gradient(circle at 78% 35%,#5c381b44,transparent 35%),#050a10;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;pointer-events:auto;-webkit-user-select:none;user-select:none}
#${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID} button{font:inherit;color:inherit;border:0;touch-action:manipulation}
#${ROOT_ID} .hdr{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:6px 12px;background:#071226f2;border-bottom:1px solid #46ddff55}.back{justify-self:start;background:#142437;border:1px solid #49637c;border-radius:8px;padding:8px 12px;font-weight:900;font-size:12px}.title{font-weight:950;font-size:20px;letter-spacing:.04em}.coins{justify-self:end;color:#ffd45a;font-weight:950;font-size:13px}
#${ROOT_ID} .body{min-height:0;display:grid;grid-template-columns:34% minmax(0,66%);gap:8px;padding:8px 8px 4px}.panel{min-height:0;border:1px solid #39566e;background:#071225ed;border-radius:12px;overflow:hidden}.carPanel{display:grid;grid-template-rows:auto 43% minmax(0,1fr) 31px;padding:9px 10px 7px}.eyebrow{font-size:8px;font-weight:900;color:#8da3ae;letter-spacing:.1em}.carHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.carName{font-size:17px;font-weight:950;font-style:italic}.rarity{font-size:8px;font-weight:900;color:#ffd05a}.carStage{min-height:0;display:flex;align-items:center;justify-content:center;position:relative}.carStage:before{content:"";position:absolute;width:84%;height:60%;border:1px solid #4cdbff33;border-radius:50%;background:#2dd7ff12}.carStage img{position:relative;max-width:96%;max-height:96%;object-fit:contain;filter:drop-shadow(0 7px 10px #000a)}
#${ROOT_ID} .stats{min-height:0;padding:3px 3px 0}.statsTitle{font-size:8px;font-weight:950;margin-bottom:5px}.stat{margin-bottom:5px}.statHead{display:flex;justify-content:space-between;gap:5px;font-size:7px;font-weight:800;color:#d8e4e9}.statHead b{color:#fff}.statHead b.preview{color:#64ef73}.statBar{height:5px;border-radius:4px;overflow:hidden;background:#14232a;display:flex;margin-top:3px}.seg{height:100%;flex:0 0 auto}.seg.base{background:#fff}.seg.t1{background:#66c6ff}.seg.t2{background:#4ee1a0}.seg.t3{background:#bf7cff}.seg.t4{background:#ffc64d}.seg.preview{opacity:.45;outline:1px solid currentColor;outline-offset:-1px}
#${ROOT_ID} .carNav{display:grid;grid-template-columns:36px 1fr 36px;align-items:center;gap:6px}.navBtn{height:27px;border-radius:7px;background:#102236;border:1px solid #41617d;font-size:18px;font-weight:950}.navBtn:disabled{opacity:.35}.carHint{text-align:center;font-size:7px;color:#859eb2;font-weight:850}
#${ROOT_ID} .craftPanel{display:grid;grid-template-rows:auto auto minmax(0,1fr);padding:9px;gap:6px}.craftTitle{display:flex;justify-content:space-between;align-items:center}.craftTitle strong{font-size:13px}.craftTitle span{font-size:7px;color:#9fb4ce;font-weight:850}.selectors{display:grid;gap:5px}.row{display:grid;gap:4px}.families{grid-template-columns:repeat(5,1fr)}.tiers{grid-template-columns:repeat(4,1fr)}.sel{min-width:0;height:28px;padding:0 4px;border-radius:6px;background:#0b1830;border:1px solid #405873;color:#a9b8c9;font-size:8px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sel.on{background:#174765;border:2px solid #5ce5ff;color:#fff}.tier.street{border-color:#66c6ff}.tier.sport{border-color:#4ee1a0}.tier.racing{border-color:#bf7cff}.tier.prototype{border-color:#ffc64d}.tier.on{background:#17223c}
#${ROOT_ID} .recipe{min-height:0;display:grid;grid-template-columns:24% minmax(0,1fr);gap:8px;border:1px solid #50708c;background:#081424;border-radius:10px;padding:6px}.partCol{min-height:0;display:grid;grid-template-rows:minmax(0,1fr) 28px;gap:5px}.partImg{min-height:0;display:flex;align-items:center;justify-content:center;background:#0d1928;border-radius:8px;overflow:hidden}.partImg img{max-width:100%;max-height:100%;object-fit:contain}.craftBtn{border-radius:6px;background:#273247;border:2px solid #526077;font-size:8px;font-weight:950}.craftBtn.ready{background:#17683f;border-color:#55f29b}.requirements{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:5px}.partName{font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reqGrid{min-height:0;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(54px,1fr);gap:4px}.req{position:relative;min-width:0;border-radius:7px;background:#101722;border:1px solid var(--tone,#ff5965);overflow:hidden;text-align:center;display:grid;grid-template-rows:1fr auto auto auto;padding:4px 3px}.req:before{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--fill,0%);background:color-mix(in srgb,var(--tone) 24%,transparent);pointer-events:none}.req>*{position:relative}.reqName{align-self:center;font-size:7px;font-weight:950;overflow:hidden;text-overflow:ellipsis}.reqPct{font-size:10px;font-weight:950;color:var(--tone)}.reqQty{font-size:8px;font-weight:950}.reqState{font-size:7px;font-weight:950;color:#ffd4d7}.req.ok .reqState{color:#7dffb6}
#${ROOT_ID} .dock{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;padding:4px 8px 6px;background:#03080bf8;border-top:1px solid #243c46}.dockItem{min-width:0;background:#081116;border:1px solid #243c46;border-radius:7px;padding:4px 7px;display:grid;grid-template-rows:auto 1fr auto;text-align:center;align-items:center}.dockFam{font-size:7px;font-weight:950;color:#d7e6ef}.dockName{font-size:8px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#7f95a5}.dockItem.equipped{border-width:2px}.dockItem.equipped .dockName{color:#fff}.dockState{font-size:6px;font-weight:900;color:#78dfff}.dockItem.equipped .dockState{color:var(--accent,#d6ad55)}
#${MODAL_ID}{position:absolute;inset:0;z-index:24050;background:#02070de8;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto}#${MODAL_ID} *{box-sizing:border-box}#${MODAL_ID} .qm{width:min(820px,calc(100% - 28px));height:min(310px,calc(100% - 22px));background:#08131d;border:2px solid #45dfff;border-radius:10px;padding:14px 18px 12px;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:5px;position:relative}.qmTitle{text-align:center;font-size:19px;font-weight:900}.qmSub{text-align:center;font-size:8px;font-weight:800;color:#8da8bd}.qmClose{position:absolute;right:10px;top:8px;width:34px;height:34px;border-radius:50%;background:#132a3b;border:2px solid #45dfff;color:#fff;font-size:22px;font-weight:900}.qmGrid{min-height:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.qmCard{min-width:0;background:#0d1a24;border:2px solid var(--accent,#45dfff);border-radius:8px;padding:5px;display:grid;grid-template-rows:minmax(0,1fr) auto auto auto;align-items:center;text-align:center;color:#fff}.qmCard.installed{background:#101821;border-width:3px;opacity:.82}.qmArt{min-height:0;display:flex;align-items:center;justify-content:center}.qmArt img{max-width:92%;max-height:100%;object-fit:contain}.qmName{font-size:8px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qmTier{font-size:7px;color:#a9bbca;font-weight:850}.qmAction{font-size:8px;font-weight:900;color:#7ddcff}.qmCard.installed .qmAction{color:#ffcf63}.qmEmpty{grid-column:1/-1;align-self:center;text-align:center;color:#71879b;font-size:13px;font-weight:850}
@media(max-height:360px){#${ROOT_ID}{grid-template-rows:42px minmax(0,1fr) 50px}#${ROOT_ID} .title{font-size:17px}#${ROOT_ID} .body{padding:5px 5px 3px;gap:5px}#${ROOT_ID} .carPanel,#${ROOT_ID} .craftPanel{padding:6px}#${ROOT_ID} .carPanel{grid-template-rows:auto 41% minmax(0,1fr) 27px}#${ROOT_ID} .stat{margin-bottom:3px}#${ROOT_ID} .statBar{height:4px}#${ROOT_ID} .sel{height:24px;font-size:7px}#${ROOT_ID} .recipe{padding:4px;gap:5px}#${ROOT_ID} .partCol{grid-template-rows:minmax(0,1fr) 24px}.qm{height:min(290px,calc(100% - 14px));padding:9px 14px}.qmGrid{gap:6px}}
`;
 document.head.appendChild(s);
}

function progressTone(p){if(p>=1)return'#42e58b';if(p>=.5)return'#ffbf3f';return'#ff5965';}
function allowedCars(scene){try{return scene._allowedWorkshopCars?.()||[];}catch{return[];}}
function previewPart(scene){const recipe=findStripRecipe(scene.slots||[]);return recipe?GARAGE_ITEMS[recipe.out]:null;}

function renderStats(scene,spec){
 const wrap=el('div','stats');wrap.append(el('div','statsTitle','RENDIMIENTO'));
 const baseValues=baseStats(spec),equipped={...(getEquippedForCar(scene.state,scene.car)||{})},preview=previewPart(scene),active={...equipped};
 if(preview?.kind==='part'&&preview.family)active[preview.family]=preview.id;
 STATS.forEach(([key,label])=>{
  const row=el('div','stat');let total=baseValues[key];const parts=[];
  for(const family of FAMILY_ORDER){const id=active[family],item=GARAGE_ITEMS[id];if(item?.kind!=='part')continue;const raw=Math.max(0,Number(statDeltaForPart(item)?.[key]||0)),room=Math.max(0,99-total),value=Math.min(raw,room);if(value>0){parts.push({item,value,preview:preview?.id===id&&equipped[family]!==id});total+=value;}}
  const head=el('div','statHead'),value=el('b',parts.some(p=>p.preview)?'preview':'',String(clamp99(total)));head.append(el('span',null,label),value);row.append(head);
  const bar=el('div','statBar'),baseSeg=el('i','seg base');baseSeg.style.width=`${Math.max(0,Math.min(99,baseValues[key]))}%`;bar.append(baseSeg);
  parts.forEach(seg=>{const n=el('i',`seg t${Number(seg.item.tier)||1} ${seg.preview?'preview':''}`);n.style.width=`${Math.max(0,seg.value)}%`;bar.append(n);});
  row.append(bar);wrap.append(row);
 });
 return wrap;
}

function closeQuickModal(){document.getElementById(MODAL_ID)?.remove();}
function openQuickFamilyInstall(scene,family){
 closeQuickModal();const root=el('div');root.id=MODAL_ID;const host=scene.__workshopDomRoot||document.body;host.appendChild(root);
 const box=el('div','qm');root.appendChild(box);box.append(el('div','qmTitle',`PIEZAS · ${FAMILY_LABEL[family]}`),el('div','qmSub','INSTALA O DESINSTALA CON UN TOQUE'));
 box.append(button('×','qmClose',closeQuickModal));const grid=el('div','qmGrid');box.append(grid);
 const eq=getEquippedForCar(scene.state,scene.car)||{},equippedId=eq[family]||null;
 const ids=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part'&&GARAGE_ITEMS[id]?.family===family).filter(id=>qty(scene.state,id)>0||id===equippedId).sort((a,b)=>Number(GARAGE_ITEMS[a]?.tier||0)-Number(GARAGE_ITEMS[b]?.tier||0));
 if(!ids.length){grid.append(el('div','qmEmpty','NO TIENES PIEZAS DE ESTA FAMILIA EN EL INVENTARIO'));return;}
 ids.slice(0,4).forEach(id=>{
  const item=GARAGE_ITEMS[id],installed=id===equippedId,tier=Number(item?.tier||1),q=qty(scene.state,id),card=button('',`qmCard ${installed?'installed':''}`,()=>{
   if(scene.busy)return;
   let changed=false;
   if(installed)changed=!!scene._unequipFromInventory?.(id);else if(q>0)changed=!!scene._installFromInventory?.(id);
   if(changed){closeQuickModal();scene.render?.();}
  });
  card.style.setProperty('--accent',TIER_COLOR[tier]||'#45dfff');const art=el('div','qmArt');const img=el('img');img.src=asset(item);img.alt='';art.append(img);card.append(art,el('div','qmName',String(item?.name||id).toUpperCase()),el('div','qmTier',`NIVEL ${tier}`),el('div','qmAction',installed?'DESINSTALAR':`INSTALAR · ×${q}`));grid.append(card);
 });
}

function renderDock(scene){
 const dock=el('div','dock'),eq=getEquippedForCar(scene.state,scene.car)||{};
 FAMILIES.forEach(family=>{
  const id=eq[family]||null,item=id?GARAGE_ITEMS[id]:null,tier=Number(item?.tier||0),card=button('',`dockItem ${item?'equipped':''}`,()=>{if(!scene.busy)openQuickFamilyInstall(scene,family);});
  const accent=item?(TIER_COLOR[tier]||'#2b424c'):'#243c46';card.style.setProperty('--accent',accent);card.style.borderColor=accent;
  card.append(el('div','dockFam',FAMILY_LABEL[family]),el('div','dockName',item?String(item.name||id).toUpperCase():'SIN EQUIPAR'),el('div','dockState',item?`EQUIPADO · T${tier} · CAMBIAR`:'INSTALAR'));
  dock.append(card);
 });
 return dock;
}

export function closeWorkshopMobileDom(scene){closeQuickModal();document.getElementById(ROOT_ID)?.remove();if(scene)scene.__workshopDomRoot=null;}

export function renderWorkshopMobileDom(scene){
 if(typeof document==='undefined'||!scene)return false;ensureStyle();closeWorkshopMobileDom(scene);
 const host=scene.game?.canvas?.parentElement||document.getElementById('app')||document.body;if(getComputedStyle(host).position==='static')host.style.position='relative';
 const root=el('div');root.id=ROOT_ID;scene.__workshopDomRoot=root;host.appendChild(root);
 const hdr=el('div','hdr');hdr.append(button('← GARAJE','back',()=>{if(!scene.busy)scene.scene.start('menu');}),el('div','title','FABRICACIÓN'),el('div','coins',`● ${Number(scene.state?.coins||0).toLocaleString('es-ES')}`));root.append(hdr);
 const body=el('div','body');root.append(body);
 const left=el('section','panel carPanel');body.append(left);const spec=CAR_SPECS[scene.car]||{};const head=el('div');head.append(el('div','eyebrow','COCHE ACTUAL'));const ch=el('div','carHead');ch.append(el('div','carName',String(spec.name||scene.car||'').toUpperCase()),el('div','rarity',String(spec.rarity||'COMÚN').toUpperCase()));head.append(ch);left.append(head);
 const stage=el('div','carStage');const ci=el('img');ci.src=carAsset(scene.car);ci.alt='';stage.append(ci);left.append(stage);left.append(renderStats(scene,spec));
 const cars=allowedCars(scene),idx=cars.indexOf(scene.car),nav=el('div','carNav'),prev=button('‹','navBtn',()=>scene._browseWorkshopCar?.(-1)),next=button('›','navBtn',()=>scene._browseWorkshopCar?.(1));prev.disabled=idx<=0;next.disabled=idx<0||idx>=cars.length-1;nav.append(prev,el('div','carHint',`${Math.max(1,idx+1)} / ${Math.max(1,cars.length)} · desliza por tus coches desbloqueados`),next);left.append(nav);
 const right=el('section','panel craftPanel');body.append(right);const ct=el('div','craftTitle');ct.append(el('strong',null,'FABRICACIÓN DIRECTA'),el('span',null,'ELIGE · REVISA · FABRICA'));right.append(ct);
 const selectors=el('div','selectors'),famRow=el('div','row families');FAMILIES.forEach(f=>famRow.append(button(FAMILY_LABEL[f],`sel ${scene.craftFamily===f?'on':''}`,()=>{if(scene.busy)return;scene.craftFamily=f;scene.craftTier='street';scene.render();})));selectors.append(famRow);const tierRow=el('div','row tiers');TIERS.forEach(t=>{const id=`${scene.craftFamily}_${t}`,owned=qty(scene.state,id);tierRow.append(button(`${TIER_LABEL[t]}${owned?` ×${owned}`:''}`,`sel tier ${t} ${scene.craftTier===t?'on':''}`,()=>{if(scene.busy)return;scene.craftTier=t;scene.render();}));});selectors.append(tierRow);right.append(selectors);
 const out=`${scene.craftFamily}_${scene.craftTier}`,item=GARAGE_ITEMS[out],recipe=DIRECT_CRAFT_RECIPES[out],card=el('div','recipe');right.append(card);const partCol=el('div','partCol'),art=el('div','partImg');if(item){const pi=el('img');pi.src=asset(item);pi.alt='';art.append(pi);}partCol.append(art);card.append(partCol);
 let can=!!recipe;const reqs=(recipe?.requires||[]).map(req=>{const have=qty(scene.state,req.id),need=Math.max(1,Number(req.qty)||1),ok=have>=need;if(!ok)can=false;return{req,have,need,ok,p:Math.max(0,Math.min(1,have/need)),item:GARAGE_ITEMS[req.id]};});const craft=button(can?'FABRICAR':`FALTAN ${reqs.filter(x=>!x.ok).length} MATERIALES`,`craftBtn ${can?'ready':''}`,()=>{if(can&&!scene.busy)scene._craftDirect?.(out,recipe);});craft.disabled=!can;partCol.append(craft);
 const info=el('div','requirements');info.append(el('div','partName',String(item?.name||out).toUpperCase()));const grid=el('div','reqGrid');info.append(grid);card.append(info);reqs.forEach(s=>{const tone=progressTone(s.p),r=el('div',`req ${s.ok?'ok':''}`);r.style.setProperty('--tone',tone);r.style.setProperty('--fill',`${Math.round(s.p*100)}%`);r.append(el('div','reqName',String(s.item?.name||s.req.id).toUpperCase()),el('div','reqPct',`${Math.round((s.have/s.need)*100)}%`),el('div','reqQty',`${s.have} / ${s.need}`),el('div','reqState',s.ok?'LISTO':`FALTAN ${Math.max(0,s.need-s.have)}`));if(!s.ok&&scene._openRecyclerForMaterial)r.addEventListener('click',()=>scene._openRecyclerForMaterial(s.req.id));grid.append(r);});
 root.append(renderDock(scene));return true;
}
