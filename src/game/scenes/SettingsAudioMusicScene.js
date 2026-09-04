import { SettingsScene as CurrentSettingsScene } from './SettingsLanguageScene.js';
import { getLanguage } from '../i18n/index.js';

const STORAGE_KEY='tdr2:settings';
const AUDIO_EVENT='tdr2:audio-settings';

function persistSettings(settings){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}
}

function persistAudio(settings){
  persistSettings(settings);
  try{window.dispatchEvent(new CustomEvent(AUDIO_EVENT,{detail:{...(settings.audio||{})}}));}catch{}
}

export class SettingsScene extends CurrentSettingsScene {
  init(){
    super.init();
    const controls=this.settings?.controls;
    if(controls?.steeringMode==='wheel'){
      controls.steeringMode='stick';
      controls.scheme='touch';
      persistSettings(this.settings);
    }
  }

  _renderTab(tab){
    super._renderTab(tab);

    if(tab==='controls' && this.root){
      this.root.querySelector('[data-choice="steer"] [data-v="wheel"]')?.remove?.();
      return;
    }

    if(tab!=='audio' || !this.root)return;

    const body=this.root.querySelector('.s2body');
    const grid=body?.querySelector('.s2grid');
    if(!grid || grid.querySelector('[data-music-volume-card]'))return;

    const audio=this.settings.audio||(this.settings.audio={});
    if(!Number.isFinite(Number(audio.music)))audio.music=.8;

    const card=document.createElement('section');
    card.className='s2card';
    card.dataset.musicVolumeCard='1';
    const label=getLanguage()==='en'?'MUSIC':'MÚSICA';
    card.innerHTML=`<div class="s2label">${label}</div><div class="s2row"><input class="s2range" data-a="music" type="range" min="0" max="1" step="0.02" value="${audio.music}"><span class="s2val">${Math.round(audio.music*100)}%</span></div>`;

    const master=grid.querySelector('[data-a="master"]')?.closest('.s2card');
    if(master?.nextSibling)grid.insertBefore(card,master.nextSibling);else grid.appendChild(card);

    const range=card.querySelector('[data-a="music"]');
    range.oninput=()=>{
      audio.music=Number(range.value);
      range.nextElementSibling.textContent=`${Math.round(audio.music*100)}%`;
      persistAudio(this.settings);
    };

    persistAudio(this.settings);
  }
}
