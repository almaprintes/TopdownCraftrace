// Native HTML text bridge for every Phaser.Text created by the game.
//
// Product rule: graphics quality may change canvas resolution/effects, but never
// text legibility. Phaser Text objects remain as layout/logic anchors so existing
// scene code, setText(), containers, tweens and i18n keep working. Their canvas
// renderer is suppressed and a DOM mirror is kept in sync above the canvas.
//
// This is language-agnostic: the mirror reads the final string from the Phaser
// object after the existing i18n layer has resolved it, so every current/future
// locale automatically uses native device-resolution typography.

const ROOT_ID='tdr-native-text-layer';
const STYLE_ID='tdr-native-text-style';

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
#${ROOT_ID}{position:absolute;inset:0;z-index:24000;pointer-events:none;overflow:hidden;contain:layout paint;}
#${ROOT_ID} .tdr-native-text{position:absolute;left:0;top:0;margin:0;padding:0;white-space:pre;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;transform-origin:0 0;box-sizing:border-box;}
`;
  document.head.appendChild(style);
}

function rgbaFromFill(value,fallback='transparent'){
  if(value===null||value===undefined||value==='')return fallback;
  if(typeof value==='string')return value;
  if(typeof value==='number')return `#${Math.max(0,value>>>0).toString(16).padStart(6,'0').slice(-6)}`;
  return fallback;
}

function px(value,fallback=0){
  const n=parseFloat(String(value??''));
  return Number.isFinite(n)?n:fallback;
}

function getHost(game){
  const canvas=game?.canvas;
  return canvas?.parentElement||document.getElementById('app')||document.body;
}

function ensureRoot(game){
  ensureStyle();
  const host=getHost(game);
  if(!host)return null;
  const computed=getComputedStyle(host);
  if(computed.position==='static')host.style.position='relative';
  let root=host.querySelector(`#${ROOT_ID}`);
  if(!root){root=document.createElement('div');root.id=ROOT_ID;host.appendChild(root);}
  return root;
}

function renderedCamera(text){
  const cams=text?.scene?.cameras?.cameras||[];
  for(const cam of cams){
    if(!cam||cam.visible===false)continue;
    const id=Number(cam.id)||0;
    if(id&&((Number(text.cameraFilter)||0)&id)!==0)continue;
    return cam;
  }
  return cams[0]||null;
}

function worldPose(text){
  try{
    const m=text.getWorldTransformMatrix?.();
    if(m){
      const sx=Math.hypot(Number(m.a)||0,Number(m.b)||0)||1;
      const sy=Math.hypot(Number(m.c)||0,Number(m.d)||0)||1;
      return {x:Number(m.tx)||0,y:Number(m.ty)||0,rotation:Math.atan2(Number(m.b)||0,Number(m.a)||0),scaleX:sx,scaleY:sy};
    }
  }catch{}
  return {x:Number(text?.x)||0,y:Number(text?.y)||0,rotation:Number(text?.rotation)||0,scaleX:Number(text?.scaleX)||1,scaleY:Number(text?.scaleY)||1};
}

function styleNode(text,node){
  const s=text?.style||{};
  const fontSize=px(s.fontSize,16);
  node.style.fontFamily=String(s.fontFamily||'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif');
  node.style.fontSize=`${fontSize}px`;
  node.style.fontWeight=String(s.fontStyle||'').includes('bold')||String(s.fontStyle||'').includes('900')?'700':'400';
  node.style.fontStyle=String(s.fontStyle||'').includes('italic')?'italic':'normal';
  node.style.color=rgbaFromFill(s.color||s.fill,'#ffffff');
  node.style.textAlign=String(s.align||'left');
  node.style.lineHeight=s.lineSpacing?`${Math.max(1,fontSize+Number(s.lineSpacing||0))}px`:'normal';
  node.style.background=rgbaFromFill(s.backgroundColor,'transparent');
  const p=s.padding||{};
  const pxv=Number(p.x??p.left??0)||0, pyv=Number(p.y??p.top??0)||0;
  node.style.padding=`${pyv}px ${pxv}px`;
  const fixed=Number(s.fixedWidth)||0;
  const wrap=Number(s.wordWrapWidth||s.wordWrap?.width)||0;
  node.style.width=fixed>0?`${fixed}px`:(wrap>0?`${wrap}px`:'max-content');
  node.style.maxWidth=wrap>0?`${wrap}px`:'none';
  node.style.whiteSpace=wrap>0?'pre-wrap':'pre';
  node.style.overflowWrap=wrap>0?'break-word':'normal';
  const stroke=rgbaFromFill(s.stroke,'transparent');
  const strokeThickness=Math.max(0,Number(s.strokeThickness)||0);
  node.style.webkitTextStroke=strokeThickness>0?`${Math.min(2,strokeThickness)}px ${stroke}`:'0 transparent';
  const sh=text?._shadow||s.shadow;
  if(sh){
    const ox=Number(sh.offsetX??sh.x??0)||0,oy=Number(sh.offsetY??sh.y??0)||0,blur=Number(sh.blur??0)||0,color=rgbaFromFill(sh.color,'rgba(0,0,0,.6)');
    node.style.textShadow=`${ox}px ${oy}px ${blur}px ${color}`;
  }else node.style.textShadow='none';
}

function syncEntry(game,text,node){
  if(!text?.scene||text.destroyed){try{node.remove();}catch{}return false;}
  const canvas=game?.canvas,host=getHost(game);if(!canvas||!host)return true;
  const cam=renderedCamera(text);if(!cam){node.style.display='none';return true;}
  const canvasRect=canvas.getBoundingClientRect(),hostRect=host.getBoundingClientRect();
  const gx=Math.max(1,Number(game.scale?.width)||canvas.width||1),gy=Math.max(1,Number(game.scale?.height)||canvas.height||1);
  const cssX=canvasRect.width/gx,cssY=canvasRect.height/gy;
  const pose=worldPose(text);
  const sfx=Number(text.scrollFactorX);const sfy=Number(text.scrollFactorY);
  const scrollX=Number(cam.scrollX)||0,scrollY=Number(cam.scrollY)||0,zoom=Number(cam.zoom)||1;
  const fx=Number.isFinite(sfx)?sfx:1,fy=Number.isFinite(sfy)?sfy:1;
  const screenX=(Number(cam.x)||0)+(pose.x-scrollX*fx)*zoom;
  const screenY=(Number(cam.y)||0)+(pose.y-scrollY*fy)*zoom;
  const left=canvasRect.left-hostRect.left+screenX*cssX;
  const top=canvasRect.top-hostRect.top+screenY*cssY;
  const ox=Math.max(0,Math.min(1,Number(text.originX)??0));
  const oy=Math.max(0,Math.min(1,Number(text.originY)??0));
  const finalScaleX=pose.scaleX*zoom*cssX,finalScaleY=pose.scaleY*zoom*cssY;
  const alpha=Math.max(0,Math.min(1,Number(text.alpha)??1));
  node.style.display=text.visible===false||alpha<=0?'none':'block';
  node.style.opacity=String(alpha);
  node.style.left=`${left}px`;node.style.top=`${top}px`;
  node.style.transform=`translate(${-ox*100}%,${-oy*100}%) rotate(${pose.rotation}rad) scale(${finalScaleX},${finalScaleY})`;
  const value=Array.isArray(text.text)?text.text.join('\n'):String(text.text??'');
  if(node.textContent!==value)node.textContent=value;
  styleNode(text,node);
  return true;
}

export function installHtmlTextRuntime(game){
  if(!game||globalThis.__tdrHtmlTextRuntimeInstalled)return;
  const Phaser=globalThis.Phaser;
  if(!Phaser?.GameObjects?.Text)return;
  globalThis.__tdrHtmlTextRuntimeInstalled=true;
  const root=ensureRoot(game);if(!root)return;
  const entries=new Map();
  const TextProto=Phaser.GameObjects.Text.prototype;
  const originalDestroy=TextProto.destroy;
  const originalWebGL=TextProto.renderWebGL;
  const originalCanvas=TextProto.renderCanvas;

  // Suppress only the glyph rasterization. The Phaser object stays fully alive as
  // a position/layout/input anchor for existing scene code.
  TextProto.renderWebGL=function(){};
  TextProto.renderCanvas=function(){};

  const register=text=>{
    if(!text||entries.has(text))return;
    const node=document.createElement('div');node.className='tdr-native-text';root.appendChild(node);entries.set(text,node);
  };

  const factoryProto=Phaser.GameObjects.GameObjectFactory?.prototype;
  if(factoryProto&&typeof factoryProto.text==='function'&&!factoryProto.__tdrNativeHtmlTextFactory){
    const originalFactory=factoryProto.text;
    factoryProto.text=function(...args){const text=originalFactory.apply(this,args);register(text);return text;};
    factoryProto.__tdrNativeHtmlTextFactory=true;
  }

  // Boot-time texts may already exist before the factory patch. Register them.
  for(const scene of Object.values(game.scene?.keys||{}))for(const child of scene?.children?.list||[])if(child instanceof Phaser.GameObjects.Text)register(child);

  TextProto.destroy=function(...args){const node=entries.get(this);if(node){try{node.remove();}catch{}entries.delete(this);}return originalDestroy?.apply(this,args);};

  let raf=0;
  const frame=()=>{
    if(!game?.isBooted&&game?.pendingDestroy){return;}
    for(const [text,node] of [...entries])if(!syncEntry(game,text,node))entries.delete(text);
    raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);

  game.events?.once?.('destroy',()=>{
    cancelAnimationFrame(raf);
    for(const node of entries.values())try{node.remove();}catch{}
    entries.clear();try{root.remove();}catch{}
    TextProto.renderWebGL=originalWebGL;TextProto.renderCanvas=originalCanvas;
    globalThis.__tdrHtmlTextRuntimeInstalled=false;
  });
}
