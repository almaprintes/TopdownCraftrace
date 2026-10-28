import './adminPaddock.css';

// UI-only Paddock. Action callbacks keep all existing Admin Hub behaviors intact.
// Photo paths are established local selector/card assets, never external downloads.
const BASE=import.meta.env.BASE_URL||'/';
const svg=(inner)=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>';
const ICONS=Object.freeze({
  track:svg('<path d="M5 7c-3 2-2 6 1 6h4c3 0 4 4 1 5s-5-1-5-3"/><path d="M15 6c-1-4 5-5 6-1 1 3-1 5-4 5s-3 3-3 5"/><circle cx="5" cy="6" r="2"/><circle cx="14" cy="18" r="2"/>'),
  environment:svg('<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>'),
  car:svg('<path d="m5 11 1.6-5a2 2 0 0 1 1.9-1.5h7a2 2 0 0 1 1.9 1.5L19 11"/><path d="M4 11h16v7H4z"/><path d="M4 14H2M20 14h2M6 18v2m12-2v2M4 14h4m8 0h4"/>'),
  image:svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>'),
  diagnostic:svg('<path d="M2 12h4l3-8 5 16 3-8h5"/>'),
  qa:svg('<path d="M9 3h6M10 3v7L5 19a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7 16h10"/>'),
  legacy:svg('<path d="M14.8 6.2a5 5 0 0 0-6.6 6.6L3 17.4a2 2 0 0 0 2.8 2.8l5.2-5.2a5 5 0 0 0 6.8-6.5l-3.3 3.3-3-3z"/>'),
  exit:svg('<path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M15 5l5 7-5 7M20 12H9"/>')
});
const make=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node;};
const BANNER_IMAGES=Object.freeze({
  track:'assets/tracks/selector/karting-tenerife.webp',
  environment:'assets/tracks/selector/rally-arafo-los-loros.webp',
  car:'assets/cars/runtime/card_crown_cuper_raro_018.svg',
  image:'assets/tracks/selector/siete-picos.webp'
});

export function mountAdminPaddock(host,handlers){
  if(!host)throw Error('Falta el contenedor para PADDOCK');
  const root=make('section','tdr-paddock');
  root.setAttribute('aria-label','TDR Paddock, centro de desarrollo');
  const shell=make('div','tdr-paddock__shell');
  root.appendChild(shell);

  const header=make('header','tdr-paddock__header');
  const brand=make('div','tdr-paddock__brand');
  const logo=make('div','tdr-paddock__logo');
  logo.innerHTML='TD<em>R</em>';
  const mark=make('div','tdr-paddock__mark');
  mark.append(make('div','tdr-paddock__eyebrow','ADMIN HUB'));
  const heading=make('h1','tdr-paddock__heading','PADDOCK');
  mark.appendChild(heading);
  mark.append(make('div','tdr-paddock__subtitle','CENTRO DE DESARROLLO · HERRAMIENTAS INTERNAS'));
  brand.append(logo,mark);
  const headActions=make('div','tdr-paddock__head-actions');
  const liveVersion=document.querySelector('meta[name="tdr-dev-version"]')?.content||'DEV';
  headActions.append(make('div','tdr-paddock__dev',liveVersion));
  const exit=make('button','tdr-paddock__exit');
  exit.type='button';exit.innerHTML=ICONS.exit+'<span>SALIR</span>';
  exit.addEventListener('click',handlers.exit);
  headActions.appendChild(exit);
  header.append(brand,headActions);shell.appendChild(header);

  const main=make('main','tdr-paddock__pane');
  main.append(make('div','tdr-paddock__section-caption','HERRAMIENTAS DE TRABAJO'));
  const primary=make('div','tdr-paddock__primary');
  const entries=[
    {id:'track',number:'01',title:'TRACK STUDIO',desc:'Diseña y refina circuitos',points:['Trazados y nodos','Anchuras y curvas','Salida, meta y exportación'],color:'#2bff88',run:handlers.track},
    {id:'environment',number:'02',title:'ENVIRONMENT BUILDER',desc:'Escenarios, decoración y colisiones',points:['Decoración y objetos','Colisiones y copas','Oclusiones fotográficas'],color:'#30cafe',run:handlers.environment},
    {id:'car',number:'03',title:'VEHICLE LAB',desc:'Coches, físicas y configuraciones',points:['Modelos y fichas','Parámetros de físicas','Calibraciones de vehículos'],color:'#f3cf75',run:handlers.cars},
    {id:'image',number:'04',title:'IMAGE LAB',desc:'Conversión, ampliación y análisis',points:['JPG, PNG y WebP','Ampliación con remuestreo','Comparador antes / después'],color:'#c38aff',run:handlers.images}
  ];
  for(const entry of entries){
    const b=make('button','tdr-paddock__tile');
    b.type='button';b.dataset.kind=entry.id;b.style.setProperty('--accent',entry.color);
    b.setAttribute('aria-label',entry.title+'. '+entry.desc);
    const img=make('img','tdr-paddock__photo');
    img.alt='';img.loading='lazy';img.decoding='async';img.src=BASE+BANNER_IMAGES[entry.id];
    const ico=make('span','tdr-paddock__tile-icon');ico.innerHTML=ICONS[entry.id];
    const body=make('div','tdr-paddock__tile-content');
    body.append(make('strong','tdr-paddock__tile-name',entry.title));
    body.append(make('span','tdr-paddock__tile-desc',entry.desc));
    const bullets=make('ul','tdr-paddock__tile-points');
    for(const point of entry.points)bullets.append(make('li','',point));
    body.appendChild(bullets);
    const arrow=make('span','tdr-paddock__tile-chevron','›');
    b.append(img,ico,body,make('span','tdr-paddock__tile-number',entry.number),arrow);
    b.addEventListener('click',entry.run);
    primary.appendChild(b);
  }
  main.appendChild(primary);

  main.append(make('div','tdr-paddock__section-caption','SOPORTE Y UTILIDADES'));
  const secondary=make('div','tdr-paddock__secondary');
  const qaPane=make('section','tdr-paddock__pane');qaPane.hidden=true;
  const legacyPane=make('section','tdr-paddock__pane');legacyPane.hidden=true;
  const openPane=(pane)=>{
    main.hidden=true;qaPane.hidden=pane!==qaPane;legacyPane.hidden=pane!==legacyPane;
    root.scrollTop=0;
  };
  const closePane=()=>{qaPane.hidden=true;legacyPane.hidden=true;main.hidden=false;root.scrollTop=0;};
  const auxiliary=[
    {name:'DIAGNÓSTICO',desc:'Último error y diagnóstico local',id:'diagnostic',color:'#ff5c71',run:handlers.diagnostics},
    {name:'LABORATORIO QA',desc:'Garaje, coches DEV y comprobaciones',id:'qa',color:'#42d2f7',run:()=>openPane(qaPane)},
    {name:'HERRAMIENTAS HEREDADAS',desc:'Editar pistas · editor Bézier',id:'legacy',color:'#a8bfd7',run:()=>openPane(legacyPane)}
  ];
  for(const a of auxiliary){
    const b=make('button','tdr-paddock__aux');b.type='button';b.style.setProperty('--accent',a.color);
    const icon=make('span','tdr-paddock__aux-icon');icon.innerHTML=ICONS[a.id];
    const txt=make('span','tdr-paddock__aux-text');
    txt.append(make('strong','tdr-paddock__aux-name',a.name),make('span','tdr-paddock__aux-desc',a.desc));
    b.append(icon,txt,make('span','tdr-paddock__aux-arrow','›'));
    b.addEventListener('click',a.run);
    secondary.appendChild(b);
  }
  main.appendChild(secondary);shell.appendChild(main);

  const paneHeader=(pane,title,sub)=>{
    const wrap=make('div','tdr-paddock__panehead');
    const back=make('button','tdr-paddock__back','‹');back.type='button';
    back.setAttribute('aria-label','Volver al Paddock');
    back.addEventListener('click',closePane);
    const titleWrap=make('div');
    titleWrap.append(make('div','tdr-paddock__panetitle',title),make('div','tdr-paddock__panesub',sub));
    wrap.append(back,titleWrap);pane.appendChild(wrap);
    const grid=make('div','tdr-paddock__tools');pane.appendChild(grid);
    return grid;
  };
  const addTool=(grid,{name,desc,run,tone})=>{
    const btn=make('button','tdr-paddock__tool');
    btn.type='button';if(tone)btn.dataset.tone=tone;
    btn.append(make('strong','',name),make('small','',desc));
    btn.addEventListener('click',run);
    grid.appendChild(btn);
    return btn;
  };

  const qaGrid=paneHeader(qaPane,'LABORATORIO QA','Pruebas del juego y comprobación de recursos. No son herramientas de edición.');
  addTool(qaGrid,{name:'GARAJE JUGADOR',desc:'Abrir el garaje para comprobar progresión, desbloqueos y homologaciones.',run:handlers.garage});
  const carsDev=addTool(qaGrid,{name:'',desc:'Activar o desactivar el acceso a toda la flota para pruebas.',run:()=>{handlers.toggleCars();refreshCarsDev();},tone:'cyan'});
  const carsLabel=carsDev.querySelector('strong');
  const refreshCarsDev=()=>{carsLabel.textContent='COCHES DEV · '+(handlers.isFullCars()?'ON':'OFF');};
  refreshCarsDev();
  addTool(qaGrid,{name:'KIT DE HOMOLOGACIÓN',desc:'Añade las piezas que falten al inventario actual. Requiere confirmación.',tone:'warning',run:()=>confirmAction('AÑADIR KIT DE HOMOLOGACIÓN','Esta acción modifica el inventario de tu partida actual. Añadirá una unidad de las piezas que falten. No es una simulación ni dispone de deshacer automático.',handlers.kit)});
  addTool(qaGrid,{name:'9 INSIGNIAS DE MAESTRÍA',desc:'Vista de comprobación de las nueve insignias generadas por TDR.',run:handlers.mastery});
  shell.appendChild(qaPane);

  const legacyGrid=paneHeader(legacyPane,'HERRAMIENTAS HEREDADAS','Se conservan para no perder funciones de desarrollo anteriores.');
  addTool(legacyGrid,{name:'EDITAR PISTAS · BÉZIER',desc:'Editor clásico de trazados. Por ahora se mantiene operativo y separado de Track Studio.',run:handlers.legacy});
  shell.appendChild(legacyPane);

  const footer=make('footer','tdr-paddock__footer');
  footer.append(make('span','', 'TDR PADDOCK · ESTUDIO DE DESARROLLO'),make('span','', 'Las herramientas y los cambios no se publican automáticamente.'));
  shell.appendChild(footer);
  const toast=make('div','tdr-paddock__toast');
  toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  shell.appendChild(toast);

  function confirmAction(title,detail,action){
    const overlay=make('div','tdr-paddock__confirm');
    overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',title);
    const body=make('div','tdr-paddock__confirmbox');
    body.append(make('strong','',title),make('p','',detail));
    const controls=make('div','tdr-paddock__confirm-actions');
    const cancel=make('button','','CANCELAR');cancel.type='button';
    const accept=make('button','','CONFIRMAR');accept.type='button';
    cancel.addEventListener('click',()=>overlay.remove());
    accept.addEventListener('click',()=>{overlay.remove();action();});
    controls.append(cancel,accept);body.appendChild(controls);
    overlay.appendChild(body);root.appendChild(overlay);cancel.focus();
  }
  host.appendChild(root);
  return {root,toast};
}
