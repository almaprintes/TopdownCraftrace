import { RaceScene as CurrentRaceScene } from './RaceStaticMinimapScene.js';

const PANEL_W = 282;
const ROW_H = 30;
const PANEL_H = ROW_H * 3;

function normalized(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function flattenScene(scene) {
  const out = [];
  const seen = new Set();
  const visit = (obj) => {
    if (!obj || seen.has(obj)) return;
    seen.add(obj);
    out.push(obj);
    if (Array.isArray(obj.list)) for (const child of obj.list) visit(child);
  };
  for (const child of scene.children?.list || []) visit(child);
  return out;
}

function isGhostLabel(obj) {
  if (typeof obj?.text !== 'string') return false;
  const text = normalized(obj.text);
  return text.includes('FANTASMA') || text.includes('GHOST');
}

function isRecordLoadedLabel(obj) {
  if (typeof obj?.text !== 'string') return false;
  const text = normalized(obj.text);
  return (text.includes('RÉCORD') || text.includes('RECORD')) && (text.includes('CARGADO') || text.includes('LOADED'));
}

function objectPoint(obj) {
  try {
    const matrix = obj?.getWorldTransformMatrix?.();
    if (matrix?.transformPoint) {
      const p = matrix.transformPoint(0, 0, {});
      if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) return { x: Number(p.x), y: Number(p.y) };
    }
  } catch (_) {}
  const x = Number(obj?.x), y = Number(obj?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function hidePhaserObject(obj) {
  try { obj?.setVisible?.(false); } catch (_) {}
  try { obj?.setAlpha?.(0); } catch (_) {}
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._tdrGhostPanelAnchor = null;
    this._tdrGhostPanelObjects = new Set();
    this._tdrGhostPanelLabels = null;
    this._tdrGhostPanelProbeUntil = performance.now() + 5000;

    this._tdrGhostPanelPostUpdate = () => this._syncStaticGhostPanel();
    this.events?.on?.('postupdate', this._tdrGhostPanelPostUpdate, this);
    this.time?.delayedCall?.(0, () => this._syncStaticGhostPanel());
    this.time?.delayedCall?.(120, () => this._syncStaticGhostPanel());
    this.time?.delayedCall?.(500, () => this._syncStaticGhostPanel());

    this.events?.once?.('shutdown', () => {
      try { this.events?.off?.('postupdate', this._tdrGhostPanelPostUpdate, this); } catch (_) {}
      try { window.removeEventListener('tdr:viewportchange', this._tdrGhostPanelResize); } catch (_) {}
      try { this.scale?.off?.('resize', this._tdrGhostPanelResize, this); } catch (_) {}
      try { this._tdrStaticGhostPanel?.remove?.(); } catch (_) {}
      this._tdrStaticGhostPanel = null;
      this._tdrGhostPanelPostUpdate = null;
      this._tdrGhostPanelResize = null;
      this._tdrGhostPanelObjects?.clear?.();
    });

    return result;
  }

  _findGhostPanelObjects() {
    const flat = flattenScene(this);
    const ghost = flat.find(isGhostLabel);
    const record = flat.find(isRecordLoadedLabel);
    if (!ghost || !record) return null;

    const gp = objectPoint(ghost), rp = objectPoint(record);
    if (!gp || !rp) return null;
    const centerX = Number.isFinite(rp.x) ? rp.x : gp.x;
    const topY = Math.min(gp.y, rp.y) - ROW_H * 0.55;
    const panel = { left: centerX - PANEL_W * 0.5, top: topY, right: centerX + PANEL_W * 0.5, bottom: topY + PANEL_H };

    const owned = [];
    for (const obj of flat) {
      if (!obj?.scene) continue;
      const isText = typeof obj.text === 'string';
      let bounds = null;
      try { bounds = obj.getBounds?.(); } catch (_) {}
      const p = objectPoint(obj);
      const cx = Number(bounds?.centerX ?? p?.x), cy = Number(bounds?.centerY ?? p?.y);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      if (cx < panel.left - 12 || cx > panel.right + 12 || cy < panel.top - 10 || cy > panel.bottom + 10) continue;
      const type = String(obj.type || obj.constructor?.name || '').toLowerCase();
      const panelShape = type.includes('rectangle') || type.includes('graphics') || type.includes('text');
      if (!panelShape) continue;
      // Only retire the ghost panel's own labels and chrome. Do not touch the DOM minimap,
      // pause/delta control, vehicle, track or unrelated HUD objects.
      if (isText && obj !== ghost && obj !== record) {
        const t = normalized(obj.text);
        if (t && !t.includes('FANTASMA') && !t.includes('GHOST') && !t.includes('RÉCORD') && !t.includes('RECORD')) continue;
      }
      owned.push(obj);
    }

    return { ghost, record, gp, rp, centerX, topY, owned };
  }

  _ensureStaticGhostPanel(found) {
    if (typeof document === 'undefined') return null;
    if (this._tdrStaticGhostPanel?.isConnected) return this._tdrStaticGhostPanel;

    const root = document.createElement('div');
    root.id = 'tdr-static-ghost-status';
    root.dataset.tdrRaceUi = '1';
    Object.assign(root.style, {
      position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px',
      zIndex: '46', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      color: '#f7fbff', fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      textAlign: 'center', boxSizing: 'border-box', transform: 'translateZ(0)', contain: 'layout paint style'
    });

    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div');
      row.className = 'tdr-static-ghost-row';
      Object.assign(row.style, {
        position: 'absolute', left: '0', right: '0', top: `${i * ROW_H / PANEL_H * 100}%`,
        height: `${ROW_H / PANEL_H * 100}%`, boxSizing: 'border-box',
        border: '1px solid rgba(67,220,255,.68)', background: 'rgba(4,17,24,.78)',
        boxShadow: i === 0 ? 'inset 0 0 14px rgba(55,205,255,.05)' : 'none'
      });
      root.appendChild(row);
    }

    const ghostText = document.createElement('div');
    ghostText.dataset.ghost = '1';
    ghostText.textContent = String(found.ghost.text || '👻 FANTASMA');
    Object.assign(ghostText.style, {
      position: 'absolute', left: '50%', top: '0', height: `${ROW_H / PANEL_H * 100}%`,
      transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      whiteSpace: 'nowrap', fontWeight: '900', letterSpacing: '.035em', color: '#c9f5ff',
      textShadow: '0 1px 2px rgba(0,0,0,.8)'
    });

    const recordText = document.createElement('div');
    recordText.dataset.record = '1';
    recordText.textContent = String(found.record.text || 'RÉCORD CARGADO');
    Object.assign(recordText.style, {
      position: 'absolute', left: '50%', top: `${ROW_H / PANEL_H * 100}%`, height: `${ROW_H / PANEL_H * 100}%`,
      transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      whiteSpace: 'nowrap', fontWeight: '900', letterSpacing: '.02em', color: '#f7fbff',
      textShadow: '0 1px 2px rgba(0,0,0,.8)'
    });

    root.append(ghostText, recordText);
    (this.game?.canvas?.parentElement || document.body).appendChild(root);
    this._tdrStaticGhostPanel = root;
    this._tdrGhostPanelLabels = { ghostText, recordText };

    this._tdrGhostPanelResize = () => this._layoutStaticGhostPanel?.();
    this.scale?.on?.('resize', this._tdrGhostPanelResize, this);
    if (typeof window !== 'undefined') window.addEventListener('tdr:viewportchange', this._tdrGhostPanelResize, { passive: true });
    return root;
  }

  _layoutStaticGhostPanel() {
    const root = this._tdrStaticGhostPanel;
    const anchor = this._tdrGhostPanelAnchor;
    const canvas = this.game?.canvas;
    if (!root?.isConnected || !anchor || !canvas) return;
    const rect = canvas.getBoundingClientRect?.();
    const vw = Math.max(1, Number(this.scale?.width || 1));
    const vh = Math.max(1, Number(this.scale?.height || 1));
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    root.style.left = `${rect.left + (anchor.left / vw) * rect.width}px`;
    root.style.top = `${rect.top + (anchor.top / vh) * rect.height}px`;
    root.style.width = `${(PANEL_W / vw) * rect.width}px`;
    root.style.height = `${(PANEL_H / vh) * rect.height}px`;
    const scale = rect.width / vw;
    const fontPx = Math.max(9, Math.min(15, 12 * scale));
    if (this._tdrGhostPanelLabels?.ghostText) this._tdrGhostPanelLabels.ghostText.style.fontSize = `${fontPx}px`;
    if (this._tdrGhostPanelLabels?.recordText) this._tdrGhostPanelLabels.recordText.style.fontSize = `${fontPx}px`;
  }

  _syncStaticGhostPanel() {
    let found = null;
    if (!this._tdrGhostPanelAnchor || performance.now() < Number(this._tdrGhostPanelProbeUntil || 0)) {
      found = this._findGhostPanelObjects();
      if (found && !this._tdrGhostPanelAnchor) {
        this._tdrGhostPanelAnchor = { left: found.centerX - PANEL_W * 0.5, top: found.topY };
        for (const obj of found.owned) this._tdrGhostPanelObjects.add(obj);
        this._ensureStaticGhostPanel(found);
        this._layoutStaticGhostPanel();
      }
    }

    for (const obj of this._tdrGhostPanelObjects || []) hidePhaserObject(obj);

    const root = this._tdrStaticGhostPanel;
    if (!root?.isConnected) return;
    const active = !!this.sys?.isActive?.();
    const hiddenByReport = !!this._sessionReportOpen;
    root.style.display = active && !hiddenByReport ? 'block' : 'none';
  }
}
