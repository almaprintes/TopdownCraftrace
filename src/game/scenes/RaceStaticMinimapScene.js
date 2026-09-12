import { RaceScene as CurrentRaceScene } from './RaceNoDiagScene.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FRAME_W = 184;
const FRAME_H = 112;
const INNER = { x: 8, y: 8, w: FRAME_W - 16, h: FRAME_H - 16 };

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);
    this._buildStaticDomMinimap();
    return result;
  }

  _hidePhaserMinimap() {
    try { this.minimapUnifiedPanel?.setVisible?.(false); } catch (_) {}
    try { this.minimapSportFrame?.setVisible?.(false); } catch (_) {}
    try { this.minimapWideFrame?.setVisible?.(false); } catch (_) {}
    for (const obj of [this.minimap?.gfx, this.minimap?.flag, this.minimap?.shadow, this.minimap?.car]) {
      try { obj?.setVisible?.(false); } catch (_) {}
    }
  }

  _buildStaticDomMinimap() {
    if (typeof document === 'undefined' || this._tdrStaticMinimap?.root?.isConnected) return;

    this._hidePhaserMinimap();

    const raw = Array.isArray(this.track?.meta?.centerline) ? this.track.meta.centerline : [];
    const worldPts = raw.map((p) => Array.isArray(p)
      ? { x: Number(p[0]), y: Number(p[1]) }
      : { x: Number(p?.x), y: Number(p?.y) })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (worldPts.length < 2) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of worldPts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    const worldW = Math.max(1, maxX - minX);
    const worldH = Math.max(1, maxY - minY);
    const fitScale = Math.min(INNER.w / worldW, INNER.h / worldH) * 0.91;
    const drawW = worldW * fitScale;
    const drawH = worldH * fitScale;
    const ox = INNER.x + (INNER.w - drawW) * 0.5 - minX * fitScale;
    const oy = INNER.y + (INNER.h - drawH) * 0.5 - minY * fitScale;

    const root = document.createElement('div');
    root.id = 'tdr-static-minimap';
    Object.assign(root.style, {
      position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px',
      zIndex: '45', pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      transform: 'translateZ(0)', contain: 'layout paint style'
    });

    const svg = svgEl('svg', {
      viewBox: `0 0 ${FRAME_W} ${FRAME_H}`,
      width: '100%', height: '100%', preserveAspectRatio: 'none',
      'aria-hidden': 'true'
    });
    svg.style.display = 'block';
    svg.style.overflow = 'visible';

    const points = worldPts.map((p) => `${ox + p.x * fitScale},${oy + p.y * fitScale}`).join(' ');
    svg.appendChild(svgEl('polyline', {
      points, fill: 'none', stroke: '#74dfff', 'stroke-opacity': '0.10',
      'stroke-width': '4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));
    svg.appendChild(svgEl('polyline', {
      points, fill: 'none', stroke: '#f2f5f7', 'stroke-opacity': '0.82',
      'stroke-width': '2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    }));

    const finish = this.track?.meta?.finish || this.track?.meta?.finishLine;
    const finishMid = finish?.a && finish?.b
      ? { x: (finish.a.x + finish.b.x) * 0.5, y: (finish.a.y + finish.b.y) * 0.5 }
      : worldPts[0];
    const fx = ox + finishMid.x * fitScale;
    const fy = oy + finishMid.y * fitScale;
    const sq = 3;
    for (let yy = 0; yy < 2; yy++) {
      for (let xx = 0; xx < 3; xx++) {
        svg.appendChild(svgEl('rect', {
          x: fx - 4 + xx * sq, y: fy - 3 + yy * sq, width: sq, height: sq,
          fill: ((xx + yy) % 2) ? '#11151a' : '#f6f7f8', 'fill-opacity': '0.95'
        }));
      }
    }

    const marker = svgEl('g');
    marker.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 5, fill: '#05131c', 'fill-opacity': '0.95' }));
    marker.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 4, fill: 'none', stroke: '#ffffff', 'stroke-opacity': '0.95', 'stroke-width': 2 }));
    marker.appendChild(svgEl('polygon', { points: '0,-5 -2.4,1.8 2.4,1.8', fill: '#63ffd1' }));
    svg.appendChild(marker);

    root.appendChild(svg);
    (this.game?.canvas?.parentElement || document.body).appendChild(root);

    this._tdrStaticMinimap = { root, svg, marker, fitScale, ox, oy, frameW: FRAME_W, frameH: FRAME_H };

    this._layoutStaticDomMinimap = () => {
      const ui = this._tdrStaticMinimap;
      const canvas = this.game?.canvas;
      if (!ui?.root?.isConnected || !canvas) return;
      const rect = canvas.getBoundingClientRect?.();
      const vw = Math.max(1, Number(this.scale?.width || 1));
      const vh = Math.max(1, Number(this.scale?.height || 1));
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const screenX = vw - FRAME_W + 18;
      const screenY = 24;
      ui.root.style.left = `${rect.left + (screenX / vw) * rect.width}px`;
      ui.root.style.top = `${rect.top + (screenY / vh) * rect.height}px`;
      ui.root.style.width = `${(FRAME_W / vw) * rect.width}px`;
      ui.root.style.height = `${(FRAME_H / vh) * rect.height}px`;
    };

    this._updateStaticDomMinimap = () => {
      const ui = this._tdrStaticMinimap;
      const body = this.carBody || this.car;
      if (!ui?.marker || !body) return;
      const px = Number(body.x), py = Number(body.y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return;
      const x = ui.ox + px * ui.fitScale;
      const y = ui.oy + py * ui.fitScale;
      const deg = Number(body.rotation || 0) * 180 / Math.PI;
      ui.marker.setAttribute('transform', `translate(${x} ${y}) rotate(${deg})`);
      const active = !!this.sys?.isActive?.();
      const hiddenByReport = !!this._sessionReportOpen;
      ui.root.style.display = active && !hiddenByReport ? 'block' : 'none';
    };

    this._onStaticMinimapResize = () => this._layoutStaticDomMinimap?.();
    this.scale?.on?.('resize', this._onStaticMinimapResize, this);
    if (typeof window !== 'undefined') window.addEventListener('tdr:viewportchange', this._onStaticMinimapResize, { passive: true });

    this._tdrStaticMinimapPostUpdate = () => {
      this._hidePhaserMinimap();
      this._updateStaticDomMinimap?.();
    };
    this.events?.on?.('postupdate', this._tdrStaticMinimapPostUpdate, this);

    this.events?.once?.('shutdown', () => {
      try { this.scale?.off?.('resize', this._onStaticMinimapResize, this); } catch (_) {}
      try { window.removeEventListener('tdr:viewportchange', this._onStaticMinimapResize); } catch (_) {}
      try { this.events?.off?.('postupdate', this._tdrStaticMinimapPostUpdate, this); } catch (_) {}
      try { this._tdrStaticMinimap?.root?.remove?.(); } catch (_) {}
      this._tdrStaticMinimap = null;
      this._onStaticMinimapResize = null;
      this._tdrStaticMinimapPostUpdate = null;
    });

    this._layoutStaticDomMinimap();
    this._updateStaticDomMinimap();
  }
}
