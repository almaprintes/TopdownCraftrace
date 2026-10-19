// Shared lightweight Phaser Graphics skin for the two existing Inventory
// entry points (lobby and workshop). Visuals ONLY: original input rectangles,
// pagination, inventory saves, filters and equipment click handlers stay intact.
// No shaders, canvas snapshots, external assets or per-frame animations.
// DEV 1.2.300: restyle within ONE pooled graphics object per opened modal.
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
export function drawInventorySurface(scene,mount,{x,y,w,h,kind='card',accent=0x67e8ff,active=false,installed=false}={},sharedGraphics=null){
  // All decorative surfaces share one Graphics display object. The pooled
  // object must be mounted before interactive sprites, and reused unchanged.
  const g=sharedGraphics||mount(scene.add.graphics());
  accent=colorSafe(accent,0x67e8ff);
  const shell=kind==='shell';
  const card=kind==='card';
  const cut=Math.min(shell?24:card?15:11,h*.15,w*.075);
  const pts=inventoryChamferPoints(x,y,w,h,cut);
  const ink=shell?0x051522:card?0x0a1a29:0x0c2335;
  polygon(g,pts,ink,shell?.99:.98,active?accent:shell?0x59c8e5:accent,
    active?1:shell?.92:card?.60:.46,shell?2:1);
  if(shell){
    // Cockpit-inspired header rails, sparse precision strokes, NO glow shader.
    polygon(g,inventoryChamferPoints(x+6,y+6,w-12,h-12,cut*.72),
      0x0a2d3d,.18,0x57b6d0,.13,1);
    g.fillStyle(0x0b2f45,.40);
    g.fillRect(x+cut+4,y+10,Math.min(180,w*.23),Math.max(4,h-20));
    g.fillStyle(0x6ce9ff,.96);
    g.fillRect(x+cut,y+2,Math.min(w*.42,360),3);
    g.fillStyle(0xf3c76b,.92);
    g.fillRect(x+w-Math.min(w*.18,150)-cut,y+2,Math.min(w*.18,150),3);
    g.lineStyle(1,0x53a5c4,.34);
    g.lineBetween(x+24,y+Math.min(91,h*.21),x+w-24,y+Math.min(91,h*.21));
  }else if(card){
    // Semi-recessed image bay, bright accent spine, and count/part panel.
    // Every shape is static geometry, batched into one shared Graphics object.
    const bayW=Math.max(32,w*.43);
    g.fillStyle(0x123b4f,installed?.18:.34);
    g.fillRect(x+cut+4,y+8,Math.max(4,bayW-cut-6),Math.max(2,h-16));
    g.fillStyle(accent,installed?.23:.90);
    g.fillRect(x+cut+2,y+2,Math.max(18,w*.27),3);
    g.fillStyle(installed?0xf4bf5c:0x44c8e6,installed?.7:.35);
    g.fillRect(x+bayW,y+15,1,Math.max(4,h-30));
    g.fillStyle(0x020e1c,.47);
    g.fillRect(x+bayW+7,y+h*.55,Math.max(8,w-bayW-cut-15),Math.max(10,h*.29));
    g.fillStyle(accent,installed?.32:.64);
    g.fillRect(x+w-cut-Math.max(18,w*.20),y+h-3,Math.max(18,w*.20),2);
  }else{
    if(active){
      g.fillStyle(0x153c50,.78);
      g.fillRect(x+cut,y+4,Math.max(1,w-2*cut),Math.max(1,h-8));
    }
    g.fillStyle(accent,active?.98:.58);
    g.fillRect(x+cut,y+1,Math.max(14,w*.24),2);
    if(active)g.fillRect(x+cut,y+h-3,Math.max(8,w-2*cut),3);
  }
  return g;
}
