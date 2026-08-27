import { SettingsScene as CurrentSettingsScene } from './SettingsAudioMusicScene.js';
import { getLanguage } from '../i18n/index.js';

const STORAGE_KEY='tdr2:settings';

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

function boolCard(label,desc,key,value){
  return `<section class="s2card"><div class="s2label">${label}</div><div class="s2desc">${desc}</div><div class="s2row"><button type="button" class="s2choice ${value?'on':''}" data-video-bool="${key}">${value?'ON':'OFF'}</button></div></section>`;
}

export class SettingsScene extends CurrentSettingsScene {
  _renderTab(tab){
    super._renderTab(tab);
    if(tab!=='video' || !this.root)return;

    const body=this.root.querySelector('.s2body');
    if(!body)return;
    const v=this.settings.video||(this.settings.video={});
    if(typeof v.antialias!=='boolean')v.antialias=v.quality!=='low';
    if(![30,45,60].includes(Number(v.targetFps)))v.targetFps=60;
    if(typeof v.particles!=='boolean')v.particles=true;
    if(typeof v.showFPS!=='boolean')v.showFPS=false;
    if(!['low','medium','high'].includes(String(v.quality)))v.quality='high';

    const en=getLanguage()==='en';
    const fps=[30,45,60];
    const pending={...v};

    const qualityDesc=()=>{
      if(pending.quality==='low')return en
        ?'LOW: 3×3 track chunks, no forward lookahead, no asphalt overlay, particles off.'
        :'BAJA: 3×3 chunks de pista, sin precarga hacia delante, sin overlay de asfalto y partículas desactivadas.';
      if(pending.quality==='medium')return en
        ?'MEDIUM: normal track range, no asphalt overlay. Balanced option.'
        :'MEDIA: alcance normal de pista, sin overlay de asfalto. Opción equilibrada.';
      return en
        ?'HIGH: full track range, lookahead and all visual layers.'
        :'ALTA: alcance completo de pista, precarga hacia delante y todas las capas visuales.';
    };

    const render=()=>{
      body.innerHTML=`<div class="s2grid">
        <section class="s2card wide">
          <div class="s2label">${en?'GRAPHICS PRESET':'CALIDAD GRÁFICA'}</div>
          <div class="s2desc">${qualityDesc()}</div>
          <div class="s2row" data-quality-row>${[['low',en?'LOW':'BAJA'],['medium',en?'MEDIUM':'MEDIA'],['high',en?'HIGH':'ALTA']].map(([key,label])=>`<button type="button" class="s2choice ${pending.quality===key?'on':''}" data-quality="${key}">${label}</button>`).join('')}</div>
        </section>
        <section class="s2card">
          <div class="s2label">${en?'TARGET FPS':'FPS OBJETIVO'}</div>
          <div class="s2desc">${en?'Caps the game loop. It does not reduce render cost by itself.':'Limita el bucle del juego. Por sí solo no reduce el coste de renderizado.'}</div>
          <div class="s2row" data-target-fps>${fps.map(val=>`<button type="button" class="s2choice ${Number(pending.targetFps)===val?'on':''}" data-fps="${val}">${val}</button>`).join('')}</div>
        </section>
        ${boolCard(en?'ANTIALIASING':'ANTIALIASING',en?'Smooths edges but costs GPU time. LOW turns it off automatically.':'Suaviza bordes pero consume GPU. BAJA lo desactiva automáticamente.','antialias',pending.antialias)}
        ${boolCard(en?'PARTICLES':'PARTÍCULAS',en?'Smoke, dust and other non-essential effects. LOW turns them off automatically.':'Humo, polvo y otros efectos no esenciales. BAJA los desactiva automáticamente.','particles',pending.particles)}
        ${boolCard(en?'PERFORMANCE HUD':'HUD DE RENDIMIENTO',en?'Shows FPS and diagnostic timings. Keep it off for normal play.':'Muestra FPS y tiempos de diagnóstico. Déjalo apagado para jugar normalmente.','showFPS',pending.showFPS)}
        <section class="s2card wide">
          <div class="s2label">${en?'SELECTED MODE':'MODO SELECCIONADO'}</div>
          <div class="s2row" style="justify-content:space-between;gap:14px">
            <span class="s2val">${String(pending.quality).toUpperCase()} · ${pending.antialias?'AA ON':'AA OFF'} · ${pending.particles?'PARTICLES ON':'PARTICLES OFF'} · ${Number(pending.targetFps)} FPS</span>
            <button type="button" class="s2apply" data-apply-video>${en?'APPLY CHANGES':'APLICAR CAMBIOS'}</button>
          </div>
          <div class="s2desc">${en?'Only settings that really change the renderer are shown here. The game reloads once when you apply them.':'Aquí solo mostramos ajustes que cambian realmente el renderizado. El juego se reinicia una sola vez al aplicarlos.'}</div>
        </section>
      </div>`;

      body.querySelectorAll('button[data-fps]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();pending.targetFps=Number(btn.dataset.fps);render();});
      body.querySelectorAll('button[data-quality]').forEach(btn=>btn.onclick=e=>{
        e.stopPropagation();
        pending.quality=String(btn.dataset.quality);
        if(pending.quality==='low'){
          pending.antialias=false;
          pending.particles=false;
        }
        render();
      });
      body.querySelectorAll('button[data-video-bool]').forEach(btn=>btn.onclick=e=>{
        e.stopPropagation();
        const key=btn.dataset.videoBool;
        pending[key]=!pending[key];
        render();
      });
      body.querySelector('[data-apply-video]')?.addEventListener('click',e=>{
        e.stopPropagation();
        persistVideo(this.settings,pending);
        const apply=body.querySelector('[data-apply-video]');
        if(apply){apply.disabled=true;apply.textContent=en?'APPLYING…':'APLICANDO…';}
        window.setTimeout(()=>window.location.reload(),220);
      });
    };

    render();
  }
}
