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

function finishStartupOverlay() {
  try {
    bootMark('menu-ready');
    window.dispatchEvent(new CustomEvent('tdr:bootready'));
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

    // Boot mínimo: solo recursos del menú inicial.
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

    // Ya NO se cargan globalmente aquí:
    // - karting-tenerife-completo.png (~3.2 MB comprimido; mucho más en RAM)
    // - asphaltOverlay
    // - start lights x7
    // - cards de garaje
    // - tutoriales
    // Todo eso debe vivir en la escena que realmente lo necesite.

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
    const { width, height } = this.scale;
    try { applyCarOverrides(this.cache.json.get('car_overrides')); } catch {}

    const goMenu = () => {
      bootMark('menu-start');

      // Do not remove the HTML startup screen before the lobby exists.
      // Phaser emits Scene CREATE only after the menu's own create() has completed.
      // Wait two browser frames as well so the finished lobby has actually painted
      // underneath the startup overlay before fading that overlay away.
      try {
        const menu=this.scene.get('menu');
        menu?.events?.once?.(Phaser.Scenes.Events.CREATE, () => {
          bootMark('menu-created');
          requestAnimationFrame(() => requestAnimationFrame(finishStartupOverlay));
        });
      } catch {}

      this.scene.start('menu');
    };

    // En iPhone 12 / modo seguro evitamos incluso decodificar el MP4 de intro.
    if (window.__tdrIosSafeMode === true) {
      goMenu();
      return;
    }

    const video = document.createElement('video');
    video.src = 'assets/intro/intro.mp4';
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = 'metadata';
    video.controls = false;
    video.loop = false;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.background = '#000';

    const domEl = this.add.dom(width / 2, height / 2, video).setOrigin(0.5);
    const fadeRect = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setDepth(1000);
    const onResize = gameSize => domEl.setPosition(gameSize.width / 2, gameSize.height / 2);
    this.scale.on('resize', onResize);

    let leaving=false;
    let introStarted=false;
    const cleanupAndGo = (animate=true) => {
      if(leaving)return; leaving=true;
      const finish=()=>{
        this.scale.off('resize',onResize);
        video.onended=null;video.onerror=null;video.onplaying=null;
        try{video.pause();}catch{}
        try{video.removeAttribute('src');video.load();}catch{}
        try{domEl.destroy();}catch{}
        try{video.remove();}catch{}
        goMenu();
      };
      if(!animate){finish();return;}
      this.tweens.add({targets:fadeRect,alpha:1,duration:220,ease:'Sine.easeInOut',onComplete:finish});
    };
    video.onended=()=>cleanupAndGo(true);
    video.onerror=()=>cleanupAndGo(false);
    video.onplaying=()=>{introStarted=true;bootMark('intro-playing');};

    bootMark('intro-request');
    const p=video.play();
    if(p&&typeof p.catch==='function')p.catch(()=>cleanupAndGo(false));

    // Critical startup rule: the intro is decoration, never a boot dependency.
    // If playback has not actually started quickly, abandon it and enter the menu.
    this.time.delayedCall(1200,()=>{
      if(this.scene.isActive()&&!introStarted) cleanupAndGo(false);
    });
    // Safety only for a genuinely playing intro.
    this.time.delayedCall(7000,()=>{
      if(this.scene.isActive()) cleanupAndGo(true);
    });
  }
}
