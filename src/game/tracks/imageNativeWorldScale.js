// Image-native circuit scale for the PRIVATE TrackStudio test race.
// The editor project, original image bytes and every car tuning parameter are
// immutable. World coordinates are expanded together; normals/angles are not.
import { shapeIsValid } from '../studio/trackShapeGeometry.js';

export const IMAGE_NATIVE_WORLD_SCALE = 3;
const copy=value=>JSON.parse(JSON.stringify(value));
const scaleNumber=(n,s)=>Number.isFinite(n)?n*s:n;
const scalePoint=(p,s)=>{
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return p;
  return {...p,x:p.x*s,y:p.y*s};
};
const scaleGate=(gate,s)=>{
  if(!gate)return gate;
  return {...gate,
    a:scalePoint(gate.a,s),
    b:scalePoint(gate.b,s),
    // Gate.normal is a unit direction, never a position.
    normal:gate.normal?{...gate.normal}:gate.normal
  };
};
const scaleShape=(shape,s)=>{
  if(!shapeIsValid(shape))throw Error('Los bordes originales de TrackStudio no son válidos');
  const edge=points=>points.map(p=>({
    ...p,x:p.x*s,y:p.y*s,
    handleIn:scalePoint(p.handleIn,s),
    handleOut:scalePoint(p.handleOut,s)
  }));
  return {...shape,leftEdge:edge(shape.leftEdge),rightEdge:edge(shape.rightEdge)};
};
const scaledDistanceKeys=['trackWidth','grassMargin','sampleStepPx','cellSize','shoulderPx'];

export function scaleImageNativeTrackForRace(source,scale=IMAGE_NATIVE_WORLD_SCALE){
  if(!source||!Number.isFinite(scale)||scale<1||scale>4)
    throw Error('Escala de mundo inválida');
  if(!Number.isFinite(source.worldW)||!Number.isFinite(source.worldH)||
     source.worldW<=0||source.worldH<=0)
    throw Error('Dimensiones de circuito incorrectas');
  if(!Array.isArray(source.centerline)||source.centerline.length<20)
    throw Error('Centerline no válida');
  const track=copy(source);
  track.worldW=scaleNumber(source.worldW,scale);
  track.worldH=scaleNumber(source.worldH,scale);
  for(const key of scaledDistanceKeys){
    if(Number.isFinite(source[key]))track[key]=source[key]*scale;
  }
  track.centerline=source.centerline.map(p=>{
    if(Array.isArray(p))return [p[0]*scale,p[1]*scale,...p.slice(2)];
    return {...scalePoint(p,scale),
      width:Number.isFinite(p.width)?p.width*scale:p.width};
  });
  track.trackShape=scaleShape(source.trackShape,scale);
  track.start=scalePoint(source.start,scale);
  track.startLine=scaleGate(source.startLine,scale);
  track.finishLine=scaleGate(source.finishLine,scale);
  track.finish=scaleGate(source.finish,scale);
  track.checkpoints=Array.isArray(source.checkpoints)
    ?source.checkpoints.map(cp=>scaleGate(cp,scale))
    :source.checkpoints;
  if(track.grid){
    track.grid={...track.grid,
      rowSpacing:scaleNumber(track.grid.rowSpacing,scale),
      colOffset:scaleNumber(track.grid.colOffset,scale),
      backOffset:scaleNumber(track.grid.backOffset,scale),
      slots:Array.isArray(track.grid.slots)?track.grid.slots.map(p=>scalePoint(p,scale)):track.grid.slots
    };
  }
  // TrackStudio's imageAsset metadata MUST NOT become a 5016x2823 texture.
  // Only the visible sprite gets a world-space scale.
  track.imageWorldScale=scale;
  track.meta={...(track.meta||{}),imageWorldScale:scale};
  return track;
}
