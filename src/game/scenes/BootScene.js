import Phaser from 'phaser';
import { applyCarOverrides } from '../cars/carSpecs.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload() {
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
    this.load.on('progress', p => { fill.width = Math.max(2, Math.floor((barW - 2) * p)); });
    this.load.on('complete', () => outline.destroy());
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    const { width, height } = this.scale;
    try { applyCarOverrides(this.cache.json.get('car_overrides')); } catch {}

    // En iPhone 12 / modo seguro evitamos incluso decodificar el MP4 de intro.
    if (window.__tdrIosSafeMode === true) {
      this.scene.start('menu');
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
    const cleanupAndGo = () => {
      if(leaving)return; leaving=true;
      this.tweens.add({targets:fadeRect,alpha:1,duration:300,ease:'Sine.easeInOut',onComplete:()=>{
        this.scale.off('resize',onResize);
        video.onended=null;video.onerror=null;
        try{video.pause();}catch{}
        try{video.removeAttribute('src');video.load();}catch{}
        try{domEl.destroy();}catch{}
        try{video.remove();}catch{}
        this.scene.start('menu');
      }});
    };
    video.onended=cleanupAndGo;
    video.onerror=cleanupAndGo;

    const p=video.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{
      const hint=this.add.text(width/2,height*.8,'Toca para empezar',{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto,Arial',fontSize:'18px',color:'#ffffff'}).setOrigin(.5);
      this.input.once('pointerdown',()=>{hint.destroy();video.play().catch(cleanupAndGo);});
    });
    this.time.delayedCall(7000,()=>{if(this.scene.isActive())cleanupAndGo();});
  }
}
