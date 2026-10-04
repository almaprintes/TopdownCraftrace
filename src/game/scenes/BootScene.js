import Phaser from 'phaser';
import { applyCarOverrides } from '../cars/carSpecs.js';

function bootMark(phase, extra={}) {
  try {
    const now=performance.now();
    const start=Number(window.__tdrBootStartedAt)||now;
    const detail={phase,elapsedMs:Math.max(0,Math.round(now-start)),...extra};
    window.__tdrBootLast=detail;
    window.dispatchEvent(new CustomEvent('tdr:bootphase',{detail}));
  } catch {}
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
    bootMark('boot-preload', { progress:0 });
    if (this.textures.exists('ui_rotate_landscape')) this.textures.remove('ui_rotate_landscape');
    this.load.image('ui_rotate_landscape', 'assets/ui/orientation_portrait.png');

    // Only resources required to paint the first lobby frame belong in Boot.
    this.load.image('logo', 'assets/logos/logo_tdr2_sobres.webp');
    this.load.json('car_overrides', 'community/car-overrides.json');
    this.load.json('trackjson:track01', 'tracks/library/track01/track.json');
    this.load.image('menu_bg', 'assets/ui/menu_bg.webp');
    this.load.image('lobby-platform', 'assets/ui/lobby/car_platform.webp');
    this.load.image('panel_event', 'assets/ui/panel_event.webp');
    this.load.image('btn_play', 'assets/ui/btn_play.webp');
    this.load.image('btn_garage', 'assets/ui/btn_garage.webp');
    this.load.image('btn_factory', 'assets/ui/btn_factory.webp');
    this.load.image('btn_tracks', 'assets/ui/btn_tracks.webp');

    const { width, height } = this.scale;
    const barW = Math.min(520, Math.floor(width * 0.7));
    const barH = 10;
    const x = (width - barW) / 2;
    const y = Math.floor(height * 0.72);
    const outline = this.add.rectangle(x + barW / 2, y, barW, barH, 0x0b1020, 0).setStrokeStyle(1, 0xb7c0ff, 0.35);
    const fill = this.add.rectangle(x, y, 0, barH - 2, 0x2bff88, 0.9).setOrigin(0, 0.5);
    this.load.on('progress', p => {
      fill.width = Math.max(2, Math.floor((barW - 2) * p));
      bootMark('boot-preload', { progress:Math.round(Math.max(0,Math.min(1,p))*100) });
    });
    this.load.on('complete', () => {
      outline.destroy();
      bootMark('boot-assets-ready', { progress:100 });
    });
  }

  create() {
    bootMark('boot-create');
    this.cameras.main.setBackgroundColor('#000000');
    try { applyCarOverrides(this.cache.json.get('car_overrides')); } catch {}

    // Startup rule: optional media never sits on the critical path.
    // The intro asset remains in the project for a future one-time/on-demand use,
    // but every normal launch goes directly from Boot to the lobby.
    const rallyDemo=location.pathname.includes('/rally-demo/');
    const launchMenu=async()=>{
      if(rallyDemo){
        bootMark('rally-demo-start');
        try{
          localStorage.setItem('tdr2:gameMode','rally');
          localStorage.setItem('tdr2:trackKey','rally-arafo-los-loros');
        }catch{}
        const carId=(()=>{try{return localStorage.getItem('tdr2:carId')||'helix_spark';}catch{return'helix_spark';}})();
        const ensure=window.__tdrEnsureScene;
        if(typeof ensure==='function'&&await ensure('race')){
          this.scene.start('race',{carId,trackKey:'rally-arafo-los-loros',gameMode:'rally'});
          return;
        }
        console.error('[rally-demo] race scene unavailable');
        return;
      }
      bootMark('menu-start');
      this.scene.start('menu');
    };

    // DEV-only gate: make it unmistakable that this URL is a development build.
    const root=document.createElement('div');
    root.id='tdr-dev-entry-notice';
    root.innerHTML=`<div class="tdr-dev-notice-card" role="dialog" aria-modal="true" aria-labelledby="tdr-dev-notice-title"><div class="tdr-dev-notice-sign">JUANFRIKAZO_DEV</div><h2 id="tdr-dev-notice-title">VERSIÓN DE DESARROLLO</h2><p>Estás entrando en una versión de pruebas de Top Down RACE.</p><p>Puede contener cambios, funciones experimentales o algún error.</p><p class="tdr-dev-notice-feedback">¿Ves algo raro? Cuéntamelo. Tu feedback ayuda a mejorar TDR.</p><button type="button">ENTENDIDO</button></div>`;
    const style=document.createElement('style');
    style.id='tdr-dev-entry-notice-style';
    style.textContent=`#tdr-dev-entry-notice{position:fixed;inset:0;z-index:36000;display:flex;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(18px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));box-sizing:border-box;background:rgba(3,8,16,.94);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}.tdr-dev-notice-card{width:min(620px,88vw);max-height:88vh;overflow:auto;box-sizing:border-box;padding:clamp(20px,4vw,38px);border:1px solid rgba(88,232,255,.42);background:linear-gradient(145deg,#101a2b,#08121e);box-shadow:0 20px 70px rgba(0,0,0,.55);text-align:center}.tdr-dev-notice-sign{display:inline-block;padding:6px 10px;border:1px solid #58e8ff;color:#58e8ff;font-size:clamp(10px,1.5vw,13px);font-weight:950;letter-spacing:.15em}.tdr-dev-notice-card h2{margin:14px 0 18px;font-size:clamp(20px,3.2vw,32px);letter-spacing:.07em}.tdr-dev-notice-card p{margin:9px auto;max-width:520px;color:#dce7f3;font-size:clamp(13px,1.8vw,16px);line-height:1.45}.tdr-dev-notice-card .tdr-dev-notice-feedback{margin-top:16px;color:#9fefff;font-weight:750}.tdr-dev-notice-card button{margin-top:22px;min-width:190px;min-height:48px;padding:0 26px;border:1px solid #58e8ff;background:#102c3a;color:#fff;font:900 14px system-ui;letter-spacing:.09em;cursor:pointer}.tdr-dev-notice-card button:active{transform:translateY(1px)}`;
    document.head.appendChild(style);
    document.body.appendChild(root);
    root.querySelector('button')?.addEventListener('click',()=>{
      root.remove();style.remove();launchMenu();
    },{once:true});

    // The HTML watchdog reports failures; only the painted lobby signals readiness.
  }
}
