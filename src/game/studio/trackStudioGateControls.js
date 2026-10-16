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
    'padding:0 1px 5px','background:#0f1422','pointer-events:auto',
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
      'border:2px solid #48627c','border-radius:8px','background:#1c2b43',
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
    const active=scene._tool;
    for(const [type,btn] of Object.entries(buttons)){
      const chosen=active===type;
      btn.setAttribute('aria-pressed',String(chosen));
      const accent=type==='start'?'#55f5ae':'#8cb8ff';
      btn.style.borderColor=chosen?accent:'#48627c';
      btn.style.background=chosen?(type==='start'?'#15503e':'#304d76'):'#1c2b43';
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
  return {root,start,finish,status,buttons,remove,widthValue,stepButton,refresh,position};
}
