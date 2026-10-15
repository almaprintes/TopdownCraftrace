# Lobby cenital y pozo del ascensor — 15/10/2026, DEV 1.2.206

- Rama de trabajo/despliegue: **main**; `dev-first-update` es histórica. No cambiar Google Play.
- Imagen aprobada por el propietario: `public/assets/ui/lobby/lobby_background_topdown_garage.webp` (1536×1024). Sin plataforma circular dibujada, con salida del coche despejada hacia la derecha.
- Única referencia visible del fondo DOM: `src/game/ui/LobbyDomUi.js`, `root.style.backgroundImage`. El plano Phaser bajo el DOM es independiente, sin plataforma duplicada.
- La plataforma animada existente continúa en `assets/ui/lobby/car_platform.webp`, sin modificar tiempos ni tamaños. El ascensor sigue siendo la ruta `LobbyGarageLiftTransition.js`; mantiene coche, plataforma y maestría sincronizados, con transiciones distintas de salida a carrera.
- El pozo aparece temporalmente bajo el ascensor: aro metálico, pared interior hundida y fondo oscuro, con labio próximo que oculta el vehículo según baja. La boca aparece al empezar el descenso y permanece abierta mientras el coche sube; al finalizar/cancelar se limpian las capas.
- Estilos en `src/game/ui/lobby-dom.css` bajo `.tdr-lobby-garage-well` y `.tdr-lobby-garage-lip`. Sin animaciones 3D pesadas ni recursos nuevos.
- Pruebas de regresión: `scripts/lobby-garage-lift-smoke.mjs` y `scripts/lobby-overview-platform-wings-smoke.mjs`. Confirmar Build + Deploy de GitHub Pages para el mismo SHA.
