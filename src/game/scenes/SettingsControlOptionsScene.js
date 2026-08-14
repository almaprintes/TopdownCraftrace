import { SettingsScene as CurrentSettingsScene } from './SettingsScene.js';

const STORAGE_KEY = 'tdr2:settings';

function connectedPad() {
  try {
    return Array.from(navigator.getGamepads?.() || []).find(Boolean) || null;
  } catch (_) {
    return null;
  }
}

export class SettingsScene extends CurrentSettingsScene {
  _renderTabContent(panelX, panelY, panelW, panelH) {
    super._renderTabContent(panelX, panelY, panelW, panelH);
    if (this.activeTab !== 'controls') return;

    const controls = this.settings?.controls || (this.settings.controls = {});
    if (!['stick', 'buttons', 'gamepad'].includes(controls.steeringMode)) {
      controls.steeringMode = 'stick';
    }

    const x = panelX + 16;
    const y = panelY + (this._panel?.headH || 56) + 118;
    const availableW = Math.min(620, panelW - 32);

    this.add.text(x, y, 'MODO DE DIRECCIÓN', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    });

    this.add.text(x, y + 22, 'Elige cómo quieres controlar el coche durante la carrera.', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '12px',
      color: '#b7c0ff'
    });

    const gap = 10;
    const cardW = Math.floor((availableW - gap * 2) / 3);
    const cardH = 72;
    const cardY = y + 48;

    const saveMode = (mode) => {
      if (controls.steeringMode === mode) return;
      controls.steeringMode = mode;
      controls.scheme = mode === 'gamepad' ? 'gamepad' : 'touch';
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); } catch (_) {}
      this.scene.restart();
    };

    const makeChoice = (cx, mode, title, subtitle, icon) => {
      const selected = controls.steeringMode === mode;
      const box = this.add.rectangle(cx, cardY, cardW, cardH, selected ? 0x123b34 : 0x141b33, selected ? 0.92 : 0.62)
        .setOrigin(0)
        .setStrokeStyle(2, selected ? 0x2bff88 : 0xb7c0ff, selected ? 0.85 : 0.20)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx + 12, cardY + 11, `${icon}  ${title}`, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '12px', fontStyle: 'bold', color: '#ffffff'
      });
      this.add.text(cx + 12, cardY + 37, subtitle, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '10px', color: selected ? '#79ffc0' : '#b7c0ff',
        wordWrap: { width: cardW - 24 }
      });

      box.on('pointerdown', () => box.setScale(0.985));
      box.on('pointerout', () => box.setScale(1));
      box.on('pointerup', () => { box.setScale(1); saveMode(mode); });
    };

    makeChoice(x, 'stick', 'PALANCA', 'Dirección analógica táctil', '◉');
    makeChoice(x + cardW + gap, 'buttons', 'BOTONES', 'Izquierda / derecha', '◀ ▶');

    const pad = connectedPad();
    makeChoice(
      x + (cardW + gap) * 2,
      'gamepad',
      'MANDO',
      pad ? `Conectado: ${String(pad.id || 'Gamepad').slice(0, 24)}` : 'Conecta DualSense / DualShock',
      '🎮'
    );

    if (controls.steeringMode === 'gamepad') {
      const statusY = cardY + cardH + 10;
      const status = pad ? 'MANDO DETECTADO · Stick izq. + L2/R2' : 'SIN MANDO DETECTADO · Conéctalo por Bluetooth y pulsa un botón';
      this.add.text(x, statusY, status, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '10px', fontStyle: 'bold',
        color: pad ? '#2bff88' : '#ffcc66'
      });
    }
  }
}
