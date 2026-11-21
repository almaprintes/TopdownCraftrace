// RACE CONTROL / DEV sports archive. No fake live rankings or server writes.
// Public race results still belong to the existing records scene.
import {TRACK_REGISTRY} from '../tracks/trackRegistry.js';
import {AI_ELO_PILOTS} from '../ai/craftraceAiEloLeague.js';
import {seedAiWeekendChampionship} from '../ai/craftraceAiWeekendChampionship.js';
import './raceControlDirectory.css';

const create=(tag,cls,text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const append=(parent,...children)=>{parent.append(...children);return parent;};
const officialTracks=()=>Object.values(TRACK_REGISTRY).filter(track=>
 !track?.meta?.hiddenFromTrackSelect&&track?.id&&track?.name
).sort((a,b)=>a.name.localeCompare(b.name,'es'));
const pilots=AI_ELO_PILOTS.slice().sort((a,b)=>b.elo-a.elo||a.id.localeCompare(b.id));
const strings={
 es:{
  pilots:'PILOTOS IA',circuits:'CIRCUITOS',events:'EVENTOS',back:'VOLVER A RACE CONTROL',
  pilotsLead:'16 pilotos permanentes. Sus coches se igualan al del jugador; en campeonatos oficiales todos usan el vehículo y desarrollo fijados para el evento.',
  provisional:'PLANTILLA DEV · ELO PROVISIONAL · SIN CARRERAS OFICIALES HOMOLOGADAS',
  position:'POS.',driver:'PILOTO',rating:'ELO',style:'ESTILO',noHistory:'Aún no hay resultados oficiales. Los historiales aparecerán cuando RACE Control publique y homologue campeonatos.',
  circuitsLead:'Circuitos registrados del juego. Los récords y las clasificaciones se consultan en el sistema actual, sin duplicar el garaje.',
  viewRecords:'VER RÉCORDS',none:'Sin circuitos disponibles.',
  eventsLead:'Campeonatos de fin de semana: 16 pilotos, cuatro clasificatorias, dos semifinales y una gran final.',
  noEvents:'Todavía no hay campeonatos oficiales publicados.',
  demo:'EJEMPLO DE CUADRO · NO ES UN EVENTO PUBLICADO',qualifying:'CLASIFICATORIAS · SÁBADO',
  semis:'SEMIFINALES · DOMINGO',final:'GRAN FINAL · DOMINGO',
  advances:'Pasan los dos primeros',pending:'Pendiente de resultados oficiales',
  season:'Las fichas, resultados y crónicas serán visibles cuando se homologuen y publiquen desde la dirección de carrera.',
  circuitType:'CIRCUITO',stage:'TRAMO', level:'DIFICULTAD'
 },
 en:{
  pilots:'AI DRIVERS',circuits:'TRACKS',events:'EVENTS',back:'BACK TO RACE CONTROL',
  pilotsLead:'16 permanent drivers. They use the player’s same car setup, or the common car chosen for official events.',
  provisional:'DEV ROSTER · PROVISIONAL ELO · NO HOMOLOGATED OFFICIAL RACES',
  position:'POS.',driver:'DRIVER',rating:'ELO',style:'STYLE',noHistory:'No homologated official race results yet. Histories will appear once events are published.',
  circuitsLead:'Registered tracks. View existing records without duplicating the garage.',
  viewRecords:'VIEW RECORDS',none:'No tracks available.',
  eventsLead:'Weekend championships: 16 AI drivers, four qualifiers, two semifinals and a grand final.',
  noEvents:'No official championships have been published yet.',
  demo:'BRACKET EXAMPLE · NOT A PUBLISHED EVENT',qualifying:'QUALIFYING · SATURDAY',
  semis:'SEMIFINALS · SUNDAY',final:'GRAND FINAL · SUNDAY',
  advances:'Top two advance',pending:'Awaiting official results',
  season:'Stories and results will appear once approved and published.',
  circuitType:'CIRCUIT',stage:'STAGE',level:'DIFFICULTY'
 }
};

function pilotList(host,l){
 const lead=create('p','rc2-dir-lead',l.pilotsLead);
 const warning=create('div','rc2-dir-notice',l.provisional);
 const grid=create('div','rc2-dir-pilot-layout');
 const list=create('div','rc2-dir-pilot-list');
 const detail=create('div','rc2-dir-pilot-detail');
 const rows=[];
 const renderDetail=p=>{
  detail.replaceChildren();
  append(detail,create('span','rc2-dir-eyebrow',l.driver),
   create('h2','',p.name),
   create('div','rc2-dir-rating',String(p.elo)+' Elo'),
   create('p','',l.style+': '+p.style),
   create('p','rc2-dir-muted',l.noHistory));
  for(const row of rows)row.setAttribute('aria-pressed',String(row.dataset.pilot===p.id));
 };
 pilots.forEach((p,i)=>{
  const row=create('button','rc2-dir-pilot-row');
  row.type='button';row.dataset.pilot=p.id;
  append(row,create('span','',String(i+1)+'.'),
   create('strong','',p.name),create('span','',String(p.elo)));
  row.addEventListener('click',()=>renderDetail(p));
  rows.push(row);list.append(row);
 });
 append(grid,list,detail);
 append(host,lead,warning,grid);
 renderDetail(pilots[0]);
}

function circuitList(host,l,onTrack){
 append(host,create('p','rc2-dir-lead',l.circuitsLead));
 const grid=create('div','rc2-dir-track-grid');
 const tracks=officialTracks();
 if(!tracks.length)grid.append(create('p','rc2-dir-muted',l.none));
 for(const t of tracks){
  const card=create('article','rc2-dir-track-card');
  const label=create('div','rc2-dir-track-name',t.name);
  const details=create('p','rc2-dir-track-meta',
   (t.raceType==='stage'?l.stage:l.circuitType)+' · '+l.level+': '+String(t.difficulty||'—'));
  const btn=create('button','rc2-dir-cta',l.viewRecords);
  btn.type='button';btn.dataset.trackId=t.id;
  btn.addEventListener('click',()=>onTrack?.(t.id));
  append(card,label,details,btn);grid.append(card);
 }
 host.append(grid);
}

function eventList(host,l){
 append(host,create('p','rc2-dir-lead',l.eventsLead),
  create('div','rc2-dir-notice',l.noEvents),
  create('p','rc2-dir-muted',l.season));
 const header=create('h2','rc2-dir-section',l.demo);
 host.append(header);
 const bracket=seedAiWeekendChampionship(pilots,'preview-weekend-format');
 const seedName=id=>pilots.find(p=>p.id===id)?.name||id;
 const grid=create('div','rc2-dir-bracket');
 const quals=create('section','rc2-dir-bracket-stage');
 quals.append(create('h3','',l.qualifying));
 bracket.races.slice(0,4).forEach((race,i)=>{
  const box=create('article','rc2-dir-bracket-race');
  append(box,create('strong','',String.fromCharCode(65+i)+' · 4 IA'));
  race.pilots.forEach(id=>box.append(create('span','',seedName(id))));
  box.append(create('small','',l.advances));quals.append(box);
 });
 const semis=create('section','rc2-dir-bracket-stage');
 semis.append(create('h3','',l.semis));
 ['SEMIFINAL 1','SEMIFINAL 2'].forEach((title,i)=>{
  const box=create('article','rc2-dir-bracket-race');
  append(box,create('strong','',title),
   create('span','',i===0?'A1 · B2 · C1 · D2':'B1 · A2 · D1 · C2'),
   create('small','',l.advances));
  semis.append(box);
 });
 const end=create('section','rc2-dir-bracket-stage');
 end.append(create('h3','',l.final));
 const box=create('article','rc2-dir-bracket-race');
 append(box,create('strong','',l.final),
  create('span','',l.pending));
 end.append(box);append(grid,quals,semis,end);host.append(grid);
}

// Mount on the same statistics root; disposer never replaces existing game
// listeners or launches another scene. Escape and Back return to hub.
export function mountRaceControlDirectory(root,{type='pilots',language='es',onBack,onTrack}={}){
 if(!root)return()=>{};
 const l=strings[language==='en'?'en':'es'],title=l[type]||l.pilots;
 root.replaceChildren();
 const wrap=create('div','rc2-directory');
 wrap.setAttribute('role','region');wrap.setAttribute('aria-label',title);
 const head=create('header','rc2-dir-header');
 const headline=create('div');
 append(headline,create('span','rc2-dir-eyebrow','RACE CONTROL · CRAFTRACE'),
  create('h1','',title));
 const back=create('button','rc2-dir-back','‹ '+l.back);
 back.type='button';back.addEventListener('click',()=>onBack?.());
 append(head,headline,back);
 const main=create('main','rc2-dir-body');main.setAttribute('tabindex','-1');
 if(type==='pilots')pilotList(main,l);
 else if(type==='circuits')circuitList(main,l,onTrack);
 else if(type==='events')eventList(main,l);
 wrap.append(head,main);root.append(wrap);
 const onKey=e=>{if(e.key==='Escape'){e.preventDefault();onBack?.();}};
 root.addEventListener('keydown',onKey);
 return()=>{root.removeEventListener('keydown',onKey);};
}
