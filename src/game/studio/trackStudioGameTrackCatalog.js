// Track Studio DEV: authoring catalog metadata and per-circuit LOCAL drafts.
// No writes to official tracks, historical records or LIVE 4 runtime.
const PREFIX='tdr2:trackstudio:ai-catalog:v1:';
const FORMULA=new Set(['chicane-vale','baku','imola','jeddah','melbourne',
  'miami','monte-carlo','sakhir','shanghai']);
const TEST=/test|prueba|sandbox|narrow|dev|prototype|laboratorio/i;
const CRAFT=/karting|canarias|tenerife|americas|américa|atl[aá]ntico|santa-cruz|siete-picos|arafo|loros/i;
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function catalogGroup(track){
 const id=String(track.key||track.id||'').toLowerCase();
 const name=String(track.name||'');
 if(TEST.test(id)||TEST.test(name))return 'Pruebas';
 if(FORMULA.has(id))return 'FormulaRace';
 if(CRAFT.test(id)||CRAFT.test(name))return 'CraftRace';
 return 'Otros';
}
export function circuitSignature(track){
 const points=track.centerline||[];
 const sample=i=>{const p=points[i]||{};return [Number(p.x||0).toFixed(1),Number(p.y||0).toFixed(1)];};
 return JSON.stringify([track.key||track.id,Number(track.worldW)||0,Number(track.worldH)||0,
  Number(track.trackWidth)||0,points.length,sample(0),sample(Math.floor(points.length/2)),
  sample(Math.max(0,points.length-1)),track.raceDirection||'forward']);
}
export function buildAiTrackCatalog(keys,createTrack){
 const entries=keys.map(key=>{
  const track=createTrack(key);
  const hidden=track.meta?.hiddenFromTrackSelect===true;
  const inverse=Boolean(track.meta?.reverseOf);
  const direction=track.meta?.variant==='clockwise'?'Horario':
   inverse?'Inverso':key==='karting-tenerife'?'Antihorario':'Normal';
  const sourceGuides=Boolean(track.aiBezierLine?.nodes?.length||
   track.meta?.aiBezierLine?.nodes?.length||track.aiLineGuides?.points?.length||
   track.meta?.aiLineGuides?.points?.length);
  return {id:key,name:String(track.name||key),group:catalogGroup(track),
   hidden,inverse,direction,sourceGuides,track,signature:circuitSignature(track)};
 });
 const counts=new Map();
 for(const e of entries){const k=normalize(e.name);counts.set(k,(counts.get(k)||0)+1);}
 for(const e of entries){
  const duplicate=counts.get(normalize(e.name))>1;
  const detail=e.id.includes('4096')?'4096 / reconstruido':
   e.id==='karting-canarias-inverso'?'original':
   e.id==='karting-tenerife-horario'?'horario':
   e.id==='karting-tenerife'?'antihorario':e.id;
  e.displayName=duplicate?e.name+' · '+detail:e.name;
 }
 return entries;
}
export function filterAiTrackCatalog(entries,{query='',group='Todos',showHidden=false}={}){
 const q=normalize(query).trim();
 return entries.filter(e=>(showHidden||!e.hidden)&&
  (group==='Todos'||e.group===group)&&
  (!q||normalize(e.displayName+' '+e.id+' '+e.group+' '+e.direction).includes(q)))
 .sort((a,b)=>{
   const g=['CraftRace','FormulaRace','Pruebas','Otros'];
   return g.indexOf(a.group)-g.indexOf(b.group)||
    a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id);
 });
}
export function readAiTrackDraft(storage,id){
 try{
  const data=JSON.parse(storage?.getItem(PREFIX+id)||'null');
  if(!data||data.version!==1||data.id!==id)return null;
  if(data.bezier!==null&&!Array.isArray(data.bezier?.nodes))return null;
  if(!Array.isArray(data.guides?.points))return null;
  return data;
 }catch{return null;}
}
export function aiTrackStatus(storage,entry){
 const draft=readAiTrackDraft(storage,entry.id);
 if(draft?.signature!==undefined&&draft.signature!==entry.signature)return 'incompatible';
 if(draft)return draft.status==='validated'?'validated':'editing';
 return entry.sourceGuides?'source':'pending';
}
export function saveAiTrackDraft(storage,id,signature,guides,bezier,{validated=false}={}){
 const previous=readAiTrackDraft(storage,id);
 if(previous&&previous.signature!==signature)
  throw Error('Hay una versión local para otra geometría. Exporta una copia antes de sustituirla.');
 const data={guides:{version:1,points:Array.isArray(guides)?guides:[]},
  bezier:bezier||null};
 const payload=JSON.stringify(data);
 const unchanged=previous?.payload===payload;
 const status=validated?'validated':unchanged&&previous?.status==='validated'?
  'validated':'editing';
 const record={version:1,id,signature,...data,payload,status,
  updatedAt:new Date().toISOString()};
 storage.setItem(PREFIX+id,JSON.stringify(record));
 return record;
}
export function installAiTrackCatalogPersistence(scene){
 const save=()=>{
  if(!scene._catalogTrackId||scene._catalogHydrating||!scene._catalogSourceSignature)return;
  // Store only AI annotation data. Neither road nodes nor reference images
  // are overwritten by changing the selected catalog circuit.
  try{
   saveAiTrackDraft(localStorage,scene._catalogTrackId,scene._catalogSourceSignature,
    scene._aiLineGuides,scene._aiBezierLine);
  }catch(error){
   console.warn('[TrackStudio] No se guardó la guía IA del catálogo',error);
   scene._flashMessage?.('No se guardó la guía IA local: '+String(error.message||error));
  }
 };
 const oldAutosave=scene._autosaveRecovery.bind(scene);
 scene._autosaveRecovery=(...args)=>{const result=oldAutosave(...args);save();return result;};
 const oldValidate=scene._aiBezierValidate?.bind(scene);
 if(oldValidate)scene._aiBezierValidate=(...args)=>{
  const report=oldValidate(...args);
  if(scene._catalogTrackId&&scene._catalogSourceSignature&&report){
   try{
    saveAiTrackDraft(localStorage,scene._catalogTrackId,scene._catalogSourceSignature,
     scene._aiLineGuides,scene._aiBezierLine,{validated:report.active===true});
   }catch(error){scene._flashMessage?.('Validada pero sin guardar: '+String(error.message||error));}
  }
  return report;
 };
 const oldSave=scene._saveProject.bind(scene);
 scene._saveProject=(...args)=>{const result=oldSave(...args);save();return result;};
}
