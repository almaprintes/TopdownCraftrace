# Top Down RACE — estabilización móvil nocturna — 2026-08-30

## Objetivo

Pasada autónoma de estabilización sobre `main` centrada en:

- recuperar fluidez y estabilidad en iPhone/Safari;
- no degradar Android;
- eliminar trabajo innecesario del hilo principal;
- reducir presión de memoria WebGL/GPU;
- corregir regresiones de gameplay introducidas por capas de rendimiento;
- hacer preview y Pages reproducibles;
- añadir guardas automáticas para impedir que reaparezcan varios fallos.

## Punto de restauración

Antes de tocar producción se creó:

`backup/pre-stabilization-2026-08-30`

Apunta exactamente al commit:

`6e03cf73539a0acbde2bbcc3a9a1f42f2ff1b570`

Ese punto incluye la auditoría pero ninguno de los cambios de estabilización posteriores. Si la validación física descubre una regresión grave, es el rollback de referencia.

## Cambios aplicados

### 1. Lazy loading móvil real

`game.js` ya no calienta automáticamente Garage, Workshop, Settings, Stats, Season, selector de circuitos y carrera poco después de pintar el lobby.

En móvil no existe warmup automático. Las escenas se importan únicamente al necesitarlas.

En escritorio el calentamiento restante:

- usa tiempo idle;
- se cancela con la primera interacción;
- nunca precarga `race`.

Motivo: el warmup anterior podía parsear/evaluar bundles grandes justo mientras el usuario manipulaba el selector de modos y aumentaba simultáneamente presión de CPU/memoria.

### 2. Selector de modos

Las cinco tarjetas WEBP se cargan durante `MenuScene.preload()`.

Se eliminó el `this.load.start()` iniciado desde el propio carrusel durante un swipe/cambio de tarjeta.

El selector deja de mezclar gestos/tweens con arranques dinámicos del Phaser Loader.

### 3. Regresión crítica iOS de cronometraje/fantasma

Se eliminó una optimización de `RaceGraphicsPresetScene` que en todos los iPhone hacía:

- `_recordGhostSample = () => {}`;
- `_completedLapCheck = () => {}`;
- vaciado de `_ghostSamples`.

Una capa gráfica no vuelve a tener autoridad para apagar lógica de gameplay.

### 4. Graphics preset fuera del hot path

`RaceGraphicsPresetScene` ya no recorre todas las celdas ni todos los children en cada frame para volver a ocultar overlays/partículas.

La política se aplica en `create()` y en dos pasadas cortas de asentamiento. Beauty Layer conserva siempre `cullRadiusCells=0`.

### 5. DOM de controles

`src/main.js` dejó de ejecutar un rAF perpetuo para decorar GAS/FRENO/joystick.

Ahora:

- la capa visual se actualiza a 20 Hz;
- los controles Phaser legacy se ocultan una sola vez por instancia de carrera;
- el modo de dirección se cachea y no se parsea `localStorage` cada frame;
- se eliminó el segundo registro del Service Worker;
- se eliminó un segundo sistema global de overlay de error.

La lógica táctil real de los controles no se ha reducido a 20 Hz: únicamente la representación DOM decorativa.

### 6. Sincronización de textos Phaser -> DOM

`htmlTextRuntime.js` era uno de los hot paths globales más caros encontrados.

Antes, por cada frame y por cada Phaser.Text convertido a HTML:

- volvía a obtener `getBoundingClientRect()` del canvas/host;
- caminaba jerarquías creando Sets;
- reescribía numerosos estilos;
- clonaba la colección de entradas;
- no restauraba por completo los prototype/factory patches al destruir el juego.

Ahora:

- métricas canvas/host se calculan una vez por pasada;
- móvil sincroniza a ~30 Hz, escritorio ~60 Hz;
- estilos se reescriben solo si cambia su firma;
- no se crean Sets por texto;
- no se clona el Map completo por frame;
- los monkey-patches se restauran al destruir el juego.

### 7. HUD de carrera

El HUD DOM cachea al crearse las referencias a vuelta, sector, tiempos, velocidad, posición, barras de sector y barras de velocidad.

Ya no ejecuta múltiples `querySelector/querySelectorAll` en cada actualización de HUD.

La telemetría de vuelta limpia se muestrea a 10 Hz en vez de consultar `_isOnTrack()` en cada frame.

### 8. Estadísticas y localStorage durante carrera

Se separó:

- `loadPlayerStats()` = lectura UI que puede combinar historial de tiempos;
- `loadPlayerStatsPersisted()` = lectura ligera de distancia/carreras/mastery sin escanear historiales TT.

Las escrituras de stats ya no llaman `overlayTiming()`.

`RaceMileageStatsScene`:

- no reconstruye el índice completo de contrarreloj durante la carrera;
- elimina el duplicado de registro de vueltas en playerStats;
- pasa de flush cada 3,5 s a 12 s + flush seguro al salir.

Mastery de carrera y badge del lobby usan la lectura ligera.

### 9. Beauty Layers y memoria móvil

Al salir de una carrera en móvil se eliminan explícitamente las texturas Beauty de esa pista del Texture Manager, una vez destruidos sus objetos.

Esto impide que visitar varios circuitos vaya acumulando mundos completos descomprimidos en GPU durante toda la sesión.

### 10. Rescue/Safe Mode de iOS

El diagnóstico ahora detecta:

- reload inesperado;
- `webglcontextlost`.

Si ocurre en iOS arma `tdr2:autoIosSafeModeUntil` durante seis horas para que la próxima sesión arranque protegida.

Una sesión limpia de al menos un minuto puede retirar el fallback automático.

En safe mode:

- objetivo sigue siendo 30 FPS;
- no se cargan los siete PNG del semáforo, se usa cuenta atrás ligera;
- no se cargan las Beauty Layers de mundo completo;
- se permite el terreno legacy/repetible de menor presión de memoria;
- al salir se limpian también las texturas de carrera previstas por el modo seguro.

El safe mode dejó de reemplazar/restaurar métodos Phaser por frame para intentar frenar el HUD.

### 11. Reloj de iOS

Se revisó la investigación real del 28/08 antes de cerrar esta pasada.

Aquella sesión midió huecos patológicos en `requestAnimationFrame` de Safari/WebKit, incluidos 100–200+ ms. El baseline que quedó activo posteriormente era el driver `setTimeout` soportado por Phaser, conservando Arcade Physics fixed-step y `desynchronized:true`.

Por tanto esta estabilización conserva ese baseline en iOS:

`forceSetTimeOut = iosDevice && !forceRafLoop()`

Android permanece en rAF normal.

Existe escape hatch para A/B sin nuevo commit:

`localStorage.setItem('tdr2:forceRafLoop','1')`

Borrando esa clave vuelve el baseline iOS de setTimeout.

### 12. Viewport/orientación

Se eliminaron dos autoridades compitiendo entre sí.

`index.html` normaliza VisualViewport/resize/orientation y emite `tdr:viewportchange`.

`orientationViewportSettle.js` escucha esa señal, Pageshow y retorno de visibilidad, con menos pasadas de asentamiento.

Se eliminó el `dispatchEvent(new Event('resize'))` sintético que podía crear cascadas de resize.

### 13. PWA / caché

Hay un único registro del Service Worker: `index.html`.

`sw.js` pasa a versión `tdr2-v21`.

Política:

- navegación/HTML: network-first online, fallback a shell válida offline;
- chunks/assets estáticos: cache-first + refresh en background;
- nunca `skipWaiting`/`clients.claim` en mitad de una partida.

Así una apertura online normal deja de arrancar voluntariamente con el HTML del despliegue anterior.

### 14. Preview = producción

`build-pages.yml` ya no copia `.github/source-index.html` encima del index real.

El viejo `.github/source-index.html` fue eliminado.

Preview y Pages compilan la misma shell.

### 15. Basura eliminada

- viejo `carFactoryModal` y su CSS retirados de `index.html`;
- `src/game/dev/rafCadenceDiagnostic.js` eliminado al no tener consumidor;
- `.github/source-index.html` eliminado.

No se borró la torre de `Race*Scene` por nombre: muchas capas siguen conectadas por imports/herencia. Esa limpieza exige primero una migración arquitectónica y no se arriesga en una noche de estabilización.

## Red de seguridad añadida

Nuevo script:

`scripts/stability-smoke.mjs`

`npm run build` ejecuta antes `npm run check:stability`.

Actualmente falla el build si reaparecen, entre otras cosas:

- anulación de cronometraje/fantasma en iOS;
- warmup automático móvil o warmup de Race;
- monkey-patching por frame del safe mode;
- Beauty Layer completa dentro de safe mode;
- Loader iniciado desde el carrusel;
- doble registro de Service Worker;
- resize sintético recursivo;
- modal Car Factory muerto;
- escrituras de stats que vuelvan a escanear todo TT;
- sincronizador HTML que vuelva a clonar la colección cada frame;
- pérdida del cleanup de prototype patches;
- preview con un index diferente del de producción;
- cambio accidental del baseline de scheduling iOS.

## Lo que NO se ha reescrito esta noche

La cadena de herencia de la carrera sigue siendo deuda técnica seria. Convertir decenas de wrappers `Race*Scene` a sistemas por composición es el siguiente trabajo estructural, pero hacerlo ahora habría aumentado mucho el riesgo de entregar una build imposible de validar físicamente antes de mañana.

Tampoco se han regenerado todas las Beauty Layers a resolución móvil. La mitigación inmediata es:

- no acumular pistas;
- safe mode sin Beauty completa.

Una familia de bakes móviles a 50–65 % de resolución lineal será el siguiente escalón si las pruebas aún muestran presión de memoria.

## Protocolo de validación física de mañana

### Antes de medir

1. Esperar a que GitHub Pages/preview del último commit estén verdes.
2. En iPhone cerrar completamente la pestaña/PWA/Safari y volver a abrir una vez, para salir del controlador SW anterior.
3. No borrar progreso salvo que exista un problema concreto: las migraciones de esta pasada no requieren reset.

### iPhone — prioridad máxima

1. Arranque frío -> lobby. Comprobar que no hay congelación.
2. Abrir/cerrar Configuración varias veces.
3. Abrir selector de modos y hacer 15–20 swipes rápidos izquierda/derecha antes de seleccionar.
4. Entrar/salir de selector de circuitos dos veces.
5. Contrarreloj Atlántico: mínimo 7–10 vueltas seguidas. Observar fluidez en vueltas 1, 3, 5 y 8+.
6. Repetir con Karting Tenerife.
7. Probar una pista Beauty grande si está desbloqueada para elevar presión de memoria.
8. Volver a lobby, entrar a otra pista y repetir: esta prueba verifica que las texturas de la anterior se liberan.
9. Girar portrait -> landscape -> portrait -> landscape y verificar viewport/HUD/controles.
10. Mantener GAS y FRENO; comprobar que no aparece selección/callout de texto.
11. Probar freno de mano izquierda/derecha.
12. Probar Fantasma y confirmar que guarda/reproduce; el cronómetro debe registrar vueltas normalmente.
13. Probar Supervivencia y, si procede, Duelo/Área de pruebas.

### Android

1. Repetir arranque, selector de modos, circuitos y una carrera larga.
2. Comprobar que seleccionar modo/circuito no devuelve al lobby.
3. Confirmar controles táctiles, HUD, tiempos, fantasma y resultados.
4. Hacer al menos un ciclo pista A -> lobby -> pista B para validar limpieza sin regresión.

## Qué registrar si aún falla iOS

Si aparece un fallo real, anotar únicamente:

- pantalla/escena;
- pista y modo;
- aproximadamente qué vuelta/minuto;
- si fue tirón, congelación, reload o cierre;
- si en el siguiente arranque aparece el aviso de diagnóstico/safe mode;
- captura o vídeo si es posible.

No volver a introducir profilers invasivos por frame. La investigación previa demostró que pueden contaminar WebKit.

## Rollback

Referencia exacta previa a esta intervención:

- branch: `backup/pre-stabilization-2026-08-30`
- commit: `6e03cf73539a0acbde2bbcc3a9a1f42f2ff1b570`

La restauración debe hacerse desde Git, nunca reconstruyendo cambios de memoria.
