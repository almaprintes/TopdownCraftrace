// 7 Picos: install a larger *logical* race world, but reuse the original
// 1448x1086 WebP texture. No extra decoded GPU pixels or per-frame calculations.
// Source .tdrtrack remains immutable and portable.
export const SIETE_PICOS_WORLD_SCALE=2.5;
export const SIETE_PICOS_TRACK_ID='siete-picos';
const point=(p,s)=>p?{...p,x:Number(p.x)*s,y:Number(p.y)*s}:p;
const gate=(g,s)=>g?.a&&g?.b?{...g,a:point(g.a,s),b:point(g.b,s)}:g;
const bezier=(n,s)=>({...point(n,s),handleIn:point(n.handleIn,s),handleOut:point(n.handleOut,s)});
export function scaleSietePicosTrack(track,scale=SIETE_PICOS_WORLD_SCALE){
  if(track?.meta?.id!==SIETE_PICOS_TRACK_ID||track.closed!==true||scale!==2.5)
    throw Error('7 Picos: invalid official world scale');
  const out={...track,worldW:track.worldW*scale,worldH:track.worldH*scale};
  for(const f of ['trackWidth','grassMargin','sampleStepPx','cellSize','shoulderPx'])
    if(Number.isFinite(Number(track[f])))out[f]=Number(track[f])*scale;
  out.centerline=track.centerline.map(p=>({...point(p,scale),
    ...(Number.isFinite(Number(p.width))?{width:Number(p.width)*scale}:{})}));
  out.trackShape={...track.trackShape,
    leftEdge:track.trackShape.leftEdge.map(n=>bezier(n,scale)),
    rightEdge:track.trackShape.rightEdge.map(n=>bezier(n,scale))};
  out.start=point(track.start,scale);
  out.finishAnchor=point(track.finishAnchor,scale);
  out.startLine=gate(track.startLine,scale);
  out.finishLine=gate(track.finishLine,scale);
  out.checkpoints=(track.checkpoints||[]).map(g=>gate(g,scale));
  if(Array.isArray(track.grid))out.grid=track.grid.map(p=>point(p,scale));
  out.meta={...track.meta,
    imageNative:{...track.meta.imageNative,worldScale:scale}};
  // Car size, physics, steering, headings, gate normals and original photo do not change.
  return out;
}
