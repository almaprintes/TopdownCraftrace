import { MenuScene as PreviousMenuScene } from './MenuStoreScene.js';
import { installLobbyDom } from '../ui/LobbyDomUi.js';

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
    installLobbyDom(this);
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
    const candidates = findCar(this._ui).filter(obj => obj?.visible !== false);
    if (!candidates.length || !this.textures.exists('lobby-platform')) return;
    const car = candidates.sort((a, b) => (b.displayWidth * b.displayHeight) - (a.displayWidth * a.displayHeight))[0];
    const ui = this._ui;
    if (!ui?.addAt) return;

    car.setScale(car.scaleX * 1.1, car.scaleY * 1.1);
    const bounds = car.getBounds?.();
    if (!bounds) return;
    const centerX = bounds.centerX;
    const centerY = bounds.centerY + 5;
    const diameter = Math.max(bounds.height * 1.5, bounds.width * 2.8, 240);

    // Insert the platform in the lobby root, immediately before the top-level
    // hero container. This avoids nested-container visibility/order problems.
    let hero = car;
    while (hero?.parentContainer && hero.parentContainer !== ui) hero = hero.parentContainer;
    const heroIndex = Math.max(1, ui.getIndex?.(hero) ?? ui.list.length);

    const glow = this.add.graphics();
    glow.fillStyle(0x39dfff, .07);
    glow.fillCircle(centerX, centerY, diameter * .52);
    glow.lineStyle(5, 0x39dfff, .72);
    glow.strokeCircle(centerX, centerY, diameter * .5);
    glow.lineStyle(2, 0xf0b84b, .46);
    glow.strokeCircle(centerX, centerY, diameter * .46);

    const platform = this.add.image(centerX, centerY, 'lobby-platform').setOrigin(.5).setAlpha(1);
    platform.setDisplaySize(diameter, diameter);
    ui.addAt(glow, heroIndex);
    ui.addAt(platform, heroIndex + 1);
  }
}
