// IMAGE LAB 2.0 presentation smoke. No browser, image bytes or cloud services needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui=fs.readFileSync('src/game/ui/adminImageLabV2.js','utf8');
const css=fs.readFileSync('src/game/ui/adminImageLabV2.css','utf8');
const core=fs.readFileSync('src/game/ui/adminImageWebpTool.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert.ok(html.includes('name="tdr-dev-version" content="DEV 1.3.48"'));
assert.ok(core.includes("import {mountImageLabV2} from './adminImageLabV2.js'"));
assert.ok(core.includes('skin.presentResult(r,sourceFile,href,'));
assert.ok(core.includes('skin.showSelection(selected[0],selected.length)'));
assert.ok(core.includes('skin.clearOutput()'));
assert.ok(core.includes("const result=await convertFileToImage(file,{format,quality,scale,mobile})"));
assert.ok(core.includes("smallButton('VER ANTES / DESPUÉS'"));
assert.ok(core.includes("new URL('./adminWebpEncoder.worker.js',import.meta.url)"));
assert.match(css,/@media\(max-height:500px\)/);
assert.match(css,/@media\(max-width:550px\)/);
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
const document={createElement:t=>new Element(t),querySelector:()=>({content:'DEV 1.3.48'})};
let serial=0;const revoked=[];
const URL={
  createObjectURL:()=> 'blob:fake-'+(++serial),
  revokeObjectURL:(url)=>revoked.push(url)
};
class Image{set src(url){this._src=url;this.naturalWidth=1024;this.naturalHeight=768;this.onload?.();}}
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
const skin=mount({overlay,panel,head,heading,close,hint,fileWrap,pick,options,formatWrap,formatInput,scaleWrap,
 qualityWrap,qualityInput,qualityValue,note,launch,status,results});
const walk=(root,needle,out=[])=>{
 if(root.className.split(' ').includes(needle))out.push(root);
 for(const child of root.children)walk(child,needle,out);
 return out;
};
assert.equal(walk(panel,'tdr-image-lab__stage-area').length,1);
assert.equal(walk(panel,'tdr-image-lab__side').length,1);
assert.equal(walk(panel,'tdr-image-lab__results-wrap').length,1);
assert.ok(walk(panel,'tdr-image-lab__version')[0].textContent==='DEV 1.3.48');
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
assert.equal(actions[0].disabled,true);
console.log('PASS Image Lab 2.0: version, layout, 4 formats, 5 scales, view, compare, download, zoom, object URL cleanup.');