// Karting Canarias published photo-world enlargement. Authoring originals stay
// at 2048x3072 so the original .tdrtrack and Environment Studio export can
// always be recovered. Only runtime world coordinates are multiplied.
export const KARTING_CANARIAS_WORLD_SCALE=2.5;
export const KARTING_CANARIAS_TRACK_ID='karting-canarias';

export function scaleNativeWorldPoint(point,scale){
  if(!point)return point;
  return {...point,x:point.x*scale,y:point.y*scale};
}
const scaleGate=(gate,scale)=>gate?.a&&gate?.b?{
  ...gate,a:scaleNativeWorldPoint(gate.a,scale),b:scaleNativeWorldPoint(gate.b,scale)
}:gate;
const scaleBezierNode=(node,scale)=>({
  ...scaleNativeWorldPoint(node,scale),
  handleIn:scaleNativeWorldPoint(node.handleIn,scale),
  handleOut:scaleNativeWorldPoint(node.handleOut,scale)
});

export function scaleKartingCanariasRaceTrack(track,scale=KARTING_CANARIAS_WORLD_SCALE){
  if(!track||scale===1)return track;
  if(track.meta?.id!==KARTING_CANARIAS_TRACK_ID)
    throw Error('Karting Canarias source track identity mismatch');
  const scalarFields=['trackWidth','grassMargin','sampleStepPx','cellSize','shoulderPx'];
  const scaled={...track,worldW:track.worldW*scale,worldH:track.worldH*scale};
  for(const key of scalarFields)
    if(Number.isFinite(track[key]))scaled[key]=track[key]*scale;
  scaled.centerline=track.centerline.map(p=>({
    ...scaleNativeWorldPoint(p,scale),
    ...(Number.isFinite(p.width)?{width:p.width*scale}:{})
  }));
  scaled.trackShape={
    ...track.trackShape,
    leftEdge:track.trackShape.leftEdge.map(p=>scaleBezierNode(p,scale)),
    rightEdge:track.trackShape.rightEdge.map(p=>scaleBezierNode(p,scale))
  };
  scaled.start=scaleNativeWorldPoint(track.start,scale);
  scaled.finishAnchor=scaleNativeWorldPoint(track.finishAnchor,scale);
  scaled.startLine=scaleGate(track.startLine,scale);
  scaled.finishLine=scaleGate(track.finishLine,scale);
  scaled.checkpoints=(track.checkpoints||[]).map(gate=>scaleGate(gate,scale));
  scaled.meta={
    ...track.meta,
    imageNative:{...track.meta.imageNative,worldScale:scale}
  };
  // Deliberately NOT scaled: carScale, every vehicle/physics setting, headings,
  // surface types, checkpoint normals, the original image and its tile pixels.
  return scaled;
}

export function scaleKartingCanariasEnvironment(env,scale=KARTING_CANARIAS_WORLD_SCALE){
  if(!env||scale===1)return env;
  if(env.trackId!==KARTING_CANARIAS_TRACK_ID)
    throw Error('Karting Canarias environment track identity mismatch');
  return {
    ...env,
    collisionLines:(env.collisionLines||[]).map(line=>({
      ...line,
      halfThickness:Number(line.halfThickness)*scale,
      nodes:line.nodes.map(node=>({
        ...scaleNativeWorldPoint(node,scale),
        in:scaleNativeWorldPoint(node.in,scale),
        out:scaleNativeWorldPoint(node.out,scale)
      }))
    })),
    collisionZones:(env.collisionZones||[]).map(zone=>({
      ...zone,points:zone.points.map(p=>scaleNativeWorldPoint(p,scale))
    }))
  };
}
