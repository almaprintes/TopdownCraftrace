// ENVIRONMENT STUDIO 2.0. A presentation-only shell over the real Phaser
// EnvironmentBuilderScene. It does not change saved project schema or assets.
// The scene's original canvas receives all drawing, dragging and pan gestures.
import './environmentStudioChrome.css';

const create=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
};
const add=(parent,...nodes)=>{parent.append(...nodes);return parent;};
const on=(el,event,callback)=>{
  el.addEventListener(event,callback);
  return el;
};
const action=(label,callback,cls='env2__button')=>{
  const button=create('button',cls,label);
  button.type='button';
  on(button,'click',e=>{e.preventDefault();e.stopPropagation();callback()});
  return button;
};
const write=(el,text)=>{
  if(!el)return;
  const next=String(text);
  if(el.textContent!==next)el.textContent=next;
};

export function mountEnvironmentStudioChrome(scene,catalog,baseUrl='/'){
  if(typeof document==='undefined'||!scene?.game?.canvas)return null;
  const root=create('div','env2');
  root.setAttribute('aria-label','Environment Studio 2.0');
  root.style.cssText='position:fixed;pointer-events:none;z-index:24019;';
  const header=create('header','env2__header');
  const brand=create('div','env2__brand');
  const logo=create('div','env2__logo');
  logo.innerHTML='TD<em>R</em>';
  const titles=create('div','env2__titles');
  add(titles,create('small','','ADMIN HUB'),
    create('strong','','ENVIRONMENT STUDIO 2.0'),
    create('span','','VEGETACIÓN · OBJETOS · SUPERFICIES'));
  add(brand,logo,titles);
  const headActions=create('div','env2__head-actions');
  const saved=action('GUARDAR',()=>scene._save(),'env2__button env2__button--primary');
  const loaded=action('ABRIR',()=>scene._load());
  const exported=action('EXPORTAR JSON',()=>scene._export());
  const imported=action('CARGAR FOTO',()=>scene._pickGuide());
  const track=action('CIRCUITO',()=>scene._changeTrackId(),'env2__button env2__button--track');
  add(headActions,saved,loaded,exported,imported,track);
  const headRight=create('div','env2__head-right');
  const version=create('span','env2__version',document.querySelector('meta[name="tdr-dev-version"]')?.content||'DEV');
  const back=action('VOLVER A PADDOCK',()=>{
    if(window.confirm('¿Salir de Environment Studio? Guarda el entorno antes de salir si has realizado cambios.'))
      scene.scene.start('admin-hub');
  },'env2__exit');
  add(headRight,version,back);
  header.append(brand,headActions,headRight);

  const rail=create('nav','env2__rail');
  rail.setAttribute('aria-label','Cámara y navegación');
  add(rail,create('span','env2__rail-title','VISTA'));
  const center=action('⌂',()=>{
    scene._editCam?.centerOn(4000,2500);
    refresh();
  },'env2__rail-button');
  center.setAttribute('aria-label','Centrar escenario');center.title='Centrar escenario';
  const zoomIn=action('+',()=>{scene._zoom(1.2);refresh()},'env2__rail-button');
  zoomIn.setAttribute('aria-label','Acercar');
  const zoomOut=action('−',()=>{scene._zoom(1/1.2);refresh()},'env2__rail-button');
  zoomOut.setAttribute('aria-label','Alejar');
  const photo=action('IMG',()=>scene._pickGuide(),'env2__rail-button env2__rail-button--photo');
  photo.setAttribute('aria-label','Importar fotografía');
  const selectRail=action('SEL',()=>chooseMode('select'),'env2__rail-button');
  selectRail.setAttribute('aria-label','Seleccionar objetos');
  const panRail=action('PAN',()=>chooseMode('pan'),'env2__rail-button');
  panRail.setAttribute('aria-label','Desplazar mapa');
  add(rail,center,zoomIn,zoomOut,photo,selectRail,panRail);

  const stage=create('section','env2__stage');
  stage.setAttribute('aria-label','Lienzo de edición real');
  const stageBar=create('div','env2__stage-bar');
  const stageName=create('span','env2__stage-label','ESCENARIO');
  const modes=create('div','env2__modes');
  const modeButtons={};
  function chooseMode(mode){
    scene._mode=mode;
    scene._status();
    refresh();
  }
  for(const [mode,label] of [
    ['select','SELECCIÓN'],['pan','DESPLAZAR'],['surface','PINTAR ASFALTO']
  ]){
    const b=action(label,()=>chooseMode(mode),'env2__mode');
    b.setAttribute('aria-pressed','false');
    modeButtons[mode]=b;
    modes.append(b);
  }
  stageBar.append(stageName,modes);
  const empty=create('div','env2__empty');
  add(empty,create('span','env2__empty-symbol','✳'),
    create('strong','','ESCENARIO LISTO PARA CREAR'),
    create('small','','Importa una fotografía o selecciona un elemento del catálogo'));
  const stageFooter=create('div','env2__stage-footer');
  const modeCaption=create('strong','','SELECCIÓN');
  const stageStats=create('span','','0 ELEMENTOS · 0 ZONAS');
  const stageZoom=create('span','','ZOOM —');
  const stageMessage=create('span','env2__stage-message','Todo listo para editar');
  add(stageFooter,modeCaption,stageStats,stageZoom,stageMessage);
  add(stage,stageBar,empty,stageFooter);

  const side=create('aside','env2__side');
  const sideHead=create('div','env2__side-head');
  add(sideHead,create('strong','','BIBLIOTECA DE ENTORNO'),create('span','','CATÁLOGO REAL'));
  const metrics=create('div','env2__metrics');
  const countMetric=(label)=>{
    const card=create('div','env2__metric');
    const value=create('strong','','0');
    add(card,create('small','',label),value);
    metrics.append(card);
    return value;
  };
  const objectCount=countMetric('OBJETOS');
  const zoneCount=countMetric('SUPERFICIES');
  const selectionCount=countMetric('SELECCIÓN');

  const tabs=create('div','env2__categories');
  const categoryNames=['VEGETACIÓN','BARRERAS','PROPS','ESTRUCTURAS'];
  const categoryButtons={};
  for(const name of categoryNames){
    categoryButtons[name]=action(name,()=>{
      scene._category=name;
      scene._refreshCatalog();
      renderCatalog();refresh();
    },'env2__category');
    tabs.append(categoryButtons[name]);
  }
  const library=create('div','env2__library');
  library.setAttribute('aria-label','Elementos disponibles, desplazamiento vertical');
  const selectionHead=create('div','env2__selection-head');
  const selectionLabel=create('strong','','ELEMENTO SELECCIONADO');
  const selectedTitle=create('span','','NINGUNO');
  selectionHead.append(selectionLabel,selectedTitle);
  const selectionTools=create('div','env2__selection-tools');
  const selectedActions=[
    ['↶ 15°',()=>scene._rotate(-15)],['↷ 15°',()=>scene._rotate(15)],
    ['ESC −',()=>scene._scale(.9)],['ESC +',()=>scene._scale(1.1)],
    ['↔ X',()=>scene._flip('x')],['↕ Y',()=>scene._flip('y')],
    ['DUPLICAR',()=>scene._duplicate()],['BORRAR',()=>scene._delete()]
  ];
  const transformButtons=selectedActions.map(([label,callback],index)=>{
    const b=action(label,()=>{callback();refresh()},
      index===7?'env2__transform env2__transform--danger':'env2__transform');
    selectionTools.append(b);return b;
  });
  const surface=create('div','env2__surface');
  const surfaceInfo=create('span','','SUPERFICIE · CÉSPED · 120 px');
  const surfaceActions=create('div','env2__surface-actions');
  const physics=action('FÍSICA',()=>{
    scene._surfacePhysics=scene._surfacePhysics==='grass'?'asphalt':'grass';
    scene._updateSurfaceInfo();refresh();
  });
  const smaller=action('ANCHO −',()=>{
    scene._surfaceWidth=Math.max(40,scene._surfaceWidth-20);
    scene._updateSurfaceInfo();refresh();
  });
  const larger=action('ANCHO +',()=>{
    scene._surfaceWidth=Math.min(320,scene._surfaceWidth+20);
    scene._updateSurfaceInfo();refresh();
  });
  surfaceActions.append(physics,smaller,larger);
  surface.append(surfaceInfo,surfaceActions);
  side.append(sideHead,metrics,tabs,library,selectionHead,selectionTools,surface);
  root.append(header,rail,stage,side);

  function renderCatalog(){
    library.replaceChildren();
    const items=catalog.filter(item=>item.cat===scene._category);
    for(const item of items){
      const card=action('',()=>{
        scene._spawn(item);
        refresh();
      },'env2__asset');
      card.setAttribute('aria-label','Insertar '+(item.label||item.id));
      const img=create('img','env2__asset-preview');
      img.src=baseUrl+'assets/'+item.path;
      img.alt='';
      img.loading='lazy';
      const title=create('span','',item.label||item.id.replaceAll('_',' '));
      card.append(img,title);
      library.append(card);
    }
    for(const name of categoryNames)
      categoryButtons[name].setAttribute('aria-pressed',String(scene._category===name));
  }
  function refresh(){
    if(disposed)return;
    const objects=scene._objects?.filter(o=>o.scene)?.length||0;
    const zones=scene._surfaces?.length||0;
    write(objectCount,objects);
    write(zoneCount,zones);
    write(selectionCount,scene._selected?.scene?'1':'0');
    write(track,'CIRCUITO: '+(scene._trackId||'—'));
    write(stageName,'ESCENARIO · '+(scene._trackId||'—'));
    const selected=scene._selected?.scene?scene._selected:null;
    const key=selected?selected._env?.asset:'NINGUNO';
    write(selectedTitle,key||'NINGUNO');
    empty.hidden=!!(objects||zones||scene._guide?.scene);
    for(const b of transformButtons)b.disabled=!selected;
    for(const [name,b] of Object.entries(modeButtons))
      b.setAttribute('aria-pressed',String(scene._mode===name));
    selectRail.setAttribute('aria-pressed',String(scene._mode==='select'));
    panRail.setAttribute('aria-pressed',String(scene._mode==='pan'));
    const names={select:'SELECCIÓN',pan:'DESPLAZAR',surface:'SUPERFICIE ASFALTO'};
    write(modeCaption,names[scene._mode]||'SELECCIÓN');
    write(stageStats,objects+' OBJETOS · '+zones+' SUPERFICIES');
    write(stageZoom,'ZOOM '+(scene._editCam?.zoom||1).toFixed(2)+'×');
    write(surfaceInfo,'ASFALTO · '+(scene._surfacePhysics==='grass'?'FÍSICA CÉSPED':'FÍSICA ASFALTO')+' · '+scene._surfaceWidth+' px');
  }
  let disposed=false;
  const position=()=>{
    if(disposed)return;
    const rect=scene.game?.canvas?.getBoundingClientRect?.();
    if(!rect?.width||!rect?.height)return;
    const sx=rect.width/Math.max(1,scene.scale.width);
    const sy=rect.height/Math.max(1,scene.scale.height);
    root.style.left=rect.left+'px';
    root.style.top=rect.top+'px';
    root.style.width=rect.width+'px';
    root.style.height=rect.height+'px';
    root.style.setProperty('--env-top',(scene._top*sy)+'px');
    root.style.setProperty('--env-left',(scene._vx*sx)+'px');
    root.style.setProperty('--env-right',(scene._right*sx)+'px');
  };
  const onViewport=()=>{position();refresh()};
  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    window.removeEventListener('resize',onViewport);
    window.removeEventListener('orientationchange',onViewport);
    scene.scale?.off?.('resize',onViewport);
    root.remove();
    scene._environmentChrome=null;
  };
  document.body.append(root);
  scene._environmentChrome={root,refresh,renderCatalog,position,dispose};
  scene.events.once('shutdown',dispose);
  scene.events.once('destroy',dispose);
  window.addEventListener('resize',onViewport);
  window.addEventListener('orientationchange',onViewport);
  scene.scale?.on?.('resize',onViewport);
  renderCatalog();position();refresh();
  return scene._environmentChrome;
}
