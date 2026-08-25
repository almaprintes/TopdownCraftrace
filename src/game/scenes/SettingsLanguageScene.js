import { SettingsScene as CurrentSettingsScene } from './SettingsWheelModeScene.js';
import { SUPPORTED_LANGUAGES, getLanguage, setLanguage, t, languageName } from '../i18n/index.js';

export class SettingsScene extends CurrentSettingsScene {
  _mount(){
    super._mount();
    if(!this.root)return;

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
    const choices=SUPPORTED_LANGUAGES.map(({code,nativeLabel})=>
      `<button class="s2choice ${current===code?'on':''}" data-language="${code}">${nativeLabel}</button>`
    ).join('');

    body.innerHTML=`
      <div class="s2grid">
        <section class="s2card wide">
          <div class="s2label">${t('settings.languageTitle')}</div>
          <div class="s2desc">${t('settings.languageDesc')}</div>
          <div class="s2row">${choices}<span class="s2note">${t('settings.languageActive')}: ${languageName(current)}</span></div>
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
