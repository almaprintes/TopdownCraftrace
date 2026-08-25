import { SettingsScene as CurrentSettingsScene } from './SettingsWheelModeScene.js';
import { SUPPORTED_LANGUAGES, getLanguage, setLanguage, t, languageName } from '../i18n/index.js';

export class SettingsScene extends CurrentSettingsScene {
  _mount(){
    super._mount();
    if(!this.root)return;

    this._installLanguageCardStyle();
    const tabs=this.root.querySelector('.s2tabs');
    if(tabs && !tabs.querySelector('[data-tab="language"]')){
      const button=document.createElement('button');
      button.className='s2tab';
      button.dataset.tab='language';
      button.textContent=t('settings.language');
      button.onclick=()=>this._renderTab('language');
      tabs.appendChild(button);
    }
    this._translateSettingsChrome();
  }

  _unmount(){
    super._unmount();
    document.getElementById('tdr-language-cards-style')?.remove?.();
  }

  _installLanguageCardStyle(){
    document.getElementById('tdr-language-cards-style')?.remove?.();
    const style=document.createElement('style');
    style.id='tdr-language-cards-style';
    style.textContent=`
      #tdr-settings2 .lang-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:10px}
      #tdr-settings2 .lang-card{position:relative;min-width:0;height:58px;border:1px solid rgba(255,255,255,.15);border-radius:13px;overflow:hidden;padding:0;background:#111214;color:#fff;text-align:left;isolation:isolate;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 5px 14px rgba(0,0,0,.22);transition:transform .12s,border-color .12s,box-shadow .12s,opacity .12s,filter .12s}
      #tdr-settings2 .lang-card:not(.future):active{transform:scale(.98)}
      #tdr-settings2 .lang-card:before,#tdr-settings2 .lang-card:after{content:'';position:absolute;inset:0;pointer-events:none}
      #tdr-settings2 .lang-card:before{z-index:-2;background:radial-gradient(circle at 18% 24%,rgba(255,255,255,.055) 0 1px,transparent 1.4px),radial-gradient(circle at 74% 68%,rgba(255,255,255,.035) 0 1px,transparent 1.5px),radial-gradient(circle at 43% 82%,rgba(0,0,0,.28) 0 1.2px,transparent 1.8px),linear-gradient(118deg,#202124,#111214 44%,#1a1b1e 72%,#0d0e10);background-size:9px 9px,13px 13px,11px 11px,100% 100%}
      #tdr-settings2 .lang-card:after{z-index:-1;opacity:.9;background:linear-gradient(90deg,transparent 0 40%,var(--stripe-a) 40% 46%,var(--stripe-b) 46% 54%,var(--stripe-c) 54% 60%,transparent 60% 100%),linear-gradient(90deg,rgba(0,0,0,.2),transparent 30%,transparent 70%,rgba(0,0,0,.24))}
      #tdr-settings2 .lang-card.es{--stripe-a:#aa151b;--stripe-b:#f1bf00;--stripe-c:#aa151b}
      #tdr-settings2 .lang-card.en{--stripe-a:#21468b;--stripe-b:#f4f5f7;--stripe-c:#c8102e}
      #tdr-settings2 .lang-card.fr{--stripe-a:#0055a4;--stripe-b:#f4f5f7;--stripe-c:#ef4135}
      #tdr-settings2 .lang-card.de{--stripe-a:#121212;--stripe-b:#dd0000;--stripe-c:#ffce00}
      #tdr-settings2 .lang-card.it{--stripe-a:#009246;--stripe-b:#f4f5f7;--stripe-c:#ce2b37}
      #tdr-settings2 .lang-card .lang-content{position:relative;z-index:2;height:58px;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end;min-width:0;background:linear-gradient(90deg,rgba(7,8,9,.72),rgba(7,8,9,.18) 37%,rgba(7,8,9,.08) 63%,rgba(7,8,9,.72))}
      #tdr-settings2 .lang-card .lang-code{position:absolute;top:7px;right:8px;font-size:8px;font-weight:1000;letter-spacing:.16em;opacity:.8;text-shadow:0 1px 4px #000}
      #tdr-settings2 .lang-card .lang-check{position:absolute;top:6px;left:8px;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;background:rgba(9,18,28,.78);border:1px solid rgba(255,255,255,.3);font-size:9px;font-weight:1000;opacity:0;transform:scale(.8);transition:.12s}
      #tdr-settings2 .lang-card .lang-name{font-size:12px;font-weight:1000;line-height:1;letter-spacing:.035em;text-transform:uppercase;text-shadow:0 1px 0 rgba(255,255,255,.08),0 2px 6px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;filter:drop-shadow(.35px 0 rgba(255,255,255,.2))}
      #tdr-settings2 .lang-card .lang-sub{margin-top:3px;font-size:7px;font-weight:900;line-height:1;letter-spacing:.075em;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 4px #000}
      #tdr-settings2 .lang-card.on{border-color:#7cffb8;box-shadow:0 0 0 1px rgba(66,247,149,.24),0 0 19px rgba(66,247,149,.2),inset 0 0 13px rgba(66,247,149,.045),inset 0 1px 0 rgba(255,255,255,.08)}
      #tdr-settings2 .lang-card.on .lang-check{opacity:1;transform:scale(1);background:#1b8c59;border-color:#7cffb8;color:#fff;box-shadow:0 0 9px rgba(66,247,149,.34)}
      #tdr-settings2 .lang-card.future{opacity:.34;filter:saturate(.55) brightness(.8);cursor:default}
      #tdr-settings2 .lang-card.future .lang-sub{opacity:.62}
      #tdr-settings2 .lang-active-note{margin-top:8px;color:#70ffad;font-size:9px;font-weight:900;letter-spacing:.03em}
      @media(max-width:760px){#tdr-settings2 .lang-grid{gap:5px}#tdr-settings2 .lang-card{height:50px;border-radius:11px}#tdr-settings2 .lang-card .lang-content{height:50px;padding:7px 8px}#tdr-settings2 .lang-card .lang-name{font-size:10px;letter-spacing:.02em}#tdr-settings2 .lang-card .lang-sub{font-size:6px}#tdr-settings2 .lang-card .lang-code{top:5px;right:6px;font-size:7px}#tdr-settings2 .lang-card .lang-check{top:5px;left:6px;width:14px;height:14px;font-size:8px}}
    `;
    document.head.appendChild(style);
  }

  _translateSettingsChrome(){
    if(!this.root)return;
    const back=this.root.querySelector('.s2back');
    const title=this.root.querySelector('.s2title');
    const saved=this.root.querySelector('.s2save');
    if(back)back.textContent=t('settings.back');
    if(title)title.textContent=t('settings.title');
    if(saved)saved.textContent=t('settings.saved');

    const labels={controls:'settings.controls',video:'settings.video',audio:'settings.audio',language:'settings.language'};
    for(const [tab,key] of Object.entries(labels)){
      const el=this.root.querySelector(`[data-tab="${tab}"]`);
      if(el)el.textContent=t(key);
    }
  }

  _renderTab(tab){
    if(tab!=='language'){
      super._renderTab(tab);
      this._translateSettingsChrome();
      return;
    }

    if(!this.root)return;
    this.root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab==='language'));
    const body=this.root.querySelector('.s2body');
    if(!body)return;

    const current=getLanguage();
    this.settings.language=current;
    const subtitles={es:'España · ES',en:'English · EN'};
    const activeChoices=SUPPORTED_LANGUAGES.map(({code,nativeLabel})=>
      `<button class="lang-card ${code} ${current===code?'on':''}" data-language="${code}" aria-pressed="${current===code?'true':'false'}">
        <span class="lang-content">
          <span class="lang-check">✓</span>
          <span class="lang-code">${code.toUpperCase()}</span>
          <span class="lang-name">${nativeLabel}</span>
          <span class="lang-sub">${subtitles[code]||code.toUpperCase()}</span>
        </span>
      </button>`
    ).join('');
    const futureChoices=[['fr','Français'],['de','Deutsch'],['it','Italiano']].map(([code,name])=>
      `<button class="lang-card future ${code}" type="button" disabled aria-disabled="true">
        <span class="lang-content">
          <span class="lang-code">${code.toUpperCase()}</span>
          <span class="lang-name">${name}</span>
          <span class="lang-sub">PRÓX.</span>
        </span>
      </button>`
    ).join('');

    body.innerHTML=`
      <div class="s2grid">
        <section class="s2card wide">
          <div class="s2label">${t('settings.languageTitle')}</div>
          <div class="s2desc">${t('settings.languageDesc')}</div>
          <div class="lang-grid">${activeChoices}${futureChoices}</div>
          <div class="lang-active-note">${t('settings.languageActive')}: ${languageName(current)}</div>
        </section>
        <section class="s2card wide">
          <div class="s2label">ES · EN</div>
          <div class="s2desc">${t('settings.languageNote')}</div>
          <div class="s2desc">${t('settings.restartNote')}</div>
        </section>
      </div>`;

    body.querySelectorAll('[data-language]').forEach(button=>{
      button.onclick=()=>{
        const code=setLanguage(button.dataset.language);
        this.settings.language=code;
        try{localStorage.setItem('tdr2:settings',JSON.stringify(this.settings));}catch{}
        this._translateSettingsChrome();
        this._renderTab('language');
      };
    });
    this._translateSettingsChrome();
  }
}
