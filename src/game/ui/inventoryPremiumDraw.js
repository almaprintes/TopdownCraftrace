// Shared lightweight Phaser Graphics skin for the two existing Inventory
// entry points (lobby and workshop). Visuals ONLY: original input rectangles,
// pagination, inventory saves, filters and equipment click handlers stay intact.
// No shaders, canvas snapshots, external assets or per-frame animations.
const colorSafe=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
export function inventoryChamferPoints(x,y,w,h,cut=13){
  const c=Math.max(2,Math.min(cut,w*.13,h*.20));
  return [
    {x:x+c,y},{x:x+w-c,y},{x:x+w,y:y+c},
    {x:x+w,y:y+h-c},{x:x+w-c,y:y+h},
    {x:x+c,y:y+h},{x,y:y+h-c},{x,y:y+c}
  ];
}
function polygon(g,pts,fill,alpha,stroke,strokeAlpha=1,weight=1){
  g.fillStyle(fill,alpha);
  g.fillPoints(pts,true);
  if(weight>0){
    g.lineStyle(weight,stroke,strokeAlpha);
    g.strokePoints(pts,true);
  }
}
export function drawInventorySurface(scene,mount,{x,y,w,h,kind='card',accent=0x67e8ff,active=false,installed=false}={}){
  const g=mount(scene.add.graphics());
  accent=colorSafe(accent,0x67e8ff);
  const shell=kind==='shell';
  const card=kind==='card';
  const cut=Math.min(shell?24:card?15:11,h*.15,w*.075);
  const pts=inventoryChamferPoints(x,y,w,h,cut);
  const background=shell?0x061521:card?0x0b2635:0x0a2535;
  polygon(g,pts,background,shell?.97:card?.92:.96,active?accent:shell?0x4fcde4:accent,active?1:shell?.88:.52,shell?2:1);
  // Inset depth with no textures or compositor-intensive blur.
  if(shell){
    polygon(g,inventoryChamferPoints(x+5,y+5,w-10,h-10,cut*.68),
      0x062030,.20,0x65e2fc,.12,1);
    g.fillStyle(0x105875,.14);
    g.fillRect(x+cut+2,y+8,Math.max(0,w*.34-cut),Math.max(1,h-16));
    g.fillStyle(accent,.96);
    g.fillRect(x+cut+2,y,Math.max(16,w*.32),3);
    g.fillStyle(0xf0c566,.65);
    g.fillRect(x+w-Math.max(34,w*.16)-cut-2,y+1,Math.max(16,w*.16),2);
    g.lineStyle(1,0x4ca9bd,.35);
    g.lineBetween(x+24,y+Math.min(90,h*.20),x+w-24,y+Math.min(90,h*.20));
  }else if(card){
    const mid=Math.max(16,w*.43);
    g.fillStyle(active?0x316b66:0x13516a,installed?.07:.15);
    g.fillRect(x+cut+3,y+5,Math.max(4,mid-cut-2),Math.max(1,h-11));
    g.fillStyle(accent,installed?.35:.87);
    g.fillRect(x+cut,y,Math.max(12,w*.28),Math.min(3,h*.04));
    g.fillStyle(accent,installed?.2:.37);
    g.fillRect(x+w-Math.max(14,w*.22)-cut,y+h-2,Math.max(14,w*.22),1);
  }else{
    if(active){
      g.fillStyle(accent,.20);
      g.fillRect(x+cut,y+4,Math.max(1,w-2*cut),Math.max(1,h-8));
    }
    g.fillStyle(accent,active?1:.54);
    g.fillRect(x+cut,y,Math.max(12,w*.32),2);
    if(active){
      g.fillRect(x+cut,y+h-3,Math.max(8,w-cut*2),3);
    }
  }
  return g;
}
