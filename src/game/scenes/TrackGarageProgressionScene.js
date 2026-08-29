import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageHideSpecialScene.js';
import { isTrackUnlocked, devFullTrackAccessEnabled } from '../tracks/trackUnlocks.js';
import { getLanguage } from '../i18n/index.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

const FONT='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
const ROOT_ID='tdr-track-selector-dom';
const STYLE_ID='tdr-track-selector-dom-style';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function pts(track){return (track?.centerline||[]).map(p=>Array.isArray(p)?{x:+p[0],y:+p[1]}:{x:+p?.x,y:+p?.y}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function surface(track){return /dirt|tierra|gravel|grava/i.test(String(track?.surface||track?.meta?.trackSurface||track?.meta?.surface||''))?'TIERRA':'ASFALTO';}
function lengthWorld(track){const direct=Number(track?.length??track?.trackLength??track?.meta?.length??track?.meta?.trackLength);if(Number.isFinite(direct)&&direct>0)return direct;const p=pts(track);let d=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];d+=Math.hypot(b.x-a.x,b.y-a.y);}return d;}
function lengthM(track){return Math.max(0,Math.round(lengthWorld(track)*.18));}
function sectors(track){const n=Number(track?.sectors);if(Number.isFinite(n)&&n>0)return Math.round(n);return Array.isArray(track?.checkpointFractions)?Math.max(1,track.checkpointFractions.length+1):3;}
function publicName(track){return getTrackPublicName(track,getLanguage()).toUpperCase();}

function trackSvg(track,locked=false){
  if(locked)return '<div class="tdr-ts-lock">🔒</div>';
  const p=pts(track);if(p.length<3)return '<div class="tdr-ts-no-preview">—</div>';
  const xs=p.map(q=>q.x),ys=p.map(q=>q.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),pad=12,scale=Math.min((240-pad*2)/bw,(130-pad*2)/bh),ox=(240-bw*scale)/2-minX*scale,oy=(130-bh*scale)/2-minY*scale;
  const d=p.map((q,i)=>`${i?'L':'M'} ${(q.x*scale+ox).toFixed(1)} ${(q.y*scale+oy).toFixed(1)}`).join(' ')+' Z';
  return `<svg viewBox="0 0 240 130" aria-hidden="true"><path d="${d}" class="tdr-ts-track-shadow"/><path d="${d}" class="tdr-ts-track-road"/></svg>`;
}
function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`#${ROOT_ID}{position:absolute;inset:0;z-index:23000;background:#07111b;color:#fff;font-family:${FONT};pointer-events:auto;display:grid;grid-template-rows:auto 1fr;overflow:hidden}#${ROOT_ID} *{box-sizing:border-box}.tdr-ts-top{height:64px;margin:8px 12px 0;border:1px solid rgba(70,221,255,.35);border-radius:13px;background:#06121d;display:flex;align-items:center;justify-content:space-between;padding:0 16px}.tdr-ts-top h1{font-size:20px;margin:0;letter-spacing:.02em}.tdr-ts-back{border:1px solid #36576a;background:#102332;color:#fff;border-radius:8px;padding:10px 14px;font-weight:800}.tdr-ts-body{min-height:0;display:grid;grid-template-columns:minmax(250px,31%) 1fr;gap:14px;padding:12px}.tdr-ts-list{min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-right:3px}.tdr-ts-card{width:100%;display:grid;grid-template-columns:92px 1fr;gap:11px;align-items:center;border:1px solid rgba(183,192,255,.18);background:#111a33;border-radius:10px;padding:8px;margin:0 0 8px;text-align:left;color:#fff;min-height:88px}.tdr-ts-card.active{border:2px solid #2bff88;background:#12243a}.tdr-ts-card.locked{background:#070b11;color:#8091a1}.tdr-ts-thumb{height:70px;border-radius:8px;background:#071016;display:grid;place-items:center;overflow:hidden}.tdr-ts-thumb svg{width:100%;height:100%}.tdr-ts-track-shadow{fill:none;stroke:#0b0f12;stroke-width:13;stroke-linecap:round;stroke-linejoin:round}.tdr-ts-track-road{fill:none;stroke:#747d82;stroke-width:8;stroke-linecap:round;stroke-linejoin:round}.tdr-ts-lock{font-size:28px}.tdr-ts-card-title{font-weight:900;font-size:13px;line-height:1.1}.tdr-ts-card-meta{font-size:10px;color:#9cb0c2;margin-top:8px;line-height:1.45}.tdr-ts-hero{min-width:0;min-height:0;border:1px solid rgba(183,192,255,.16);border-radius:14px;background:#0c1724;display:grid;grid-template-rows:auto minmax(0,1fr) auto;overflow:hidden}.tdr-ts-hero-head{text-align:center;padding:16px 18px 8px}.tdr-ts-hero-kicker{font-size:10px;color:#6c8395;font-weight:900;letter-spacing:.12em}.tdr-ts-hero-name{font-size:28px;font-weight:1000;margin-top:4px}.tdr-ts-preview{margin:4px 20px 10px;border-radius:14px;background:radial-gradient(circle at 50% 45%,#24402f,#102218 65%,#08110d);display:grid;place-items:center;min-height:0;overflow:hidden}.tdr-ts-preview svg{width:min(88%,700px);height:88%}.tdr-ts-preview .tdr-ts-track-shadow{stroke-width:16}.tdr-ts-preview .tdr-ts-track-road{stroke-width:10}.tdr-ts-locked-hero{font-size:54px;text-align:center}.tdr-ts-locked-hero strong{display:block;font-size:34px;margin-top:8px}.tdr-ts-locked-hero span{display:block;font-size:12px;color:#91a6b6;margin-top:8px}.tdr-ts-footer{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;padding:12px 18px 16px}.tdr-ts-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.tdr-ts-stat{border-right:1px solid rgba(183,192,255,.10);padding:0 10px}.tdr-ts-stat:last-child{border-right:0}.tdr-ts-stat small{display:block;color:#8295a6;font-size:8px;font-weight:900}.tdr-ts-stat strong{display:block;margin-top:4px;font-size:14px}.tdr-ts-select{min-width:220px;height:46px;border:0;border-radius:8px;background:#2bff88;color:#07131b;font-weight:1000;font-size:14px}.tdr-ts-select:disabled{background:#263542;color:#8ea0ad}@media(max-width:760px){.tdr-ts-body{grid-template-columns:43% 1fr;gap:8px;padding:8px}.tdr-ts-card{grid-template-columns:70px 1fr;padding:6px;min-height:76px}.tdr-ts-thumb{height:58px}.tdr-ts-card-title{font-size:11px}.tdr-ts-card-meta{font-size:9px;margin-top:5px}.tdr-ts-hero-name{font-size:20px}.tdr-ts-preview{margin:2px 10px 8px}.tdr-ts-footer{grid-template-columns:1fr;padding:8px 10px 12px}.tdr-ts-select{width:100%;min-width:0;height:40px}.tdr-ts-stats{gap:2px}.tdr-ts-stat{padding:0 5px}.tdr-ts-stat strong{font-size:11px}.tdr-ts-top{height:54px;margin:6px 8px 0}.tdr-ts-top h1{font-size:16px}}@media(max-height:520px){.tdr-ts-top{height:48px}.tdr-ts-body{padding-top:6px}.tdr-ts-card{min-height:68px}.tdr-ts-thumb{height:52px}.tdr-ts-hero-head{padding:8px 10px 4px}.tdr-ts-hero-name{font-size:18px}.tdr-ts-preview{margin-bottom:4px}.tdr-ts-footer{padding-top:5px;padding-bottom:7px}.tdr-ts-select{height:36px}}`;
  document.head.appendChild(s);
}

export class TrackGarageScene extends CurrentTrackGarageScene {
  _fullTrackAccess(){return this._mode==='admin'||devFullTrackAccessEnabled();}
  _lockedTrack(track){return !this._fullTrackAccess()&&!isTrackUnlocked(track?.key||track?.id);}

  create(){
    super.create();

    if(!this._fullTrackAccess()&&Array.isArray(this._tracks)&&this._tracks.length){
      const selectedKey=this._tracks?.[this._index]?.key||this._tracks?.[this._index]?.id;
      const originalOrder=new Map(this._tracks.map((track,i)=>[track?.key||track?.id,i]));
      this._tracks=[...this._tracks].sort((a,b)=>{const aLocked=this._lockedTrack(a)?1:0,bLocked=this._lockedTrack(b)?1:0;if(aLocked!==bLocked)return aLocked-bLocked;return (originalOrder.get(a?.key||a?.id)??0)-(originalOrder.get(b?.key||b?.id)??0);});
      let next=this._tracks.findIndex(t=>(t?.key||t?.id)===selectedKey);if(next<0||this._lockedTrack(this._tracks[next]))next=this._tracks.findIndex(t=>!this._lockedTrack(t));this._index=next>=0?next:0;
      try{this._commercial?.destroy?.(true);}catch{}this._commercial=null;try{this._buildCommercial?.();}catch{}
    }

    if(this._mode!=='admin')this._installDomSelector();
  }

  _installDomSelector(){
    ensureStyle();
    try{this._commercial?.setVisible?.(false);}catch{}
    const host=this.game?.canvas?.parentElement||document.getElementById('app')||document.body;if(!host)return;
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    host.querySelector(`#${ROOT_ID}`)?.remove();
    const root=document.createElement('div');root.id=ROOT_ID;host.appendChild(root);this._trackSelectorDom=root;

    const render=()=>{
      const lang=getLanguage()==='en'?'en':'es',track=this._tracks?.[this._index],locked=this._lockedTrack(track);
      const list=this._tracks.map((t,i)=>{const l=this._lockedTrack(t),name=l?'???':publicName(t);return `<button class="tdr-ts-card ${i===this._index?'active':''} ${l?'locked':''}" data-index="${i}" type="button"><div class="tdr-ts-thumb">${trackSvg(t,l)}</div><div><div class="tdr-ts-card-title">${name}</div><div class="tdr-ts-card-meta">${String(i+1).padStart(2,'0')} · ${l?(lang==='en'?'LOCKED':'BLOQUEADO'):surface(t)}<br>${l?'—':`${lengthM(t)} m · ${sectors(t)} ${lang==='en'?'sectors':'sectores'}`}</div></div></button>`}).join('');
      const hero=locked?`<div class="tdr-ts-locked-hero">🔒<strong>???</strong><span>${lang==='en'?'TRACK LOCKED · DISCOVER IT BY PLAYING':'CIRCUITO BLOQUEADO · DESCÚBRELO JUGANDO'}</span></div>`:trackSvg(track,false);
      root.innerHTML=`<div class="tdr-ts-top"><h1>${lang==='en'?'TRACK SELECTOR':'SELECTOR DE CIRCUITOS'}</h1><button class="tdr-ts-back" type="button">← ${lang==='en'?'BACK':'VOLVER'}</button></div><div class="tdr-ts-body"><div class="tdr-ts-list">${list}</div><section class="tdr-ts-hero"><div class="tdr-ts-hero-head"><div class="tdr-ts-hero-kicker">${lang==='en'?'SELECTED TRACK':'CIRCUITO SELECCIONADO'}</div><div class="tdr-ts-hero-name">${locked?'???':publicName(track)}</div></div><div class="tdr-ts-preview">${hero}</div><div class="tdr-ts-footer"><div class="tdr-ts-stats"><div class="tdr-ts-stat"><small>${lang==='en'?'LENGTH':'LONGITUD'}</small><strong>${locked?'—':`${lengthM(track)} m`}</strong></div><div class="tdr-ts-stat"><small>${lang==='en'?'SECTORS':'SECTORES'}</small><strong>${locked?'—':sectors(track)}</strong></div><div class="tdr-ts-stat"><small>${lang==='en'?'SURFACE':'SUPERFICIE'}</small><strong>${locked?'—':surface(track)}</strong></div></div><button class="tdr-ts-select" type="button" ${locked?'disabled':''}>${locked?(lang==='en'?'LOCKED':'BLOQUEADO'):(lang==='en'?'SELECT TRACK':'SELECCIONAR')}</button></div></section></div>`;
      root.querySelectorAll('[data-index]').forEach(btn=>btn.addEventListener('click',()=>{this._index=clamp(Number(btn.dataset.index)||0,0,this._tracks.length-1);render();requestAnimationFrame(()=>root.querySelector(`[data-index="${this._index}"]`)?.scrollIntoView?.({block:'nearest'}));}));
      root.querySelector('.tdr-ts-select')?.addEventListener('click',()=>this._launchSelected());
      root.querySelector('.tdr-ts-back')?.addEventListener('click',()=>this.scene.start('menu'));
    };
    render();
    this.events.once('shutdown',()=>{try{root.remove();}catch{}this._trackSelectorDom=null;});
  }

  _trackItem(x,y,w,h,track,i){
    const out=super._trackItem(x,y,w,h,track,i);if(!out?.item||!this._lockedTrack(track))return out;
    const veil=this.add.rectangle(0,0,w,h,0x03070d,.88).setOrigin(0),lock=this.add.text(w/2,h/2-12,'🔒',{fontFamily:FONT,fontSize:'25px',color:'#ffffff'}).setOrigin(.5),mystery=this.add.text(w/2,h/2+22,'???',{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#d7e4ee',letterSpacing:2}).setOrigin(.5);out.item.add([veil,lock,mystery]);try{out.item.bringToTop(out.hit);}catch{}return out;
  }

  _trackHero(root,g,x,y,w,h){
    const track=this._tracks?.[this._index];super._trackHero(root,g,x,y,w,h);if(!root||!this._lockedTrack(track))return;const veil=this.add.rectangle(x,y,w,h,0x03070d,.91).setOrigin(0).setStrokeStyle(2,0x526a7a,.75),lock=this.add.text(x+w/2,y+h*.39,'🔒',{fontFamily:FONT,fontSize:'44px',color:'#ffffff'}).setOrigin(.5),title=this.add.text(x+w/2,y+h*.54,'???',{fontFamily:FONT,fontSize:'34px',fontStyle:'bold',color:'#ffffff',letterSpacing:4}).setOrigin(.5),note=this.add.text(x+w/2,y+h*.66,'CIRCUITO BLOQUEADO\nDESCÚBRELO JUGANDO',{fontFamily:FONT,fontSize:'12px',fontStyle:'bold',color:'#8fa9ba',align:'center',lineSpacing:5}).setOrigin(.5);root.add([veil,lock,title,note]);
  }

  _launchSelected(...args){
    const track=this._tracks?.[this._index];if(this._lockedTrack(track)){return;}return super._launchSelected(...args);
  }
}
