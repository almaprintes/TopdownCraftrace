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
    bootMark('menu-start');
    this.scene.start('menu');

    // Failsafe only. The final MenuScene normally emits tdr:bootready after its
    // create() has painted. Never leave the HTML startup cover stuck forever if
    // a future menu override forgets that signal.
    setTimeout(() => {
      try {
        const startup=document.getElementById('tdrStartup');
        if (startup && document.querySelector('#app canvas')) {
          bootMark('menu-ready-failsafe');
          finishStartupOverlay();
        }
      } catch {}
    }, 5000);
  }
}
