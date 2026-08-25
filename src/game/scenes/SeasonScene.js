import Phaser from 'phaser';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel, RACE_EVENTS } from '../events/raceEvents.js';
import { getLanguage } from '../i18n/index.js';
import { INDUCTION_SEASON, seasonText } from '../seasons/seasonCatalog.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

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
      #tdr-season-dom .lane{position:relative;min-height:0;padding:24px 34px 22px;display:flex;flex-direction:column;justify-content:center}
      #tdr-season-dom .lane.free{border-bottom:1px solid rgba(255,255,255,.1)}
      #tdr-season-dom .lane:before{content:'';position:absolute;left:34px;right:34px;top:50%;height:3px;transform:translateY(-50%);background:#264657;box-shadow:0 0 0 1px rgba(255,255,255,.025)}
      #tdr-season-dom .lane.premium:before{background:#5a4521}
      #tdr-season-dom .lane-label{position:absolute;left:34px;top:18px;font-size:9px;font-weight:1000;letter-spacing:.16em;color:#62ffb2}
      #tdr-season-dom .lane.premium .lane-label{color:#f0c65a}
      #tdr-season-dom .reward-node{position:relative;z-index:1;width:min(78%,560px);min-height:86px;margin:auto;display:grid;grid-template-columns:64px minmax(0,1fr);align-items:center;gap:18px;padding:15px 18px;background:#10231d;border:1px solid rgba(57,255,154,.5);box-shadow:0 8px 24px rgba(0,0,0,.28)}
      #tdr-season-dom .lane.premium .reward-node{background:#211b10;border-color:rgba(216,167,58,.52)}
      #tdr-season-dom .reward-icon{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:#0a1712;border:1px solid rgba(98,255,178,.44);font-size:23px}
      #tdr-season-dom .lane.premium .reward-icon{background:#18130b;border-color:rgba(240,198,90,.42)}
      #tdr-season-dom .reward-name{font-size:13px;font-weight:1000;color:#e8fff4;line-height:1.25}
      #tdr-season-dom .lane.premium .reward-name{color:#b3914c}
      #tdr-season-dom .reward-sub{margin-top:6px;font-size:8px;font-weight:800;letter-spacing:.07em;color:#729486}
      #tdr-season-dom .lane.premium .reward-sub{color:#806d43}
      #tdr-season-dom .claim{position:absolute;right:34px;bottom:18px;height:34px;padding:0 18px;border:1px solid #62ffb2;background:#174b37;font-size:9px;font-weight:1000;letter-spacing:.06em;cursor:pointer;z-index:4}

      #tdr-season-dom .swipe-hint{position:absolute;right:18px;top:50%;transform:translateY(-50%);width:34px;height:58px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.08);background:rgba(4,12,18,.6);font-size:24px;color:#60788a;pointer-events:none}
      #tdr-season-dom .stage-slide:last-child .swipe-hint{display:none}

      @media(max-width:1050px){#tdr-season-dom .s-head{grid-template-columns:86px minmax(0,1fr) 220px;padding:0 18px;gap:14px}#tdr-season-dom .s-title{font-size:21px}#tdr-season-dom .stage-slide{flex-basis:92vw;min-width:720px;grid-template-columns:minmax(235px,33%) minmax(0,1fr)}#tdr-season-dom .mission-title{font-size:27px}#tdr-season-dom .lane{padding-left:24px;padding-right:24px}#tdr-season-dom .lane:before{left:24px;right:24px}#tdr-season-dom .lane-label{left:24px}#tdr-season-dom .reward-node{width:min(82%,500px)}}
      @media(max-height:520px){#tdr-season-dom .s-head{height:64px}#tdr-season-dom .season-main{height:calc(100% - 64px)}#tdr-season-dom .track-head{height:42px}#tdr-season-dom .stage-scroll{padding-bottom:12px}#tdr-season-dom .mission-pane{padding:18px}#tdr-season-dom .mission-title{margin-top:16px;font-size:25px}#tdr-season-dom .mission-desc{margin-top:13px;font-size:10px}#tdr-season-dom .lane{padding-top:18px;padding-bottom:15px}#tdr-season-dom .lane-label{top:10px}#tdr-season-dom .reward-node{min-height:68px;grid-template-columns:48px 1fr;padding:10px 14px}#tdr-season-dom .reward-icon{width:42px;height:42px;font-size:18px}#tdr-season-dom .reward-name{font-size:11px}}
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
      const rewardLabel=raceEventRewardLabel(def?.reward);
      const progressText=`${Math.min(value,target)}/${target} ${objective.label||''}`;
      const rewardState=done?(lang==='en'?'COLLECTED':'RECOGIDA'):(active?(lang==='en'?'CURRENT REWARD':'PREMIO ACTUAL'):(lang==='en'?'LOCKED REWARD':'PREMIO BLOQUEADO'));
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
            <div class="reward-node">
              <div class="reward-icon">${done?'✓':'◈'}</div>
              <div><div class="reward-name">${esc(rewardLabel)}</div><div class="reward-sub">${esc(rewardState)}</div></div>
            </div>
            ${active&&activeProgress?.complete?`<button class="claim" type="button">${lang==='en'?'CLAIM REWARD':'RECLAMAR PREMIO'}</button>`:''}
          </div>
          <div class="lane premium">
            <div class="lane-label">${esc(L.premium)} · ${esc(L.comingSoon)}</div>
            <div class="reward-node">
              <div class="reward-icon">🔒</div>
              <div><div class="reward-name">${lang==='en'?'EXCLUSIVE SEASON REWARD':'RECOMPENSA EXCLUSIVA DE TEMPORADA'}</div><div class="reward-sub">${lang==='en'?'PREMIUM TRACK DISABLED FOR LAUNCH':'LÍNEA PREMIUM DESACTIVADA EN EL LANZAMIENTO'}</div></div>
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
