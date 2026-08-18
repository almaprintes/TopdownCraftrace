import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupUi() {
    super._setupUi();
    this._catalogScroll = 0;
    this._catalogMaxScroll = 0;
    this._catalogPointerDown = false;
    this._catalogMoved = false;
    this._catalogLastY = 0;

    const { width, height } = this.scale;
    const rx = width - this._right + 14;
    const startY = this._top + 82;
    const selectionY = height - 174;
    const viewH = Math.max(90, selectionY - startY - 12);

    this._catalogViewport = { x: rx, y: startY, w: this._right - 28, h: viewH };

    const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(rx, startY, this._right - 28, viewH);
    this._catalogMaskShape = maskShape;
    this._catalogMask = maskShape.createGeometryMask();
    this._catalogRoot?.setMask(this._catalogMask);

    const insideCatalog = (p) => {
      const v = this._catalogViewport;
      return !!v && p.x >= v.x && p.x <= v.x + v.w && p.y >= v.y && p.y <= v.y + v.h;
    };

    this.input.on('pointerdown', (p) => {
      if (!insideCatalog(p)) return;
      this._catalogPointerDown = true;
      this._catalogMoved = false;
      this._catalogLastY = p.y;
    });

    this.input.on('pointermove', (p) => {
      if (!this._catalogPointerDown || !p.isDown) return;
      const dy = p.y - this._catalogLastY;
      if (Math.abs(dy) > 1) {
        this._catalogMoved = true;
        this._setCatalogScroll(this._catalogScroll + dy);
        this._catalogLastY = p.y;
      }
    });

    const stopCatalogDrag = () => {
      this._catalogPointerDown = false;
      this.time.delayedCall(0, () => { this._catalogMoved = false; });
    };
    this.input.on('pointerup', stopCatalogDrag);
    this.input.on('pointerupoutside', stopCatalogDrag);

    this.input.on('wheel', (p, _gos, _dx, dy) => {
      if (!insideCatalog(p)) return;
      this._setCatalogScroll(this._catalogScroll - dy * 0.55);
    });

    this.events.once('shutdown', () => {
      try { this._catalogMaskShape?.destroy(); } catch {}
      this._catalogMaskShape = null;
      this._catalogMask = null;
    });
  }

  _setCatalogScroll(value) {
    const minY = -Math.max(0, this._catalogMaxScroll || 0);
    this._catalogScroll = Math.max(minY, Math.min(0, Number(value) || 0));
    if (this._catalogRoot && this._catalogViewport) {
      this._catalogRoot.y = this._catalogViewport.y + this._catalogScroll;
    }
  }

  _refreshCatalog() {
    if (!this._catalogRoot) return;
    this._catalogRoot.removeAll(true);

    const { width, height } = this.scale;
    const rx = width - this._right + 14;
    const startY = this._top + 82;
    const items = (typeof CATALOG !== 'undefined' ? CATALOG : []).filter(a => a.cat === this._category);

    // CATALOG lives in the parent module scope, so when it isn't directly visible
    // rebuild the list from the textures already loaded by the parent scene.
    const fallbackItems = this._catalogItemsForCategory?.(this._category) || [];
    const source = items.length ? items : fallbackItems;

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
      const tx = this.add.text(x + cardW / 2, y + 64, a.id.replace(/_01$/, '').replaceAll('_', ' '), {
        fontFamily: 'system-ui', fontSize: '8px', color: '#fff', align: 'center',
        wordWrap: { width: cardW - 8 }
      }).setOrigin(.5, 0);
      bg.on('pointerup', () => {
        if (this._catalogMoved) return;
        this._spawn(a);
      });
      this._catalogRoot.add([bg, img, tx]);
    });

    if (this._catalogMask) this._catalogRoot.setMask(this._catalogMask);
    this._editCam?.ignore(this._catalogRoot.list);
  }

  _catalogItemsForCategory(category) {
    // Mirror of the current Builder catalog, kept here only so the scroll layer
    // remains isolated and reversible.
    const items = [
      ['VEGETACIÓN','tree_broad_01','environment/tree_broad_01.webp',170],
      ['VEGETACIÓN','tree_broad_02','environment/tree_broad_02.webp',160],
      ['VEGETACIÓN','palm_tall_01','environment/palm_tall_01.webp',130],
      ['VEGETACIÓN','shrub_round_01','environment/shrub_round_01.webp',78],
      ['VEGETACIÓN','shrub_flowers_01','environment/shrub_flowers_01.webp',74],
      ['BARRERAS','concrete_barrier_straight_01','environment/barriers/concrete_barrier_straight_01.webp',240],
      ['BARRERAS','guardrail_curve_01','environment/barriers/guardrail_curve_01.webp',230],
      ['BARRERAS','guardrail_straight_01','environment/barriers/guardrail_straight_01.webp',260],
      ['BARRERAS','plastic_barrier_redwhite_01','environment/barriers/plastic_barrier_redwhite_01.webp',260],
      ['BARRERAS','tire_barrier_curve_l_01','environment/barriers/tire_barrier_curve_l_01.webp',220],
      ['BARRERAS','tire_barrier_straight_short_01','environment/barriers/tire_barrier_straight_short_01.webp',220],
      ['BARRERAS','tire_stack_compact_01','environment/barriers/tire_stack_compact_01.webp',125],
      ['PROPS','bollard_metal_short_01','environment/props/bollard_metal_short_01.webp',72],
      ['PROPS','cone_orange_01','environment/props/cone_orange_01.webp',68],
      ['PROPS','direction_sign_01','environment/props/direction_sign_01.webp',115],
      ['PROPS','extinguisher_post_01','environment/props/extinguisher_post_01.webp',82],
      ['PROPS','fence_chainlink_curve_l_01','environment/props/fence_chainlink_curve_l_01.webp',235],
      ['PROPS','fence_chainlink_straight_01','environment/props/fence_chainlink_straight_01.webp',260],
      ['PROPS','light_post_short_01','environment/props/light_post_short_01.webp',88],
      ['PROPS','metal_barrel_01','environment/props/metal_barrel_01.webp',85],
      ['PROPS','race_start_light_01','environment/props/race_start_light_01.webp',120],
      ['PROPS','toolbox_01','environment/props/toolbox_01.webp',105],
      ['PROPS','wood_pallet_01','environment/props/wood_pallet_01.webp',130],
      ['ESTRUCTURAS','control_tower_small_01','environment/structures/control_tower_small_01.webp',180],
      ['ESTRUCTURAS','grandstand_sparse_01','environment/structures/grandstand_sparse_01.webp',360],
      ['ESTRUCTURAS','grandstand_half_01','environment/structures/grandstand_half_01.webp',380],
      ['ESTRUCTURAS','grandstand_full_01','environment/structures/grandstand_full_01.webp',390],
      ['ESTRUCTURAS','marshal_post_01','environment/structures/marshal_post_01.webp',125],
      ['ESTRUCTURAS','paddock_box_small_01','environment/structures/paddock_box_small_01.webp',235],
      ['ESTRUCTURAS','pit_garage_small_01','environment/structures/pit_garage_small_01.webp',315]
    ];
    return items.filter(x => x[0] === category).map(([cat,id,path,w]) => ({cat,id,path,w}));
  }
}
