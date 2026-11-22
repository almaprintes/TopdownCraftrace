// Accessible native-DOM catalog for iPhone landscape, Android and desktop.
// The original road lives in the registry; this UI only copies it to the editor.
import {buildAiTrackCatalog,filterAiTrackCatalog,readAiTrackDraft,
 aiTrackStatus} from './trackStudioGameTrackCatalog.js';

const css=(el,style)=>{el.style.cssText=style;return el;};
const element=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const button=(text,fn,style)=>{
 const b=css(element('button',text),
  'cursor:pointer;touch-action:manipulation;border-radius:9px;border:1px solid #327b91;background:#173548;color:#e8faff;min-height:38px;padding:7px 12px;font:700 12px system-ui;'+(style||''));
 b.type='button';b.addEventListener('click',fn);return b;
};
const paint=(canvas,track)=>{
 const ctx=canvas.getContext?.('2d');if(!ctx)return;
 const src=track.raceCenterline||track.centerline||[];
 const points=src.filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y));
 if(points.length<2)return;
 const width=canvas.width,height=canvas.height;
 ctx.fillStyle='#091623';ctx.fillRect(0,0,width,height);
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);
  maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}
 const scale=Math.min((width-22)/Math.max(1,maxX-minX),(height-14)/Math.max(1,maxY-minY));
 const ox=(width-(maxX-minX)*scale)/2,oy=(height-(maxY-minY)*scale)/2;
 const step=Math.max(1,Math.ceil(points.length/700));
 ctx.strokeStyle='#5ca8bd';ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.lineCap='round';
 ctx.beginPath();
 for(let i=0;i<points.length;i+=step){
  const p=points[i],x=ox+(p.x-minX)*scale,y=oy+(p.y-minY)*scale;
  if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
 }
 const end=points[points.length-1];ctx.lineTo(ox+(end.x-minX)*scale,oy+(end.y-minY)*scale);
 if(track.closed)ctx.closePath();ctx.stroke();
 const start=track.start||points[0];
 if(Number.isFinite(start?.x)&&Number.isFinite(start?.y)){
  ctx.beginPath();ctx.arc(ox+(start.x-minX)*scale,oy+(start.y-minY)*scale,3,0,Math.PI*2);
  ctx.fillStyle='#6bedd1';ctx.fill();
 }
};
const STATES={
 pending:['SIN TRAZADA','#a2bac8'],
 editing:['EN EDICIÓN','#f3c97f'],
 validated:['VALIDADA LOCAL','#70dfba'],
 incompatible:['GEOMETRÍA CAMBIADA','#ff9e97'],
 source:['GUÍAS DE ORIGEN','#9dc8f6']
};
export function openTrackStudioGameTrackCatalog(scene,keys,readTrack,cloneTrack=readTrack){
 if(typeof document==='undefined')return;
 scene?._closeGameTrackCatalog?.();
 const entries=buildAiTrackCatalog(keys,readTrack);
 const previous=document.activeElement;
 let filter='Todos',search='',showHidden=false;
 const root=css(element('div'),
  'position:fixed;inset:0;z-index:2147483601;display:grid;place-items:center;padding:9px;box-sizing:border-box;background:rgba(2,8,18,.93);font:12px system-ui,-apple-system,sans-serif;color:#effaff;');
 root.id='tdr-studio-game-track-catalog';
 const panel=css(element('section'),
  'width:min(980px,98vw);max-height:94dvh;display:flex;flex-direction:column;min-height:0;background:#0b1b2a;border:1px solid #398aa1;border-radius:15px;box-shadow:0 12px 50px #0009;overflow:hidden;');
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','Catálogo de circuitos para trazadas IA');
 const heading=css(element('header'),
  'padding:12px 14px 7px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;');
 const title=element('strong','CIRCUITOS · TRAZADAS IA');
 title.style.cssText='font:800 clamp(15px,2.5vw,20px) system-ui;letter-spacing:.03em;color:#a4f0ff';
 const close=()=>{
  document.removeEventListener('keydown',onKey);
  root.remove();scene?.events?.off?.('shutdown',close);
  scene?.events?.off?.('destroy',close);
  if(scene?._closeGameTrackCatalog===close)scene._closeGameTrackCatalog=null;
  previous?.focus?.();
 };
 const exit=button('CERRAR',close,'background:#273b4b');
 heading.append(title,exit);
 const toolbar=css(element('div'),
  'padding:4px 14px 9px;display:flex;gap:7px;align-items:center;flex-wrap:wrap;');
 const input=css(element('input'),
  'flex:1 1 150px;min-width:115px;max-width:360px;min-height:37px;box-sizing:border-box;background:#0a2a3a;color:white;border:1px solid #3e8fa0;border-radius:8px;padding:8px;font:13px system-ui;');
 input.type='search';input.placeholder='Buscar circuito o ID';input.setAttribute('aria-label','Buscar circuito');
 input.addEventListener('input',()=>{search=input.value;render();});
 toolbar.append(input);
 const tabs=css(element('div'),
  'display:flex;gap:5px;align-items:center;flex-wrap:wrap;');
 for(const name of ['Todos','CraftRace','FormulaRace','Pruebas','Otros']){
  const tab=button(name,()=>{filter=name;render();},'font-size:11px;min-height:34px;padding:5px 8px;');
  tab.dataset.group=name;tabs.append(tab);
 }
 toolbar.append(tabs);
 const secondary=css(element('div'),
  'padding:0 14px 9px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;color:#b7d4df;');
 const technicalLabel=css(element('label'),'display:flex;gap:6px;align-items:center;cursor:pointer;');
 const technical=element('input');technical.type='checkbox';technical.checked=false;
 technical.addEventListener('change',()=>{showHidden=technical.checked;render();});
 technicalLabel.append(technical,element('span','Mostrar variantes técnicas / ocultas'));
 const summary=element('span');
 secondary.append(technicalLabel,summary);
 const grid=css(element('div'),
  'overflow:auto;overscroll-behavior:contain;min-height:0;flex:1;padding:9px 14px 13px;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:9px;align-content:start;');
 grid.setAttribute('role','list');
 const footer=css(element('footer','Las validaciones locales no publican la IA. Exporta el proyecto para integrar y probar su trazada en DEV.'),
  'padding:9px 14px;color:#9dbac7;background:#091624;border-top:1px solid #24475b;font:11px/1.4 system-ui;');
 function load(entry){
  if(entry.id!==scene._catalogTrackId&&scene._nodes?.length>2&&
   !window.confirm('¿Abrir '+entry.displayName+'?\n\nLa edición actual se guardará en este dispositivo. Exporta el proyecto si necesitas una copia externa.'))return;
  const prior=scene._catalogTrackId;
  if(prior&&prior!==entry.id)scene._autosaveRecovery?.();
  const draft=readAiTrackDraft(localStorage,entry.id);
  if(draft&&draft.signature!==entry.signature){
   scene._flashMessage?.('La guía guardada no coincide con la geometría actual. Exporta la copia anterior antes de continuar.');
   return;
  }
  const selected=cloneTrack(entry.id);
  const track={...selected,
   aiLineGuides:draft?draft.guides:selected.aiLineGuides||selected.meta?.aiLineGuides,
   aiBezierLine:draft?draft.bezier:selected.aiBezierLine||selected.meta?.aiBezierLine};
  try{
   scene._pushHistory?.();
   scene._catalogHydrating=true;
   scene._importProjectOrTrack(track);
   scene._catalogTrackId=entry.id;
   scene._catalogSourceSignature=entry.signature;
   scene._catalogRaceDirection=selected.raceDirection||'forward';
   scene._autosaveRecovery?.();
   scene._frameTrackView?.();
   scene._flashMessage?.('Circuito '+entry.displayName+' · guías IA separadas · '+entry.id);
   close();
  }catch(error){
   console.error('[TrackStudio] No se pudo abrir el circuito',entry.id,error);
   scene._flashMessage?.('Error cargando circuito: '+String(error.message||error));
  }finally{scene._catalogHydrating=false;}
 }
 function render(){
  for(const b of tabs.children)b.style.background=b.dataset.group===filter?'#146b81':'#173548';
  const filtered=filterAiTrackCatalog(entries,{query:search,group:filter,showHidden});
  grid.replaceChildren();
  summary.textContent=filtered.length+' de '+entries.length+' registros · '+
   entries.filter(e=>aiTrackStatus(localStorage,e)==='validated').length+' validados aquí';
  for(const entry of filtered){
   const status=aiTrackStatus(localStorage,entry),[caption,color]=STATES[status];
   const card=button('',()=>load(entry),
    'display:flex;flex-direction:column;gap:5px;align-items:stretch;text-align:left;min-height:147px;padding:10px;background:#123044;border-color:'+
    (scene._catalogTrackId===entry.id?'#79edcc':'#315b70')+';');
   card.dataset.trackId=entry.id;
   card.setAttribute('role','listitem');
   card.setAttribute('aria-label',entry.displayName+' · '+entry.direction+' · '+caption);
   const head=css(element('div'),
    'display:flex;gap:8px;align-items:center;justify-content:space-between;');
   const name=css(element('strong',entry.displayName),
    'font:800 12px/1.3 system-ui;color:#fff;min-width:0;overflow-wrap:anywhere;');
   const badge=css(element('span',entry.direction),
    'flex-shrink:0;border-radius:5px;background:#1c5265;padding:4px 6px;font-size:10px;color:#c8f0ff;');
   head.append(name,badge);
   const img=element('canvas');img.width=240;img.height=66;
   img.style.cssText='display:block;width:100%;height:52px;border-radius:5px;background:#091623;';
   const bottom=css(element('div'),
    'display:flex;gap:8px;align-items:center;justify-content:space-between;');
   const state=css(element('span',caption),'font:800 10px system-ui;color:'+color);
   const group=css(element('span',entry.group),'font:10px system-ui;color:#a6c8d7');
   bottom.append(state,group);
   const id=css(element('small',entry.id),
    'font:10px system-ui;color:#8fafc0;overflow-wrap:anywhere;');
   card.append(head,img,bottom,id);grid.append(card);paint(img,entry.track);
  }
  if(!filtered.length)grid.append(element('p','No hay circuitos con estos filtros.'));
 }
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
 root.addEventListener('pointerdown',e=>{if(e.target===root)close();});
 panel.append(heading,toolbar,secondary,grid,footer);root.append(panel);document.body.append(root);
 scene._closeGameTrackCatalog=close;
 document.addEventListener('keydown',onKey);
 scene?.events?.once?.('shutdown',close);
 scene?.events?.once?.('destroy',close);
 render();input.focus?.();
}
