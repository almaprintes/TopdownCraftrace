// One SVG route renderer for loading previews. Rally stages are OPEN paths:
// never emit the SVG Z command, which connects the final checkpoint to start.
export function trackPreviewSvgPath(points,{closed=true,scale=1,offsetX=0,offsetY=0}={}){
 if(!Array.isArray(points)||points.length<2)return '';
 const commands=[];
 for(const p of points){
  const x=Number(p?.x),y=Number(p?.y);
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  commands.push((commands.length?'L':'M')+' '+(x*scale+offsetX).toFixed(1)+' '+(y*scale+offsetY).toFixed(1));
 }
 if(commands.length<2)return '';
 return commands.join(' ')+(closed?' Z':'');
}
