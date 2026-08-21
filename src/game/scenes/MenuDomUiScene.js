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

  _installCarPlatform() {
    const candidates = findCar(this._ui).filter(obj => obj?.visible !== false);
    if (!candidates.length || !this.textures.exists('lobby-platform')) return;
    const car = candidates.sort((a, b) => (b.displayWidth * b.displayHeight) - (a.displayWidth * a.displayHeight))[0];
    const parent = car.parentContainer;
    if (!parent?.addAt) return;

    const platform = this.add.image(car.x, car.y + 5, 'lobby-platform').setOrigin(.5).setAlpha(.92);
    const diameter = Math.max(car.displayHeight * 1.28, car.displayWidth * 2.45, 190);
    platform.setDisplaySize(diameter, diameter);
    const index = Math.max(0, parent.getIndex?.(car) ?? 0);
    parent.addAt(platform, index);
  }
}

