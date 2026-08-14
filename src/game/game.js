import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuUiStabilityScene.js';
import { RaceScene } from './scenes/RaceControlSchemeScene.js';
import { UpgradeShopScene } from './scenes/UpgradeWorkshopCraftAssetsScene.js';
import { GarageScene } from './scenes/GarageUiStabilityScene.js';
import { SettingsScene } from './scenes/SettingsControlOptionsScene.js';
import { GarageDetailScene } from './scenes/GarageDetailSpeedConsistencyScene.js';
import { AdminHubScene } from './scenes/AdminHubScene.js';
import { CarEditorScene } from './scenes/CarEditorSpeedConsistencyScene.js';
import { TrackEditorScene } from './scenes/TrackEditorScene.js';
import { TrackGarageScene } from './scenes/TrackGarageGeneratedPreviewScene.js';
import { TrackStudioScene } from './scenes/TrackStudioScene.js';

class MenuAliasScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.scene.start('menu');
  }
}

export function createGame(parentId = 'app') {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: '#0b1020',
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    scene: [BootScene, MenuScene, MenuAliasScene, GarageScene, SettingsScene, GarageDetailScene, RaceScene, AdminHubScene, UpgradeShopScene, CarEditorScene, TrackGarageScene, TrackStudioScene, TrackEditorScene],
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    render: { pixelArt: false, antialias: true, antialiasGL: true, roundPixels: false }
  });
}
