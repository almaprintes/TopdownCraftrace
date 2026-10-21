import { RaceScene as CurrentRaceScene } from './RaceStaticMinimapScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { ghostPanelViewportRect } from '../ui/ghostPanelViewport.js';

const PANEL_W = 282;
const ROW_H = 30;
const PANEL_H = ROW_H * 3;
const GHOST_BASE_ALPHA = 0.48;
const GHOST_VISIBILITY_LEVELS = [1, 0.75, 0.5, 0.25];
const PB_GHOST_PREFIX = 'tdr2:ghostPb:';

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
    // RaceGhostModeScene may already have injected an online leaderboard rival.
    // Never replace that live rival with the circuit PB in this later presentation layer.
    const onlineGhost = this._onlineGhostChallenge && this._ghostData?.samples?.length ? this._ghostData : null;
    this._ghostData = onlineGhost || readPbGhost(this._tdrPbGhostStorageKey);
    this._tdrGhostKnownBestMs = Number.isFinite(Number(this.ttBest?.lapMs)) ? Number(this.ttBest.lapMs) : null;

    // PB validation applies only to local ghosts. Online rivals are intentionally
    // independent from ttBest and remain read-only for this race.
    if (!onlineGhost && this._ghostData && !this._isGhostCurrentPersonalBest()) this._ghostData = null;

    const ghostCarId = this._ghostData?.carId;
    if (ghostCarId && CAR_SPECS?.[ghostCarId]) {
      try { this.ensureCarSkinTexture?.(CAR_SPECS[ghostCarId]); } catch (_) {}
    }

    this._tdrGhostPanelLabels = null;
    this._tdrGhostPanelRows = null;
    this._tdrGhostVisibleEnabled = true;
    this._tdrGhostVisibilityIndex = 0;

    // The DOM panel exists from the start, including after the first/new PB,
    // when legacy Phaser labels change text. Its layout never samples camera zoom.
    if(this._tdrGameMode==='ghost'){
      this._ensureStaticGhostPanel();
      this._tdrGhostPanelPostUpdate = () => this._syncStaticGhostPanel();
      this.events?.on?.('postupdate', this._tdrGhostPanelPostUpdate, this);
      this._syncStaticGhostPanel();
      this.time?.delayedCall?.(0, () => this._syncStaticGhostPanel(true));
      this.time?.delayedCall?.(120, () => this._syncStaticGhostPanel(true));
      this.time?.delayedCall?.(500, () => this._syncStaticGhostPanel(true));
    }

    this.events?.once?.('shutdown', () => {
      try { this.events?.off?.('postupdate', this._tdrGhostPanelPostUpdate, this); } catch (_) {}
      try { window.removeEventListener('tdr:viewportchange', this._tdrGhostPanelResize); } catch (_) {}
      try { this.scale?.off?.('resize', this._tdrGhostPanelResize, this); } catch (_) {}
      try { this._tdrStaticGhostPanel?.remove?.(); } catch (_) {}
      this._tdrStaticGhostPanel = null;
      this._tdrGhostPanelPostUpdate = null;
      this._tdrGhostPanelResize = null;
      this._tdrGhostPanelRows = null;
      this._tdrGhostPanelNextRefresh = 0;
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
    if (this._onlineGhostChallenge) return super._completedLapCheck?.(now);
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

  _createGhostHud() {
    // Keep base Ghost state/record hooks, but never render camera-sensitive
    // Phaser controls. This runs exactly when the base scene creates them.
    super._createGhostHud();
    this._hideLegacyGhostHud();
    this._layoutStaticGhostPanel();
  }

  _hideLegacyGhostHud() {
    const old=[this._ghostTopBg,this._ghostSubBg,this._ghostHud,this._ghostSubHud].filter(Boolean);
    for(const obj of old)try{obj.setVisible(false);}catch{}
    // Do not let the zooming WORLD camera draw any of these elements,
    // even if a later label refresh or plugin toggles visibility.
    if(old.length)try{this.cameras?.main?.ignore?.(old);}catch{}
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

  _ensureStaticGhostPanel() {
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
    // Canvas parents can be transformed by mobile viewport/layout code;
    // fixed positioning under such parents drifts with the canvas.
    document.body.appendChild(root);
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
      if ((!this._onlineGhostChallenge && !this._isGhostCurrentPersonalBest()) || this._replayActive || typeof this._enterReplay !== 'function') return;
      this._enterReplay();
      if(this._tdrStaticGhostPanel)this._tdrStaticGhostPanel.style.display='none';
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
    const root=this._tdrStaticGhostPanel;
    const canvas=this.game?.canvas;
    if(!root?.isConnected||!canvas)return;
    const rect=canvas.getBoundingClientRect?.();
    const layout=this._ghostControlsLayout?.();
    const next=ghostPanelViewportRect({
      canvasRect:rect,
      viewportWidth:this.scale?.width,
      viewportHeight:this.scale?.height,
      ghostLayout:layout,
      panelWidth:PANEL_W,
      panelHeight:PANEL_H
    });
    if(!next)return;
    for(const property of ['left','top','width','height']){
      const value=`${next[property]}px`;
      if(root.style[property]!==value)root.style[property]=value;
    }
    for(const label of Object.values(this._tdrGhostPanelLabels||{})){
      if(label&&label.style.fontSize!==`${next.fontPx}px`)label.style.fontSize=`${next.fontPx}px`;
    }
  }

  _refreshStaticGhostPanelLabels() {
    const labels = this._tdrGhostPanelLabels;
    if (!labels) return;
    const level = GHOST_VISIBILITY_LEVELS[Number(this._tdrGhostVisibilityIndex || 0)] ?? 1;
    const hasPbReplay = this._isGhostCurrentPersonalBest();
    const onlineReplay = !!this._onlineGhostChallenge && !!this._ghostData?.samples?.length;
    const hasReplay = onlineReplay || hasPbReplay;
    const bestMs = Number(this.ttBest?.lapMs);

    const setText=(node,value)=>{if(node&&node.textContent!==value)node.textContent=value;};
    setText(labels.ghostText,`👻 FANTASMA · ${this._tdrGhostVisibleEnabled ? 'ON' : 'OFF'}`);
    const recordText=onlineReplay?`🌐 ONLINE ${fmtPb(this._ghostData?.lapMs)} · ▶`:
      hasPbReplay?`🏆 PB ${fmtPb(bestMs)} · ▶`:
      Number.isFinite(bestMs)?`🏆 PB ${fmtPb(bestMs)} · SIN REPLAY`:'RÉCORD NO DISPONIBLE';
    setText(labels.recordText,recordText);
    setText(labels.visibilityText,`◐ VISIBILIDAD · ${Math.round(level * 100)}%`);
    const recordRow=this._tdrGhostPanelRows?.[1];
    if(recordRow){
      const opacity=hasReplay?'1':'.58',cursor=hasReplay?'pointer':'default';
      if(recordRow.style.opacity!==opacity)recordRow.style.opacity=opacity;
      if(recordRow.style.cursor!==cursor)recordRow.style.cursor=cursor;
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

  _syncStaticGhostPanel(forceLayout=false) {
    if(this._tdrGameMode!=='ghost')return;
    const now=performance.now();
    if(!forceLayout&&now<Number(this._tdrGhostPanelNextRefresh||0))return;
    this._tdrGhostPanelNextRefresh=now+120;
    this._hideLegacyGhostHud();
    this._applyGhostPanelPreference();
    this._refreshStaticGhostPanelLabels();
    if(forceLayout)this._layoutStaticGhostPanel();
    const root=this._tdrStaticGhostPanel;
    if(!root?.isConnected)return;
    const active=!!this.sys?.isActive?.();
    root.style.display=active&&!this._sessionReportOpen&&!this._replayActive?'block':'none';
  }

}

// DEV 1.1.145 validation trigger: active static Ghost layer preserves online rival and its stable DOM controls.

// DEV 1.1.146 validation trigger: Ghost DOM rows are viewport-fixed and independent from dynamic camera zoom.

// DEV 1.1.147 validation trigger: normal and online Ghost DOM rows follow their fixed HUD labels through dynamic zoom.

// DEV 1.1.148 validation trigger: Ghost DOM panel is fixed HUD geometry and never follows camera zoom.

// DEV 1.1.149 validation trigger: Ghost HUD panel is mounted on document.body for true fixed positioning.

// DEV 1.1.150 validation trigger: restore proven static Ghost DOM replacement for ONLINE/empty/PB states.
