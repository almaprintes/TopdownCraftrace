import { MenuScene as CurrentMenuScene } from './MenuSeasonScene.js';
import { t } from '../i18n/index.js';

const MODE_KEY='tdr2:gameMode';
const BASE=import.meta.env.BASE_URL||'/';

const MODES=[
  {key:'timeattack',asset:'contrarreloj.webp'},
  {key:'ghost',asset:'fantasma.webp'},
  {key:'survival',asset:'supervivencia.webp'},
  {key:'duel',asset:'duelo.webp'},
  {key:'practice',asset:'area-pruebas.webp'}
];

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class MenuScene extends CurrentMenuScene {
  create(data){
    if(typeof super.create==='function')super.create(data);
    try{
      const started=Number(window.__tdrBootStartedAt)||performance.now();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const elapsedMs=Math.max(0,Math.round(performance.now()-started));
        window.__tdrBootLast={phase:'menu-ready',elapsedMs};
        window.dispatchEvent(new CustomEvent('tdr:bootphase',{detail:{phase:'menu-ready',elapsedMs}}));
        window.dispatchEvent(new CustomEvent('tdr:bootready'));
      }));
    }catch{}
    this.events?.once?.('shutdown',()=>this._closeGameModeModal());
    this.events?.once?.('destroy',()=>this._closeGameModeModal());
  }

  _selectedModeKey(){
    try{
      const key=localStorage.getItem(MODE_KEY)||'timeattack';
      return MODES.some(m=>m.key===key)?key:'timeattack';
    }catch{return'timeattack';}
  }

  _openGameModeModal(){
    if(typeof document==='undefined'||this._gameModeDom?.isConnected)return;
    const selected=this._selectedModeKey();
    let index=Math.max(0,MODES.findIndex(m=>m.key===selected));
    let launching=false;

    const root=document.createElement('div');
    root.className='tdr-mode-dom-root';
    root.dataset.tdrMenuUi='1';
    root.innerHTML=`<style>
.tdr-mode-dom-root{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(2,7,13,.84);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;touch-action:manipulation;overscroll-behavior:none}
.tdr-mode-panel{position:relative;width:min(94vw,1080px);height:min(86vh,440px);min-height:315px;border:1px solid rgba(255,159,67,.82);background:#07131b;box-shadow:0 24px 80px rgba(0,0,0,.58);overflow:hidden;display:flex;flex-direction:column;padding:14px 58px 12px}
.tdr-mode-title{text-align:center;font-size:22px;font-weight:900;line-height:1.1;margin-top:2px}.tdr-mode-help{text-align:center;color:#a9bac9;font-size:9px;margin-top:5px;letter-spacing:.04em}
.tdr-mode-close{position:absolute;right:11px;top:8px;width:42px;height:42px;border:0;background:transparent;color:#a9bac9;font:800 30px/1 system-ui;z-index:5}
.tdr-mode-carousel{flex:1;display:flex;gap:22px;align-items:center;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;padding:8px calc(50% - 112px) 4px;scrollbar-width:none;touch-action:pan-x}.tdr-mode-carousel::-webkit-scrollbar{display:none}
.tdr-mode-card{flex:0 0 224px;height:min(67vh,300px);max-height:300px;min-height:220px;scroll-snap-align:center;scroll-snap-stop:always;border:0;background:transparent;padding:0;opacity:.44;transform:scale(.78);transition:transform .18s ease,opacity .18s ease;outline:none;touch-action:manipulation}.tdr-mode-card img{display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none;-webkit-user-drag:none;filter:drop-shadow(0 12px 18px rgba(0,0,0,.48))}.tdr-mode-card.active{opacity:1;transform:scale(1)}
.tdr-mode-arrow{position:absolute;top:50%;transform:translateY(-35%);width:48px;height:48px;border-radius:50%;border:1px solid #ffb04c;background:#102435;color:#fff;font:800 34px/1 system-ui;z-index:4}.tdr-mode-arrow.prev{left:10px}.tdr-mode-arrow.next{right:10px}.tdr-mode-arrow:disabled{opacity:.3;border-color:#425261}
.tdr-mode-dots{height:18px;display:flex;justify-content:center;align-items:center;gap:12px}.tdr-mode-dot{width:8px;height:8px;border-radius:50%;background:#51606d;opacity:.7}.tdr-mode-dot.active{width:10px;height:10px;background:#ff9f43;opacity:1}
@media(max-height:430px){.tdr-mode-panel{height:94vh;min-height:280px;padding-top:9px;padding-bottom:7px}.tdr-mode-title{font-size:19px}.tdr-mode-help{margin-top:2px}.tdr-mode-card{height:230px;min-height:190px;flex-basis:174px}.tdr-mode-carousel{padding-left:calc(50% - 87px);padding-right:calc(50% - 87px)}}
</style><div class="tdr-mode-panel" role="dialog" aria-modal="true" aria-label="${t('modes.title')}"><button class="tdr-mode-close" type="button" aria-label="Cerrar">×</button><div class="tdr-mode-title">${t('modes.title')}</div><div class="tdr-mode-help">${t('modes.swipe')}</div><button class="tdr-mode-arrow prev" type="button" aria-label="Anterior">‹</button><div class="tdr-mode-carousel">${MODES.map((m,i)=>`<button class="tdr-mode-card${i===index?' active':''}" type="button" data-index="${i}" data-key="${m.key}"><img src="${BASE}assets/ui/game-modes/${m.asset}" alt="${m.key}" draggable="false" loading="eager" decoding="async"></button>`).join('')}</div><button class="tdr-mode-arrow next" type="button" aria-label="Siguiente">›</button><div class="tdr-mode-dots">${MODES.map((_,i)=>`<span class="tdr-mode-dot${i===index?' active':''}" data-dot="${i}"></span>`).join('')}</div></div>`;

    const carousel=root.querySelector('.tdr-mode-carousel');
    const cards=[...root.querySelectorAll('.tdr-mode-card')];
    const dots=[...root.querySelectorAll('.tdr-mode-dot')];
    const prev=root.querySelector('.tdr-mode-arrow.prev');
    const next=root.querySelector('.tdr-mode-arrow.next');
    const close=root.querySelector('.tdr-mode-close');

    const update=(nextIndex,{scroll=false,instant=false}={})=>{
      index=clamp(Number(nextIndex)||0,0,MODES.length-1);
      cards.forEach((card,i)=>card.classList.toggle('active',i===index));
      dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
      if(prev)prev.disabled=index===0;if(next)next.disabled=index===MODES.length-1;
      if(scroll){
        try{cards[index]?.scrollIntoView?.({behavior:instant?'auto':'smooth',block:'nearest',inline:'center'});}catch{}
      }
    };

    const startCurrent=()=>{
      if(launching)return;
      launching=true;
      const key=MODES[index]?.key||'timeattack';
      try{localStorage.setItem(MODE_KEY,key);}catch{}
      this._closeGameModeModal();
      try{this._startSelectedMode?.(key);}catch(err){launching=false;console.error('[game-mode-dom] start failed',err);}
    };

    let scrollTimer=0;
    const settleFromScroll=()=>{
      window.clearTimeout(scrollTimer);
      scrollTimer=window.setTimeout(()=>{
        if(!carousel?.isConnected)return;
        const center=carousel.scrollLeft+carousel.clientWidth/2;
        let best=index,bestDist=Infinity;
        cards.forEach((card,i)=>{const cardCenter=card.offsetLeft+card.offsetWidth/2;const d=Math.abs(cardCenter-center);if(d<bestDist){best=i;bestDist=d;}});
        update(best);
      },70);
    };
    carousel?.addEventListener('scroll',settleFromScroll,{passive:true});
    carousel?.addEventListener('scrollend',()=>settleFromScroll(),{passive:true});

    cards.forEach((card,i)=>card.addEventListener('click',()=>{
      if(i!==index){update(i,{scroll:true});return;}
      startCurrent();
    }));
    prev?.addEventListener('click',()=>update(index-1,{scroll:true}));
    next?.addEventListener('click',()=>update(index+1,{scroll:true}));
    close?.addEventListener('click',()=>this._closeGameModeModal());
    root.addEventListener('click',e=>{if(e.target===root)this._closeGameModeModal();});

    document.body.appendChild(root);
    this._gameModeDom=root;
    this._gameModeModal=root;
    requestAnimationFrame(()=>requestAnimationFrame(()=>update(index,{scroll:true,instant:true})));
  }

  _closeGameModeModal(){
    try{this._gameModeDom?.remove?.();}catch{}
    this._gameModeDom=null;
    this._gameModeModal=null;
  }
}
