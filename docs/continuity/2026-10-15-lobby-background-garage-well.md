# Lobby cenital y pozo del ascensor — 15/10/2026, DEV 1.2.206

- Rama de trabajo/despliegue: **main**; `dev-first-update` es histórica. No cambiar Google Play.
- Imagen aprobada por el propietario: `public/assets/ui/lobby/lobby_background_topdown_garage.webp` (1536×1024). Sin plataforma circular dibujada, con salida del coche despejada hacia la derecha.
- Única referencia visible del fondo DOM: `src/game/ui/LobbyDomUi.js`, `root.style.backgroundImage`. El plano Phaser bajo el DOM es independiente, sin plataforma duplicada.
- La plataforma animada existente continúa en `assets/ui/lobby/car_platform.webp`, sin modificar tiempos ni tamaños. El ascensor sigue siendo la ruta `LobbyGarageLiftTransition.js`; mantiene coche, plataforma y maestría sincronizados, con transiciones distintas de salida a carrera.
- El pozo aparece temporalmente bajo el ascensor: aro metálico, pared interior hundida y fondo oscuro, con labio próximo que oculta el vehículo según baja. La boca aparece al empezar el descenso y permanece abierta mientras el coche sube; al finalizar/cancelar se limpian las capas.
- Estilos en `src/game/ui/lobby-dom.css` bajo `.tdr-lobby-garage-well` y `.tdr-lobby-garage-lip`. Sin animaciones 3D pesadas ni recursos nuevos.
- Pruebas de regresión: `scripts/lobby-garage-lift-smoke.mjs` y `scripts/lobby-overview-platform-wings-smoke.mjs`. Confirmar Build + Deploy de GitHub Pages para el mismo SHA.

## Corrección ortográfica — DEV 1.2.207 (15/10/2026)
- Una captura real del lobby reveló que el óvalo del pozo anterior estaba desplazado, deformado y no coincidía con la plataforma.
- `platformArtworkBounds()` en `LobbyGarageLiftTransition.js` examina una vez por imagen una miniatura alfa de 128 × 128 de la plataforma. `garageLiftFootprint()` convierte la silueta visible a coordenadas de pantalla respetando `object-fit: contain`. Si la lectura alfa no está disponible se usa un rectángulo de seguridad centrado.
- El hueco ahora se coloca sobre la **misma huella visual** de la plataforma en cualquier resolución; sin desplazamientos artificiales en Y ni aros inclinados.
- Plataforma, coche y maestría usan animaciones independientes de escala (plataforma 0.88, coche 0.86), brillo y opacidad con puntos de transición; el aro metálico permanece fijo a cota de suelo (z-index 2) y tapa su perímetro mientras desaparecen. Fondo del pozo a z-index 0.
- Se mantienen los tiempos `down:1040`, `up:1120`, las rutas garaje↔lobby, el retorno tras selección y la transición aparte lobby→carrera.
- Pruebas `scripts/lobby-garage-lift-smoke.mjs`: mapping con alfa, fallback de CSS, sin traslación Y, nueva máscara perimetral, cleanup, requisitos originales. Las demás pruebas visuales aceptan versiones DEV 1.2.x sin depender de un parche fijo.
- No se publica Android ni se toca `dev-first-update`. Confirmación final requiere Build + Deploy verdes para el HEAD exacto de `main`.
