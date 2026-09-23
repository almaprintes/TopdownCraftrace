import { MenuScene as PreviousMenuScene } from './MenuStoreScene.js';
import { installLobbyDom } from '../ui/LobbyDomUi.js';
import { polishLobbyForPublish } from '../ui/LobbyPublishPolish.js';
import { CANONICAL_TRACK_IDS } from '../tracks/trackIdentity.js';
import '../ui/floating-chrome.css';
import '../ui/lobby-tablet.css';
import '../ui/seasonPassBehavior.js';

const canonicalLobbyTrackKey=value=>{const key=String(value||'').trim();return !key||key==='track01'||key==='track1'?CANONICAL_TRACK_IDS.ATLANTICO:key;};

export class MenuScene extends PreviousMenuScene {
  preload() {
    super.preload?.();
    const base = import.meta.env.BASE_URL || '/';
    if (!this.textures.exists('lobby-platform')) {
      this.load.image('lobby-platform', `${base}assets/ui/lobby/car_platform.webp`);
    }
  }

  _renderGlobalEventCard() {}

  _liveLobbyTrackKey() {
    let persisted = '';
    try { persisted = String(localStorage.getItem('tdr2:trackKey') || '').trim(); } catch {}
    const registered = String(this.registry?.get?.('selectedTrackKey') || '').trim();
    const live=canonicalLobbyTrackKey(persisted || registered || this.selectedTrackKey);
    try{if(persisted!==live)localStorage.setItem('tdr2:trackKey',live);}catch{}
    return live;
  }

  _syncLobbyTrackPreview() {
    const liveTrackKey = this._liveLobbyTrackKey();
    if (!liveTrackKey) return;
    if (this.selectedTrackKey !== liveTrackKey) {
      this.selectedTrackKey = liveTrackKey;
      try { this.registry?.set?.('selectedTrackKey', liveTrackKey); } catch {}
    }
    if (this._lobbyDomRoot?.isConnected && this._lobbyRenderedTrackKey !== liveTrackKey) {
      const lobbyRoot = installLobbyDom(this);
      polishLobbyForPublish(this, lobbyRoot);
      this._lobbyRenderedTrackKey = liveTrackKey;
    }
  }

  renderUI() {
    if (this._ui) {
      try { this.tweens?.killTweensOf?.(this._ui); } catch {}
      try { this._ui.destroy(true); } catch {}
      this._ui = null;
    }

    const { width, height } = this.scale;
    this._ui = this.add.container(0, 0);

    const bg = this.add.image(width / 2, height / 2, 'menu_bg').setOrigin(.5).setDepth(0);
    const sx = width / (bg.width || 1);
    const sy = height / (bg.height || 1);
    bg.setScale(Math.max(sx, sy));
    bg.setPosition(width / 2, height / 2);
    this._ui.add(bg);

    this._installCarPlatform();

    const liveTrackKey = this._liveLobbyTrackKey();
    if (liveTrackKey) {
      this.selectedTrackKey = liveTrackKey;
      try { this.registry?.set?.('selectedTrackKey', liveTrackKey); } catch {}
    }
    const lobbyRoot = installLobbyDom(this);
    polishLobbyForPublish(this, lobbyRoot);
    this._lobbyRenderedTrackKey = this.selectedTrackKey;
  }

  update(time, delta) {
    super.update?.(time, delta);
    this._syncLobbyTrackPreview();
    const modalOpen = Boolean(
      this._storeModal?.scene ||
      this._lobbyInventoryModal?.scene ||
      this._gameModeModal?.scene ||
      this._eventRewardModal?.scene
    );
    this._lobbyDomRoot?.classList.toggle('tdr-lobby-dom--modal-open', modalOpen);
  }

  _installCarPlatform() {
    const ui = this._ui;
    if (!ui?.addAt) return;

    const { width, height } = this.scale;
    const centerX = width * .5;
    const centerY = height * .505;
    const tabletLandscape = (() => {
      try {
        const coarse = window.matchMedia?.('(pointer: coarse)')?.matches;
        const landscape = width >= height;
        const ratio = width / Math.max(1, height);
        return Boolean(coarse && landscape && width >= 820 && height >= 600 && ratio <= 1.6);
      } catch { return false; }
    })();
    const diameter = tabletLandscape
      ? Math.max(400, Math.min(480, width * .42, height * .60))
      : Math.max(260, Math.min(380, width * .26, height * .48));

    const glow = this.add.graphics();
    glow.fillStyle(0x07131b, .58);
    glow.fillCircle(centerX, centerY, diameter * .52);
    glow.lineStyle(6, 0x39dfff, .92);
    glow.strokeCircle(centerX, centerY, diameter * .5);
    glow.lineStyle(3, 0xf0b84b, .72);
    glow.strokeCircle(centerX, centerY, diameter * .46);
    ui.addAt(glow, Math.min(1, ui.list.length));

    if (this.textures.exists('lobby-platform')) {
      const platform = this.add.image(centerX, centerY, 'lobby-platform').setOrigin(.5).setAlpha(1);
      platform.setDisplaySize(diameter, diameter);
      ui.addAt(platform, Math.min(2, ui.list.length));
    }
  }
}
