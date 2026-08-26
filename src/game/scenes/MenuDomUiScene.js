import { MenuScene as PreviousMenuScene } from './MenuStoreScene.js';
import { installLobbyDom } from '../ui/LobbyDomUi.js';
import { polishLobbyForPublish } from '../ui/LobbyPublishPolish.js';

export class MenuScene extends PreviousMenuScene {
  preload() {
    super.preload?.();
    const base = import.meta.env.BASE_URL || '/';
    if (!this.textures.exists('lobby-platform')) {
      this.load.image('lobby-platform', `${base}assets/ui/lobby/car_platform.webp`);
    }
  }

  // Publish lobby: one layout only. The old Phaser lobby is no longer rendered
  // at all, so language changes can only replace strings inside the same DOM UI.
  _renderGlobalEventCard() {}

  renderUI() {
    if (this._ui) {
      try { this.tweens?.killTweensOf?.(this._ui); } catch {}
      try { this._ui.destroy(true); } catch {}
      this._ui = null;
    }

    const { width, height } = this.scale;
    this._ui = this.add.container(0, 0);

    // Keep only the photographic background in Phaser. All player-facing lobby
    // panels, labels and hit areas belong exclusively to the DOM layer below.
    const bg = this.add.image(width / 2, height / 2, 'menu_bg').setOrigin(.5).setDepth(0);
    const sx = width / (bg.width || 1);
    const sy = height / (bg.height || 1);
    bg.setScale(Math.max(sx, sy));
    bg.setPosition(width / 2, height / 2);
    this._ui.add(bg);

    this._installCarPlatform();

    const lobbyRoot = installLobbyDom(this);
    polishLobbyForPublish(this, lobbyRoot);
  }

  update(time, delta) {
    super.update?.(time, delta);
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
    const diameter = Math.max(260, Math.min(380, width * .26, height * .48));

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
