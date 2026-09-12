import { RaceScene as CurrentRaceScene } from './RaceStaticMinimapScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

const PANEL_W = 282;
const ROW_H = 30;
const PANEL_H = ROW_H * 3;
const GHOST_BASE_ALPHA = 0.48;
const GHOST_VISIBILITY_LEVELS = [1, 0.75, 0.5, 0.25];
const PB_GHOST_PREFIX = 'tdr2:ghostPb:';

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

function fmtPb(ms) {
  const value = Number(ms);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const m = Math.floor(value / 60000);
  const s = Math.floor((value % 60000) / 1000);
  const cs = Math.floor((value % 1000) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function pbGhostKey(trackKey) {
  return `${PB_GHOST_PREFIX}${trackKey || 'track01'}`;
}

function readPbGhost(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (!data || !Array.isArray(data.samples) || data.samples.length < 2 || !Number.isFinite(Number(data.lapMs))) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function writePbGhost(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (_) {
    return false;
  }
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    // The official Time Trial PB is the single source of truth. Legacy per-car ghosts
    // are deliberately not migrated because their lap time may not match the current PB.
    this._tdrCurrentGhostCarId = this._ghostCarId || this.carId || data?.carId || 'car';
    this._tdrPbGhostStorageKey = pbGhostKey(this._ghostTrackKey || this.trackKey);
    this._ghostStorageKey = this._tdrPbGhostStorageKey;
    this._ghostData = readPbGhost(this._tdrPbGhostStorageKey);
    this._tdrGhostKnownBestMs = Number.isFinite(Number(this.ttBest?.lapMs)) ? Number(this.ttBest.lapMs) : null;

    // Only expose a replay as PERSONAL BEST when its stored official lap equals ttBest.
    if (this._ghostData && !this._isGhostCurrentPersonalBest()) this._ghostData = null;

    const ghostCarId = this._ghostData?.carId;
    if (ghostCarId && CAR_SPECS?.[ghostCarId]) {
      try { this.ensureCarSkinTexture?.(CAR_SPECS[ghostCarId]); } catch (_) {}
    }

    this._tdrGhostPanelAnchor = null;
    this._tdrGhostPanelObjects = new Set();
    this._tdrGhostPanelLabels = null;
    this._tdrGhostPanelRows = null;
    this._tdrGhostPanelProbeUntil = performance.now() + 5000;
    this._tdrGhostVisibleEnabled = true;
    this._tdrGhostVisibilityIndex = 0;

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
      this._tdrGhostPanelRows = null;
      this._tdrGhostPanelObjects?.clear?.();
    });

    return result;
  }

  _isGhostCurrentPersonalBest() {
    const ghostMs = Number(this._ghostData?.lapMs);
    const bestMs = Number(this.ttBest?.lapMs);
    const ghostTrack = String(this._ghostData?.trackKey || this._ghostTrackKey || '');
    const currentTrack = String(this._ghostTrackKey || this.trackKey || '');
    return Number.isFinite(ghostMs)
      && Number.isFinite(bestMs)
      && Math.abs(ghostMs - bestMs) <= 1
      && ghostTrack === currentTrack;
  }

  _runtimeGhostTextureKey() {
    const replayCarId = this._ghostData?.carId;
    const replayKey = replayCarId ? `car_${replayCarId}` : null;
    if (replayKey && this.textures?.exists?.(replayKey)) return replayKey;
    return super._runtimeGhostTextureKey?.() || null;
  }

  _completedLapCheck(now) {
    if (this._replayActive) return;
    const hist = Array.isArray(this.ttHistory) ? this.ttHistory : [];
    if (hist.length <= this._ghostHistoryLen) return;

    const last = hist[hist.length - 1] || {};
    const lapMs = Number(last.lapMs ?? this.timing?.lastLap);
    const valid = last.valid !== false && last.invalid !== true && Number.isFinite(lapMs) && lapMs > 1000;
    const officialBestMs = Number(this.ttBest?.lapMs);
    const previousBestMs = Number(this._tdrGhostKnownBestMs);
    const isOfficialNewPb = valid
      && Number.isFinite(officialBestMs)
      && Math.abs(lapMs - officialBestMs) <= 1
      && (!Number.isFinite(previousBestMs) || officialBestMs < previousBestMs - 0.5);

    if (isOfficialNewPb && this._ghostSamples.length > 4) {
      const samples = this._ghostSamples
        .filter(sample => Number.isFinite(Number(sample?.t)) && Number(sample.t) >= 0 && Number(sample.t) < officialBestMs)
        .map(sample => ({ t: Number(sample.t), x: Number(sample.x), y: Number(sample.y), r: Number(sample.r || 0) }));

      // Force the final replay sample to the exact official PB duration and current
      // finish-line position. This removes the old 0–45 ms gap caused by sample cadence.
      if (this.carBody) {
        samples.push({
          t: Math.round(officialBestMs),
          x: Number(this.carBody.x || 0),
          y: Number(this.carBody.y || 0),
          r: Number(this.carBody.rotation || 0)
        });
      }

      const saved = {
        version: 5,
        kind: 'circuit-personal-best',
        trackKey: this._ghostTrackKey,
        carId: this._tdrCurrentGhostCarId,
        lapMs: Math.round(officialBestMs),
        recordedAt: Date.now(),
        samples
      };

      if (samples.length > 4 && writePbGhost(this._tdrPbGhostStorageKey, saved)) {
        this._ghostData = saved;

        // Enrich the existing official ttBest record without changing its key or timing
        // semantics. These fields are ready for the future local records table/leaderboard.
        try {
          const current = JSON.parse(localStorage.getItem(this.ttKey) || '{}');
          const enriched = {
            ...current,
            lapMs: Number(this.ttBest?.lapMs ?? officialBestMs),
            carId: saved.carId,
            ghostKey: this._tdrPbGhostStorageKey,
            ghostVersion: saved.version,
            recordedAt: saved.recordedAt
          };
          localStorage.setItem(this.ttKey, JSON.stringify(enriched));
          if (this.ttBest) Object.assign(this.ttBest, enriched);
        } catch (_) {}

        try { this._ghostSprite?.destroy?.(); } catch (_) {}
        this._ghostSprite = null;
        if (saved.carId && CAR_SPECS?.[saved.carId]) {
          try { this.ensureCarSkinTexture?.(CAR_SPECS[saved.carId]); } catch (_) {}
        }
        this._createGhostSprite?.();
        this._syncGhostVisual?.();
        this._setGhostHudLabels?.('👻 NUEVO FANTASMA', 'RÉCORD PERSONAL GUARDADO');
        this._ensureReplayEntryButton?.();
      }
    }

    if (Number.isFinite(officialBestMs)) this._tdrGhostKnownBestMs = officialBestMs;
    this._ghostHistoryLen = hist.length;
    this._ghostSamples = [];
    this._ghostLapStartPerf = now;
    this._ghostLastSamplePerf = 0;
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
      const panelShape = type.includes('rectangle') || type.includes('graphics') || type.includes('text') || type.includes('container');
      if (!panelShape) continue;
      if (isText && obj !== ghost && obj !== record) {
        const t = normalized(obj.text);
        if (t && !t.includes('FANTASMA') && !t.includes('GHOST') && !t.includes('RÉCORD') && !t.includes('RECORD') && !t.includes('REPETICIÓN') && !t.includes('REPLAY')) continue;
      }
      owned.push(obj);
    }

    return { ghost, record, gp, rp, centerX, topY, owned };
  }

  _makeGhostPanelText(topPercent, value, color = '#f7fbff') {
    const text = document.createElement('div');
    text.textContent = value;
    Object.assign(text.style, {
      position: 'absolute', left: '0', right: '0', top: topPercent,
      height: `${ROW_H / PANEL_H * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 5px', boxSizing: 'border-box', pointerEvents: 'none',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      fontWeight: '900', letterSpacing: '.025em', color,
      textShadow: '0 1px 2px rgba(0,0,0,.8)'
    });
    return text;
  }

  _wireGhostPanelRow(row, onTap) {
    if (!row || typeof onTap !== 'function') return;
    row.style.pointerEvents = 'auto';
    row.style.cursor = 'pointer';
    row.style.touchAction = 'manipulation';
    const activate = (event) => {
      try { event.preventDefault(); event.stopPropagation(); } catch (_) {}
      onTap();
      this._refreshStaticGhostPanelLabels();
    };
    row.addEventListener('pointerdown', activate);
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

    const rows = [];
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('div');
      row.className = 'tdr-static-ghost-row';
      row.dataset.row = String(i);
      Object.assign(row.style, {
        position: 'absolute', left: '0', right: '0', top: `${i * ROW_H / PANEL_H * 100}%`,
        height: `${ROW_H / PANEL_H * 100}%`, boxSizing: 'border-box',
        border: '1px solid rgba(67,220,255,.68)', background: 'rgba(4,17,24,.78)',
        boxShadow: i === 0 ? 'inset 0 0 14px rgba(55,205,255,.05)' : 'none'
      });
      rows.push(row);
      root.appendChild(row);
    }

    const ghostText = this._makeGhostPanelText('0', '👻 FANTASMA · ON', '#c9f5ff');
    ghostText.dataset.ghost = '1';
    const recordText = this._makeGhostPanelText(`${ROW_H / PANEL_H * 100}%`, '🏆 RÉCORD PERSONAL');
    recordText.dataset.record = '1';
    const visibilityText = this._makeGhostPanelText(`${ROW_H * 2 / PANEL_H * 100}%`, '◐ VISIBILIDAD · 100%', '#d8f8ff');
    visibilityText.dataset.visibility = '1';

    root.append(ghostText, recordText, visibilityText);
    (this.game?.canvas?.parentElement || document.body).appendChild(root);
    this._tdrStaticGhostPanel = root;
    this._tdrGhostPanelLabels = { ghostText, recordText, visibilityText };
    this._tdrGhostPanelRows = rows;

    this._wireGhostPanelRow(rows[0], () => {
      this._tdrGhostVisibleEnabled = !this._tdrGhostVisibleEnabled;
      if (!this._tdrGhostVisibleEnabled && !this._replayActive) {
        try { this._ghostSprite?.setVisible?.(false); } catch (_) {}
      }
    });
    this._wireGhostPanelRow(rows[1], () => {
      if (!this._isGhostCurrentPersonalBest() || this._replayActive || typeof this._enterReplay !== 'function') return;
      this._enterReplay();
    });
    this._wireGhostPanelRow(rows[2], () => {
      this._tdrGhostVisibilityIndex = (Number(this._tdrGhostVisibilityIndex || 0) + 1) % GHOST_VISIBILITY_LEVELS.length;
      this._applyGhostPanelPreference();
    });

    this._tdrGhostPanelResize = () => this._layoutStaticGhostPanel?.();
    this.scale?.on?.('resize', this._tdrGhostPanelResize, this);
    if (typeof window !== 'undefined') window.addEventListener('tdr:viewportchange', this._tdrGhostPanelResize, { passive: true });
    this._refreshStaticGhostPanelLabels();
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
    for (const label of Object.values(this._tdrGhostPanelLabels || {})) {
      if (label) label.style.fontSize = `${fontPx}px`;
    }
  }

  _refreshStaticGhostPanelLabels() {
    const labels = this._tdrGhostPanelLabels;
    if (!labels) return;
    const level = GHOST_VISIBILITY_LEVELS[Number(this._tdrGhostVisibilityIndex || 0)] ?? 1;
    const hasPbReplay = this._isGhostCurrentPersonalBest();
    const bestMs = Number(this.ttBest?.lapMs);

    if (labels.ghostText) labels.ghostText.textContent = `👻 FANTASMA · ${this._tdrGhostVisibleEnabled ? 'ON' : 'OFF'}`;
    if (labels.recordText) {
      if (hasPbReplay) labels.recordText.textContent = `🏆 PB ${fmtPb(bestMs)} · ▶`;
      else if (Number.isFinite(bestMs)) labels.recordText.textContent = `🏆 PB ${fmtPb(bestMs)} · SIN REPLAY`;
      else labels.recordText.textContent = 'RÉCORD NO DISPONIBLE';
    }
    if (labels.visibilityText) labels.visibilityText.textContent = `◐ VISIBILIDAD · ${Math.round(level * 100)}%`;
    if (this._tdrGhostPanelRows?.[1]) {
      this._tdrGhostPanelRows[1].style.opacity = hasPbReplay ? '1' : '.58';
      this._tdrGhostPanelRows[1].style.cursor = hasPbReplay ? 'pointer' : 'default';
    }
  }

  _applyGhostPanelPreference() {
    if (this._replayActive) return;
    const ghost = this._ghostSprite;
    if (!ghost?.scene) return;
    const level = GHOST_VISIBILITY_LEVELS[Number(this._tdrGhostVisibilityIndex || 0)] ?? 1;
    try { ghost.setAlpha(GHOST_BASE_ALPHA * level); } catch (_) {}
    if (!this._tdrGhostVisibleEnabled) {
      try { ghost.setVisible(false); } catch (_) {}
    }
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
    this._applyGhostPanelPreference();
    this._refreshStaticGhostPanelLabels();

    const root = this._tdrStaticGhostPanel;
    if (!root?.isConnected) return;
    const active = !!this.sys?.isActive?.();
    const hiddenByReport = !!this._sessionReportOpen;
    const hiddenByReplay = !!this._replayActive;
    root.style.display = active && !hiddenByReport && !hiddenByReplay ? 'block' : 'none';
  }
}
