// Track Studio 2.0 — IMAGE LAB visual language, without replacing Phaser.
// Opaque UI docks surround the real Phaser editing viewport; touch/zoom and
// project formats still belong exclusively to TrackStudioScene.
import {studioInspectorCopy,shapeInspectorCopy} from './shapeDomInspector.js';
import {shapeIsValid} from './trackShapeGeometry.js';

const make=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!=null)el.textContent=text;
  return el;
};
const add=(parent,...children)=>{parent.append(...children);return parent;};
const button=(text,callback,cls='ts-lab__button')=>{
  const b=make('button',cls,text);
  b.type='button';
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();callback();});
  return b;
};
const state=(node,value)=>{const text=String(value);if(node.textContent!==text)node.textContent=text;};
const action=(s,key)=>s._studioShapeButtons?.[key]?.run?.();

export function mountTrackStudioLabChrome(scene,gate){
  if(typeof document==='undefined'||!scene.game?.canvas)return null;
  const root=make('div','ts-lab');
  root.setAttribute('aria-label','Track Studio 2.0');
  root.style.cssText='position:fixed;pointer-events:none;z-index:24018;';
  const header=make('header','ts-lab__header');
  const brand=make('div','ts-lab__brand');
  const logo=make('div','ts-lab__logo');logo.innerHTML='TD<em>R</em>';
  const titles=make('div','ts-lab__titles');
  add(titles,make('small','','ADMIN HUB'),make('strong','', 'TRACK STUDIO '));
  const two=titles.querySelector('strong');two.append(make('em','','2.0'));
  titles.append(make('span','','DISEÑO · TRAZADO · EDICIÓN'));
  add(brand,logo,titles);
  const headActions=make('div','ts-lab__head-actions');
  const save=button('GUARDAR',()=>{scene._saveProject?.();},'ts-lab__head-button ts-lab__head-button--primary');
  const open=button('ABRIR',()=>scene._openProjectSourceMenu?.(),'ts-lab__head-button');
  const create=button('NUEVO',()=>{
    if(!window.confirm('¿Crear proyecto nuevo?\n\nSustituirá lo que estás editando. Guarda antes una copia si quieres conservarlo.'))return;
    scene._pushHistory?.();scene._newProject?.();
    scene._autosaveRecovery?.();scene._flashMessage?.('Proyecto nuevo');
  },'ts-lab__head-button');
  const loop=button('PISTA ABIERTA',()=>scene._toggleClosed?.(),'ts-lab__head-button');
  const minus=button('ANCHO −',()=>scene._changeTrackWidth?.(-scene._trackWidthStep()),'ts-lab__head-button');
  const plus=button('ANCHO +',()=>scene._changeTrackWidth?.(scene._trackWidthStep()),'ts-lab__head-button');
  const undo=button('↶',()=>scene._undo?.(),'ts-lab__head-button ts-lab__head-button--icon');
  undo.setAttribute('aria-label','Deshacer');
  const redo=button('↷',()=>scene._redo?.(),'ts-lab__head-button ts-lab__head-button--icon');
  redo.setAttribute('aria-label','Rehacer');
  headActions.append(save,open,create,loop,minus,plus,undo,redo);
  const headRight=make('div','ts-lab__head-right');
  const version=make('span','ts-lab__version',document.querySelector('meta[name="tdr-dev-version"]')?.content||'DEV');
  const exit=button('VOLVER A PADDOCK',()=>scene._requestExitTrackStudio?.(),'ts-lab__exit');
  add(headRight,version,exit);
  header.append(brand,headActions,headRight);

  const rail=make('nav','ts-lab__rail');
  rail.setAttribute('aria-label','Navegación del lienzo');
  rail.append(make('div','ts-lab__rail-title','VISTA'));
  const railHome=button('⌂',()=>{
    scene._editCam?.centerOn(scene._editorWorldW/2,scene._editorWorldH/2);
    scene._redrawEditor?.();scene._updatePanel?.();
  },'ts-lab__rail-button');
  railHome.title='Centrar mapa';railHome.setAttribute('aria-label','Centrar mapa');
  const railIn=button('+',()=>scene._applyZoomAtViewportCenter?.(1.15),'ts-lab__rail-button');
  railIn.setAttribute('aria-label','Acercar');
  const railOut=button('−',()=>scene._applyZoomAtViewportCenter?.(1/1.15),'ts-lab__rail-button');
  railOut.setAttribute('aria-label','Alejar');
  let guidePanel;
  const photo=button('IMG',()=>{
    if(!guidePanel)return;
    guidePanel.hidden=!guidePanel.hidden;
  },'ts-lab__rail-button ts-lab__rail-button--image');
  photo.setAttribute('aria-label','Importar fotografía de referencia');
  const map=button('MAP',()=>scene._openCanvasImagePicker?.(),'ts-lab__rail-button');
  map.setAttribute('aria-label','Cargar imagen maestra para crear y probar un circuito');
  map.title='Importar imagen maestra (para ▶ PROBAR)';
  add(rail,railHome,railIn,railOut,photo,map);
  guidePanel=make('div','ts-lab__guide-panel');
  guidePanel.hidden=true;
  const guideTitle=make('strong','','IMAGEN DE REFERENCIA');
  const guideCommands=make('div','ts-lab__guide-actions');
  const guideLoad=button('CARGAR',()=>scene._openGuidePicker?.());
  const guideLock=button('BLOQUEAR',()=>{
    if(!scene._guideImage)return scene._flashMessage?.('Carga una imagen de referencia');
    scene._guideLocked=!scene._guideLocked;
    scene._autosaveRecovery?.();
    scene._updatePanel?.();
  });
  const guideShow=button('MOSTRAR',()=>{
    if(!scene._guideImage)return scene._flashMessage?.('Carga una imagen de referencia');
    scene._toggleGuideVisibility?.();scene._autosaveRecovery?.();
  });
  const guideLess=button('TAMAÑO −',()=>scene._changeGuideScale?.(1/1.08));
  const guideMore=button('TAMAÑO +',()=>scene._changeGuideScale?.(1.08));
  const guideFade=button('OPACIDAD −',()=>scene._changeGuideAlpha?.(-0.08));
  const guideBright=button('OPACIDAD +',()=>scene._changeGuideAlpha?.(0.08));
  const guideClose=button('CERRAR',()=>{guidePanel.hidden=true;});
  guideCommands.append(guideLoad,guideLock,guideShow,guideLess,guideMore,guideFade,guideBright,guideClose);
  guidePanel.append(guideTitle,guideCommands);
  
  const workspace=make('section','ts-lab__workspace');
  workspace.setAttribute('aria-label','Lienzo de edición Phaser');
  const stageTop=make('div','ts-lab__stage-top');
  const stageTag=make('span','ts-lab__stage-tag','LIENZO DE EDICIÓN');
  const stageActions=make('div','ts-lab__stage-actions');
  const shapeCreate=button('CREAR PISTA',()=>action(scene,'create'),'ts-lab__stage-button ts-lab__stage-button--create');
  const shapeEdit=button('AJUSTAR',()=>action(scene,'edit'),'ts-lab__stage-button');
  const shapeNode=button('+ NODO',()=>action(scene,'add'),'ts-lab__stage-button');
  const shapeGrid=button('PARRILLA',()=>action(scene,scene._showStartingGrid===false?'gridOff':'gridOn'),'ts-lab__stage-button');
  const shapePreview=button('▶ PROBAR',()=>action(scene,'preview'),'ts-lab__stage-button ts-lab__stage-button--preview');
  add(stageActions,shapeCreate,shapeEdit,shapeNode,shapeGrid,shapePreview);
  stageTop.append(stageTag,stageActions);
  const placeholder=make('div','ts-lab__empty');
  add(placeholder,make('span','ts-lab__empty-icon','⌖'),make('strong','','LIENZO LISTO PARA DISEÑAR'),
    make('small','','Carga una imagen o abre un proyecto para comenzar a trabajar'));
  // Topmost editor notice: never draw errors behind the header or toolbars.
  const notice=make('div','ts-lab__notice');
  notice.setAttribute('role','status');
  notice.setAttribute('aria-live','polite');
  notice.hidden=true;
  let noticeTimeout=null;
  const showNotice=(raw)=>{
    const message=String(raw||'');
    const missingMaster=/no tiene imagen maestra|no se encuentra la imagen maestra/i.test(message);
    const displayed=missingMaster
      ?'Para probar en carrera, pulsa MAP y carga una imagen maestra. IMG es solo una referencia.'
      :message;
    const error=missingMaster||/no se puede|error|no hay|falta|primero|inválid|falló/i.test(message);
    state(notice,displayed);
    notice.setAttribute('data-error',String(error));
    notice.hidden=!displayed;
    if(noticeTimeout!=null)window.clearTimeout?.(noticeTimeout);
    noticeTimeout=window.setTimeout?.(()=>{
      notice.hidden=true;noticeTimeout=null;
    },error?8000:3500)??null;
    return displayed;
  };
  const stageBottom=make('div','ts-lab__stage-bottom');
  const mode=make('strong','ts-lab__mode','EDITAR');
  const stats=make('span','ts-lab__stats','0 NODOS · ZOOM —');
  const center=button('CENTRAR',()=>railHome.click(),'ts-lab__bottom-button');
  const status=make('span','ts-lab__status','Todo listo para empezar');
  stageBottom.append(mode,stats,center,status);
  workspace.append(stageTop,notice,placeholder,stageBottom);

  const side=make('aside','ts-lab__side');
  const sideHead=make('div','ts-lab__side-head');
  add(sideHead,make('strong','','PROPIEDADES'),make('span','','PISTA ACTUAL'));
  const metrics=make('div','ts-lab__metrics');
  const metric=(name)=>{
    const parent=make('div','ts-lab__metric');
    const value=make('strong','','0');
    add(parent,make('span','',name),value);
    metrics.append(parent);
    return value;
  };
  const nodeMetric=metric('NODOS');
  const cpMetric=metric('CHECKPOINTS');
  const pianoMetric=metric('PIANOS');
  const meta=make('div','ts-lab__meta','SIN SELECCIÓN');
  const info=make('div','ts-lab__properties','Selecciona un nodo o toca un borde para editar');
  const nudge=make('div','ts-lab__nudge');
  const nudgeTitle=make('span','','MOVER SELECCIÓN');
  const nudgeControls=make('div','ts-lab__nudge-controls');
  const step=button('PASO',()=>{
    scene._cycleNudgeStep?.();
    scene._updatePanel?.();
  });
  for(const [label,dx,dy] of [['←',-1,0],['↑',0,-1],['↓',0,1],['→',1,0]]){
    const move=button(label,()=>scene._nudgeSelectedNode?.(
      dx*scene._getNudgeStep(),dy*scene._getNudgeStep()
    ));
    move.setAttribute('aria-label','Mover selección '+label);
    nudgeControls.append(move);
  }
  nudgeControls.append(step);
  nudge.append(nudgeTitle,nudgeControls);
  nudge.hidden=true;
  const toolsHead=make('div','ts-lab__tools-head');
  add(toolsHead,make('strong','','HERRAMIENTAS'),make('span','','TRAZADO Y MARCAS'));
  const toolHost=make('div','ts-lab__tool-host');
  side.append(sideHead,metrics,meta,info,nudge,toolsHead,toolHost);

  root.append(header,rail,workspace,side,guidePanel);
  document.body.append(root);
  if(!gate?.mountInto?.(toolHost)){
    root.remove();
    return null; // original native UI remains available on failure
  }

  let closed=false,displayed='';
  const oldUpdate=scene._updatePanel;
  const oldFlash=scene._flashMessage;
  function refresh(){
    if(closed)return;
    const nodes=scene._nodes?.length||0;
    state(nodeMetric,nodes);state(cpMetric,scene._checkpoints?.length||0);
    state(pianoMetric,scene._pianos?.length||0);
    state(loop,scene._isClosed?'PISTA CERRADA':'PISTA ABIERTA');
    state(shapeGrid,scene._showStartingGrid===false?'PARRILLA NO':'PARRILLA SÍ');
    const tool=scene._tool||'edit';
    state(mode,tool.toUpperCase());
    state(stats,nodes+' NODOS · ZOOM '+(scene._editCam?.zoom||1).toFixed(2)+'×');
    const hasWork=!!(nodes||scene._imageCanvas||scene._guideImage||scene._trackShape);
    placeholder.hidden=hasWork;
    const edge=scene._shapeEditing&&shapeIsValid(scene._trackShape);
    const description=edge?shapeInspectorCopy(scene._trackShape,scene._shapeSelected):studioInspectorCopy(scene);
    const next=description.replaceAll('\n',' · ').replace(/\s+/g,' ').trim();
    if(next!==displayed){state(info,next);displayed=next;}
    state(meta,edge?'AJUSTE DE BORDES':scene._imageCanvas?'LIENZO FOTOGRÁFICO':'TRAZADO');
    const selected=(scene._selectedNode>=0)||(scene._selectedPiano>=0);
    nudge.hidden=!selected;
    state(step,'PASO '+scene._getNudgeStep?.()+' px');
    state(guideLock,scene._guideLocked?'DESBLOQUEAR':'BLOQUEAR');
    state(guideShow,scene._guideVisible?'OCULTAR':'MOSTRAR');
    for(const [name,b] of [['create',shapeCreate],['edit',shapeEdit],['add',shapeNode]]){
      b.setAttribute('aria-pressed',String(name==='edit'&&!!scene._shapeEditing));
    }
    for(const btn of toolHost.querySelectorAll('button'))btn.style.touchAction='manipulation';
  }
  scene._updatePanel=function(...args){
    const out=oldUpdate.apply(this,args);refresh();return out;
  };
  scene._flashMessage=function(...args){
    const message=String(args[0]||'');
    if(!message)return;
    // Phaser text at y=80 used to be covered by the premium DOM header.
    // When the DOM shell exists, avoid drawing a second hidden message.
    this._msgText?.destroy?.();
    this._msgText=null;
    const displayed=showNotice(message);
    state(status,displayed);
  };

  const position=()=>{
    if(closed)return;
    const rect=scene.game?.canvas?.getBoundingClientRect?.();
    if(!rect||rect.width<=0||rect.height<=0)return;
    const sx=rect.width/Math.max(1,scene.scale.width);
    const sy=rect.height/Math.max(1,scene.scale.height);
    root.style.left=rect.left+'px';
    root.style.top=rect.top+'px';
    root.style.width=rect.width+'px';
    root.style.height=rect.height+'px';
    root.style.setProperty('--ts-header',scene._topBarH*sy+'px');
    root.style.setProperty('--ts-left',scene._viewX*sx+'px');
    root.style.setProperty('--ts-right',scene._rightPanelW*sx+'px');
  };
  const dispose=()=>{
    if(closed)return;
    closed=true;
    window.removeEventListener('resize',position);
    window.removeEventListener('orientationchange',position);
    scene.scale?.off?.('resize',position);
    // Restoring the editor's original methods allows safe scene transitions.
    scene._updatePanel=oldUpdate;
    scene._flashMessage=oldFlash;
    if(noticeTimeout!=null)window.clearTimeout?.(noticeTimeout);
    root.remove();
    scene._studioChromeMounted=false;
  };
  scene._studioChromeMounted=true;
  scene._studioShapeButtons&&Object.values(scene._studioShapeButtons).forEach(b=>b?.setVisible?.(false));
  scene._emptyHelp?.setVisible?.(false);
  window.addEventListener('resize',position);
  window.addEventListener('orientationchange',position);
  scene.scale?.on?.('resize',position);
  scene.events.once('shutdown',dispose);
  scene.events.once('destroy',dispose);
  refresh();position();
  return {root,refresh,position,dispose};
}
