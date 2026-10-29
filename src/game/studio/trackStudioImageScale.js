// Track Studio 2.0 — scale authored world coordinates together with a replacement photo.
// This is an editor transform, NOT a runtime car-scale or camera-zoom adjustment.
// The original editor data is never mutated; callers can retain it for undo/recovery.
const validSize=(w,h)=>Number.isSafeInteger(w)&&Number.isSafeInteger(h)&&
  w>0&&h>0&&w<=8192&&h<=8192&&w*h<=32000000;
const coordinate=(v,f)=>Number.isFinite(v)?v*f:v;
const scalePoint=(p,sx,sy)=>p&&typeof p==='object'?{
  ...p,x:coordinate(p.x,sx),y:coordinate(p.y,sy)
}:p;
const scaleGate=(gate,sx,sy)=>gate&&typeof gate==='object'?{
  ...gate,a:scalePoint(gate.a,sx,sy),b:scalePoint(gate.b,sx,sy)
  // 'normal' is a direction vector, not a position or distance.
}:gate;
const scaleNode=(node,sx,sy,sw)=>node&&typeof node==='object'?{
  ...scalePoint(node,sx,sy),
  ...(node.handleIn?{handleIn:scalePoint(node.handleIn,sx,sy)}:{}),
  ...(node.handleOut?{handleOut:scalePoint(node.handleOut,sx,sy)}:{}),
  ...(Number.isFinite(node.width)?{width:coordinate(node.width,sw)}:{})
}:node;

/**
 * Same composition, different pixel resolution. Refuse a changed aspect ratio:
 * stretching a map would silently destroy road/photo alignment.
 */
export function imageTrackResizePlan(editor,newWidth,newHeight){
  const oldWidth=Number(editor?.imageCanvas?.width);
  const oldHeight=Number(editor?.imageCanvas?.height);
  const width=Number(newWidth),height=Number(newHeight);
  if(!validSize(oldWidth,oldHeight))throw Error('Carga primero una imagen maestra válida');
  if(!validSize(width,height))throw Error('La nueva imagen supera 8192 px por lado o 32 MP');
  const sx=width/oldWidth,sy=height/oldHeight;
  if(Math.abs(sx/sy-1)>0.005)
    throw Error('Las imágenes tienen proporciones distintas. Recorta la nueva con el mismo encuadre.');
  return {oldWidth,oldHeight,width,height,sx,sy,scale:(sx+sy)/2,
    sameSize:width===oldWidth&&height===oldHeight};
}

export function rescaleImageTrackEditor(editor,newWidth,newHeight){
  const {sx,sy,scale,width,height}=imageTrackResizePlan(editor,newWidth,newHeight);
  const shape=editor.trackShape;
  return {
    ...editor,
    imageCanvas:{...editor.imageCanvas,width,height},
    nodes:Array.isArray(editor.nodes)?editor.nodes.map(p=>scaleNode(p,sx,sy,scale)):[],
    trackWidth:coordinate(editor.trackWidth,scale),
    startLine:scaleGate(editor.startLine,sx,sy),
    finishLine:scaleGate(editor.finishLine,sx,sy),
    checkpoints:Array.isArray(editor.checkpoints)
      ?editor.checkpoints.map(g=>scaleGate(g,sx,sy)):[],
    trackShape:shape?{
      ...shape,
      leftEdge:Array.isArray(shape.leftEdge)?shape.leftEdge.map(p=>scaleNode(p,sx,sy,scale)):shape.leftEdge,
      rightEdge:Array.isArray(shape.rightEdge)?shape.rightEdge.map(p=>scaleNode(p,sx,sy,scale)):shape.rightEdge
    }:shape,
    ...(Number.isFinite(editor.guideX)?{guideX:coordinate(editor.guideX,sx)}:{}),
    ...(Number.isFinite(editor.guideY)?{guideY:coordinate(editor.guideY,sy)}:{})
  };
}
