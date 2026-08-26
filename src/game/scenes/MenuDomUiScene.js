import { MenuScene as PreviousMenuScene } from './MenuStoreScene.js';
import { installLobbyDom } from '../ui/LobbyDomUi.js';
import { polishLobbyForPublish } from '../ui/LobbyPublishPolish.js';

function findCar(node, out = []) {
  if (!node) return out;
  const key = String(node?.texture?.key || '');
  if (key === 'car' || key.startsWith('skin:')) out.push(node);
  if (Array.isArray(node.list)) node.list.forEach(child => findCar(child, out));
  return out;
}

export class MenuScene extends PreviousMenuScene {
  preload() {
    super.preload?.();
    const base = import.meta.env.BASE_URL || '/';
    if (!this.textures.exists('lobby-platform')) {
      this.load.image('lobby-platform', `${base}assets/ui/lobby/car_platform.webp`);
    }
  }

  renderUI() {
    super.renderUI();
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

    // The car is always centred by the lobby layout. Use that canonical layout
    // position rather than depending on a skin texture key or nested container.
    const { width, height } = this.scale;
    const centerX = width * .5;
    const centerY = height * .505;
    const diameter = Math.max(260, Math.min(380, width * .26, height * .48));

    const candidates = findCar(ui).filter(obj => obj?.visible !== false);
    const car = candidates.sort((a, b) => (b.displayWidth * b.displayHeight) - (a.displayWidth * a.displayHeight))[0];
    // Racing sprites are deliberately tiny for performance. The lobby uses a
    // separate high-resolution DOM render, so keep the gameplay sprite hidden.
    if (car) car.setVisible(false);

    const glow = this.add.graphics();
    glow.fillStyle(0x07131b, .58);
    glow.fillCircle(centerX, centerY, diameter * .52);
    glow.lineStyle(6, 0x39dfff, .92);
    glow.strokeCircle(centerX, centerY, diameter * .5);
    glow.lineStyle(3, 0xf0b84b, .72);
    glow.strokeCircle(centerX, centerY, diameter * .46);

    // Index 0 is the photographic background. Everything inserted immediately
    // after it is guaranteed to remain below the hero car and all HUD layers.
    ui.addAt(glow, Math.min(1, ui.list.length));
    if (this.textures.exists('lobby-platform')) {
      const platform = this.add.image(centerX, centerY, 'lobby-platform').setOrigin(.5).setAlpha(1);
      platform.setDisplaySize(diameter, diameter);
      ui.addAt(platform, Math.min(2, ui.list.length));
    }
  }
}
