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
    this._selectedStage=null;
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
      #tdr-season-dom .s-head{height:68px;display:grid;grid-template-columns:96px minmax(0,1fr) 290px;align-items:center;gap:18px;padding:0 26px;background:#0a1b28;border-top:3px solid #d8a73a;border-bottom:1px solid rgba(53,207,255,.45)}
      #tdr-season-dom .s-back{height:38px;border:1px solid #5b7284;background:#0e1d2a;border-radius:4px;font-size:10px;font-weight:900;letter-spacing:.08em;cursor:pointer}
      #tdr-season-dom .s-title{font-size:23px;line-height:1;font-weight:1000;letter-spacing:.01em}
      #tdr-season-dom .s-sub{margin-top:6px;font-size:8px;font-weight:800;letter-spacing:.1em;color:#8fa4b5}
      #tdr-season-dom .s-total{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px}
      #tdr-season-dom .s-count{font-size:12px;font-weight:1000;color:#f0c65a}
      #tdr-season-dom .s-bar{height:9px;background:#142532;border:1px solid rgba(255,255,255,.11);overflow:hidden}
      #tdr-season-dom .s-bar>i{display:block;height:100%;background:#35cfff}

      #tdr-season-dom .season-main{height:calc(100% - 68px);display:grid;grid-template-rows:34px minmax(220px,1fr) 116px;min-height:0}
      #tdr-season-dom .track-head{display:flex;align-items:center;justify-content:space-between;padding:0 28px}
      #tdr-season-dom .track-title{font-size:10px;font-weight:1000;letter-spacing:.16em;color:#a8bac8}
      #tdr-season-dom .track-note{font-size:7px;font-weight:900;letter-spacing:.11em;color:#667b8c}

      #tdr-season-dom .route-shell{position:relative;min-height:0;border-top:1px solid rgba(255,255,255,.055);border-bottom:1px solid rgba(255,255,255,.075);background:radial-gradient(circle at 40% 32%,rgba(53,207,255,.035),transparent 42%),linear-gradient(180deg,#07131c,#061019);overflow:hidden}
      #tdr-season-dom .route-scroll{position:absolute;inset:0;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;touch-action:pan-x;scroll-snap-type:x proximity;scroll-padding-inline:185px}
      #tdr-season-dom .route-scroll::-webkit-scrollbar{height:6px}
      #tdr-season-dom .route-scroll::-webkit-scrollbar-track{background:#07121a}
      #tdr-season-dom .route-scroll::-webkit-scrollbar-thumb{background:#294151;border-radius:9px}
      #tdr-season-dom .route-inner{position:relative;height:100%;min-width:max-content;display:grid;grid-template-columns:repeat(14,150px);grid-template-rows:1fr 1fr;column-gap:118px;padding:6px 180px 8px 205px;align-items:center}

      #tdr-season-dom .route-label{position:absolute;left:18px;width:155px;height:72px;z-index:8;padding:13px 14px 10px 18px;background:linear-gradient(100deg,rgba(9,31,30,.98),rgba(6,18,26,.92));border:1px solid rgba(57,255,154,.23);clip-path:polygon(0 0,88% 0,100% 50%,88% 100%,0 100%);pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.28)}
      #tdr-season-dom .route-label.free{top:25%;transform:translateY(-50%);border-left:3px solid #39ff9a}
      #tdr-season-dom .route-label.premium{top:75%;transform:translateY(-50%);border-color:rgba(216,167,58,.34);border-left:3px solid #e2af3f;background:linear-gradient(100deg,rgba(39,29,12,.96),rgba(8,17,22,.94))}
      #tdr-season-dom .route-label strong{display:block;font-size:11px;letter-spacing:.08em;color:#62ffb2}
      #tdr-season-dom .route-label.premium strong{color:#f0c65a}
      #tdr-season-dom .route-label small{display:block;margin-top:6px;font-size:6px;font-weight:900;letter-spacing:.11em;color:#7aa596}
      #tdr-season-dom .route-label.premium small{color:#9d834e}

      #tdr-season-dom .road{position:absolute;left:0;right:0;z-index:0;background:#1b2228;box-shadow:0 0 20px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.05)}
      #tdr-season-dom .free-road{top:calc(25% + 40px);height:54px;border-top:2px solid rgba(210,224,231,.74);border-bottom:2px solid rgba(210,224,231,.74);box-shadow:0 0 18px rgba(57,255,154,.07),inset 0 0 0 1px rgba(255,255,255,.03)}
      #tdr-season-dom .free-road:after{content:'';position:absolute;left:0;right:0;top:50%;height:2px;transform:translateY(-50%);background:repeating-linear-gradient(90deg,rgba(255,255,255,.88) 0 24px,transparent 24px 52px)}
      #tdr-season-dom .free-road:before{content:'';position:absolute;inset:-5px 0;border-top:2px solid rgba(57,255,154,.38);border-bottom:2px solid rgba(57,255,154,.38);filter:drop-shadow(0 0 5px rgba(57,255,154,.18))}
      #tdr-season-dom .premium-road{top:calc(75% + 31px);height:70px;border-top:2px solid rgba(226,175,63,.88);border-bottom:2px solid rgba(226,175,63,.88);background:linear-gradient(180deg,#1b2228 0 46%,#403114 46% 54%,#1b2228 54% 100%);box-shadow:0 0 22px rgba(216,167,58,.13),inset 0 0 0 1px rgba(255,255,255,.035)}
      #tdr-season-dom .premium-road:before,#tdr-season-dom .premium-road:after{content:'';position:absolute;left:0;right:0;height:2px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.82) 0 22px,transparent 22px 48px)}
      #tdr-season-dom .premium-road:before{top:24%}
      #tdr-season-dom .premium-road:after{bottom:24%}

      #tdr-season-dom .stage-node{position:relative;z-index:3;width:150px;height:102px;align-self:center;scroll-snap-align:center;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:17px 8px 8px;border:1px solid #405767;background:linear-gradient(180deg,rgba(12,28,38,.98),rgba(6,18,26,.96));box-shadow:0 10px 24px rgba(0,0,0,.38);transition:transform .14s,border-color .14s,box-shadow .14s,opacity .14s}
      #tdr-season-dom .stage-node:hover{transform:translateY(-2px)}
      #tdr-season-dom .stage-node.free-node{grid-row:1;margin-top:-23px}
      #tdr-season-dom .stage-node.premium-node{grid-row:2;margin-top:-28px;border-color:rgba(216,167,58,.45);background:linear-gradient(180deg,rgba(32,26,14,.97),rgba(10,15,18,.98))}
      #tdr-season-dom .stage-node.done{border-color:rgba(57,255,154,.7)}
      #tdr-season-dom .stage-node.current{border:2px solid #62ffb2;box-shadow:0 0 22px rgba(57,255,154,.18),0 12px 26px rgba(0,0,0,.42)}
      #tdr-season-dom .stage-node.selected{outline:2px solid rgba(53,207,255,.72);outline-offset:3px}
      #tdr-season-dom .stage-node.locked{opacity:.68}
      #tdr-season-dom .stage-badge{position:absolute;left:50%;top:-15px;transform:translateX(-50%);min-width:34px;height:29px;padding:0 7px;display:grid;place-items:center;background:#0b1821;border:1px solid #597180;border-radius:10px;font-size:9px;font-weight:1000;color:#d9e5ea;box-shadow:0 4px 10px rgba(0,0,0,.34)}
      #tdr-season-dom .premium-node .stage-badge{border-color:#a77a24;color:#f0c65a;background:#1c160b;transform:translateX(-50%) rotate(45deg);border-radius:5px;min-width:27px;width:27px;height:27px;padding:0}
      #tdr-season-dom .premium-node .stage-badge span{transform:rotate(-45deg)}
      #tdr-season-dom .node-art{height:62px;width:100%;display:flex;align-items:center;justify-content:center;gap:3px;overflow:visible;filter:drop-shadow(0 7px 7px rgba(0,0,0,.46))}
      #tdr-season-dom .node-loot{position:relative;width:37px;height:55px;display:grid;place-items:center}
      #tdr-season-dom .node-loot.coin{width:54px}
      #tdr-season-dom .node-loot img{max-width:100%;max-height:50px;object-fit:contain}
      #tdr-season-dom .node-loot.coin img{max-height:56px}
      #tdr-season-dom .node-qty{position:absolute;right:-2px;bottom:-2px;min-width:25px;height:18px;padding:0 5px;display:grid;place-items:center;border-radius:10px;background:#0b2d21;border:1px solid rgba(98,255,178,.7);font-size:8px;font-weight:1000;color:#fff}
      #tdr-season-dom .node-loot.coin .node-qty{background:#4a370e;border-color:#d9ac3d;color:#ffe788}
      #tdr-season-dom .premium-gift{position:relative;width:72px;height:67px;display:grid;place-items:center;filter:grayscale(.25) saturate(.75) brightness(.72) drop-shadow(0 8px 8px rgba(0,0,0,.52))}
      #tdr-season-dom .premium-gift img{max-width:72px;max-height:67px;object-fit:contain}
      #tdr-season-dom .premium-lock{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:31px;height:31px;border-radius:50%;display:grid;place-items:center;background:rgba(8,8,7,.84);border:1px solid rgba(240,198,90,.66);font-size:14px}
      #tdr-season-dom .road-pin{position:absolute;left:50%;bottom:-31px;transform:translateX(-50%);width:13px;height:13px;border-radius:50%;background:#183341;border:2px solid #7b929e;box-shadow:0 0 0 4px rgba(6,16,25,.82)}
      #tdr-season-dom .free-node.current .road-pin,#tdr-season-dom .free-node.done .road-pin{background:#39ff9a;border-color:#b2ffd5;box-shadow:0 0 12px rgba(57,255,154,.65),0 0 0 4px rgba(6,16,25,.82)}
      #tdr-season-dom .premium-node .road-pin{bottom:-39px;background:#6b5119;border-color:#d8a73a}

      #tdr-season-dom .detail-dock{display:grid;grid-template-columns:1.55fr .85fr 1.1fr .85fr;min-height:0;background:#081722;border-top:1px solid #2f4758;box-shadow:0 -10px 28px rgba(0,0,0,.2)}
      #tdr-season-dom .detail-cell{min-width:0;padding:12px 18px;border-right:1px solid rgba(255,255,255,.085);display:flex;flex-direction:column;justify-content:center}
      #tdr-season-dom .detail-cell:last-child{border-right:0}
      #tdr-season-dom .detail-kicker{font-size:7px;font-weight:1000;letter-spacing:.14em;color:#62ffb2}
      #tdr-season-dom .detail-title{margin-top:5px;font-size:18px;line-height:1;font-weight:1000}
      #tdr-season-dom .detail-desc{margin-top:6px;font-size:9px;line-height:1.25;color:#b7c6d1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #tdr-season-dom .detail-label{font-size:7px;font-weight:1000;letter-spacing:.13em;color:#7890a1}
      #tdr-season-dom .detail-value{margin-top:8px;font-size:13px;font-weight:1000;color:#6deaff}
      #tdr-season-dom .detail-cell .s-bar{margin-top:7px;height:7px}
      #tdr-season-dom .detail-reward{margin-top:5px;display:flex;align-items:center;gap:5px;min-height:56px}
      #tdr-season-dom .detail-reward .loot{position:relative;width:47px;height:52px;display:grid;place-items:center;filter:drop-shadow(0 6px 6px rgba(0,0,0,.45))}
      #tdr-season-dom .detail-reward .loot.coin{width:64px}
      #tdr-season-dom .detail-reward .loot img{max-width:100%;max-height:48px;object-fit:contain}
      #tdr-season-dom .detail-reward .loot.coin img{max-height:55px}
      #tdr-season-dom .loot-qty{position:absolute;right:-2px;bottom:0;min-width:27px;height:18px;padding:0 5px;display:grid;place-items:center;border-radius:10px;background:#103829;border:1px solid rgba(98,255,178,.66);font-size:8px;font-weight:1000;color:#fff}
      #tdr-season-dom .loot.coin .loot-qty{background:#4d390f;border-color:#d9ac3d;color:#ffe788}
      #tdr-season-dom .loot-name{display:none}
      #tdr-season-dom .premium-detail{display:flex;align-items:center;gap:12px;margin-top:8px;color:#af9251}
      #tdr-season-dom .premium-detail img{width:52px;height:52px;object-fit:contain;filter:grayscale(.3) brightness(.72)}
      #tdr-season-dom .claim{height:34px;margin-top:7px;padding:0 14px;border:1px solid #62ffb2;background:#174b37;font-size:8px;font-weight:1000;letter-spacing:.07em;cursor:pointer}
      #tdr-season-dom .coming{margin-top:8px;padding:9px 10px;border:1px solid rgba(216,167,58,.38);background:#211a0d;color:#d4ad53;font-size:8px;font-weight:1000;letter-spacing:.08em;text-align:center}

      @media(max-width:1050px){
        #tdr-season-dom .s-head{grid-template-columns:86px minmax(0,1fr) 220px;padding:0 18px;gap:14px}
        #tdr-season-dom .s-title{font-size:20px}
        #tdr-season-dom .route-inner{grid-template-columns:repeat(14,138px);column-gap:105px;padding-left:190px;padding-right:150px}
        #tdr-season-dom .stage-node{width:138px;height:96px}
        #tdr-season-dom .detail-dock{grid-template-columns:1.35fr .75fr 1.1fr .8fr}
        #tdr-season-dom .detail-cell{padding:10px 12px}
        #tdr-season-dom .detail-title{font-size:16px}
      }
      @media(max-height:520px){
        #tdr-season-dom .s-head{height:62px}
        #tdr-season-dom .season-main{height:calc(100% - 62px);grid-template-rows:28px minmax(205px,1fr) 98px}
        #tdr-season-dom .route-label{height:60px;width:146px;padding-top:10px}
        #tdr-season-dom .stage-node{height:86px}
        #tdr-season-dom .node-art{height:52px}
        #tdr-season-dom .node-loot{height:48px;width:33px}
        #tdr-season-dom .node-loot.coin{width:48px}
        #tdr-season-dom .node-loot img{max-height:44px}
        #tdr-season-dom .node-loot.coin img{max-height:49px}
        #tdr-season-dom .detail-cell{padding-top:7px;padding-bottom:7px}
        #tdr-season-dom .detail-desc{margin-top:4px;font-size:8px}
        #tdr-season-dom .detail-reward{min-height:45px}
        #tdr-season-dom .detail-reward .loot{height:43px;width:40px}
        #tdr-season-dom .detail-reward .loot.coin{width:54px}
        #tdr-season-dom .detail-reward .loot img{max-height:40px}
        #tdr-season-dom .detail-reward .loot.coin img{max-height:46px}
      }
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

  _rewardItems(reward){
    const items=[];
    const coins=Math.max(0,Number(reward?.coins)||0);
    if(coins)items.push({type:'coin',qty:coins,src:`${BASE}assets/store/coins_2500.webp`});
    for(const [id,nRaw] of Object.entries(reward?.items||{})){
      const n=Math.max(0,Number(nRaw)||0);
      const file=MATERIAL_ART[id];
      if(n&&file)items.push({type:id,qty:n,src:`${BASE}assets/crafting/materials/${file}`});
    }
    return items;
  }

  _rewardGallery(reward,lang,compact=false){
    return this._rewardItems(reward).map(item=>{
      const isCoin=item.type==='coin';
      const name=isCoin?(lang==='en'?'Coins':'Monedas'):(MATERIAL_NAMES[item.type]?.[lang]||item.type);
      if(compact){
        return `<div class="node-loot ${isCoin?'coin':''}" title="${esc(name)} ${isCoin?'':'×'}${item.qty}"><img src="${item.src}" alt=""><span class="node-qty">${isCoin?item.qty:`×${item.qty}`}</span></div>`;
      }
      return `<div class="loot ${isCoin?'coin':''}" title="${esc(name)} ${isCoin?'':'×'}${item.qty}"><img src="${item.src}" alt=""><span class="loot-qty">${isCoin?item.qty:`×${item.qty}`}</span><span class="loot-name">${esc(name)}</span></div>`;
    }).join('');
  }

  _renderDom(){
    if(!this._root)return;
    const lang=getLanguage()==='en'?'en':'es';
    const L=seasonText(lang);
    const data=getCurrentRaceEvent();
    const stages=INDUCTION_SEASON.stages;
    const index=data.finished?stages.length:Math.max(0,Number(data.index)||0);
    const current=Math.min(stages.length-1,index);
    if(this._selectedStage===null)this._selectedStage=current;
    this._selectedStage=clamp(Number(this._selectedStage)||0,0,stages.length-1);
    const selected=this._selectedStage;
    const activeProgress=data.progress;
    const activeRatio=data.finished?1:clamp((Number(activeProgress?.value)||0)/Math.max(1,Number(activeProgress?.target)||1),0,1);
    const totalRatio=data.finished?1:clamp((index+activeRatio)/stages.length,0,1);

    const nodes=stages.map((stage,i)=>{
      const def=this._localizedDef(RACE_EVENTS.find(x=>x.id===stage.id),lang);
      const done=data.finished||i<index;
      const active=!data.finished&&i===index;
      const locked=!done&&!active;
      const classes=`${done?'done':''} ${active?'current':''} ${locked?'locked':''} ${selected===i?'selected':''}`;
      return `<button class="stage-node free-node ${classes}" type="button" data-stage="${i}" style="grid-column:${i+1}">
        <span class="stage-badge">${String(i+1).padStart(2,'0')}</span>
        <span class="node-art">${this._rewardGallery(def?.reward,lang,true)}</span>
        <span class="road-pin"></span>
      </button>
      <button class="stage-node premium-node ${selected===i?'selected':''}" type="button" data-stage="${i}" style="grid-column:${i+1}">
        <span class="stage-badge"><span>${String(i+1).padStart(2,'0')}</span></span>
        <span class="premium-gift"><img src="${BASE}assets/store/daily_gift.webp" alt=""><span class="premium-lock">🔒</span></span>
        <span class="road-pin"></span>
      </button>`;
    }).join('');

    const stage=stages[selected];
    const def=this._localizedDef(RACE_EVENTS.find(x=>x.id===stage.id),lang);
    const selectedDone=data.finished||selected<index;
    const selectedActive=!data.finished&&selected===index;
    const objective=def?.objective||{};
    const target=Math.max(1,Number(objective.target)||1);
    const value=selectedActive?Number(activeProgress?.value||0):(selectedDone?target:0);
    const ratio=selectedDone?1:(selectedActive?activeRatio:0);
    const progressText=`${Math.min(value,target)}/${target} ${objective.label||''}`;

    this._root.innerHTML=`
      <header class="s-head">
        <button class="s-back" type="button">${lang==='en'?'← BACK':'← VOLVER'}</button>
        <div><div class="s-title">${esc(L.season)} 0 · ${esc(L.induction)}</div><div class="s-sub">${esc(L.subtitle)}</div></div>
        <div class="s-total"><div class="s-count">${Math.min(index+1,stages.length)}/${stages.length}</div><div class="s-bar"><i style="width:${totalRatio*100}%;background:${data.finished?'#39ff9a':'#35cfff'}"></i></div></div>
      </header>
      <main class="season-main">
        <div class="track-head"><div class="track-title">${lang==='en'?'INDUCTION PATH':'RUTA DE INDUCCIÓN'}</div><div class="track-note">${lang==='en'?'SWIPE HORIZONTALLY · CONTINUOUS ROUTE':'DESLIZA EN HORIZONTAL · RUTA CONTINUA'}</div></div>
        <section class="route-shell">
          <div class="route-label free"><strong>${lang==='en'?'FREE ROAD':'RUTA GRATIS'}</strong><small>${lang==='en'?'UNLOCK REWARDS':'DESBLOQUEA PREMIOS'}</small></div>
          <div class="route-label premium"><strong>${lang==='en'?'PREMIUM HIGHWAY':'AUTOVÍA PREMIUM'}</strong><small>${lang==='en'?'EXCLUSIVE REWARDS':'PREMIOS EXCLUSIVOS'}</small></div>
          <div class="route-scroll">
            <div class="route-inner">
              <div class="road free-road"></div>
              <div class="road premium-road"></div>
              ${nodes}
            </div>
          </div>
        </section>
        <section class="detail-dock">
          <div class="detail-cell">
            <div class="detail-kicker">${esc(L.stage)} ${selected+1} / ${stages.length}</div>
            <div class="detail-title">${esc(def?.title||stage[lang]||stage.es)}</div>
            <div class="detail-desc">${esc(def?.description||'')}</div>
          </div>
          <div class="detail-cell">
            <div class="detail-label">${lang==='en'?'OBJECTIVE':'OBJETIVO'}</div>
            <div class="detail-value">${esc(progressText)}</div>
            <div class="s-bar"><i style="width:${ratio*100}%;background:${selectedDone?'#39ff9a':'#35cfff'}"></i></div>
          </div>
          <div class="detail-cell">
            <div class="detail-kicker">${lang==='en'?'FREE REWARD':'RECOMPENSA GRATIS'}</div>
            <div class="detail-reward">${this._rewardGallery(def?.reward,lang,false)}</div>
            ${selectedActive&&activeProgress?.complete?`<button class="claim" type="button">${lang==='en'?'CLAIM REWARD':'RECLAMAR PREMIO'}</button>`:''}
          </div>
          <div class="detail-cell">
            <div class="detail-label" style="color:#d6ad50">${lang==='en'?'PREMIUM REWARD':'RECOMPENSA PREMIUM'}</div>
            <div class="premium-detail"><img src="${BASE}assets/store/daily_gift.webp" alt=""><strong>🔒</strong></div>
            <div class="coming">${lang==='en'?'PREMIUM PASS · COMING SOON':'PASE PREMIUM · PRÓXIMAMENTE'}</div>
          </div>
        </section>
      </main>`;

    const scroller=this._root.querySelector('.route-scroll');
    requestAnimationFrame(()=>{
      const target=scroller?.querySelector(`.free-node[data-stage="${selected}"]`);
      target?.scrollIntoView?.({behavior:'instant',inline:'center',block:'nearest'});
    });

    this._root.querySelector('.s-back')?.addEventListener('click',()=>this.scene.start('menu'));
    this._root.querySelectorAll('.stage-node').forEach(node=>node.addEventListener('click',()=>{
      this._selectedStage=Number(node.dataset.stage)||0;
      this._renderDom();
    }));
    this._root.querySelector('.claim')?.addEventListener('click',()=>{
      const result=claimCurrentRaceEvent();
      if(result?.ok){
        this._selectedStage=null;
        this._renderDom();
      }
    });
  }
}
