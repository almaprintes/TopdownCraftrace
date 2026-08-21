import { loadGarage } from '../garage/garageStore.js';
import './lobby-dom.css';

const BASE = import.meta.env.BASE_URL || '/';
const asset = (name) => `${BASE}assets/ui/lobby/${name}`;

function disableTree(node) {
  if (!node) return;
  try { node.disableInteractive?.(); } catch {}
  if (Array.isArray(node.list)) node.list.forEach(disableTree);
}

function hideLegacyLobbyControls(scene) {
  if (scene._topLobbyHeader) {
    disableTree(scene._topLobbyHeader);
    scene._topLobbyHeader.setVisible(false);
  }
  const hiddenKeys = new Set(['btn_play', 'btn_garage', 'btn_factory', 'btn_tracks']);
  const walk = (node) => {
    if (!node) return;
    if (hiddenKeys.has(String(node?.texture?.key || ''))) {
      try { node.setVisible(false); } catch {}
      try { node.disableInteractive?.(); } catch {}
    }
    if (Array.isArray(node.list)) node.list.forEach(walk);
  };
  walk(scene._ui);
}

function makeButton({ cls = '', icon, label, action }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tdr-lobby-button ${cls}`.trim();
  button.innerHTML = `<img src="${asset(icon)}" alt="" draggable="false"><span>${label}</span>`;
  button.addEventListener('click', action);
  return button;
}

function startRaceFlow(scene) {
  if (typeof scene._openGameModeModal === 'function') {
    scene._openGameModeModal();
    return;
  }
  const carId = scene.selectedCarId;
  const trackKey = scene.selectedTrackKey || 'track01';
  try {
    localStorage.setItem('tdr2:carId', carId);
    localStorage.setItem('tdr2:trackKey', trackKey);
  } catch {}
  scene.scene.start('race', { carId, trackKey });
}

export function installLobbyDom(scene) {
  hideLegacyLobbyControls(scene);

  let root = scene._lobbyDomRoot;
  if (!root?.isConnected) {
    const host = scene.game?.canvas?.parentElement || document.getElementById('app') || document.body;
    host.classList.add('tdr-lobby-host');

    root = document.createElement('div');
    root.className = 'tdr-lobby-dom';
    root.innerHTML = `
      <header class="tdr-lobby-header">
        <button type="button" class="tdr-lobby-brand" aria-label="Top Down Race">
          <img src="${BASE}assets/logos/logo_tdr2_sobres.webp" alt="Top Down Race" draggable="false">
        </button>
        <div class="tdr-lobby-wallet">
          <img src="${BASE}assets/ui/moneda-tdr.webp" alt="" draggable="false">
          <span><small>MONEDAS</small><strong data-coins>0</strong></span>
        </div>
        <nav class="tdr-lobby-top-actions" aria-label="Acciones principales"></nav>
      </header>
      <div class="tdr-lobby-play-slot"></div>
      <nav class="tdr-lobby-bottom-actions" aria-label="Navegación principal"></nav>
    `;
    host.appendChild(root);
    scene._lobbyDomRoot = root;

    const top = root.querySelector('.tdr-lobby-top-actions');
    top.append(
      makeButton({ cls: 'tdr-lobby-button--gold', icon: 'icon_inventory.webp', label: 'INVENTARIO', action: () => scene._openLobbyInventoryModal?.('materials') }),
      makeButton({ cls: 'tdr-lobby-button--purple', icon: 'icon_store.webp', label: 'TIENDA', action: () => scene._openStoreModal?.('materials') }),
      makeButton({ icon: 'icon_settings.webp', label: 'CONFIGURACIÓN', action: () => scene.scene.start('SettingsScene') })
    );

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'tdr-lobby-play';
    play.innerHTML = '<span class="tdr-lobby-play-triangle">▶</span><span>ARRANCAR MOTOR</span>';
    play.addEventListener('click', () => startRaceFlow(scene));
    root.querySelector('.tdr-lobby-play-slot').appendChild(play);

    const bottom = root.querySelector('.tdr-lobby-bottom-actions');
    bottom.append(
      makeButton({ icon: 'icon_garage.webp', label: 'GARAJE', action: () => scene.scene.start('GarageScene', { mode: 'player' }) }),
      makeButton({ cls: 'tdr-lobby-button--factory', icon: 'icon_factory.webp', label: 'FÁBRICA', action: () => scene.scene.start('upgrade-shop') }),
      makeButton({ cls: 'tdr-lobby-button--gold', icon: 'icon_tracks.webp', label: 'CIRCUITOS', action: () => scene.scene.start('TrackGarageScene', { mode: 'player' }) })
    );

    const brand = root.querySelector('.tdr-lobby-brand');
    let adminTimer = 0;
    const cancelAdmin = () => { if (adminTimer) window.clearTimeout(adminTimer); adminTimer = 0; };
    brand.addEventListener('pointerdown', () => {
      cancelAdmin();
      adminTimer = window.setTimeout(() => {
        const enabled = localStorage.getItem('tdr2:admin') === '1' ? '0' : '1';
        localStorage.setItem('tdr2:admin', enabled);
        if (enabled === '1') scene.scene.start('admin-hub');
      }, 700);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(name => brand.addEventListener(name, cancelAdmin));

    scene.events.once('shutdown', () => {
      try { root.remove(); } catch {}
      if (scene._lobbyDomRoot === root) scene._lobbyDomRoot = null;
    });
  }

  const coins = Math.max(0, Math.floor(Number(loadGarage()?.coins) || 0));
  const coinNode = root.querySelector('[data-coins]');
  if (coinNode) coinNode.textContent = coins.toLocaleString('es-ES');
  return root;
}

