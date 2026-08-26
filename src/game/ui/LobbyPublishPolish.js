import { getLanguage } from '../i18n/index.js';
import './lobby-publish-polish.css';

function makeCardButton(node, label, action) {
  if (!node) return;
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', '0');
  node.setAttribute('aria-label', label);

  if (!node.dataset.tdrPublishNavBound) {
    node.dataset.tdrPublishNavBound = '1';
    node.addEventListener('click', event => {
      event.preventDefault();
      action();
    });
    node.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      action();
    });
  }
}

export function polishLobbyForPublish(scene, root) {
  if (!root?.isConnected) return;
  const lang = getLanguage() === 'en' ? 'en' : 'es';

  const season = root.querySelector('[data-event-card]');
  if (season) {
    const kicker = season.querySelector('.tdr-card-kicker');
    if (kicker) kicker.textContent = lang === 'en' ? 'SEASON PASS' : 'PASE DE TEMPORADA';
    const claim = season.querySelector('.tdr-event-claim');
    if (claim) claim.textContent = lang === 'en' ? 'OPEN SEASON' : 'ABRIR TEMPORADA';
    makeCardButton(
      season,
      lang === 'en' ? 'Open Season Pass' : 'Abrir Pase de Temporada',
      () => scene.scene.start('season')
    );
  }

  const track = root.querySelector('[data-track-card]');
  if (track) {
    makeCardButton(
      track,
      lang === 'en' ? 'Open track selector' : 'Abrir selector de circuitos',
      () => scene.scene.start('TrackGarageScene', { mode: 'player' })
    );
  }
}
