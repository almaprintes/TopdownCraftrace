import { MenuScene as CurrentMenuScene } from './MenuDuelModeScene.js';

// The publish lobby owns the Season Pass UI in DOM. The former Phaser season
// card is intentionally retired at its source instead of being rendered and
// hidden/destroyed later. This prevents duplicate UI and avoids wasting CPU on
// objects, hit areas and text that the player never uses.
export class MenuScene extends CurrentMenuScene {
  _renderGlobalEventCard() {}
}
