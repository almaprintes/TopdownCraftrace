import { RaceScene as TimingRaceScene } from './RaceWideCameraPreviewScene.js';

// Legacy Phaser timing/loot banners retired.
// Lap/record feedback is handled by the current DOM side-panel feedback system.
// Keep this scene in the inheritance chain so downstream race scenes remain stable.
export class RaceScene extends TimingRaceScene {
  _destroyTimingBanner() {
    if (this._timingBannerTimer) {
      try { this._timingBannerTimer.remove(false); } catch (_) {}
      this._timingBannerTimer = null;
    }
    if (this._timingBanner?.scene) {
      try { this._timingBanner.destroy(true); } catch (_) {}
    }
    this._timingBanner = null;
    this._timingBannerScreenY = null;
    this._pinTimingBanner = null;
    this._restoreTimingHudAfterBanner();
  }

  _restoreTimingHudAfterBanner() {
    const hud = this.competitionHud;
    if (hud?.scene && this._timingHudWasVisible !== false) hud.setVisible(true);
    this._timingHudWasVisible = null;
  }

  // Older timing code still calls this hook after registering lap records.
  // Keep record persistence intact, but never create the obsolete Phaser banner.
  _showTimingAchievement() {
    this._destroyTimingBanner();
  }

  // RaceWideCameraPreviewScene also creates a transient Phaser loot text after each
  // completed lap. On multi-camera layouts it can survive as an empty dark/green box.
  // Loot is already granted before this visual hook is called, so retiring only the
  // presentation cannot affect rewards, timing, physics or lap registration.
  _showRaceLoot() {
    // Intentionally no-op: current race UI owns transient feedback.
  }
}
