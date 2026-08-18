import { EnvironmentBuilderScene as ScrollEnvironmentBuilderScene } from './EnvironmentBuilderScrollScene.js';

export class EnvironmentBuilderScene extends ScrollEnvironmentBuilderScene {
  _refreshCatalog() {
    if (!this._catalogRoot) return;
    this._catalogRoot.removeAll(true);
    this._catalogCards = [];

    const { width, height } = this.scale;
    const rx = width - this._right + 14;
    const startY = this._top + 82;
    const source = this._catalogItemsForCategory?.(this._category) || [];

    const cardW = 84, cardH = 86, gap = 8, cols = 3;
    const rows = Math.max(1, Math.ceil(source.length / cols));
    const contentH = rows * (cardH + gap) - gap;
    const viewH = this._catalogViewport?.h ?? Math.max(90, (height - 174) - startY - 12);
    this._catalogMaxScroll = Math.max(0, contentH - viewH);
    this._catalogScroll = 0;
    this._catalogRoot.setPosition(rx, startY);

    source.forEach((a, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cardW + gap);
      const y = row * (cardH + gap);

      const bg = this.add.rectangle(x, y, cardW, cardH, 0x151f31, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0x344563, .9)
        .setInteractive({ useHandCursor: true });

      const img = this.add.image(x + cardW / 2, y + 34, `env:${a.id}`);
      const s = Math.min(58 / (img.width || 1), 48 / (img.height || 1));
      img.setScale(s);

      const tx = this.add.text(
        x + cardW / 2,
        y + 64,
        a.id.replace(/_01$/, '').replaceAll('_', ' '),
        {
          fontFamily: 'system-ui',
          fontSize: '8px',
          color: '#fff',
          align: 'center',
          wordWrap: { width: cardW - 8 }
        }
      ).setOrigin(.5, 0);

      bg.on('pointerup', (pointer) => {
        if (this._catalogMoved) return;
        if (!bg.input?.enabled) return;
        pointer?.event?.stopPropagation?.();
        this._spawn(a);
      });

      this._catalogRoot.add([bg, img, tx]);
      this._catalogCards.push({ bg, img, tx, localY: y, h: cardH });
    });

    if (this._catalogMask) this._catalogRoot.setMask(this._catalogMask);
    this._editCam?.ignore(this._catalogRoot.list);
    this._syncCatalogInput();
  }

  _setCatalogScroll(value) {
    super._setCatalogScroll(value);
    this._syncCatalogInput();
  }

  _syncCatalogInput() {
    const v = this._catalogViewport;
    if (!v || !Array.isArray(this._catalogCards)) return;

    const rootY = this._catalogRoot?.y ?? v.y;
    const top = v.y;
    const bottom = v.y + v.h;

    for (const card of this._catalogCards) {
      const cardTop = rootY + card.localY;
      const cardBottom = cardTop + card.h;
      const fullyInside = cardTop >= top && cardBottom <= bottom;

      if (card.bg?.input) card.bg.input.enabled = fullyInside;
      card.bg?.setAlpha(fullyInside ? 1 : 0.45);
    }
  }
}
