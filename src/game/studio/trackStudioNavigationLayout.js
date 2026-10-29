// Pure layout helper: keep every Track Studio toolbar action on-screen.
// Buttons and captions share these exact coordinates across desktop/mobile.
export const TRACK_STUDIO_TOP_TOOLS=Object.freeze([
  'save','load','new','closure','widthDown','widthUp','undo','redo'
]);
export function trackStudioToolbarLayout(width,rightPanelW=280){
  if(!Number.isFinite(width)||width<=0)throw Error('Ancho de pantalla inválido');
  const compact=width<1040;
  if(!compact){
    return {compact:false,twoRows:false,y:29,
      x:[285,329,373,429,477,517,569,609]};
  }
  const usableRight=width-rightPanelW-16;
  const twoRows=usableRight<460;
  if(twoRows){
    // On narrow landscape phones use two groups of four. The top bar
    // remains within its 72px height; avoid drawing captions off-screen.
    const start=Math.min(Math.max(138,width*.23),Math.max(138,usableRight-154));
    const gap=Math.max(36,Math.min(42,(usableRight-start-9)/3));
    return {compact:true,twoRows:true,y:19,
      x:[start,start+gap,start+gap*2,start+gap*3,
         start,start+gap,start+gap*2,start+gap*3]};
  }
  const start=width<840?203:232;
  const gap=Math.max(33,Math.min(42,(usableRight-start-22)/7));
  return {compact:true,twoRows:false,y:24,
    x:Array.from({length:8},(_,i)=>start+i*gap)};
}

// Editor controls (shape, edge, grid, preview) must never spill into the
// inspector on short phones. Two rows remain inside the map viewport.
export function trackStudioShapeToolbarLayout(viewX,viewY,viewWidth){
  const compact=viewWidth<720;
  const x=viewX+10,y=viewY+9;
  const offsets=compact?[[0,0],[112,0],[220,0],[0,46],[112,46]]:
    [[0,0],[114,0],[225,0],[310,0],[447,0]];
  return {compact,points:offsets.map(([dx,dy])=>({x:x+dx,y:y+dy}))};
}
