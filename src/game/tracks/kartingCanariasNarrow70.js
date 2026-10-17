// DEV-only authored Karting Canarias Narrow-70. Source and published version unchanged.
export const NARROW_ID='karting-canarias-narrow70';
export const NARROW_RATIO=70/105;
export const NARROW_WORLD_SCALE=2.5;
const lerp=(a,b,t)=>a+(b-a)*t;
const shift=(edge,origin,ratio)=>({x:lerp(origin.x,edge.x,ratio),y:lerp(origin.y,edge.y,ratio)});
export function narrowCanariasTrack(canonical,editor){
  if(canonical?.meta?.id!=='karting-canarias'||!Array.isArray(editor?.nodes)||editor.nodes.length!==18)
    throw Error('Narrow-70 requires the verified Canarias authoring geometry');
  const ratio=NARROW_RATIO,scale=NARROW_WORLD_SCALE;
  const edge=(list)=>list.map(node=>{
    const index=node.sourceNodeIndex;
    if(!Number.isInteger(index)||!editor.nodes[index])throw Error('Narrow-70 unmatched Bezier control');
    const ref=editor.nodes[index];
    const anchor=shift(node,{x:ref.x*scale,y:ref.y*scale},ratio);
    return {...node,...anchor,
      handleIn:shift(node.handleIn,{x:ref.handleIn.x*scale,y:ref.handleIn.y*scale},ratio),
      handleOut:shift(node.handleOut,{x:ref.handleOut.x*scale,y:ref.handleOut.y*scale},ratio)};
  });
  const trimGate=g=>{
    if(!g?.a||!g?.b)return g;
    const mx=(g.a.x+g.b.x)/2,my=(g.a.y+g.b.y)/2;
    return {...g,a:shift(g.a,{x:mx,y:my},ratio),b:shift(g.b,{x:mx,y:my},ratio)};
  };
  const oldTiles=canonical.meta.imageNative.tiles;
  if(oldTiles.length!==4)throw Error('Narrow-70 needs exactly four original photo tiles');
  const dir='assets/tracks/karting-canarias-narrow70/';
  return {...canonical,
    name:'KARTING CANARIAS · NARROW 70 · DEV',
    trackWidth:canonical.trackWidth*ratio,
    centerline:canonical.centerline.map(p=>({...p,width:p.width*ratio})),
    trackShape:{...canonical.trackShape,
      leftEdge:edge(canonical.trackShape.leftEdge),
      rightEdge:edge(canonical.trackShape.rightEdge)},
    finishLine:trimGate(canonical.finishLine),
    checkpoints:canonical.checkpoints.map(trimGate),
    meta:{...canonical.meta,id:NARROW_ID,trackId:NARROW_ID,publicName:'CANARIAS · NARROW 70 · DEV',
      source:'Derived from verified Karting Canarias Track Studio source (read-only A/B)',
      devOnly:true,experimental:true,variantOf:'karting-canarias',
      originalPhotoUnchanged:true,narrowRatio:ratio,narrowReferenceWidth:70,
      imageNative:{...canonical.meta.imageNative,
        assetPath:dir+'narrow70-master.webp',
        tiles:oldTiles.map(tile=>({...tile,assetPath:dir+'photo-'+
          Math.round(tile.y/1536)+'-'+Math.round(tile.x/1024)+'.webp'}))}};
}
