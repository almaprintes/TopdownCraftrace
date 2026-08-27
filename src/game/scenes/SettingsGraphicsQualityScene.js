import { SettingsScene as CurrentSettingsScene } from './SettingsAudioMusicScene.js';
import { getLanguage } from '../i18n/index.js';

const STORAGE_KEY='tdr2:settings';

const PRESETS=Object.freeze({
  performance:Object.freeze({
    quality:'low',targetFps:30,antialias:false,particles:false,surfaceResolution:'1k',lighting:false,
    es:'Prioriza estabilidad y batería. 30 FPS, superficies ligeras, sin iluminación avanzada ni partículas.',
    en:'Prioritizes stability and battery life. 30 FPS, light surfaces, no advanced lighting or particles.'
  }),
  medium:Object.freeze({
    quality:'medium',targetFps:45,antialias:true,particles:false,surfaceResolution:'1k',lighting:true,
    es:'Equilibrado. 45 FPS, antialiasing e iluminación de materiales con coste contenido.',
    en:'Balanced. 45 FPS, antialiasing and material lighting at a controlled cost.'
  }),
  high:Object.freeze({
    quality:'high',targetFps:60,antialias:true,particles:true,surfaceResolution:'2k',lighting:true,
    es:'Alta calidad. 60 FPS, superficies 2K, iluminación de materiales y efectos completos.',
    en:'High quality. 60 FPS, 2K surfaces, material lighting and full effects.'
  }),
  ultra:Object.freeze({
    quality:'high',targetFps:60,antialias:true,particles:true,surfaceResolution:'4k',lighting:true,ultra:true,
    es:'Máxima calidad. 60 FPS, superficies hasta 4K y todos los efectos disponibles. Recomendado para móviles potentes.',
    en:'Maximum quality. 60 FPS, surfaces up to 4K and every available effect. Recommended for powerful phones.'
  })
});

function save(settings){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}
}

function persistVideo(settings,video){
  try{
    const current=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const next={...current,video:{...(current.video||{}),...(video||{})}};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(next));
    if(settings)settings.video={...(settings.video||{}),...(video||{})};
  }catch{
    if(settings)settings.video={...(settings.video||{}),...(video||{})};
    save(settings);
  }
}

function inferPreset(video){
  const explicit=String(video?.preset||'').toLowerCase();
  if(PRESETS[explicit])return explicit;
  const q=String(video?.quality||'high').toLowerCase();
  if(q==='low')return 'performance';
  if(q==='medium')return 'medium';
  return 'high';
}

function appliedVideoFor(preset,showFPS){
  const cfg=PRESETS[preset]||PRESETS.high;
  return {...cfg,preset,showFPS:!!showFPS};
}

export class SettingsScene extends CurrentSettingsScene {
  _renderTab(tab){
    super._renderTab(tab);
    if(tab!=='video' || !this.root)return;

    const body=this.root.querySelector('.s2body');
    if(!body)return;
    const v=this.settings.video||(this.settings.video={});
    const en=getLanguage()==='en';
    let selected=inferPreset(v);
    let showFPS=!!v.showFPS;

    const labels={
      performance:en?'PERFORMANCE':'RENDIMIENTO',
      medium:en?'MEDIUM':'MEDIO',
      high:en?'HIGH QUALITY':'ALTA CALIDAD',
      ultra:'ULTRA'
    };

    const render=()=>{
      const cfg=PRESETS[selected];
      body.innerHTML=`<div class="s2grid">
        <section class="s2card wide">
          <div class="s2label">${en?'GRAPHICS QUALITY':'CALIDAD GRÁFICA'}</div>
          <div class="s2desc">${en?'Choose one mode. The game configures the technical options automatically.':'Elige un modo. El juego configura automáticamente todas las opciones técnicas.'}</div>
          <div class="s2row" data-preset-row>${Object.keys(PRESETS).map(key=>`<button type="button" class="s2choice ${selected===key?'on':''}" data-preset="${key}">${labels[key]}</button>`).join('')}</div>
        </section>

        <section class="s2card wide">
          <div class="s2label">${labels[selected]}</div>
          <div class="s2desc">${en?cfg.en:cfg.es}</div>
          <div class="s2row" style="gap:18px;flex-wrap:wrap">
            <span class="s2val">${cfg.targetFps} FPS</span>
            <span class="s2val">${String(cfg.surfaceResolution).toUpperCase()}</span>
            <span class="s2val">AA ${cfg.antialias?'ON':'OFF'}</span>
            <span class="s2val">${en?'LIGHTING':'LUCES'} ${cfg.lighting?'ON':'OFF'}</span>
            <span class="s2val">${en?'EFFECTS':'EFECTOS'} ${cfg.particles?'ON':'OFF'}</span>
          </div>
        </section>

        <section class="s2card">
          <div class="s2label">${en?'PERFORMANCE HUD':'HUD DE RENDIMIENTO'}</div>
          <div class="s2desc">${en?'Diagnostic FPS and timings. It does not change graphics quality.':'FPS y tiempos de diagnóstico. No cambia la calidad gráfica.'}</div>
          <div class="s2row"><button type="button" class="s2choice ${showFPS?'on':''}" data-fps-hud>${showFPS?'ON':'OFF'}</button></div>
        </section>

        <section class="s2card wide">
          <div class="s2row" style="justify-content:flex-end">
            <button type="button" class="s2apply" data-apply-video>${en?'APPLY':'APLICAR'}</button>
          </div>
          <div class="s2desc">${en?'The game reloads once so the selected preset is applied everywhere.':'El juego se reinicia una sola vez para aplicar el preset en todo el renderizado.'}</div>
        </section>
      </div>`;

      body.querySelectorAll('button[data-preset]').forEach(btn=>btn.onclick=e=>{
        e.stopPropagation();
        selected=String(btn.dataset.preset);
        render();
      });
      body.querySelector('[data-fps-hud]')?.addEventListener('click',e=>{
        e.stopPropagation();showFPS=!showFPS;render();
      });
      body.querySelector('[data-apply-video]')?.addEventListener('click',e=>{
        e.stopPropagation();
        persistVideo(this.settings,appliedVideoFor(selected,showFPS));
        const apply=body.querySelector('[data-apply-video]');
        if(apply){apply.disabled=true;apply.textContent=en?'APPLYING…':'APLICANDO…';}
        window.setTimeout(()=>window.location.reload(),220);
      });
    };

    render();
  }
}
