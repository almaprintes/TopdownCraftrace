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
      #tdr-settings2 .lang-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}
      #tdr-settings2 .lang-card{position:relative;min-height:122px;border:1px solid rgba(255,255,255,.14);border-radius:18px;overflow:hidden;padding:0;background:#0d1522;color:#fff;text-align:left;isolation:isolate;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 10px 25px rgba(0,0,0,.18);transition:transform .12s,border-color .12s,box-shadow .12s}
      #tdr-settings2 .lang-card:active{transform:scale(.985)}
      #tdr-settings2 .lang-card:before,#tdr-settings2 .lang-card:after{content:'';position:absolute;inset:0;pointer-events:none}
      #tdr-settings2 .lang-card:after{background:linear-gradient(90deg,rgba(5,10,18,.18),rgba(5,10,18,.68) 58%,rgba(5,10,18,.86));z-index:-1}
      #tdr-settings2 .lang-card.es:before{background:linear-gradient(180deg,#aa151b 0 27%,#f1bf00 27% 73%,#aa151b 73% 100%);opacity:.72;z-index:-2}
      #tdr-settings2 .lang-card.en:before{background:
        linear-gradient(33deg,transparent 42%,rgba(255,255,255,.92) 42% 48%,#c8102e 48% 52%,rgba(255,255,255,.92) 52% 58%,transparent 58%),
        linear-gradient(-33deg,transparent 42%,rgba(255,255,255,.92) 42% 48%,#c8102e 48% 52%,rgba(255,255,255,.92) 52% 58%,transparent 58%),
        linear-gradient(90deg,transparent 39%,rgba(255,255,255,.94) 39% 45%,#c8102e 45% 55%,rgba(255,255,255,.94) 55% 61%,transparent 61%),
        linear-gradient(180deg,transparent 35%,rgba(255,255,255,.94) 35% 43%,#c8102e 43% 57%,rgba(255,255,255,.94) 57% 65%,transparent 65%),
        #012169;opacity:.72;z-index:-2}
      #tdr-settings2 .lang-card .lang-content{position:relative;z-index:2;height:100%;min-height:122px;padding:18px 20px;display:flex;flex-direction:column;justify-content:flex-end}
      #tdr-settings2 .lang-card .lang-code{position:absolute;top:14px;right:16px;font-size:11px;font-weight:1000;letter-spacing:.18em;opacity:.78}
      #tdr-settings2 .lang-card .lang-check{position:absolute;top:13px;left:16px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(9,18,28,.72);border:1px solid rgba(255,255,255,.28);font-size:14px;font-weight:1000;opacity:0;transform:scale(.8);transition:.12s}
      #tdr-settings2 .lang-card .lang-name{font-size:clamp(20px,2.25vw,28px);font-weight:1000;letter-spacing:.02em;text-shadow:0 2px 8px rgba(0,0,0,.45)}
      #tdr-settings2 .lang-card .lang-sub{margin-top:4px;font-size:10px;font-weight:850;letter-spacing:.08em;opacity:.82}
      #tdr-settings2 .lang-card.on{border-color:#7cffb8;box-shadow:0 0 0 2px rgba(66,247,149,.16),0 0 30px rgba(66,247,149,.16),inset 0 1px 0 rgba(255,255,255,.08)}
      #tdr-settings2 .lang-card.on .lang-check{opacity:1;transform:scale(1);background:#1b8c59;border-color:#7cffb8;color:#fff}
      #tdr-settings2 .lang-active-note{margin-top:12px;color:#70ffad;font-size:11px;font-weight:900;letter-spacing:.03em}
      @media(max-width:760px){#tdr-settings2 .lang-grid{gap:9px}#tdr-settings2 .lang-card{min-height:100px;border-radius:15px}#tdr-settings2 .lang-card .lang-content{min-height:100px;padding:13px 14px}#tdr-settings2 .lang-card .lang-name{font-size:18px}#tdr-settings2 .lang-card .lang-code{top:10px;right:11px}#tdr-settings2 .lang-card .lang-check{top:9px;left:11px}}
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
    const choices=SUPPORTED_LANGUAGES.map(({code,nativeLabel})=>
      `<button class="lang-card ${code} ${current===code?'on':''}" data-language="${code}" aria-pressed="${current===code?'true':'false'}">
        <span class="lang-content">
          <span class="lang-check">✓</span>
          <span class="lang-code">${code.toUpperCase()}</span>
          <span class="lang-name">${nativeLabel}</span>
          <span class="lang-sub">${subtitles[code]||code.toUpperCase()}</span>
        </span>
      </button>`
    ).join('');

    body.innerHTML=`
      <div class="s2grid">
        <section class="s2card wide">
          <div class="s2label">${t('settings.languageTitle')}</div>
          <div class="s2desc">${t('settings.languageDesc')}</div>
          <div class="lang-grid">${choices}</div>
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
