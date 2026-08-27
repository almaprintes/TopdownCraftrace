import { SettingsScene as CurrentSettingsScene } from './SettingsAudioMusicScene.js';
import { getLanguage } from '../i18n/index.js';

const STORAGE_KEY='tdr2:settings';

const PRESETS=Object.freeze({
  performance:Object.freeze({
    quality:'low',targetFps:30,antialias:false,particles:false,surfaceResolution:'1k',lighting:false,
    es:'Prioriza estabilidad, temperatura y batería. Ideal para móviles modestos o sesiones largas.',
    en:'Prioritizes stability, thermals and battery life. Ideal for modest phones or long sessions.'
  }),
  medium:Object.freeze({
    quality:'medium',targetFps:45,antialias:true,particles:false,surfaceResolution:'1k',lighting:true,
    es:'Equilibrio entre fluidez y detalle. La opción segura para la mayoría de dispositivos.',
    en:'Balanced smoothness and detail. The safe choice for most devices.'
  }),
  high:Object.freeze({
    quality:'high',targetFps:60,antialias:true,particles:true,surfaceResolution:'2k',lighting:true,
    es:'Prioriza detalle visual manteniendo un objetivo de 60 FPS en dispositivos potentes.',
    en:'Prioritizes visual detail while targeting 60 FPS on powerful devices.'
  }),
  ultra:Object.freeze({
    quality:'high',targetFps:60,antialias:true,particles:true,surfaceResolution:'4k',lighting:true,ultra:true,
    es:'Máxima calidad disponible. El juego adapta automáticamente la resolución de materiales al dispositivo para evitar sobrecargar la memoria.',
    en:'Maximum available quality. Material resolution adapts automatically to the device to avoid excessive memory pressure.'
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
          <div class="s2desc">${en?'Choose one mode. The game handles all technical graphics settings automatically.':'Elige un modo. El juego se encarga automáticamente de todos los ajustes técnicos.'}</div>
          <div class="s2row" data-preset-row>${Object.keys(PRESETS).map(key=>`<button type="button" class="s2choice ${selected===key?'on':''}" data-preset="${key}">${labels[key]}</button>`).join('')}</div>
        </section>

        <section class="s2card wide">
          <div class="s2label">${labels[selected]}</div>
          <div class="s2desc">${en?cfg.en:cfg.es}</div>
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
