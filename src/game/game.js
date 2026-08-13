import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { RaceScene } from './scenes/RaceSurfaceProfileScene.js';
import { UpgradeShopScene } from './scenes/UpgradeWorkshopCraftAssetsScene.js';
import { GarageScene } from './scenes/GarageSpeedConsistencyScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GarageDetailScene } from './scenes/GarageDetailSpeedConsistencyScene.js';
import { AdminHubScene } from './scenes/AdminHubScene.js';
import { CarEditorScene } from './scenes/CarEditorScene.js';
import { TrackEditorScene } from './scenes/TrackEditorScene.js';
import { TrackGarageScene } from './scenes/TrackGarageGeneratedPreviewScene.js';
import { TrackStudioScene } from './scenes/TrackStudioScene.js';
export function createGame(parentId = 'app') {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: parentId,
    backgroundColor: '#0b1020',
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    scene: [BootScene, MenuScene, GarageScene, SettingsScene, GarageDetailScene, RaceScene, AdminHubScene, UpgradeShopScene, CarEditorScene, TrackGarageScene, TrackStudioScene, TrackEditorScene],
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false } },
    render: { pixelArt: false, antialias: true, antialiasGL: true, roundPixels: false }
  });
}
