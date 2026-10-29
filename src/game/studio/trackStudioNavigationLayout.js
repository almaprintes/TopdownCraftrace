// Pure, independently testable coordinates for Track Studio's compact UI.
// All measurements are Phaser logical units, not physical screenshot pixels.
export const TRACK_STUDIO_TOP_TOOLS=Object.freeze([
  'save','load','new','closure','widthDown','widthUp','undo','redo'
]);
export function trackStudioToolbarLayout(width,rightPanelW=280){
  if(!Number.isFinite(width)||width<=0)throw Error('Ancho de pantalla inválido');
  const right=Math.max(280,width-rightPanelW);
  const twoRows=right<790;
  if(!twoRows){
    const start=214,usable=right-start-7;
    const gap=Math.min(76,usable/8);
    const buttonWidth=Math.max(58,Math.min(70,gap-5));
    return {compact:false,twoRows:false,width:buttonWidth,height:55,
      x:Array.from({length:8},(_,i)=>start+gap*i+gap/2),
      y:Array.from({length:8},()=>38)};
  }
  // The previous layout placed icons 42px apart and drew captions separately:
  // at 1.7x screenshot scale those captions visibly overlapped.
  // Each new button owns its own caption INSIDE a fixed hit rectangle.
  const start=width<740?Math.max(125,Math.min(155,right-260)):Math.max(155,Math.min(203,right-285));
  const gap=Math.min(68,(right-start-8)/4);
  const buttonWidth=Math.max(48,gap-5);
  return {compact:true,twoRows:true,width:buttonWidth,height:32,
    x:Array.from({length:8},(_,i)=>start+gap*(i%4)+gap/2),
    y:Array.from({length:8},(_,i)=>i<4?20:55)};
}
export function trackStudioShapeToolbarLayout(viewX,viewY,viewWidth){
  const x=viewX+10,y=viewY+10;
  const sizes=[119,108,87,111,118];
  const gap=7;
  const sum=sizes.reduce((a,b)=>a+b,0)+gap*4;
  if(viewWidth>=sum+20){
    let offset=0;
    return {compact:false,rows:1,
      points:sizes.map(width=>{const p={x:x+offset,y,width,height:38};offset+=width+gap;return p;})};
  }
  const twoRows=viewWidth>=380;
  const offsets=twoRows?[[0,0],[128,0],[244,0],[0,46],[120,46]]:
    [[0,0],[128,0],[0,46],[128,46],[0,92]];
  return {compact:true,rows:twoRows?2:3,
    points:offsets.map(([dx,dy],i)=>({x:x+dx,y:y+dy,width:sizes[i],height:38}))};
}
