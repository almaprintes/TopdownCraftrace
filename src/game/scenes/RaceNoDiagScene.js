import { RaceScene as CurrentRaceScene } from './RaceExperienceExportReadingScene.js';

function isDiagnosticText(obj) {
  if (!obj || typeof obj.text !== 'string') return false;
  const text = String(obj.text || '').toUpperCase();
  return text.includes('[DIAG]')
    || text.includes('GEOMCELLS=')
    || text.includes('GFXCELLS=')
    || text.includes('VISIBLETILES=')
    || text.includes('[TRACK] CELLS=');
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._disableRaceDiagnostics();

    this._tdrNoDiagPostUpdate = () => this._disableRaceDiagnostics();
    this.events?.on?.('postupdate', this._tdrNoDiagPostUpdate, this);
    this.events?.once?.('shutdown', () => {
      try { this.events?.off?.('postupdate', this._tdrNoDiagPostUpdate, this); } catch (_) {}
      this._tdrNoDiagPostUpdate = null;
    });

    return result;
  }

  _disableRaceDiagnostics() {
    try {
      if (this._diagText?.scene) this._diagText.destroy();
    } catch (_) {}
    this._diagText = null;
    this._diagLines = [];
    this._diag = () => {};

    // Belt-and-braces cleanup for legacy/asynchronous diagnostic text creation.
    // This is deliberately limited to known diagnostic signatures so normal HUD
    // text, timing, delta and race messages are untouched.
    for (const obj of this.children?.list || []) {
      if (!isDiagnosticText(obj)) continue;
      try { obj.destroy?.(); } catch (_) {
        try { obj.setVisible?.(false); } catch (_) {}
      }
    }
  }
}
