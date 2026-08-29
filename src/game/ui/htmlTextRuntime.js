import Phaser from 'phaser';

const ROOT_ID='tdr-native-text-layer';
const STYLE_ID='tdr-native-text-style';
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

// These scenes use Phaser cameras/masks as real scrolling viewports. Mirroring
// their Text objects into one global DOM layer breaks the relationship between
// the list, its mask and pointer-driven scrolling. Keep their text in Phaser
// until those screens are migrated as proper DOM lists rather than mirrored text.
const PHASER_SCROLL_SCENES=new Set(['GarageScene','TrackGarageScene']);
function sceneKey(text){try{return String(text?.scene?.sys?.settings?.key||text?.scene?.scene?.key||'');}catch{return '';}}
function shouldUseHtml(text){return !PHASER_SCROLL_SCENES.has(sceneKey(text));}

function ensureRoot(game){
  if(!document.getElementById(STYLE_ID)){
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`#${ROOT_ID}{position:absolute;inset:0;z-index:24000;pointer-events:none;overflow:hidden}#${ROOT_ID} .tdr-native-clip{position:absolute;left:0;top:0;overflow:hidden;pointer-events:none}#${ROOT_ID} .tdr-native-text{position:absolute;left:0;top:0;margin:0;white-space:pre;pointer-events:none;user-select:none;-webkit-user-select:none;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;transform-origin:0 0;box-sizing:border-box}`;
    document.head.appendChild(style);
  }
  const host=game?.canvas?.parentElement||document.getElementById('app')||document.body;
  if(!host)return null;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  let root=host.querySelector(`#${ROOT_ID}`);
  if(!root){root=document.createElement('div');root.id=ROOT_ID;host.appendChild(root);}
  return root;
}

function cameraFor(text){
  const cams=text?.scene?.cameras?.cameras||[];
  return cams.find(c=>c?.visible!==false&&(!c.id||((Number(text.cameraFilter)||0)&c.id)===0))||null;
}

function pose(text){
  try{const m=text.getWorldTransformMatrix?.();if(m)return{x:finite(m.tx),y:finite(m.ty),r:Math.atan2(finite(m.b),finite(m.a)),sx:Math.hypot(finite(m.a),finite(m.b))||1,sy:Math.hypot(finite(m.c),finite(m.d))||1};}catch{}
  return{x:finite(text?.x),y:finite(text?.y),r:finite(text?.rotation),sx:finite(text?.scaleX,1),sy:finite(text?.scaleY,1)};
}
function color(v,f='#fff'){return typeof v==='string'?v:(Number.isFinite(Number(v))?`#${(Number(v)>>>0).toString(16).padStart(6,'0').slice(-6)}`:f);}

function applyStyle(text,node){
  const s=text?.style||{},fs=parseFloat(String(s.fontSize||16))||16,fw=finite(s.fixedWidth),ww=finite(s.wordWrapWidth||s.wordWrap?.width),pad=s.padding||{},fontStyle=String(s.fontStyle||'').toLowerCase();
  node.style.fontFamily=String(s.fontFamily||'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif');
  node.style.fontSize=`${fs}px`;
  node.style.fontWeight=fontStyle.includes('bold')||fontStyle.includes('900')?'700':'400';
  node.style.fontStyle=fontStyle.includes('italic')?'italic':'normal';
  node.style.color=color(s.color||s.fill);
  node.style.textAlign=String(s.align||'left');
  node.style.lineHeight=s.lineSpacing?`${Math.max(1,fs+finite(s.lineSpacing))}px`:'normal';
  node.style.background=s.backgroundColor?color(s.backgroundColor,'transparent'):'transparent';
  node.style.padding=`${finite(pad.y??pad.top)}px ${finite(pad.x??pad.left)}px`;
  node.style.width=fw>0?`${fw}px`:(ww>0?`${ww}px`:'max-content');
  node.style.maxWidth=ww>0?`${ww}px`:'none';
  node.style.whiteSpace=ww>0?'pre-wrap':'pre';
  node.style.overflowWrap=ww>0?'break-word':'normal';
  const st=Math.max(0,finite(s.strokeThickness));
  node.style.webkitTextStroke=st?`${Math.min(2,st)}px ${color(s.stroke,'transparent')}`:'0 transparent';
}

function hierarchyState(text){
  let alpha=Math.max(0,Math.min(1,finite(text?.alpha,1)));
  if(text?.visible===false||text?.active===false)return{visible:false,alpha:0};
  let p=text?.parentContainer||null;const seen=new Set();
  while(p&&!seen.has(p)){
    seen.add(p);
    if(p.visible===false||p.active===false)return{visible:false,alpha:0};
    alpha*=Math.max(0,Math.min(1,finite(p.alpha,1)));
    p=p.parentContainer||null;
  }
  return{visible:alpha>0.001,alpha};
}

function sceneVisible(text){
  try{
    const s=text?.scene;if(!s?.sys)return false;
    if(typeof s.sys.isActive==='function'&&!s.sys.isActive())return false;
    if(typeof s.sys.isVisible==='function'&&!s.sys.isVisible())return false;
  }catch{return false;}
  return true;
}

function inheritedMask(text){
  let o=text;const seen=new Set();
  while(o&&!seen.has(o)){
    seen.add(o);
    if(o.mask)return o.mask;
    o=o.parentContainer||null;
  }
  return null;
}

function maskBounds(mask){
  if(!mask)return null;
  try{
    const source=mask.geometryMask||mask.bitmapMask||mask;
    const b=source?.getBounds?.();
    if(b&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0)return{x:b.x,y:b.y,width:b.width,height:b.height};
  }catch{}
  return null;
}

function sync(game,text,entry){
  const {clip,node}=entry;
  if(!text?.scene){clip.remove();return false;}
  if(!shouldUseHtml(text)){clip.remove();return false;}
  const canvas=game?.canvas,host=canvas?.parentElement;if(!canvas||!host)return true;
  const state=hierarchyState(text);
  if(!state.visible||!sceneVisible(text)){clip.style.display='none';return true;}
  const cam=cameraFor(text);if(!cam){clip.style.display='none';return true;}

  const cr=canvas.getBoundingClientRect(),hr=host.getBoundingClientRect();
  const gx=Math.max(1,finite(game.scale?.width,canvas.width||1)),gy=Math.max(1,finite(game.scale?.height,canvas.height||1));
  const cx=cr.width/gx,cy=cr.height/gy,zoom=Math.max(.001,finite(cam.zoom,1));
  const p=pose(text),fx=Number.isFinite(Number(text.scrollFactorX))?Number(text.scrollFactorX):1,fy=Number.isFinite(Number(text.scrollFactorY))?Number(text.scrollFactorY):1;
  const x=finite(cam.x)+(p.x-finite(cam.scrollX)*fx)*zoom,y=finite(cam.y)+(p.y-finite(cam.scrollY)*fy)*zoom;
  const ox=Math.max(0,Math.min(1,finite(text.originX))),oy=Math.max(0,Math.min(1,finite(text.originY)));

  const camLeft=finite(cam.x),camTop=finite(cam.y),camRight=camLeft+finite(cam.width,gx),camBottom=camTop+finite(cam.height,gy);
  if(x<camLeft-120||x>camRight+120||y<camTop-120||y>camBottom+120){clip.style.display='none';return true;}

  let clipX=cr.left-hr.left+camLeft*cx,clipY=cr.top-hr.top+camTop*cy,clipW=(camRight-camLeft)*cx,clipH=(camBottom-camTop)*cy;
  const mb=maskBounds(inheritedMask(text));
  if(mb){
    const mx=(finite(cam.x)+(mb.x-finite(cam.scrollX))*zoom)*cx+cr.left-hr.left;
    const my=(finite(cam.y)+(mb.y-finite(cam.scrollY))*zoom)*cy+cr.top-hr.top;
    const mw=mb.width*zoom*cx,mh=mb.height*zoom*cy;
    const r=Math.min(clipX+clipW,mx+mw),b=Math.min(clipY+clipH,my+mh);
    clipX=Math.max(clipX,mx);clipY=Math.max(clipY,my);clipW=Math.max(0,r-clipX);clipH=Math.max(0,b-clipY);
    if(clipW<1||clipH<1){clip.style.display='none';return true;}
  }

  clip.style.display='block';
  clip.style.left=`${clipX}px`;clip.style.top=`${clipY}px`;clip.style.width=`${clipW}px`;clip.style.height=`${clipH}px`;
  clip.style.opacity=String(state.alpha*Math.max(0,Math.min(1,finite(cam.alpha,1))));

  node.style.left=`${cr.left-hr.left+x*cx-clipX}px`;
  node.style.top=`${cr.top-hr.top+y*cy-clipY}px`;
  node.style.transform=`translate(${-ox*100}%,${-oy*100}%) rotate(${p.r}rad) scale(${p.sx*zoom*cx},${p.sy*zoom*cy})`;
  const value=Array.isArray(text.text)?text.text.join('\n'):String(text.text??'');
  if(node.textContent!==value)node.textContent=value;
  applyStyle(text,node);
  return true;
}

export function installHtmlTextRuntime(game){
  if(!game||globalThis.__tdrHtmlTextRuntimeInstalled)return;
  globalThis.__tdrHtmlTextRuntimeInstalled=true;
  const root=ensureRoot(game);if(!root){globalThis.__tdrHtmlTextRuntimeInstalled=false;return;}
  const entries=new Map(),proto=Phaser.GameObjects.Text.prototype,originalDestroy=proto.destroy,originalWebGL=proto.renderWebGL,originalCanvas=proto.renderCanvas;

  // Render normally in camera-scrolling scenes. Everywhere else the DOM mirror
  // replaces the Phaser glyphs as before.
  proto.renderWebGL=function(...args){if(!shouldUseHtml(this))return originalWebGL?.apply(this,args);};
  proto.renderCanvas=function(...args){if(!shouldUseHtml(this))return originalCanvas?.apply(this,args);};

  const register=text=>{
    if(!text||entries.has(text)||!shouldUseHtml(text))return;
    const clip=document.createElement('div');clip.className='tdr-native-clip';
    const node=document.createElement('div');node.className='tdr-native-text';clip.appendChild(node);root.appendChild(clip);
    entries.set(text,{clip,node});
  };
  const factory=Phaser.GameObjects.GameObjectFactory.prototype;
  if(!factory.__tdrNativeHtmlTextFactory){
    const original=factory.text;
    factory.text=function(...args){const text=original.apply(this,args);register(text);return text;};
    factory.__tdrNativeHtmlTextFactory=true;
  }
  for(const scene of Object.values(game.scene?.keys||{}))for(const child of scene?.children?.list||[])if(child instanceof Phaser.GameObjects.Text)register(child);
  proto.destroy=function(...args){const entry=entries.get(this);if(entry){entry.clip.remove();entries.delete(this);}return originalDestroy?.apply(this,args);};
  let raf=0;
  const frame=()=>{if(game?.pendingDestroy)return;for(const [text,entry] of [...entries])if(!sync(game,text,entry))entries.delete(text);raf=requestAnimationFrame(frame);};
  raf=requestAnimationFrame(frame);
  game.events?.once?.('destroy',()=>{
    cancelAnimationFrame(raf);for(const entry of entries.values())entry.clip.remove();entries.clear();root.remove();
    proto.renderWebGL=originalWebGL;proto.renderCanvas=originalCanvas;globalThis.__tdrHtmlTextRuntimeInstalled=false;
  });
}
