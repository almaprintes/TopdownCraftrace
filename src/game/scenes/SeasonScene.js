import Phaser from 'phaser';
import { getCurrentRaceEvent, claimCurrentRaceEvent, RACE_EVENTS } from '../events/raceEvents.js';
import { getLanguage } from '../i18n/index.js';
import { INDUCTION_SEASON, seasonText } from '../seasons/seasonCatalog.js';

const BASE=import.meta.env.BASE_URL||'/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const MATERIAL_ART={
  scrap:'chatarra.webp',
  alloy:'aleacion.webp',
  rubber:'goma.webp',
  compound:'compuesto.webp',
  disc:'disco_metalico.webp',
  spring:'muelle.webp',
  gear:'engranaje.webp',
  ecu:'electronica.webp'
};
const MATERIAL_NAMES={
  scrap:{es:'Chatarra',en:'Scrap'},alloy:{es:'Aleación',en:'Alloy'},rubber:{es:'Goma',en:'Rubber'},compound:{es:'Compuesto',en:'Compound'},
  disc:{es:'Disco',en:'Disc'},spring:{es:'Muelle',en:'Spring'},gear:{es:'Engranaje',en:'Gear'},ecu:{es:'Electrónica',en:'Electronics'}
};

export class SeasonScene extends Phaser.Scene {
  constructor(){super('season');}

  create(){
    this.cameras.main.setBackgroundColor('#061019');
    this._mount();
    this.events.once('shutdown',()=>this._unmount());
  }

  _unmount(){
    try{this._root?.remove();}catch{}
    this._root=null;
    document.getElementById('tdr-season-dom-style')?.remove?.();
  }

  _mount(){
    this._unmount();
    const style=document.createElement('style');
    style.id='tdr-season-dom-style';
    style.textContent=`
      #tdr-season-dom{position:fixed;inset:0;z-index:25000;background:#061019;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none}
      #tdr-season-dom *{box-sizing:border-box}
      #tdr-season-dom button{font:inherit;color:inherit}
      #tdr-season-dom .s-head{height:72px;display:grid;grid-template-columns:96px minmax(0,1fr) 300px;align-items:center;gap:18px;padding:0 28px;background:#0a1b28;border-top:3px solid #d8a73a;border-bottom:1px solid rgba(53,207,255,.45)}
      #tdr-season-dom .s-back{height:38px;border:1px solid #5b7284;background:#0e1d2a;border-radius:4px;font-size:10px;font-weight:900;letter-spacing:.08em;cursor:pointer}
      #tdr-season-dom .s-title{font-size:24px;line-height:1;font-weight:1000;letter-spacing:.01em}
      #tdr-season-dom .s-sub{margin-top:7px;font-size:9px;font-weight:800;letter-spacing:.09em;color:#8fa4b5}
      #tdr-season-dom .s-total{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px}
      #tdr-season-dom .s-count{font-size:12px;font-weight:1000;color:#f0c65a}
      #tdr-season-dom .s-bar{height:10px;background:#142532;border:1px solid rgba(255,255,255,.11);overflow:hidden}
      #tdr-season-dom .s-bar>i{display:block;height:100%;background:#35cfff}

      #tdr-season-dom .season-main{height:calc(100% - 72px);display:flex;flex-direction:column;min-height:0}
      #tdr-season-dom .track-head{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 34px;flex:0 0 auto}
      #tdr-season-dom .track-title{font-size:11px;font-weight:1000;letter-spacing:.16em;color:#a8bac8}
      #tdr-season-dom .track-note{font-size:8px;font-weight:900;letter-spacing:.1em;color:#667b8c}

      #tdr-season-dom .stage-scroll{position:relative;min-height:0;flex:1;display:flex;gap:22px;overflow-x:auto;overflow-y:hidden;padding:0 max(34px,6vw) 22px;scroll-snap-type:x mandatory;scroll-padding-inline:max(34px,6vw);-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x}
      #tdr-season-dom .stage-scroll::-webkit-scrollbar{height:8px}
      #tdr-season-dom .stage-scroll::-webkit-scrollbar-track{background:#09141d}
      #tdr-season-dom .stage-scroll::-webkit-scrollbar-thumb{background:#294151;border-radius:8px}

      #tdr-season-dom .stage-slide{position:relative;flex:0 0 min(88vw,980px);height:100%;min-width:620px;scroll-snap-align:center;scroll-snap-stop:always;border:1px solid #314653;background:linear-gradient(135deg,#0b1721,#08131c 58%,#0a1822);overflow:hidden;display:grid;grid-template-columns:minmax(250px,31%) minmax(0,1fr);grid-template-rows:1fr;box-shadow:0 14px 34px rgba(0,0,0,.22)}
      #tdr-season-dom .stage-slide:before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,rgba(53,207,255,.035),transparent 38%,rgba(216,167,58,.025));pointer-events:none}
      #tdr-season-dom .stage-slide.done{border-color:rgba(57,255,154,.7)}
      #tdr-season-dom .stage-slide.active{border:2px solid #35cfff;box-shadow:0 0 0 1px rgba(53,207,255,.12),0 14px 38px rgba(0,0,0,.3)}
      #tdr-season-dom .stage-slide.locked{opacity:.72}

      #tdr-season-dom .mission-pane{position:relative;z-index:2;padding:24px 24px 20px;background:linear-gradient(180deg,rgba(7,22,32,.96),rgba(7,18,27,.9));border-right:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;min-width:0}
      #tdr-season-dom .stage-kicker{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:9px;font-weight:1000;letter-spacing:.15em;color:#6deaff}
      #tdr-season-dom .stage-state{padding:5px 8px;background:#071119;color:#657583;white-space:nowrap}
      #tdr-season-dom .stage-slide.active .stage-state{color:#6deaff}
      #tdr-season-dom .stage-slide.done .stage-state{color:#62ffb2}
      #tdr-season-dom .mission-title{margin:24px 0 0;font-size:32px;line-height:1;font-weight:1000;letter-spacing:-.025em}
      #tdr-season-dom .mission-desc{margin-top:21px;font-size:12px;line-height:1.45;color:#b9c7d2;max-width:95%}
      #tdr-season-dom .objective{margin-top:auto;padding-top:18px}
      #tdr-season-dom .objective-label{font-size:8px;font-weight:1000;letter-spacing:.14em;color:#7f94a6}
      #tdr-season-dom .objective-value{margin-top:10px;font-size:13px;font-weight:1000;color:#6deaff}
      #tdr-season-dom .objective .s-bar{margin-top:12px;height:11px}

      #tdr-season-dom .lanes{position:relative;z-index:2;min-width:0;display:grid;grid-template-rows:1fr 1fr}
      #tdr-season-dom .lane{position:relative;min-height:0;padding:24px 34px 22px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
      #tdr-season-dom .lane.free{border-bottom:1px solid rgba(255,255,255,.1);background:radial-gradient(circle at 50% 54%,rgba(57,255,154,.055),transparent 48%)}
      #tdr-season-dom .lane.premium{background:radial-gradient(circle at 50% 54%,rgba(216,167,58,.06),transparent 48%)}
      #tdr-season-dom .lane:before{content:'';position:absolute;left:34px;right:34px;top:54%;height:3px;transform:translateY(-50%);background:linear-gradient(90deg,transparent,#264657 12%,#264657 88%,transparent);box-shadow:0 0 18px rgba(53,207,255,.06)}
      #tdr-season-dom .lane.premium:before{background:linear-gradient(90deg,transparent,#5a4521 12%,#5a4521 88%,transparent);box-shadow:0 0 18px rgba(216,167,58,.06)}
      #tdr-season-dom .lane-label{position:absolute;left:34px;top:15px;font-size:9px;font-weight:1000;letter-spacing:.16em;color:#62ffb2;z-index:4}
      #tdr-season-dom .lane.premium .lane-label{color:#f0c65a}

      #tdr-season-dom .reward-showcase{position:relative;z-index:2;width:min(92%,650px);height:132px;margin:17px auto 0;display:flex;align-items:center;justify-content:center;gap:10px;padding:7px 14px;background:linear-gradient(180deg,rgba(10,28,23,.72),rgba(5,15,14,.9));border:1px solid rgba(57,255,154,.25);box-shadow:0 14px 34px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.035);overflow:visible}
      #tdr-season-dom .stage-slide.active .lane.free .reward-showcase{border-color:rgba(98,255,178,.58);box-shadow:0 0 24px rgba(57,255,154,.08),0 14px 34px rgba(0,0,0,.36)}
      #tdr-season-dom .loot{position:relative;flex:0 1 82px;width:82px;height:104px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 8px 9px rgba(0,0,0,.5))}
      #tdr-season-dom .loot.coin{flex-basis:116px;width:116px;height:112px}
      #tdr-season-dom .loot img{display:block;max-width:100%;max-height:92px;object-fit:contain;transform:scale(1.02);transition:transform .15s}
      #tdr-season-dom .loot.coin img{max-height:108px;max-width:116px}
      #tdr-season-dom .stage-slide.active .loot img{transform:scale(1.07)}
      #tdr-season-dom .loot-qty{position:absolute;right:-2px;bottom:2px;min-width:34px;height:24px;padding:0 7px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(180deg,#14392c,#09231a);border:1px solid rgba(98,255,178,.7);box-shadow:0 4px 10px rgba(0,0,0,.45);font-size:11px;font-weight:1000;color:#fff;white-space:nowrap}
      #tdr-season-dom .loot.coin .loot-qty{right:2px;background:linear-gradient(180deg,#5a4311,#2c2109);border-color:rgba(240,198,90,.85);color:#ffe78e}
      #tdr-season-dom .loot-name{position:absolute;left:50%;bottom:-12px;transform:translateX(-50%);font-size:6px;font-weight:1000;letter-spacing:.08em;color:#7f9b8e;text-transform:uppercase;white-space:nowrap;opacity:.78}
      #tdr-season-dom .reward-state{position:absolute;right:12px;top:10px;padding:4px 7px;background:rgba(4,12,10,.78);font-size:6px;font-weight:1000;letter-spacing:.12em;color:#6d8c7c;z-index:4}
      #tdr-season-dom .stage-slide.active .reward-state{color:#62ffb2}
      #tdr-season-dom .stage-slide.done .reward-state{color:#62ffb2}

      #tdr-season-dom .premium-showcase{position:relative;z-index:2;width:min(86%,560px);height:128px;margin:18px auto 0;display:grid;place-items:center;background:linear-gradient(180deg,rgba(37,29,13,.68),rgba(18,14,7,.91));border:1px solid rgba(216,167,58,.34);box-shadow:0 14px 34px rgba(0,0,0,.35);overflow:hidden}
      #tdr-season-dom .premium-showcase:after{content:'';position:absolute;inset:0;background:linear-gradient(112deg,transparent 30%,rgba(255,220,126,.09) 48%,transparent 66%);pointer-events:none}
      #tdr-season-dom .premium-art{position:relative;width:155px;height:118px;display:grid;place-items:center;filter:grayscale(.32) saturate(.72) brightness(.7) drop-shadow(0 10px 12px rgba(0,0,0,.56));opacity:.72}
      #tdr-season-dom .premium-art img{display:block;max-width:100%;max-height:118px;object-fit:contain}
      #tdr-season-dom .premium-lock{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:rgba(8,8,7,.83);border:1px solid rgba(240,198,90,.7);box-shadow:0 0 22px rgba(216,167,58,.16);font-size:24px;z-index:3}
      #tdr-season-dom .premium-coming{position:absolute;right:12px;bottom:10px;padding:5px 8px;background:rgba(30,23,9,.88);border:1px solid rgba(216,167,58,.25);font-size:6px;font-weight:1000;letter-spacing:.14em;color:#b3914c;z-index:4}
      #tdr-season-dom .claim{position:absolute;right:34px;bottom:18px;height:34px;padding:0 18px;border:1px solid #62ffb2;background:#174b37;font-size:9px;font-weight:1000;letter-spacing:.06em;cursor:pointer;z-index:5}

      #tdr-season-dom .swipe-hint{position:absolute;right:18px;top:50%;transform:translateY(-50%);width:34px;height:58px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(4,12,18,.6);font-size:24px;color:#60788a;pointer-events:none}
      #tdr-season-dom .stage-slide:last-child .swipe-hint{display:none}

      @media(max-width:1050px){#tdr-season-dom .s-head{grid-template-columns:86px minmax(0,1fr) 220px;padding:0 18px;gap:14px}#tdr-season-dom .s-title{font-size:21px}#tdr-season-dom .stage-slide{flex-basis:92vw;min-width:720px;grid-template-columns:minmax(235px,33%) minmax(0,1fr)}#tdr-season-dom .mission-title{font-size:27px}#tdr-season-dom .lane{padding-left:24px;padding-right:24px}#tdr-season-dom .lane:before{left:24px;right:24px}#tdr-season-dom .lane-label{left:24px}#tdr-season-dom .reward-showcase{width:94%;gap:6px;padding-inline:8px}#tdr-season-dom .loot{flex-basis:70px;width:70px}#tdr-season-dom .loot.coin{flex-basis:100px;width:100px}}
      @media(max-height:520px){#tdr-season-dom .s-head{height:64px}#tdr-season-dom .season-main{height:calc(100% - 64px)}#tdr-season-dom .track-head{height:42px}#tdr-season-dom .stage-scroll{padding-bottom:12px}#tdr-season-dom .mission-pane{padding:18px}#tdr-season-dom .mission-title{margin-top:16px;font-size:25px}#tdr-season-dom .mission-desc{margin-top:13px;font-size:10px}#tdr-season-dom .lane{padding-top:16px;padding-bottom:10px}#tdr-season-dom .lane-label{top:8px}#tdr-season-dom .reward-showcase{height:104px;margin-top:14px}#tdr-season-dom .loot{height:84px;flex-basis:64px;width:64px}#tdr-season-dom .loot img{max-height:72px}#tdr-season-dom .loot.coin{height:90px;flex-basis:88px;width:88px}#tdr-season-dom .loot.coin img{max-height:86px;max-width:90px}#tdr-season-dom .loot-qty{height:21px;font-size:9px}#tdr-season-dom .loot-name{display:none}#tdr-season-dom .premium-showcase{height:102px;margin-top:13px}#tdr-season-dom .premium-art{height:94px;width:130px}#tdr-season-dom .premium-art img{max-height:94px}#tdr-season-dom .premium-lock{width:46px;height:46px;font-size:20px}}
    `;
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.id='tdr-season-dom';
    this._root=root;
    document.body.appendChild(root);
    this._renderDom();
  }

  _localizedDef(def,lang){
    if(!def)return null;
    return {
      ...def,
      title:def.title?.[lang]||def.title?.es||def.id,
      description:def.description?.[lang]||def.description?.es||'',
      objective:{...def.objective,label:def.objective?.label?.[lang]||def.objective?.label?.es||''}
    };
  }

  _rewardGallery(reward,lang){
    const items=[];
    const coins=Math.max(0,Number(reward?.coins)||0);
    if(coins){
      items.push(`<div class="loot coin" title="${coins} ${lang==='en'?'coins':'monedas'}"><img src="${BASE}assets/store/coins_2500.webp" alt=""><span class="loot-qty">${coins}</span><span class="loot-name">${lang==='en'?'Coins':'Monedas'}</span></div>`);
    }
    for(const [id,nRaw] of Object.entries(reward?.items||{})){
      const n=Math.max(0,Number(nRaw)||0);
      const file=MATERIAL_ART[id];
      if(!n||!file)continue;
      const name=MATERIAL_NAMES[id]?.[lang]||id;
      items.push(`<div class="loot" title="${esc(name)} ×${n}"><img src="${BASE}assets/crafting/materials/${file}" alt=""><span class="loot-qty">×${n}</span><span class="loot-name">${esc(name)}</span></div>`);
    }
    return items.join('');
  }

  _renderDom(){
    if(!this._root)return;
    const lang=getLanguage()==='en'?'en':'es';
    const L=seasonText(lang);
    const data=getCurrentRaceEvent();
    const stages=INDUCTION_SEASON.stages;
    const index=data.finished?stages.length:Math.max(0,Number(data.index)||0);
    const current=Math.min(stages.length-1,index);
    const activeProgress=data.progress;
    const activeRatio=data.finished?1:clamp((Number(activeProgress?.value)||0)/Math.max(1,Number(activeProgress?.target)||1),0,1);
    const totalRatio=data.finished?1:clamp((index+activeRatio)/stages.length,0,1);

    const slides=stages.map((stage,i)=>{
      const def=this._localizedDef(RACE_EVENTS.find(x=>x.id===stage.id),lang);
      const done=data.finished||i<index;
      const active=!data.finished&&i===index;
      const locked=!done&&!active;
      const status=done?(lang==='en'?'DONE':'HECHA'):(active?L.current:L.locked);
      const objective=def?.objective||{};
      const target=Math.max(1,Number(objective.target)||1);
      const value=active?Number(activeProgress?.value||0):(done?target:0);
      const ratio=done?1:(active?activeRatio:0);
      const progressText=`${Math.min(value,target)}/${target} ${objective.label||''}`;
      const rewardState=done?(lang==='en'?'COLLECTED':'RECOGIDA'):(active?(lang==='en'?'CURRENT REWARD':'PREMIO ACTUAL'):(lang==='en'?'LOCKED REWARD':'PREMIO BLOQUEADO'));
      const rewardGallery=this._rewardGallery(def?.reward,lang);
      return `<article class="stage-slide ${done?'done':''} ${active?'active':''} ${locked?'locked':''}" data-stage="${i}">
        <section class="mission-pane">
          <div class="stage-kicker"><span>${esc(L.stage)} ${i+1} · ${String(i+1).padStart(2,'0')}</span><span class="stage-state">${esc(status)}</span></div>
          <h2 class="mission-title">${esc(def?.title||stage[lang]||stage.es)}</h2>
          <div class="mission-desc">${esc(def?.description||'')}</div>
          <div class="objective">
            <div class="objective-label">${lang==='en'?'MISSION PROGRESS':'PROGRESO DE MISIÓN'}</div>
            <div class="s-bar"><i style="width:${ratio*100}%;background:${done?'#39ff9a':'#35cfff'}"></i></div>
            <div class="objective-value">${esc(progressText)}</div>
          </div>
        </section>
        <section class="lanes">
          <div class="lane free">
            <div class="lane-label">${lang==='en'?'FREE REWARD':'RECOMPENSA GRATIS'}</div>
            <div class="reward-showcase">
              <div class="reward-state">${esc(rewardState)}</div>
              ${rewardGallery}
            </div>
            ${active&&activeProgress?.complete?`<button class="claim" type="button">${lang==='en'?'CLAIM REWARD':'RECLAMAR PREMIO'}</button>`:''}
          </div>
          <div class="lane premium">
            <div class="lane-label">${esc(L.premium)} · ${esc(L.comingSoon)}</div>
            <div class="premium-showcase">
              <div class="premium-art"><img src="${BASE}assets/store/daily_gift.webp" alt=""></div>
              <div class="premium-lock">🔒</div>
              <div class="premium-coming">${lang==='en'?'PREMIUM REWARD · COMING SOON':'PREMIO PREMIUM · PRÓXIMAMENTE'}</div>
            </div>
          </div>
        </section>
        <div class="swipe-hint">›</div>
      </article>`;
    }).join('');

    this._root.innerHTML=`
      <header class="s-head">
        <button class="s-back" type="button">${lang==='en'?'← BACK':'← VOLVER'}</button>
        <div><div class="s-title">${esc(L.season)} 0 · ${esc(L.induction)}</div><div class="s-sub">${esc(L.subtitle)}</div></div>
        <div class="s-total"><div class="s-count">${Math.min(index+1,stages.length)}/${stages.length}</div><div class="s-bar"><i style="width:${totalRatio*100}%;background:${data.finished?'#39ff9a':'#35cfff'}"></i></div></div>
      </header>
      <main class="season-main">
        <div class="track-head"><div class="track-title">${lang==='en'?'INDUCTION PATH':'RUTA DE INDUCCIÓN'}</div><div class="track-note">${lang==='en'?'SWIPE HORIZONTALLY · 14 STAGES':'DESLIZA EN HORIZONTAL · 14 ETAPAS'}</div></div>
        <div class="stage-scroll">${slides}</div>
      </main>`;

    const scroller=this._root.querySelector('.stage-scroll');
    requestAnimationFrame(()=>{
      const active=scroller?.querySelector('.stage-slide.active')||scroller?.querySelector('.stage-slide:last-child');
      active?.scrollIntoView?.({behavior:'instant',inline:'center',block:'nearest'});
    });
    this._root.querySelector('.s-back')?.addEventListener('click',()=>this.scene.start('menu'));
    this._root.querySelector('.claim')?.addEventListener('click',()=>{
      const result=claimCurrentRaceEvent();
      if(result?.ok)this._renderDom();
    });
  }
}
