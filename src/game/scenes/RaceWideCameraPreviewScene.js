import { RaceScene as CurrentRaceScene } from './RaceForgeSurfaceScene.js';
import { hasTrack } from '../tracks/trackRegistry.js';
import { grantRaceLoot } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { installKartingCanariasDividers } from './KartingCanariasDividerLayer.js';

// Wider gameplay camera + current selected-library-track bridge.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();

    this._zoomGameplayMin = 0.62;
    this._zoomGameplayMax = 1.06;
    this._zoomKmhRef = 105;
    this._zoomLerp = 0.042;

    this.zoom = 0.96;
    this._zoomCurrent = this.zoom;
    this._garageRewardHistCount = 0;

    // Cronometraje doble:
    // - ttBest: récord absoluto del circuito (independiente del coche).
    // - ttCarBest: mejor vuelta del modelo de coche actual en este circuito.
    this.ttCarBest = null;
    this.ttCarBestKey = null;
    this.ttRecordMeta = null;
    this.ttRecordMetaKey = null;
    this._recordCarId = 'stock';
  }

  _readTimedRecord(key) {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !Number.isFinite(parsed.lapMs)) return null;
      return {
        lapMs: parsed.lapMs,
        lapTick: parsed.lapTick ?? null,
        s1: Number.isFinite(parsed.s1) ? parsed.s1 : null,
        s1Tick: parsed.s1Tick ?? null,
        s2: Number.isFinite(parsed.s2) ? parsed.s2 : null,
        s2Tick: parsed.s2Tick ?? null,
        carId: parsed.carId || null
      };
    } catch (_) {
      return null;
    }
  }

  _writeTimedRecord(key, record) {
    if (!key || !record || !Number.isFinite(record.lapMs)) return;
    try { localStorage.setItem(key, JSON.stringify(record)); } catch (_) {}
  }

  _lapRecordFromHistory(row, carId = null) {
    if (!row || !Number.isFinite(row.lapMs)) return null;
    return {
      lapMs: row.lapMs,
      lapTick: row.lapTick ?? null,
      s1: Number.isFinite(row.s1) ? row.s1 : null,
      s1Tick: row.s1Tick ?? null,
      s2: Number.isFinite(row.s2) ? row.s2 : null,
      s2Tick: row.s2Tick ?? null,
      carId: carId || row.carId || null
    };
  }

  init(data) {
    let requestedTrack = data?.trackKey || null;
    try { requestedTrack = requestedTrack || localStorage.getItem('tdr2:trackKey'); } catch (_) {}

    super.init(data);

    if (requestedTrack && hasTrack(requestedTrack)) {
      this.trackKey = requestedTrack;
      try { localStorage.setItem('tdr2:trackKey', requestedTrack); } catch (_) {}

      this.ttHistKey = `tdr2:ttHist:${requestedTrack}`;
      this.ttHistory = [];
      try {
        const raw = localStorage.getItem(this.ttHistKey);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed?.history)) {
          this.ttHistory = parsed.history.filter((r) => r && Number.isFinite(r.lapMs)).slice(-500);
        }
      } catch (_) {}

      // El registro histórico existente continúa siendo el récord ABSOLUTO del circuito.
      this.ttKey = `tdr2:ttBest:${requestedTrack}`;
      this.ttBest = this._readTimedRecord(this.ttKey);
    }

    try { this._recordCarId = localStorage.getItem('tdr2:carId') || this.carId || 'stock'; }
    catch (_) { this._recordCarId = this.carId || 'stock'; }

    const timingTrack = this.trackKey || requestedTrack || 'default';
    this.ttCarBestKey = `tdr2:ttBestCar:${timingTrack}:${this._recordCarId}`;
    this.ttCarBest = this._readTimedRecord(this.ttCarBestKey);

    // Si ya existen vueltas nuevas etiquetadas con coche, reconstruimos el mejor tiempo
    // aunque la clave específica todavía no exista (migración transparente).
    if (!this.ttCarBest && Array.isArray(this.ttHistory)) {
      const candidates = this.ttHistory
        .filter((r) => r?.carId === this._recordCarId && Number.isFinite(r.lapMs))
        .sort((a,b) => a.lapMs - b.lapMs);
      if (candidates.length) {
        this.ttCarBest = this._lapRecordFromHistory(candidates[0], this._recordCarId);
        this._writeTimedRecord(this.ttCarBestKey, this.ttCarBest);
      }
    }

    // Metadato complementario del récord absoluto: permite saber qué coche lo consiguió
    // sin cambiar la clave histórica tdr2:ttBest:<circuito> que usa la carrera base.
    this.ttRecordMetaKey = `tdr2:ttRecordMeta:${timingTrack}`;
    this.ttRecordMeta = this._readTimedRecord(this.ttRecordMetaKey);
    if (!this.ttRecordMeta && this.ttBest) {
      this.ttRecordMeta = { ...this.ttBest, carId: this.ttBest.carId || null };
    }

    this._garageRewardHistCount = Array.isArray(this.ttHistory) ? this.ttHistory.length : 0;
  }

  create() {
    super.create();

    // El HUD de competición debe comparar la vuelta actual contra el MISMO COCHE,
    // no contra el récord absoluto del circuito. La lógica base sigue conservando ttBest
    // como récord absoluto; solo sustituimos temporalmente la referencia mientras se dibuja HUD/delta.
    if (typeof this._syncCompetitionHud === 'function') {
      const inheritedSync = this._syncCompetitionHud.bind(this);
      this._syncCompetitionHud = () => {
        const absoluteBest = this.ttBest;
        this.ttBest = this.ttCarBest;
        try {
          inheritedSync();
        } finally {
          this.ttBest = absoluteBest;
        }
        this._syncRecordHud();
      };
    }

    // Renombrar BEST para dejar claro que pertenece al vehículo actual.
    try {
      for (const child of this.competitionHud?.list || []) {
        if (child?.text === 'BEST') child.setText('BEST COCHE');
      }

      if (this.competitionHud?.scene) {
        const rec = this.add.text(139, 58, 'RÉCORD --:--.--', {
          fontFamily:'Orbitron, system-ui, sans-serif',
          fontSize:'8px', fontStyle:'800', color:'#FFD76A'
        }).setOrigin(0,0).setShadow(0,1,'#000000',2,false,true);
        this.competitionHud.add(rec);
        this.competitionHud._record = rec;
      }
      this._syncRecordHud();
    } catch (_) {}

    // Sponsor-board safety pass. The first pilot showed that checking only each board's
    // centre was insufficient on compact parallel sections: the long rectangle could still
    // clip the asphalt. Re-seat every sponsor after the environment is mounted so the entire
    // panel remains beyond the white edge line. Repeated delayed passes cover async texture load.
    const makeSafe = () => {
      try {
        const center = (this.track?.geom?.center || []).map((p) => Array.isArray(p)
          ? { x:Number(p[0]), y:Number(p[1]), width:Number(this.track?.meta?.trackWidth || 150) }
          : { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || this.track?.meta?.trackWidth || 150) }
        ).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
        if (center.length < 4) return;

        const sponsors = (this.children?.list || []).filter((o) => {
          const key = o?.texture?.key || o?.frame?.texture?.key || '';
          return typeof key === 'string' && key.startsWith('env-sponsor-');
        });

        const n = center.length;
        const idx = (i) => (i + n) % n;
        const nearestIndex = (x, y) => {
          let bestI = 0, bestD2 = Infinity;
          for (let i = 0; i < n; i++) {
            const dx = x - center[i].x, dy = y - center[i].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; bestI = i; }
          }
          return bestI;
        };

        const pointSafe = (x, y, clearance = 34) => {
          for (let i = 0; i < n; i++) {
            const p = center[i];
            const half = Number(p.width || this.track?.meta?.trackWidth || 150) * 0.5;
            if (Math.hypot(x - p.x, y - p.y) < half + clearance) return false;
          }
          return true;
        };

        for (const board of sponsors) {
          if (!board?.scene || board._tdrSponsorSafe) continue;
          const i = nearestIndex(board.x, board.y);
          const a = center[idx(i - 2)], b = center[idx(i + 2)], p = center[i];
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const side = ((board.x - p.x) * nx + (board.y - p.y) * ny) >= 0 ? 1 : -1;
          const half = Number(p.width || this.track?.meta?.trackWidth || 150) * 0.5;

          let chosen = null;
          for (const extra of [72, 88, 104, 124, 146, 170]) {
            const x = p.x + nx * side * (half + extra);
            const y = p.y + ny * side * (half + extra);
            if (pointSafe(x, y, 30)) { chosen = { x, y }; break; }
          }
          if (!chosen) {
            // Last resort: opposite side, only if the compact layout blocks the original side.
            for (const extra of [88, 108, 132, 158, 184]) {
              const x = p.x - nx * side * (half + extra);
              const y = p.y - ny * side * (half + extra);
              if (pointSafe(x, y, 30)) { chosen = { x, y }; break; }
            }
          }
          if (chosen) board.setPosition(chosen.x, chosen.y);
          board._tdrSponsorSafe = true;
        }
      } catch (e) {
        console.warn('[TDR2] sponsor safety pass failed', e);
      }
    };

    this.time.delayedCall(0, makeSafe);
    this.time.delayedCall(260, makeSafe);
    this.time.delayedCall(850, makeSafe);

    // Karting Canarias has several very close parallel lanes. Install physical median
    // dividers after the car and track geometry exist. They are real Arcade Physics
    // static bodies, not decorative sprites, so shortcuts between nearby lanes are blocked.
    try {
      installKartingCanariasDividers(this);
    } catch (e) {
      console.warn('[TDR2] Karting Canarias divider install failed', e);
    }
  }

  _fmtRecord(ms) {
    if (!Number.isFinite(ms)) return '--:--.--';
    if (typeof this._fmtTT2 === 'function') return this._fmtTT2(ms);
    const t=Math.max(0,ms),m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);
    return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  _syncRecordHud() {
    const hud = this.competitionHud;
    if (!hud?._record?.scene) return;
    const recordMs = Number(this.ttBest?.lapMs);
    const recordCar = this.ttRecordMeta?.carId;
    const carName = recordCar ? (CAR_SPECS[recordCar]?.name || recordCar) : '';
    hud._record.setText(`RÉCORD ${this._fmtRecord(recordMs)}${carName ? ` · ${String(carName).toUpperCase()}` : ''}`);
  }

  _persistTaggedHistory(newest) {
    if (!this.ttHistKey || !Array.isArray(this.ttHistory)) return;
    newest.carId = this._recordCarId;
    try {
      const raw = localStorage.getItem(this.ttHistKey);
      const parsed = raw ? JSON.parse(raw) : {};
      const payload = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      payload.history = this.ttHistory.slice(-500);
      localStorage.setItem(this.ttHistKey, JSON.stringify(payload));
    } catch (_) {}
  }

  _registerLapRecords(newest) {
    if (!newest || !Number.isFinite(newest.lapMs)) return { carBest:false, circuitRecord:false };

    this._persistTaggedHistory(newest);

    const previousCarMs = Number(this.ttCarBest?.lapMs);
    const carBest = !Number.isFinite(previousCarMs) || newest.lapMs < previousCarMs;
    if (carBest) {
      this.ttCarBest = this._lapRecordFromHistory(newest, this._recordCarId);
      this._writeTimedRecord(this.ttCarBestKey, this.ttCarBest);
    }

    // super.update() ya ha evaluado y guardado ttBest. Si la vuelta recién terminada
    // coincide con ese mejor absoluto, esta vuelta acaba de igualar/mejorar el récord.
    const absoluteMs = Number(this.ttBest?.lapMs);
    const circuitRecord = Number.isFinite(absoluteMs) && Math.abs(newest.lapMs - absoluteMs) < 0.5;
    if (circuitRecord) {
      this.ttRecordMeta = this._lapRecordFromHistory(newest, this._recordCarId);
      this._writeTimedRecord(this.ttRecordMetaKey, this.ttRecordMeta);
    }

    this._syncRecordHud();
    return { carBest, circuitRecord };
  }

  _showTimingAchievement({ carBest, circuitRecord }, lapMs) {
    if (!carBest && !circuitRecord) return;
    const carName = String(CAR_SPECS[this._recordCarId]?.name || this._recordCarId).toUpperCase();
    const msg = circuitRecord
      ? `🏆 NUEVO RÉCORD DEL CIRCUITO  ·  ${this._fmtRecord(lapMs)}  ·  ${carName}`
      : `NUEVA MEJOR VUELTA · ${carName}  ·  ${this._fmtRecord(lapMs)}`;
    const tone = circuitRecord ? '#FFE06A' : '#63FFD1';

    const t = this.add.text(this.scale.width/2, 58, msg, {
      fontFamily:'Orbitron, system-ui', fontSize:'12px', fontStyle:'900', color:tone,
      backgroundColor:'#061018e8', padding:{x:14,y:9}, stroke:'#000000', strokeThickness:2
    }).setOrigin(.5,0).setScrollFactor(0).setDepth(100000);
    try { this.cameras.main.ignore(t); } catch (_) {}
    try { this.uiCam?.removeFromRenderList?.(t); } catch (_) {}
    this.tweens.add({targets:t,alpha:0,y:48,delay:1900,duration:420,onComplete:()=>t.destroy()});
  }

  update(time, delta) {
    super.update(time, delta);

    const hist = Array.isArray(this.ttHistory) ? this.ttHistory : [];
    if (hist.length <= this._garageRewardHistCount) return;

    const newest = hist[hist.length - 1];
    this._garageRewardHistCount = hist.length;
    if (!newest || !Number.isFinite(newest.lapMs)) return;

    const records = this._registerLapRecords(newest);
    this._showTimingAchievement(records, newest.lapMs);

    const reward = grantRaceLoot({ trackKey: this.trackKey, lapMs: newest.lapMs });
    this._showRaceLoot(reward);
  }

  _showRaceLoot(reward) {
    const bits = Object.entries(reward || {}).map(([id,n]) => {
      const item = GARAGE_ITEMS[id];
      return `${item?.icon || '•'} ${item?.name || id} ×${n}`;
    });
    if (!bits.length) return;

    const t = this.add.text(this.scale.width / 2, 92, `BOTÍN DE CARRERA  ·  ${bits.join('   ')}`, {
      fontFamily:'Orbitron, system-ui', fontSize:'12px', fontStyle:'900', color:'#eafff2',
      backgroundColor:'#07160fdd', padding:{x:14,y:9}, stroke:'#143823', strokeThickness:2
    }).setOrigin(.5,0).setScrollFactor(0).setDepth(99999);

    try { this.cameras.main.ignore(t); } catch (_) {}
    try { this.uiCam?.removeFromRenderList?.(t); } catch (_) {}

    this.tweens.add({targets:t,alpha:0,y:76,delay:1700,duration:420,onComplete:()=>t.destroy()});
  }
}
