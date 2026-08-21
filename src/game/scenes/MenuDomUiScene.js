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
    const parent = car.parentContainer;
    if (!parent?.addAt) return;

    car.setScale(car.scaleX * 1.1, car.scaleY * 1.1);
    const diameter = Math.max(car.displayHeight * 1.42, car.displayWidth * 2.65, 220);
    const glow = this.add.graphics();
    glow.fillStyle(0x39dfff, .07);
    glow.fillCircle(car.x, car.y + 5, diameter * .52);
    glow.lineStyle(3, 0x39dfff, .38);
    glow.strokeCircle(car.x, car.y + 5, diameter * .5);
    const platform = this.add.image(car.x, car.y + 5, 'lobby-platform').setOrigin(.5).setAlpha(1);
    platform.setDisplaySize(diameter, diameter);
    const index = Math.max(0, parent.getIndex?.(car) ?? 0);
    parent.addAt(glow, index);
    parent.addAt(platform, index + 1);
  }
}
