// Only the *published world-space* size changes. The 4344x3258 owner WebP,
// exact binary source and racing car models/physics remain byte-identical.
export const ATLANTICO_WORLD_SCALE=0.94;
export const ATLANTICO_WORLD_TRACK_ID='circuito-atlantico';
const point=(p,s)=>p?{...p,x:Number(p.x)*s,y:Number(p.y)*s}:p;
const gate=(g,s)=>g?.a&&g?.b?{...g,a:point(g.a,s),b:point(g.b,s)}:g;
const bezier=(n,s)=>({...point(n,s),handleIn:point(n.handleIn,s),handleOut:point(n.handleOut,s)});
export function scaleAtlanticoRaceTrack(track,scale=ATLANTICO_WORLD_SCALE){
  if(!track||scale===1)return track;
  if(track.meta?.id!==ATLANTICO_WORLD_TRACK_ID)throw Error('Atlántico: canonical track identity mismatch');
  if(!(scale>0&&scale<=1))throw Error('Atlántico: invalid world scale');
  const out={...track,worldW:track.worldW*scale,worldH:track.worldH*scale};
  for(const field of ['trackWidth','grassMargin','sampleStepPx','cellSize','shoulderPx']){
    if(Number.isFinite(track[field]))out[field]=track[field]*scale;
  }
  out.centerline=track.centerline.map(p=>({
    ...point(p,scale),...(Number.isFinite(p.width)?{width:p.width*scale}:{})
  }));
  out.trackShape={...track.trackShape,
    leftEdge:track.trackShape.leftEdge.map(p=>bezier(p,scale)),
    rightEdge:track.trackShape.rightEdge.map(p=>bezier(p,scale))};
  out.start=point(track.start,scale);
  out.finishAnchor=point(track.finishAnchor,scale);
  out.startLine=gate(track.startLine,scale);
  out.finishLine=gate(track.finishLine,scale);
  out.checkpoints=(track.checkpoints||[]).map(g=>gate(g,scale));
  if(Array.isArray(track.grid))out.grid=track.grid.map(p=>point(p,scale));
  out.meta={...track.meta,imageNative:{...track.meta.imageNative,worldScale:scale}};
  // Do not scale carScale, car physics, steering, camera, gate normals,
  // photo pixel resolution or the six original tile coordinates.
  return out;
}
export function scaleAtlanticoEnvironment(env,scale=ATLANTICO_WORLD_SCALE){
  if(!env||scale===1)return env;
  if(!['track01',ATLANTICO_WORLD_TRACK_ID].includes(env.trackId))
    throw Error('Atlántico: authored environment identity mismatch');
  if(!(scale>0&&scale<=1))throw Error('Atlántico: invalid environment scale');
  return {...env,
    collisionLines:(env.collisionLines||[]).map(line=>({
      ...line,
      ...(Number.isFinite(Number(line.halfThickness))?
        {halfThickness:Number(line.halfThickness)*scale}:{}),
      nodes:(line.nodes||[]).map(n=>({...point(n,scale),
        in:point(n.in,scale),out:point(n.out,scale)}))
    })),
    collisionZones:(env.collisionZones||[]).map(z=>({
      ...z,points:(z.points||[]).map(p=>point(p,scale))
    })),
    environment:(env.environment||[]).map(item=>({
      ...point(item,scale),
      ...(Number.isFinite(Number(item.displayWidth))?
        {displayWidth:Number(item.displayWidth)*scale}:{})
    }))
  };
}
