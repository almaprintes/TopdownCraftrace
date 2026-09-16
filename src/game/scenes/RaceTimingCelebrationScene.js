import { RaceScene as TimingRaceScene } from './RaceWideCameraPreviewScene.js';

// Legacy top-of-screen timing celebration retired.
// Lap/record feedback is handled by the current side-panel feedback system.
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

  // Intentionally kept as a no-op because older timing code still calls this hook.
  // Removing the hook would make the legacy caller responsible for UI policy again.
  _showTimingAchievement() {
    this._destroyTimingBanner();
  }
}
