// Native DOM inspector for image-native TrackStudio edge editing.
// Selecting / dragging border nodes must never force Phaser Text.updateText:
// iOS can throw in Frame.updateUVs -> Frame.setSize during frequent setText().
export function shapeInspectorCopy(shape, selected) {
  if (!shape || !selected || !shape[selected.side]?.[selected.index]) {
    return 'AJUSTAR BORDES\n\nToca el asfalto o un borde\npara elegir el lado.\n\nToca un nodo y después\narrástralo para moverlo.\n\nZona vacía: mover el mapa.';
  }
  const n=shape[selected.side][selected.index];
  return [
    selected.side==='leftEdge'?'BORDE IZQUIERDO':'BORDE DERECHO',
    'Nodo '+(selected.index+1)+' / '+shape[selected.side].length,
    'X: '+Math.round(n.x)+'  Y: '+Math.round(n.y),
    '',
    'Primer toque: seleccionar.',
    'Segundo gesto: mover.',
    'Tiradores: ajustar curvas.',
    '+ NODO: subdividir el tramo.'
  ].join('\n');
}
export function createShapeDomInspector(scene) {
  const node=document.createElement('div');
  node.id='tdr-trackstudio-shape-inspector';
  node.setAttribute('aria-live','off');
  node.style.cssText=[
    'position:fixed','box-sizing:border-box','display:none','z-index:24002',
    'pointer-events:none','color:#fff','white-space:pre-line',
    'font:13px/1.35 system-ui,-apple-system,Segoe UI,Arial,sans-serif',
    'overflow:hidden','overflow-wrap:anywhere','padding:0','margin:0',
    'text-align:left','background:transparent'
  ].join(';');
  document.body.appendChild(node);
  let shown=false;
  const place=()=>{
    if(!shown)return;
    const rect=scene.game?.canvas?.getBoundingClientRect?.();
    if(!rect||!rect.width||!rect.height)return;
    const sx=rect.width/Math.max(1,scene.scale?.width||1);
    const sy=rect.height/Math.max(1,scene.scale?.height||1);
    const left=scene.scale.width-scene._rightPanelW+20;
    const top=scene._panelContentY;
    node.style.left=(rect.left+left*sx)+'px';
    node.style.top=(rect.top+top*sy)+'px';
    node.style.width=(Math.max(90,scene._rightPanelW-40)*sx)+'px';
    node.style.maxHeight=(Math.max(50,scene.scale.height-top-16)*sy)+'px';
    node.style.fontSize=(13*Math.min(sx,sy))+'px';
  };
  const onResize=()=>place();
  window.addEventListener('resize',onResize);
  window.addEventListener('orientationchange',onResize);
  return {
    show(value){
      const next=String(value||'');
      if(node.textContent!==next)node.textContent=next;
      shown=true;
      node.style.display='block';
      place();
    },
    hide(){shown=false;node.style.display='none';},
    destroy(){
      shown=false;
      window.removeEventListener('resize',onResize);
      window.removeEventListener('orientationchange',onResize);
      node.remove();
    }
  };
}


// All TrackStudio properties use one HTML inspector. The original Phaser
// Text.setText() on pointerup triggered Frame.updateUVs on iPhone.
export function studioInspectorCopy(scene) {
  const nodes=Array.isArray(scene?._nodes)?scene._nodes:[];
  const pianos=Array.isArray(scene?._pianos)?scene._pianos:[];
  const cps=Array.isArray(scene?._checkpoints)?scene._checkpoints:[];
  const loop=scene?._isClosed?'cerrado':'abierto';
  const zoom=Number(scene?._editCam?.zoom);
  const zoomStr=Number.isFinite(zoom)?zoom.toFixed(2):'0.00';
  const safe=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)
    ? Math.round(p.x)+', '+Math.round(p.y):'—';
  if(Number.isInteger(scene?._selectedPiano) && scene._selectedPiano>=0 && scene._selectedPiano<pianos.length) {
    const p=pianos[scene._selectedPiano];
    return ['Piano #'+scene._selectedPiano,
      'Centro: '+safe(p?.point),'A: '+safe(p?.a),'B: '+safe(p?.b),
      'Loop: '+loop,'Zoom: '+zoomStr].join('\n');
  }
  if(Number.isInteger(scene?._selectedNode) && scene._selectedNode>=0 && scene._selectedNode<nodes.length) {
    const n=nodes[scene._selectedNode];
    if(n&&Number.isFinite(n.x)&&Number.isFinite(n.y)) {
      return ['Nodo #'+scene._selectedNode,'Modo: '+(scene._selectedPart?.type||'node'),
        'X: '+Math.round(n.x),'Y: '+Math.round(n.y),
        'In: '+safe(n.handleIn),'Out: '+safe(n.handleOut),
        'Zoom: '+zoomStr,'Ancho: '+scene._trackWidth+'px'].join('\n');
    }
  }
  const guide=scene?._guideImage?(scene._guideVisible?'visible':'oculta'):'no cargada';
  const canvas=scene?._imageCanvas?'\nLienzo: '+scene._imageCanvas.width+'×'+scene._imageCanvas.height:'';
  return ['Sin selección','Nodos: '+nodes.length,'Pianos: '+pianos.length,
    'Salida: '+(scene?._startLine?'sí':'no'),'Meta: '+(scene?._finishLine?'sí':'no'),
    'Checkpoints: '+cps.length,'Guía: '+guide].join('\n')+canvas;
}
