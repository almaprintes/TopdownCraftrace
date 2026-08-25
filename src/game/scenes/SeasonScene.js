import Phaser from 'phaser';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
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
      #tdr-season-dom .s-body{height:calc(100% - 72px);display:grid;grid-template-columns:minmax(300px,34%) minmax(0,1fr);gap:24px;padding:22px 28px 24px}
      #tdr-season-dom .mission{min-width:0;border:2px solid #35cfff;background:#0a1722;padding:20px;display:flex;flex-direction:column;overflow:hidden}
      #tdr-season-dom .eyebrow{font-size:10px;font-weight:1000;letter-spacing:.18em;color:#6deaff}
      #tdr-season-dom .mission h2{margin:26px 0 0;font-size:29px;line-height:1.05;font-weight:1000;letter-spacing:-.02em}
      #tdr-season-dom .mission .desc{margin:28px 0 0;font-size:12px;line-height:1.45;color:#b9c7d2;max-width:92%}
      #tdr-season-dom .progress-label{margin-top:34px;font-size:9px;font-weight:1000;letter-spacing:.14em;color:#7f94a6}
      #tdr-season-dom .mission .s-bar{margin-top:17px;height:12px}
      #tdr-season-dom .mission .value{margin-top:11px;font-size:14px;font-weight:1000;color:#6deaff}
      #tdr-season-dom .rewards{margin-top:auto;display:grid;gap:12px}
      #tdr-season-dom .reward-title{font-size:9px;font-weight:1000;letter-spacing:.15em;color:#62ffb2}
      #tdr-season-dom .reward-box{min-height:48px;display:flex;align-items:center;padding:10px 14px;border:1px solid rgba(57,255,154,.42);background:#10231d;font-size:11px;font-weight:900;color:#e8fff4}
      #tdr-season-dom .premium .reward-title{color:#f0c65a}
      #tdr-season-dom .premium .reward-box{border-color:rgba(216,167,58,.44);background:#211b10;color:#b3914c}
      #tdr-season-dom .claim{height:38px;border:1px solid #62ffb2;background:#174b37;font-size:10px;font-weight:1000;letter-spacing:.06em;cursor:pointer}
      #tdr-season-dom .path{min-width:0;overflow:hidden;display:flex;flex-direction:column}
      #tdr-season-dom .path-head{height:34px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      #tdr-season-dom .path-title{font-size:11px;font-weight:1000;letter-spacing:.16em;color:#a8bac8}
      #tdr-season-dom .path-note{font-size:8px;font-weight:900;letter-spacing:.1em;color:#667b8c;white-space:nowrap}
      #tdr-season-dom .stage-grid{min-height:0;flex:1;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:10px}
      #tdr-season-dom .stage{min-width:0;position:relative;border:1px solid #314653;background:#0b1721;padding:14px 12px 11px;display:flex;flex-direction:column;overflow:hidden}
      #tdr-season-dom .stage.done{border-color:#39ff9a;background:#0d241b}
      #tdr-season-dom .stage.active{border:2px solid #35cfff;background:#0c2632;box-shadow:0 0 18px rgba(53,207,255,.09)}
      #tdr-season-dom .stage-top{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:9px;font-weight:1000;color:#617584}
      #tdr-season-dom .stage.done .stage-top{color:#62ffb2}
      #tdr-season-dom .stage.active .stage-top{color:#6deaff}
      #tdr-season-dom .stage-name{margin-top:22px;font-size:12px;line-height:1.24;font-weight:1000;color:#7a8995;overflow-wrap:anywhere}
      #tdr-season-dom .stage.done .stage-name,#tdr-season-dom .stage.active .stage-name{color:#fff}
      #tdr-season-dom .stage-status{margin-top:auto;min-height:20px;display:grid;place-items:center;background:#071119;font-size:7px;font-weight:1000;letter-spacing:.12em;color:#657583}
      #tdr-season-dom .stage.done .stage-status{color:#62ffb2}
      #tdr-season-dom .stage.active .stage-status{color:#6deaff}
      @media(max-width:1050px){#tdr-season-dom .s-head{grid-template-columns:86px minmax(0,1fr) 220px;padding:0 18px;gap:14px}#tdr-season-dom .s-title{font-size:21px}#tdr-season-dom .s-body{grid-template-columns:minmax(285px,35%) minmax(0,1fr);padding:18px;gap:18px}#tdr-season-dom .mission h2{font-size:25px}#tdr-season-dom .stage{padding:11px 9px 9px}#tdr-season-dom .stage-name{font-size:10px;margin-top:16px}}
      @media(max-height:520px){#tdr-season-dom .s-head{height:64px}#tdr-season-dom .s-body{height:calc(100% - 64px);padding-top:14px;padding-bottom:14px}#tdr-season-dom .mission{padding:16px}#tdr-season-dom .mission h2{margin-top:16px;font-size:23px}#tdr-season-dom .mission .desc{margin-top:15px;font-size:10px}#tdr-season-dom .progress-label{margin-top:19px}#tdr-season-dom .rewards{gap:8px}#tdr-season-dom .reward-box{min-height:40px}#tdr-season-dom .stage-grid{gap:8px}#tdr-season-dom .stage-name{margin-top:12px}}
    `;
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.id='tdr-season-dom';
    this._root=root;
    document.body.appendChild(root);
    this._renderDom();
  }

  _renderDom(){
    if(!this._root)return;
    const lang=getLanguage()==='en'?'en':'es';
    const L=seasonText(lang);
    const data=getCurrentRaceEvent();
    const stages=INDUCTION_SEASON.stages;
    const index=data.finished?stages.length:Math.max(0,Number(data.index)||0);
    const current=Math.min(stages.length-1,index);
    const stage=stages[current];
    const event=data.event;
    const progress=data.progress;
    const ratio=data.finished?1:clamp((Number(progress?.value)||0)/Math.max(1,Number(progress?.target)||1),0,1);
    const totalRatio=data.finished?1:clamp((index+ratio)/stages.length,0,1);
    const stageCards=stages.map((s,i)=>{
      const done=data.finished||i<index;
      const active=!data.finished&&i===index;
      const status=done?(lang==='en'?'DONE':'HECHA'):(active?L.current:L.locked);
      return `<article class="stage ${done?'done':''} ${active?'active':''}">
        <div class="stage-top"><span>${String(i+1).padStart(2,'0')}</span><span>${done?'✓':active?'◆':'•'}</span></div>
        <div class="stage-name">${esc(s[lang]||s.es)}</div>
        <div class="stage-status">${esc(status)}</div>
      </article>`;
    }).join('');

    const missionTitle=data.finished?(lang==='en'?'INDUCTION COMPLETE':'INDUCCIÓN COMPLETADA'):(stage?.[lang]||event?.title||'');
    const missionDesc=data.finished?(lang==='en'?'You are ready for the monthly seasons.':'Ya estás listo para las temporadas mensuales.'):(event?.description||'');
    const progressBlock=data.finished?'':`
      <div class="progress-label">${lang==='en'?'MISSION PROGRESS':'PROGRESO DE MISIÓN'}</div>
      <div class="s-bar"><i style="width:${ratio*100}%"></i></div>
      <div class="value">${esc(progress?.value||0)}/${esc(progress?.target||0)} ${esc(progress?.label||'')}</div>`;
    const rewards=data.finished?'':`
      <div class="rewards">
        <div><div class="reward-title">${lang==='en'?'FREE REWARD':'RECOMPENSA GRATIS'}</div><div class="reward-box">${esc(raceEventRewardLabel(event?.reward))}</div></div>
        <div class="premium"><div class="reward-title">${esc(L.premium)} · ${esc(L.comingSoon)}</div><div class="reward-box">🔒 ${lang==='en'?'EXCLUSIVE REWARD':'RECOMPENSA EXCLUSIVA'}</div></div>
        ${progress?.complete?`<button class="claim" type="button">${lang==='en'?'CLAIM REWARD':'RECLAMAR PREMIO'}</button>`:''}
      </div>`;

    this._root.innerHTML=`
      <header class="s-head">
        <button class="s-back" type="button">${lang==='en'?'← BACK':'← VOLVER'}</button>
        <div><div class="s-title">${esc(L.season)} 0 · ${esc(L.induction)}</div><div class="s-sub">${esc(L.subtitle)}</div></div>
        <div class="s-total"><div class="s-count">${Math.min(index+1,stages.length)}/${stages.length}</div><div class="s-bar"><i style="width:${totalRatio*100}%;background:${data.finished?'#39ff9a':'#35cfff'}"></i></div></div>
      </header>
      <main class="s-body">
        <section class="mission">
          <div class="eyebrow">${data.finished?esc(L.complete):`${esc(L.stage)} ${current+1}`}</div>
          <h2>${esc(missionTitle)}</h2>
          <div class="desc">${esc(missionDesc)}</div>
          ${progressBlock}
          ${rewards}
        </section>
        <section class="path">
          <div class="path-head"><div class="path-title">${lang==='en'?'INDUCTION PATH':'RUTA DE INDUCCIÓN'}</div><div class="path-note">${lang==='en'?'14 STAGES · ONE TIME':'14 ETAPAS · UNA SOLA VEZ'}</div></div>
          <div class="stage-grid">${stageCards}</div>
        </section>
      </main>`;

    this._root.querySelector('.s-back')?.addEventListener('click',()=>this.scene.start('menu'));
    this._root.querySelector('.claim')?.addEventListener('click',()=>{
      const result=claimCurrentRaceEvent();
      if(result?.ok)this._renderDom();
    });
  }
}
