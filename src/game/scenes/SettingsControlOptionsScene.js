import { SettingsScene as CurrentSettingsScene } from './SettingsScene.js';

const STORAGE_KEY = 'tdr2:settings';

export class SettingsScene extends CurrentSettingsScene {
  _renderTabContent(panelX, panelY, panelW, panelH) {
    super._renderTabContent(panelX, panelY, panelW, panelH);
    if (this.activeTab !== 'controls') return;

    const controls = this.settings?.controls || (this.settings.controls = {});
    if (!['stick', 'buttons'].includes(controls.steeringMode)) {
      controls.steeringMode = 'stick';
    }

    const x = panelX + 16;
    const y = panelY + (this._panel?.headH || 56) + 118;
    const availableW = Math.min(470, panelW - 32);

    this.add.text(x, y, 'MODO DE DIRECCIÓN', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    });

    this.add.text(x, y + 22, 'Elige cómo quieres girar el coche durante la carrera.', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '12px',
      color: '#b7c0ff'
    });

    const gap = 10;
    const cardW = Math.floor((availableW - gap) / 2);
    const cardH = 64;
    const cardY = y + 48;

    const makeChoice = (cx, mode, title, subtitle, icon) => {
      const selected = controls.steeringMode === mode;
      const box = this.add.rectangle(cx, cardY, cardW, cardH, selected ? 0x123b34 : 0x141b33, selected ? 0.92 : 0.62)
        .setOrigin(0)
        .setStrokeStyle(2, selected ? 0x2bff88 : 0xb7c0ff, selected ? 0.85 : 0.20)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx + 14, cardY + 12, `${icon}  ${title}`, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '13px', fontStyle: 'bold', color: '#ffffff'
      });
      this.add.text(cx + 14, cardY + 36, subtitle, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '11px', color: selected ? '#79ffc0' : '#b7c0ff'
      });

      box.on('pointerdown', () => box.setScale(0.985));
      box.on('pointerout', () => box.setScale(1));
      box.on('pointerup', () => {
        box.setScale(1);
        if (controls.steeringMode === mode) return;
        controls.steeringMode = mode;
        controls.scheme = 'touch';
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch (_) {}
        this.scene.restart();
      });
    };

    makeChoice(x, 'stick', 'PALANCA', 'Dirección analógica actual', '◉');
    makeChoice(x + cardW + gap, 'buttons', 'BOTONES', 'Izquierda / derecha', '◀ ▶');
  }
}
