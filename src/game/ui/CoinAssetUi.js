export const TDR_COIN_KEY='ui:tdr-coin';
export const TDR_COIN_PATH=`${import.meta.env.BASE_URL||'/'}assets/ui/moneda-tdr.webp`;

export function preloadTdrCoin(scene){
  if(!scene?.textures?.exists?.(TDR_COIN_KEY))scene?.load?.image?.(TDR_COIN_KEY,TDR_COIN_PATH);
}

function visit(node,fn){
  if(!node)return;
  fn(node);
  if(Array.isArray(node.list))for(const child of node.list)visit(child,fn);
}

export function replaceProceduralCoins(scene,root,size=24){
  if(!scene?.textures?.exists?.(TDR_COIN_KEY)||!root)return;
  const targets=[];
  visit(root,node=>{
    if(typeof node?.text!=='string'||node.__tdrCoinPatched)return;
    const s=node.text.trim();
    if(s==='◈'||/^●\s*\d/.test(s)||/^◈\s*[+\-]?\d/.test(s))targets.push(node);
  });
  for(const t of targets){
    const original=t.text.trim();
    t.__tdrCoinPatched=true;
    if(original==='◈'){
      t.setVisible(false);
      const img=scene.add.image(t.x,t.y,TDR_COIN_KEY).setOrigin(t.originX??0,t.originY??.5);
      const s=size/Math.max(1,img.height);img.setScale(s);
      t.parentContainer?.add?.(img);
      continue;
    }
    const clean=original.replace(/^[◈●]\s*/,'');
    t.setText(clean);
    const b=t.getBounds?.();
    const h=Math.max(18,Math.min(size,Number(t.style?.fontSize||size)*1.45||size));
    const img=scene.add.image((b?.left??t.x)-h*.72,(b?.centerY??t.y),TDR_COIN_KEY).setOrigin(.5);
    img.setScale(h/Math.max(1,img.height));
    t.parentContainer?.add?.(img);
  }
}
