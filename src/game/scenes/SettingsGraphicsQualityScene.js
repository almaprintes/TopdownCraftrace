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
    if(!Number.isFinite(Number(v.resolutionScale))){
      const old=String(v.renderScale||'normal');
      v.resolutionScale=old==='eco'?0.65:old==='sharp'?1:0.85;
    }
    if(typeof v.antialias!=='boolean')v.antialias=v.quality!=='low';
    if(![30,45,60].includes(Number(v.targetFps)))v.targetFps=60;
    if(typeof v.particles!=='boolean')v.particles=true;
    if(typeof v.showFPS!=='boolean')v.showFPS=false;
    if(!['low','medium','high'].includes(String(v.quality)))v.quality='high';

    const en=getLanguage()==='en';
    const scales=[[0.50,'50%'],[0.65,'65%'],[0.80,'80%'],[1.00,'100%']];
    const fps=[30,45,60];
    const pending={...v};

    const render=()=>{
      body.innerHTML=`<div class="s2grid">
        <section class="s2card wide">
          <div class="s2label">${en?'RENDER RESOLUTION':'RESOLUCIÓN DE RENDER'}</div>
          <div class="s2desc">${en?'This most directly reduces GPU load. 50% renders one quarter of the pixels of 100%.':'Este es el ajuste que más directamente reduce la carga de GPU. 50% renderiza una cuarta parte de los píxeles de 100%.'}</div>
          <div class="s2row" data-render-scale>${scales.map(([val,label])=>`<button type="button" class="s2choice ${Math.abs(Number(pending.resolutionScale)-val)<.01?'on':''}" data-scale="${val}">${label}</button>`).join('')}</div>
        </section>
        <section class="s2card">
          <div class="s2label">${en?'TARGET FPS':'FPS OBJETIVO'}</div>
          <div class="s2desc">${en?'Caps the game loop. It does not lower visual quality.':'Limita el bucle del juego. No reduce la calidad visual.'}</div>
          <div class="s2row" data-target-fps>${fps.map(val=>`<button type="button" class="s2choice ${Number(pending.targetFps)===val?'on':''}" data-fps="${val}">${val}</button>`).join('')}</div>
        </section>
        <section class="s2card">
          <div class="s2label">${en?'GRAPHICS PRESET':'CALIDAD GRÁFICA'}</div>
          <div class="s2desc">${en?'Controls secondary decoration and effects.':'Controla decoración y efectos secundarios.'}</div>
          <div class="s2row" data-quality>${[['low',en?'LOW':'BAJA'],['medium',en?'MEDIUM':'MEDIA'],['high',en?'HIGH':'ALTA']].map(([key,label])=>`<button type="button" class="s2choice ${pending.quality===key?'on':''}" data-quality="${key}">${label}</button>`).join('')}</div>
        </section>
        ${boolCard(en?'ANTIALIASING':'ANTIALIASING',en?'Smooths edges, but costs GPU time. Turn it off on slower devices.':'Suaviza bordes, pero consume GPU. Desactívalo en dispositivos lentos.','antialias',pending.antialias)}
        ${boolCard(en?'PARTICLES':'PARTÍCULAS',en?'Smoke, dust and other non-essential effects.':'Humo, polvo y otros efectos no esenciales.','particles',pending.particles)}
        ${boolCard(en?'PERFORMANCE HUD':'HUD DE RENDIMIENTO',en?'Shows FPS and diagnostic timings.':'Muestra FPS y tiempos de diagnóstico.','showFPS',pending.showFPS)}
        <section class="s2card wide">
          <div class="s2label">${en?'PENDING RENDER MODE':'MODO DE RENDER SELECCIONADO'}</div>
          <div class="s2row" style="justify-content:space-between;gap:14px">
            <span class="s2val">${String(pending.quality).toUpperCase()} · ${Math.round(Number(pending.resolutionScale)*100)}% · ${pending.antialias?'AA ON':'AA OFF'} · ${Number(pending.targetFps)} FPS</span>
            <button type="button" class="s2apply" data-apply-video>${en?'APPLY CHANGES':'APLICAR CAMBIOS'}</button>
          </div>
          <div class="s2desc">${en?'Select everything first. The game reloads only when you press Apply.':'Selecciona primero todos los ajustes. El juego solo se reinicia al pulsar Aplicar.'}</div>
        </section>
      </div>`;

      body.querySelectorAll('[data-scale]').forEach(btn=>btn.onclick=()=>{pending.resolutionScale=Number(btn.dataset.scale);render();});
      body.querySelectorAll('[data-fps]').forEach(btn=>btn.onclick=()=>{pending.targetFps=Number(btn.dataset.fps);render();});
      body.querySelectorAll('[data-quality]').forEach(btn=>btn.onclick=()=>{
        pending.quality=String(btn.dataset.quality);
        if(pending.quality==='low')pending.antialias=false;
        render();
      });
      body.querySelectorAll('[data-video-bool]').forEach(btn=>btn.onclick=()=>{
        const key=btn.dataset.videoBool;
        pending[key]=!pending[key];
        render();
      });
      body.querySelector('[data-apply-video]')?.addEventListener('click',()=>{
        persistVideo(this.settings,pending);
        const apply=body.querySelector('[data-apply-video]');
        if(apply){apply.disabled=true;apply.textContent=en?'APPLYING…':'APLICANDO…';}
        window.setTimeout(()=>window.location.reload(),220);
      });
    };

    render();
  }
}
