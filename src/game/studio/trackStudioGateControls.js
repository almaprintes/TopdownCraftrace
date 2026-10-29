// Track Studio — labelled drawing palette docked inside PROPIEDADES / ACCIONES.
// Do not place controls over the viewport: precision editing needs the full map.
// Keep 44px touch targets; original tool handlers / .tdrtrack data are unchanged.
import {nextTrackStudioWidthStep,trackStudioWidthStep} from './trackStudioWidthRange.js';

export function installTrackStudioGateControls(scene){
  if(typeof document==='undefined')return null;
  const root=document.createElement('div');
  root.className='tdr-trackstudio-gate-actions';
  root.setAttribute('role','group');
  root.setAttribute('aria-label','Herramientas de edición: editar, pluma, salida, meta, checkpoints y pianos');
  root.style.cssText=[
    'position:fixed','z-index:24010','box-sizing:border-box',
    'padding:4px 3px 6px','background:linear-gradient(155deg,#102a3c,#091827)','pointer-events:auto',
    'overflow-y:auto','overflow-x:hidden','overscroll-behavior:contain',
    'touch-action:pan-y','scrollbar-width:thin'
  ].join(';');
  // Width precision is explicitly visible next to the editing tools.
  // The W−/W+ buttons stay in the top toolbar; this setting controls their step.
  const widthRow=document.createElement('div');
  widthRow.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:4px;padding:1px 0 7px;';
  const widthValue=document.createElement('span');
  widthValue.style.cssText='color:#e8f1ff;font:800 12px system-ui,-apple-system,Segoe UI,sans-serif;white-space:nowrap;';
  widthRow.appendChild(widthValue);
  const stepButton=document.createElement('button');
  stepButton.type='button';
  stepButton.setAttribute('aria-label','Cambiar paso de anchura: 1, 5, 10, 25, 50 o 100 píxeles');
  stepButton.style.cssText='min-height:44px;min-width:94px;padding:5px 6px;border:2px solid #638fc0;border-radius:8px;background:#203852;color:#fff;font:800 12px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;touch-action:manipulation;';
  stepButton.addEventListener('pointerdown',e=>e.stopPropagation());
  stepButton.addEventListener('pointerup',e=>e.stopPropagation());
  stepButton.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    scene._widthStep=nextTrackStudioWidthStep(scene._widthStep);
    refresh();
  });
  widthRow.appendChild(stepButton);
  root.appendChild(widthRow);

  const localWidth=document.createElement('div');
  localWidth.className='tdr-trackstudio-local-width';
  localWidth.setAttribute('role','group');
  localWidth.setAttribute('aria-label','Ancho local del nodo seleccionado');
  localWidth.style.cssText='display:none;box-sizing:border-box;padding:7px 0;margin:0 0 6px;border-top:1px solid #344866;border-bottom:1px solid #344866;';
  const localLabel=document.createElement('div');
  localLabel.style.cssText='color:#c6f7ec;font:800 12px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;padding-bottom:5px;';
  localWidth.appendChild(localLabel);
  const localRow=document.createElement('div');
  localRow.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:5px;';
  const makeLocal=(name,aria,onClick)=>{
    const btn=document.createElement('button');btn.type='button';btn.textContent=name;
    btn.setAttribute('aria-label',aria);
    btn.style.cssText='min-width:0;min-height:44px;border:2px solid #638fc0;border-radius:8px;background:#254766;color:#fff;font:800 13px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;touch-action:manipulation;';
    btn.addEventListener('pointerdown',e=>e.stopPropagation());
    btn.addEventListener('pointerup',e=>e.stopPropagation());
    btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();onClick();refresh();});
    return btn;
  };
  const localMinus=makeLocal('− ANCHO','Estrechar el tramo del nodo seleccionado',()=>{
    const i=scene._selectedWidthNodeIndex?.();
    if(i<0)return;
    scene._setLocalNodeWidth?.((scene._nodes[i].width??scene._trackWidth)-trackStudioWidthStep(null,null,scene._widthStep));
  });
  const localPlus=makeLocal('+ ANCHO','Ensanchar el tramo del nodo seleccionado',()=>{
    const i=scene._selectedWidthNodeIndex?.();
    if(i<0)return;
    scene._setLocalNodeWidth?.((scene._nodes[i].width??scene._trackWidth)+trackStudioWidthStep(null,null,scene._widthStep));
  });
  localRow.appendChild(localMinus);localRow.appendChild(localPlus);
  localWidth.appendChild(localRow);
  const localReset=makeLocal('RESTABLECER AL ANCHO GENERAL','Quitar el ancho individual de este nodo',()=>{
    scene._setLocalNodeWidth?.(null);
  });
  localReset.style.cssText+='width:100%;margin-top:5px;';
  localWidth.appendChild(localReset);
  root.appendChild(localWidth);

  const grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;align-items:stretch;';
  root.appendChild(grid);
  const hints={
    edit:'EDITAR · toca un nodo para ajustarlo',
    pen:'PLUMA · toca para una recta; arrastra para curvar',
    start:'SALIDA · toca la carretera para colocar la línea verde',
    finish:'META · toca la carretera para colocar la línea blanca',
    checkpoint:'CONTROL · toca para añadir un checkpoint',
    piano:'PIANOS · toca para colocar un piano'
  };
  const buttons={};
  const make=(type,label)=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.dataset.gate=type;
    btn.textContent=label;
    btn.setAttribute('aria-label',hints[type]);
    btn.style.cssText=[
      'min-width:0','min-height:44px','box-sizing:border-box','padding:7px 4px',
      'border:1px solid #355c72','border-radius:9px','background:#132b3f',
      'color:#fff','font:800 12px/1.15 system-ui,-apple-system,Segoe UI,sans-serif',
      'cursor:pointer','touch-action:manipulation','white-space:normal',
      '-webkit-tap-highlight-color:transparent'
    ].join(';');
    btn.addEventListener('pointerdown',e=>e.stopPropagation());
    btn.addEventListener('pointerup',e=>e.stopPropagation());
    btn.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      scene._setTool(type);
      scene._flashMessage?.(hints[type]);
      refresh();
    });
    grid.appendChild(btn);
    buttons[type]=btn;
    return btn;
  };
  make('edit','EDITAR');
  make('pen','PLUMA');
  const start=make('start','SALIDA');
  const finish=make('finish','META');
  make('checkpoint','CONTROL');
  make('piano','PIANOS');

  const status=document.createElement('span');
  status.className='tdr-trackstudio-gate-status';
  status.style.cssText='display:block;margin-top:7px;color:#bcd4e6;font:700 12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;overflow-wrap:anywhere;';
  root.appendChild(status);

  // The former Phaser delete control occupied this area and could cover
  // the new palette. Replace it with a contextual, accessible DOM action.
  const remove=document.createElement('button');
  remove.type='button';
  remove.textContent='BORRAR SELECCIÓN';
  remove.setAttribute('aria-label','Borrar el nodo o piano seleccionado');
  remove.style.cssText='display:none;width:100%;min-height:44px;margin-top:6px;padding:6px;border:2px solid #9b6a79;border-radius:8px;background:#462333;color:#fff;font:800 12px system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;touch-action:manipulation;';
  remove.addEventListener('pointerdown',e=>e.stopPropagation());
  remove.addEventListener('pointerup',e=>e.stopPropagation());
  remove.addEventListener('click',e=>{
    e.preventDefault();e.stopPropagation();
    scene._deleteSelectedNode?.();
    refresh();
  });
  root.appendChild(remove);
  document.body.appendChild(root);

  function refresh(){
    const currentWidth=Number(scene._trackWidth);
    widthValue.textContent='ANCHO '+(Number.isFinite(currentWidth)?currentWidth:'—')+' px';
    stepButton.textContent='PASO '+trackStudioWidthStep(null,null,scene._widthStep)+' px';
    const selectedWidthNode=scene._selectedWidthNodeIndex?.()??-1;
    const widthNode=scene._nodes?.[selectedWidthNode];
    const hasWidthNode=selectedWidthNode>=0&&!!widthNode;
    localWidth.style.display=hasWidthNode?'block':'none';
    if(hasWidthNode){
      const local=Number.isFinite(widthNode.width)?widthNode.width:scene._trackWidth;
      localLabel.textContent='NODO '+(selectedWidthNode+1)+' · ANCHO LOCAL: '+local+' px';
      localReset.style.display=Number.isFinite(widthNode.width)?'block':'none';
    }
    const active=scene._tool;
    for(const [type,btn] of Object.entries(buttons)){
      const chosen=active===type;
      btn.setAttribute('aria-pressed',String(chosen));
      const accent=type==='start'?'#38f1b4':'#54cbe6';
      btn.style.borderColor=chosen?accent:'#355c72';
      btn.style.background=chosen?(type==='start'?'#15503e':'#304d76'):'#132b3f';
    }
    if(active==='start')status.textContent='Toca la pista para situar SALIDA';
    else if(active==='finish')status.textContent='Toca la pista para situar META';
    else if(active==='checkpoint')status.textContent='Toca para colocar CONTROL';
    else if(active==='piano')status.textContent='Toca para colocar PIANO';
    else if(active==='pen')status.textContent='Toca o arrastra para dibujar';
    else status.textContent='Salida '+(scene._startLine?'✓':'—')+'  ·  Meta '+(scene._finishLine?'✓':'—');
    const selected=!scene._shapeEditing && (
      (scene._selectedNode>=0 && scene._selectedNode<(scene._nodes?.length||0)) ||
      (scene._selectedPiano>=0 && scene._selectedPiano<(scene._pianos?.length||0))
    );
    remove.style.display=selected?'block':'none';
  }
  function position(){
    const rect=scene.game?.canvas?.getBoundingClientRect?.();
    if(!rect||rect.width<=0||rect.height<=0)return;
    const viewW=Math.max(1,scene.scale?.width||1);
    const viewH=Math.max(1,scene.scale?.height||1);
    const sx=rect.width/viewW,sy=rect.height/viewH;
    const sideW=scene._rightPanelW||280;
    const x=viewW-sideW+12;
    const y=(scene._panelActionsY??(viewH-200))+34;
    root.style.left=(rect.left+x*sx)+'px';
    root.style.top=(rect.top+y*sy)+'px';
    root.style.width=((sideW-24)*sx)+'px';
    root.style.maxHeight=(Math.max(44,(viewH-y-9)*sy))+'px';
    const font=Math.max(12,Math.min(15,Math.round(12*Math.min(sx,sy))));
    Object.values(buttons).forEach(btn=>{btn.style.fontSize=font+'px';});
    status.style.fontSize=Math.max(11,font-1)+'px';
  }
  const wrap=(key,after)=>{
    const before=scene[key];
    if(typeof before!=='function')return;
    scene[key]=function(...args){
      const result=before.apply(this,args);
      after?.();
      refresh();
      return result;
    };
  };
  wrap('_setTool');
  wrap('_placeStartLineAt',()=>{if(scene._startLine)scene._autosaveRecovery?.();});
  wrap('_placeFinishLineAt',()=>{if(scene._finishLine)scene._autosaveRecovery?.();});
  wrap('_applyProjectData');
  wrap('_newProject');
  wrap('_toggleClosed');
  wrap('_updatePanel');
  window.addEventListener('resize',position);
  window.addEventListener('orientationchange',position);
  scene.events.once('shutdown',()=>{
    window.removeEventListener('resize',position);
    window.removeEventListener('orientationchange',position);
    root.remove();
  });
  refresh();position();
  return {root,start,finish,status,buttons,remove,widthValue,stepButton,localWidth,localLabel,localMinus,localPlus,localReset,refresh,position};
}
