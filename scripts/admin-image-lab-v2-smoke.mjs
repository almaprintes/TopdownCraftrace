// IMAGE LAB 2.0 presentation smoke. No browser, image bytes or cloud services needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui=fs.readFileSync('src/game/ui/adminImageLabV2.js','utf8');
const css=fs.readFileSync('src/game/ui/adminImageLabV2.css','utf8');
const core=fs.readFileSync('src/game/ui/adminImageWebpTool.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const expectedDevVersion=html.match(/name="tdr-dev-version" content="([^"]+)"/)?.[1];
assert.ok(expectedDevVersion?.startsWith('DEV '));
assert.ok(core.includes("import {mountImageLabV2} from './adminImageLabV2.js'"));
assert.ok(core.includes('skin.presentResult(r,sourceFile,href,'));
assert.ok(core.includes('skin.showSelection(selected[0],selected.length,detectSourceFormat(selected[0]))'));
assert.ok(core.includes('skin.clearOutput()'));
assert.ok(core.includes("const result=await convertFileToImage(file,{format,quality,scale,mobile})"));
assert.ok(core.includes("smallButton('VER ANTES / DESPUÉS'"));
assert.ok(core.includes("new URL('./adminWebpEncoder.worker.js',import.meta.url)"));
assert.match(css,/@media\(max-height:500px\)/);
assert.match(css,/@media\(max-width:550px\)/);
// Landscape layout guard: nothing essential may move below the fold.
// A 100dvh screen owns exactly three rows (header, workspace, result strip).
assert.ok(css.includes('@media (orientation:landscape) and (min-width:600px) and (max-height:820px)'));
assert.ok(css.includes('@media (orientation:landscape) and (min-width:600px) and (max-height:415px)'));
assert.ok(css.includes('height:100dvh!important;max-height:100dvh!important;'));
assert.ok(css.includes('overflow:hidden!important;overscroll-behavior:none!important;'));
assert.match(css,/grid-template-rows:42px minmax\(0,1fr\) auto/);
assert.match(css,/grid-template-rows:34px minmax\(0,1fr\) auto/);
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.ok(css.includes('max-height:45px;overflow-x:auto;overflow-y:hidden'));
assert.ok(css.includes('.tdr-image-lab__footer{display:none}'));

assert.match(core,/env\(safe-area-inset-left/); // inherited from existing overlay
assert.doesNotMatch(ui,/fetch\(|XMLHttpRequest|WebSocket|localStorage/);
assert.ok(ui.includes("current?.compare?.()"));
assert.ok(ui.includes("current?.download?.()"));

class Element{
  constructor(tag){
    this.tag=tag;this.children=[];this.events={};this.attrs={};this.className='';
    this.style={cssText:''};this.hidden=false;this.disabled=false;this.textContent='';
    this.value='';this.classList={add:(...names)=>{this.className=[this.className,...names].join(' ').trim();}};
    this.clientWidth=900;this.scrollLeft=0;this.scrollTop=0;
  }
  append(...children){
    for(const child of children){child.remove();this.children.push(child);child.parent=this;}
  }
  appendChild(el){this.append(el);return el;}
  replaceChildren(...children){for(const c of this.children)c.parent=null;this.children=[];this.append(...children);}
  insertBefore(el,before){el.remove();const i=this.children.indexOf(before);if(i<0)this.append(el);else{this.children.splice(i,0,el);el.parent=this;}}
  get firstChild(){return this.children[0]||null;}
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
  set innerHTML(value){
    this.replaceChildren();this._html=value;
    if(value.includes('<strong'))this.append(new Element('strong'));
    if(value.includes('<span'))this.append(new Element('span'));
  }
  querySelector(tag){
    for(const e of this.children){if(e.tag===tag)return e;const n=e.querySelector(tag);if(n)return n;}
    return null;
  }
  setAttribute(k,v){this.attrs[k]=String(v);}
  addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
  dispatchEvent(e){for(const fn of this.events[e.type]||[])fn(e);}
  click(){this.dispatchEvent({type:'click'});}
  removeAttribute(k){if(k==='src')this.src='';delete this.attrs[k];}
  getBoundingClientRect(){return{left:0,width:900};}
  focus(){}
}
const document={createElement:t=>new Element(t),querySelector:()=>({content:expectedDevVersion})};
let serial=0;const revoked=[];
const URL={
  createObjectURL:()=> 'blob:fake-'+(++serial),
  revokeObjectURL:(url)=>revoked.push(url)
};
let fixtureWidth=1024,fixtureHeight=768;
class Image{set src(url){this._src=url;this.naturalWidth=fixtureWidth;this.naturalHeight=fixtureHeight;this.onload?.();}}
class Event{constructor(type){this.type=type;}}
const requestAnimationFrame=fn=>fn();
const executable=ui.replace(/^import .*$/gm,'').replace('export function mountImageLabV2','function mountImageLabV2');
const mount=new Function('document','URL','Image','Event','requestAnimationFrame',
 executable+'\nreturn mountImageLabV2;')(document,URL,Image,Event,requestAnimationFrame);
const el=(tag)=>new Element(tag);
const panel=el('div'),overlay=el('section'),head=el('div'),heading=el('div'),close=el('button');
heading.append(el('h2'),el('div'));
const hint=el('p'),fileWrap=el('label'),pick=el('input'),options=el('div'),note=el('div');
fileWrap.append(pick);
const makeWrap=(element)=>{
 const wrap=el('label');wrap.append(el('strong'),element);options.append(wrap);return wrap;
};
const formatInput=el('select');formatInput.value='webp';
const scaleInput=el('select');scaleInput.value='1';
const qualityInput=el('input');qualityInput.value='86';
const formatWrap=makeWrap(formatInput),qualityWrap=makeWrap(qualityInput),scaleWrap=makeWrap(scaleInput);
const qualityValue=qualityWrap.querySelector('strong');
const launch=el('button'),status=el('div'),results=el('div');
panel.append(head,hint,fileWrap,options,note,launch,status,results);
const skin=mount({overlay,panel,head,heading,close,hint,fileWrap,pick,options,formatWrap,formatInput,scaleWrap,scaleInput,
 qualityWrap,qualityInput,qualityValue,note,launch,status,results,
 exportLimits:{mobile:true,getLimits:(requestedFormat,sourceFormat)=>{
   const actual=requestedFormat==='original'?sourceFormat:requestedFormat;
   const maxPixels=actual==='webp'?16_000_000:32_000_000;
   return {mobile:true,maxEdge:8192,maxPixels,usesWasm:actual==='webp'};
 }}});
const walk=(root,needle,out=[])=>{
 if(root.className.split(' ').includes(needle))out.push(root);
 for(const child of root.children)walk(child,needle,out);
 return out;
};
assert.equal(walk(panel,'tdr-image-lab__stage-area').length,1);
assert.equal(walk(panel,'tdr-image-lab__side').length,1);
assert.equal(walk(panel,'tdr-image-lab__results-wrap').length,1);
assert.ok(walk(panel,'tdr-image-lab__version')[0].textContent===expectedDevVersion);
assert.ok(walk(panel,'tdr-image-lab__settings-note').includes(note));
assert.equal(walk(panel,'tdr-image-lab__format-choice').length,4);
assert.equal(walk(panel,'tdr-image-lab__scale-choice').length,5);
const png=walk(panel,'tdr-image-lab__format-choice')[1];
png.click();assert.equal(formatInput.value,'png');
const up=walk(panel,'tdr-image-lab__scale-choice')[3];
up.click();assert.equal(scaleInput.value,'2.5');
const source={name:'Circuito Tenerife.jpg',size:450000};
skin.showSelection(source,1);
assert.ok(walk(panel,'tdr-image-lab__filename')[0].textContent.includes('Circuito Tenerife'));
const output={name:'Circuito Tenerife-x2_5.webp',originalWidth:1024,originalHeight:768,
 width:2560,height:1920,format:'webp',originalBytes:450000,blob:{size:240000}};
let compared=0,downloaded=0;
skin.presentResult(output,source,'blob:export-file',()=>compared++,()=>downloaded++);
assert.equal(walk(panel,'tdr-image-lab__photo-label').length,2);
const actions=walk(panel,'tdr-image-lab__action');
actions[0].click();actions[1].click();
assert.deepEqual([compared,downloaded],[1,1]);
assert.equal(walk(panel,'tdr-image-lab__metric').length,6); // excludes the delta subclass? includes both
const button=walk(panel,'tdr-image-lab__zoom');
button[1].click();
assert.equal(walk(panel,'tdr-image-lab__canvas')[0].style.width,'2560px');
skin.clearOutput();
assert.ok(revoked.length>=2,'Object URLs must be revoked on reset');
// Screenshot regression: a 1320×2868 PNG ×3 requests 3960×8604 pixels.
// This cannot fit the iPhone Canvas edge/memory budget and must be flagged
// before pressing PROCESS. ×2 (2640×5736) remains possible on the iPhone.
fixtureWidth=1320;fixtureHeight=2868;
formatInput.value='webp';formatInput.dispatchEvent(new Event('change'));
skin.showSelection({name:'IMG_7255.png',size:1_800_000},1,'png');
const scales=walk(panel,'tdr-image-lab__scale-choice');
assert.equal(scales[3].disabled,true,'×2.5 exceeds 16 MP on mobile');
assert.equal(scales[4].disabled,true,'×3 exceeds 8192 px and 16 MP on mobile');
assert.equal(scales[2].disabled,false,'×2 is permitted on mobile');
assert.equal(launch.disabled,true,'Invalid selected scale must not start conversion');
scales[2].click();
assert.equal(launch.disabled,false,'Valid selected scale must enable conversion');
assert.ok(walk(panel,'tdr-image-lab__export-hint')[0].textContent.includes('2640 × 5736'));
assert.equal(actions[0].disabled,true);
// Actual iPhone screenshot regression: 2862×3435 PNG and "Mantener formato".
// ×1.5 is 4293×5153, 22.1 MP: allowed via native PNG; ×2 exceeds 32 MP.
fixtureWidth=2862;fixtureHeight=3435;
formatInput.value='original';formatInput.dispatchEvent(new Event('change'));
scaleInput.value='1';scaleInput.dispatchEvent(new Event('change'));
skin.showSelection({name:'IMG_7127.png',type:'image/png',size:9_740_000},1,'png');
assert.equal(scales[1].disabled,false,'PNG ×1.5 must be available on iPhone');
assert.equal(scales[2].disabled,true,'PNG ×2 exceeds mobile 32 MP budget');
scales[1].click();
assert.equal(scaleInput.value,'1.5');
assert.equal(launch.disabled,false,'Native PNG ×1.5 should allow PROCESS');
assert.ok(walk(panel,'tdr-image-lab__export-hint')[0].textContent.includes('4293 × 5153'));
assert.ok(walk(panel,'tdr-image-lab__export-hint')[0].textContent.includes('ALTA MEMORIA'));
formatInput.value='webp';formatInput.dispatchEvent(new Event('change'));
assert.equal(scales[1].disabled,true,'WebP fallback >16 MP must remain protected');
formatInput.value='png';formatInput.dispatchEvent(new Event('change'));
assert.equal(scales[1].disabled,false,'PNG conversion restores ×1.5');
console.log('PASS Image Lab 2.0: version, layout, 4 formats, 5 scales, view, compare, download, zoom, object URL cleanup.');