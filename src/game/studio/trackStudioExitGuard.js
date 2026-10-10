// Protect editing sessions from accidental exits. No global navigation changes outside TrackStudio.
export function installTrackStudioExitGuard(scene) {
  const message = '¿Salir de Track Studio?\n\nSi no has guardado con 💾, perderás los cambios que no hayas exportado.\n\nCancelar = seguir editando.';
  let leaving = false;
  let guarded = false;
  let marker = null;

  const recovery = () => {
    try { scene._autosaveRecovery?.(); }
    catch (err) { console.warn('[TrackStudio] No se pudo guardar recuperación al salir', err); }
  };
  const leave = () => {
    if (leaving) return;
    recovery();
    leaving = true;
    // This replaces only the entry introduced while editing; it cannot alter the PWA route.
    if (guarded && window.history?.state?.tdrTrackStudioExit === marker) {
      try { window.history.back(); } catch {}
    }
    scene._destroyGuideInput?.();
    scene._destroyProjectInput?.();
    scene.scene.start('admin-hub');
  };
  scene._requestExitTrackStudio = () => {
    if (leaving || !window.confirm(message)) return false;
    leave();
    return true;
  };
  const onPopState = () => {
    if (leaving || !guarded) return;
    if (window.confirm(message)) {
      leave();
    } else {
      // Browser's Back removed our sentinel: restore exactly one guard entry.
      try { window.history.pushState({ tdrTrackStudioExit: marker }, '', window.location.href); }
      catch (e) { console.warn('[TrackStudio] No se pudo restituir la protección Atrás', e); }
    }
  };
  const onBeforeUnload = event => {
    if (leaving) return;
    recovery();
    event.preventDefault();
    event.returnValue = ''; // Browser-owned generic warning (not always shown on iOS).
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  try {
    marker = 'ts-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    window.history.pushState({ tdrTrackStudioExit: marker }, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    guarded = true;
  } catch (err) {
    console.warn('[TrackStudio] Browser history guard unavailable', err);
  }
  scene.events.once('shutdown', () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
    window.removeEventListener('popstate', onPopState);
    delete scene._requestExitTrackStudio;
  });
}
