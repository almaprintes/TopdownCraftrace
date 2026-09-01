import { CAR_SPECS } from '../cars/carSpecs.js';
import { GARAGE_ITEMS, DIRECT_CRAFT_RECIPES } from '../garage/partsCatalog.js';
import { qty } from '../garage/garageStore.js';

const ROOT_ID='tdr-workshop-mobile-dom';
const STYLE_ID='tdr-workshop-mobile-dom-style';
const FAMILIES=['engine','brakes','tires','suspension','transmission'];
const FAMILY_LABEL={engine:'MOTOR',brakes:'FRENOS',tires:'NEUMÁTICOS',suspension:'SUSPENSIÓN',transmission:'TRANSMISIÓN'};
const TIERS=['street','sport','racing','prototype'];
const TIER_LABEL={street:'STREET',sport:'SPORT',racing:'RACING',prototype:'PROTOTYPE'};
const MATERIAL_FILES={scrap:'chatarra.webp',alloy:'aleacion.webp',rubber:'goma.webp',compound:'compuesto.webp',disc:'disco_metalico.webp',spring:'muelle.webp',gear:'engranaje.webp',ecu:'electronica.webp'};
const PART_FILES={
 engine_street:'engine/engine_street.webp',engine_sport:'engine/engine_sport.webp',engine_racing:'engine/engine_racing.webp',engine_prototype:'engine/engine_prototype.webp',
 brakes_street:'brakes/brakes_street.webp',brakes_sport:'brakes/brakes_sport.webp',brakes_racing:'brakes/brakes_racing.webp',brakes_prototype:'brakes/brakes_prototype.webp',
 tires_street:'tires/tires_street.webp',tires_sport:'tires/tires_sport.webp',tires_racing:'tires/tires_racing_t3.webp',tires_prototype:'tires/tires_prototype_t4.webp',
 suspension_street:'suspension/suspension_street_t1.webp',suspension_sport:'suspension/suspension_sport_t2.webp',suspension_racing:'suspension/suspension_racing_t3.webp',suspension_prototype:'suspension/suspension_prototype_t4.webp',
 transmission_street:'transmission/transmission_street_t1.webp',transmission_sport:'transmission/transmission_sport_t2.webp',transmission_racing:'transmission/transmission_racing_t3.webp',transmission_prototype:'transmission/transmission_prototype_t4.webp'
};
const base=()=>String(import.meta.env.BASE_URL||'./');
const asset=(item)=>{
 if(!item)return'';
 if(item.kind==='material'){const f=MATERIAL_FILES[item.id];return f?`${base()}assets/crafting/materials/${f}`:'';}
 const f=PART_FILES[item.id];return f?`${base()}assets/crafting/parts/${f}`:'';
};
const carAsset=id=>`${base()}assets/cars/workshop/${id}.webp`;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;};
const button=(label,cls,onClick)=>{const b=el('button',cls,label);b.type='button';b.addEventListener('click',onClick);return b;};

function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=el('style');s.id=STYLE_ID;s.textContent=`
#${ROOT_ID}{position:absolute;inset:0;z-index:23000;display:grid;grid-template-rows:48px minmax(0,1fr);background:radial-gradient(circle at 22% 46%,#12364b55,transparent 38%),radial-gradient(circle at 78% 35%,#5c381b44,transparent 35%),#050a10;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;pointer-events:auto;-webkit-user-select:none;user-select:none}
#${ROOT_ID} *{box-sizing:border-box}
#${ROOT_ID} button{font:inherit;color:inherit;border:0;touch-action:manipulation}
#${ROOT_ID} .hdr{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:6px 12px;background:#071226f2;border-bottom:1px solid #46ddff55;box-shadow:0 3px 18px #0008}
#${ROOT_ID} .back{justify-self:start;background:#142437;border:1px solid #49637c;border-radius:8px;padding:8px 12px;font-weight:900;font-size:12px}
#${ROOT_ID} .title{font-weight:950;font-size:20px;letter-spacing:.04em}
#${ROOT_ID} .coins{justify-self:end;color:#ffd45a;font-weight:950;font-size:13px}
#${ROOT_ID} .body{min-height:0;display:grid;grid-template-columns:minmax(270px,43%) minmax(0,57%);gap:8px;padding:8px}
#${ROOT_ID} .panel{min-height:0;border:1px solid #39566e;background:#071225ed;border-radius:12px;overflow:hidden}
#${ROOT_ID} .carPanel{display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:10px}
#${ROOT_ID} .eyebrow{font-size:9px;font-weight:900;color:#91a8ba;letter-spacing:.12em}
#${ROOT_ID} .carHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.carName{font-size:16px;font-weight:950}.rarity{font-size:9px;font-weight:900;color:#ffd15c}
#${ROOT_ID} .carStage{min-height:0;display:flex;align-items:center;justify-content:center;position:relative}.carStage:before{content:"";position:absolute;width:76%;height:58%;border:1px solid #4cdbff33;border-radius:50%;background:#2dd7ff12}.carStage img{position:relative;max-width:88%;max-height:88%;object-fit:contain;filter:drop-shadow(0 7px 10px #000a)}
#${ROOT_ID} .carNav{display:grid;grid-template-columns:42px 1fr 42px;align-items:center;gap:6px}.navBtn{height:31px;border-radius:7px;background:#102236;border:1px solid #41617d;font-size:20px;font-weight:950}.carHint{text-align:center;font-size:8px;color:#859eb2;font-weight:850}
#${ROOT_ID} .craftPanel{display:grid;grid-template-rows:auto auto minmax(0,1fr);padding:9px;gap:6px}.craftTitle{display:flex;justify-content:space-between;align-items:center}.craftTitle strong{font-size:13px}.craftTitle span{font-size:7px;color:#9fb4ce;font-weight:850}
#${ROOT_ID} .selectors{display:grid;gap:5px}.row{display:grid;gap:4px}.families{grid-template-columns:repeat(5,1fr)}.tiers{grid-template-columns:repeat(4,1fr)}.sel{min-width:0;height:28px;padding:0 4px;border-radius:6px;background:#0b1830;border:1px solid #405873;color:#a9b8c9;font-size:8px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sel.on{background:#174765;border:2px solid #5ce5ff;color:#fff}.tier.street{border-color:#66c6ff}.tier.sport{border-color:#4ee1a0}.tier.racing{border-color:#bf7cff}.tier.prototype{border-color:#ffc64d}.tier.on{background:#17223c}
#${ROOT_ID} .recipe{min-height:0;display:grid;grid-template-columns:24% minmax(0,1fr);gap:8px;border:1px solid #50708c;background:#081424;border-radius:10px;padding:6px}.partCol{min-height:0;display:grid;grid-template-rows:minmax(0,1fr) 28px;gap:5px}.partImg{min-height:0;display:flex;align-items:center;justify-content:center;background:#0d1928;border-radius:8px;overflow:hidden}.partImg img{max-width:100%;max-height:100%;object-fit:contain}.craftBtn{border-radius:6px;background:#273247;border:2px solid #526077;font-size:8px;font-weight:950}.craftBtn.ready{background:#17683f;border-color:#55f29b}.requirements{min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);gap:5px}.partName{font-size:12px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.reqGrid{min-height:0;display:grid;grid-auto-flow:column;grid-auto-columns:minmax(54px,1fr);gap:4px}.req{position:relative;min-width:0;border-radius:7px;background:#101722;border:1px solid var(--tone,#ff5965);overflow:hidden;text-align:center;display:grid;grid-template-rows:1fr auto auto auto;padding:4px 3px}.req:before{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--fill,0%);background:color-mix(in srgb,var(--tone) 24%,transparent);pointer-events:none}.req>*{position:relative}.reqName{align-self:center;font-size:7px;font-weight:950;overflow:hidden;text-overflow:ellipsis}.reqPct{font-size:10px;font-weight:950;color:var(--tone)}.reqQty{font-size:8px;font-weight:950}.reqState{font-size:7px;font-weight:950;color:#ffd4d7}.req.ok .reqState{color:#7dffb6}.req.recycle{cursor:pointer}
@media(max-height:360px){#${ROOT_ID}{grid-template-rows:42px minmax(0,1fr)}#${ROOT_ID} .hdr{padding:4px 10px}#${ROOT_ID} .title{font-size:17px}#${ROOT_ID} .body{padding:5px;gap:5px}#${ROOT_ID} .carPanel,#${ROOT_ID} .craftPanel{padding:6px}#${ROOT_ID} .sel{height:24px;font-size:7px}#${ROOT_ID} .recipe{padding:4px;gap:5px}#${ROOT_ID} .partCol{grid-template-rows:minmax(0,1fr) 24px}.carNav{grid-template-columns:36px 1fr 36px}}
`;
 document.head.appendChild(s);
}
function progressTone(p){if(p>=1)return'#42e58b';if(p>=.5)return'#ffbf3f';return'#ff5965';}
function allowedCars(scene){try{return scene._allowedWorkshopCars?.()||[];}catch{return[];}}

export function closeWorkshopMobileDom(scene){
 const root=document.getElementById(ROOT_ID);root?.remove();if(scene)scene.__workshopDomRoot=null;
}

export function renderWorkshopMobileDom(scene){
 if(typeof document==='undefined'||!scene)return false;
 ensureStyle();closeWorkshopMobileDom(scene);
 const host=scene.game?.canvas?.parentElement||document.getElementById('app')||document.body;
 if(getComputedStyle(host).position==='static')host.style.position='relative';
 const root=el('div');root.id=ROOT_ID;scene.__workshopDomRoot=root;host.appendChild(root);
 const hdr=el('div','hdr');
 hdr.append(button('← GARAJE','back',()=>{if(!scene.busy)scene.scene.start('menu');}),el('div','title','FABRICACIÓN'),el('div','coins',`● ${Number(scene.state?.coins||0).toLocaleString('es-ES')}`));root.append(hdr);
 const body=el('div','body');root.append(body);
 const left=el('section','panel carPanel');body.append(left);
 const head=el('div');head.append(el('div','eyebrow','COCHE ACTUAL'));const carHead=el('div','carHead');const spec=CAR_SPECS[scene.car]||{};carHead.append(el('div','carName',String(spec.name||scene.car||'').toUpperCase()),el('div','rarity',String(spec.rarity||'').toUpperCase()));head.append(carHead);left.append(head);
 const stage=el('div','carStage');const img=el('img');img.src=carAsset(scene.car);img.alt='';stage.append(img);left.append(stage);
 const nav=el('div','carNav');const cars=allowedCars(scene),index=cars.indexOf(scene.car);const prev=button('‹','navBtn',()=>scene._browseWorkshopCar?.(-1));const next=button('›','navBtn',()=>scene._browseWorkshopCar?.(1));prev.disabled=index<=0;next.disabled=index<0||index>=cars.length-1;nav.append(prev,el('div','carHint',`${Math.max(1,index+1)} / ${Math.max(1,cars.length)} · desliza por tus coches desbloqueados`),next);left.append(nav);
 const right=el('section','panel craftPanel');body.append(right);const ct=el('div','craftTitle');ct.append(el('strong',null,'FABRICACIÓN DIRECTA'),el('span',null,'ELIGE · REVISA · FABRICA'));right.append(ct);
 const selectors=el('div','selectors');const famRow=el('div','row families');FAMILIES.forEach(f=>famRow.append(button(FAMILY_LABEL[f],`sel ${scene.craftFamily===f?'on':''}`,()=>{if(scene.busy)return;scene.craftFamily=f;scene.craftTier='street';scene.render();})));selectors.append(famRow);
 const tierRow=el('div','row tiers');TIERS.forEach(t=>{const id=`${scene.craftFamily}_${t}`,owned=qty(scene.state,id);tierRow.append(button(`${TIER_LABEL[t]}${owned?` ×${owned}`:''}`,`sel tier ${t} ${scene.craftTier===t?'on':''}`,()=>{if(scene.busy)return;scene.craftTier=t;scene.render();}));});selectors.append(tierRow);right.append(selectors);
 const out=`${scene.craftFamily}_${scene.craftTier}`,item=GARAGE_ITEMS[out],recipe=DIRECT_CRAFT_RECIPES[out];const card=el('div','recipe');right.append(card);
 const partCol=el('div','partCol');const art=el('div','partImg');if(item){const pi=el('img');pi.src=asset(item);pi.alt='';art.append(pi);}partCol.append(art);card.append(partCol);
 let can=!!recipe;const reqs=(recipe?.requires||[]).map(req=>{const have=qty(scene.state,req.id),need=Math.max(1,Number(req.qty)||1),ok=have>=need;if(!ok)can=false;return{req,have,need,ok,p:Math.max(0,Math.min(1,have/need)),item:GARAGE_ITEMS[req.id]};});
 const craft=button(can?'FABRICAR':`FALTAN ${reqs.filter(x=>!x.ok).length} MATERIALES`,`craftBtn ${can?'ready':''}`,()=>{if(can&&!scene.busy)scene._craftDirect?.(out,recipe);});craft.disabled=!can;partCol.append(craft);
 const info=el('div','requirements');info.append(el('div','partName',String(item?.name||out).toUpperCase()));const grid=el('div','reqGrid');info.append(grid);card.append(info);
 reqs.forEach(s=>{const tone=progressTone(s.p),r=el('div',`req ${s.ok?'ok':''} ${!s.ok&&scene._openRecyclerForMaterial?'recycle':''}`);r.style.setProperty('--tone',tone);r.style.setProperty('--fill',`${Math.round(s.p*100)}%`);r.append(el('div','reqName',String(s.item?.name||s.req.id).toUpperCase()),el('div','reqPct',`${Math.round((s.have/s.need)*100)}%`),el('div','reqQty',`${s.have} / ${s.need}`),el('div','reqState',s.ok?'LISTO':`FALTAN ${Math.max(0,s.need-s.have)}`));if(!s.ok&&scene._openRecyclerForMaterial)r.addEventListener('click',()=>scene._openRecyclerForMaterial(s.req.id));grid.append(r);});
 return true;
}
