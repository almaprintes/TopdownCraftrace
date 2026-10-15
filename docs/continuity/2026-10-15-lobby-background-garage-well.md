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

## DEV 1.2.208 — oclusión progresiva real (15/10/2026)
- El propietario observó que DEV 1.2.207 seguía fundiendo el vehículo y la plataforma **uniformemente**, sin un descenso aparente.
- Solución: `anchoredPart()` construye una capa de máscara circular (`.tdr-lobby-garage-aperture`) de tamaño y posición exactos según `garageLiftFootprint()`. Los nodos clonados de plataforma, coche y maestría se renderizan por separado DENTRO de sendas aperturas fijas de suelo, con z-index 0/1/4.
- La máscara usa `clip-path: ellipse()` y se cierra de 51 % a 0 % **desde el perímetro hacia el centro**, con keyframes al 0/20/50/77/100 % del tiempo. La subida invierte la misma trayectoria geométrica; el aro metálico `tdr-lobby-garage-rim` sigue fijo en z-index 2.
- Se eliminó el fade global de alpha en los tres objetos: las capas de movimiento conservan `opacity: 1`, con oscurecimiento moderado (`filter: brightness`) y mínimo cambio de escala (1 → 0,96) mientras quedan ocultas desde los bordes. Esto produce una desaparición físicamente legible por la boca del pozo, no una imagen entera que se transparenta.
- Se respetan los tiempos exactos `GARAGE_LIFT_TIMING` 1040/1120 ms, la salida independiente a carrera y el comportamiento DEV-only. Las máscaras se liberan en `cleanup()` y en `shutdown`; no se introduce un canvas Phaser adicional.
- `scripts/lobby-garage-lift-smoke.mjs` valida matemáticamente la reducción monótona de la apertura y la inversión de subida, y comprueba los tres recortes y ausencia del fade anterior. Validar de nuevo en dispositivo real, además de Build + Deploy de GitHub Actions.

## DEV 1.2.209 — handoff de lobby a carrera con carga lenta (15/10/2026)

- Incidencia observada: en red móvil con poca cobertura, tras salir el coche del lobby hacia la derecha vuelve a aparecer en el centro antes de que entre la carrera.
- Causa verificada en `src/game/ui/LobbyRaceDeparture.js`: `next()` hacía `launched=true;stop();launch()`, y `stop()` restauraba la visibilidad de los objetos DOM originales. El `scene.start('race')` podía esperar a importar el módulo de escena `race` de forma asíncrona en `src/game/game.js`. Por tanto, el lobby repintaba el coche durante la espera.
- Reparación: prewarm del módulo `race` a partir de 180 ms de la animación y **espera de la promesa** tras completar el desplazamiento. No se llama a `stop()` antes de lanzar la carrera; solo el evento de cierre de la escena desencadena limpieza/restauración de los elementos del antiguo lobby (ya no visibles en pantalla).
- Durante la espera, el coche real sigue oculto y los clones ya están fuera de pantalla. Si la importación falla, se ejecuta `stop()` y se recupera el lobby para poder reintentar, evitando un bloqueo indefinido con el coche invisible.
- La carga de assets del circuito sigue estando a cargo de la escena de carrera; esta corrección cubre exclusivamente el intervalo entre fin de animación e inicio efectivo de la escena. No modifica la transición del ascensor, las físicas, las pantallas de carga ni Google Play.
- Pruebas: `scripts/lobby-race-departure-smoke.mjs` valida la espera al recurso `__tdrWarmRaceScene`, la ausencia de `launched=true;stop()` y la recuperación de fallo. Versionar DEV y comprobar Build + Deploy del HEAD exacto en `main`.

## DEV 1.2.210 — Gaussian radial suave (15/10/2026)

- Revisión tras la grabación del ascensor: el propietario descarta tanto el recorte circular duro (efecto iris) como la desaparición lineal vertical. Decisión final: **desvanecimiento radial lento, desde fuera hacia el centro, con un borde muy amplio y suave estilo desenfoque gaussiano**. La subida usa la inversión exacta.
- `LobbyGarageLiftTransition.js`: `garageLiftSoftRadius(progress,goingDown)` recorre 145%→−45% (y viceversa), con curva smoothstep; `animateSoftApertures()` anima una única variable de CSS compartida por plataforma, coche y maestría mediante `requestAnimationFrame`, con timeout de respaldo si se suspende el renderizado en segundo plano. Se mantiene la huella cenital calculada con alfa de la plataforma.
- `lobby-dom.css`: `mask-image` y `-webkit-mask-image` sobre la apertura fija, con **perfil de opacidad gaussiano aproximado por múltiples paradas de función de distribución normal**, de ancho ±40% alrededor del radio. No aplicar `filter: blur` a los coches: desenfocaría también sus detalles, no solamente el borde de la desaparición. No usa recortes circulares variables ni fundido global.
- Duraciones para un resultado pausado: `down:1850` y `up:1900` ms. Se mantienen profundidad del pozo, vista 90° y nivelado. El aro metálico del suelo permanece fijo.
- Bug adyacente corregido tras revisar la grabación: **en el descenso completo no limpiar y restaurar inmediatamente los sprites originales antes del cambio de escena**, pues provocaba un flash del coche y plataforma en el lobby durante la carga diferida de `GarageScene`. Las capas de descenso siguen invisibles hasta `shutdown`; hay recuperación tras 20 segundos si el cambio de escena fracasa.
- `scripts/lobby-garage-lift-smoke.mjs` valida la simetría de la máscara, sus radios extremos, el perfil gaussiano de CSS, soporte WebKit/iOS y la ausencia de clipping de radio duro. Probar visualmente en iPhone; las pruebas solo validan contratos de código.
- Sólo DEV en la rama `main`; no tocar publicación Android ni transición a carrera (arreglada por separado en DEV 1.2.209). Confirmar Build y Deploy verdes del HEAD.

## DEV 1.2.211 — sincronización de profundidad (15/10/2026)

- Nueva observación del propietario en iPhone: la **máscara gaussiana de DEV 1.2.210 es convincente**, pero el encogimiento y la desaparición no parecen corresponder al mismo descenso. Se solicita **acelerar ligeramente el encogimiento al principio**, como si la plataforma se alejara de la cámara antes de entrar en la sombra; luego el halo de oscuridad la cubre progresivamente.
- `src/game/ui/LobbyGarageLiftTransition.js`: `GARAGE_LIFT_DEPTH_STOPS` es el perfil único para plataforma, coche y maestría. Sus capas comparten **la misma** lista de keyframes de `scale`/`brightness` y duran lo mismo que la máscara radial. A 16% de avance la escala pasa a 0.961 con brillo 1; a 30%, escala 0.932 pero brillo aún 0.985; en el segundo tramo (48–100%) escala termina en 0.87 y brillo disminuye hasta 0.12, a la vez que la máscara difusa se estrecha.
- Las interpolaciones de keyframes usan `easing:'linear'` porque **los 7 puntos de control ya incorporan la curva**; el radio gaussiano sigue usando el `smoothstep` común sobre la misma duración. Esto evita que otra curva temporal añadida sobre los keyframes retrase/desincronice su escala respecto al halo.
- No se toca geometría, duración (1850ms bajada / 1900ms subida), z-index, fondo ni HTML de la plataforma; cámara ortográfica 90°. La aparición desde el garaje usa el **mismo perfil invertido**, con oscurecimiento previo y aumento progresivo hasta tamaño 1.
- `scripts/lobby-garage-lift-smoke.mjs`: verifica que más de la mitad de la reducción de escala ocurra en el primer 30% con brillo casi intacto; que los tres elementos compartan exactamente la curva y que no se reactive una segunda interpolación global de easing. Continúan las pruebas del gradiente gaussiano y de limpieza de recursos.
- Rama única `main`, solo DEV web. Comprobar Build/Deploy del SHA final antes de anunciar publicación. Validación visual final en dispositivo.
