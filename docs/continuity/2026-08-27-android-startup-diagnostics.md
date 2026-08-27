# Continuidad — 2026-08-27 — Arranque Android / pantalla azul

## Estado
EN OPTIMIZACIÓN ACTIVA.

Se ha pasado de arranques muy variables de ~15–20 s e incluso bloqueos de más de 100 s a un arranque físico observado de ~6 s tras corregir Service Worker, sincronización del overlay y retirar la intro MP4 de la ruta crítica. El siguiente objetivo es reducir esos ~6 s mediante code splitting de escenas.

## Síntoma real inicial
En Android el wrapper instalado podía tardar alrededor de 15 segundos en mostrar el juego. Antes de entrar, el usuario veía durante gran parte de ese tiempo un fondo azul oscuro, y en intentos anteriores incluso podía quedarse bloqueado sin terminar de cargar.

Esto se trata como problema de arranque/rendimiento, no como simple problema estético.

## Hallazgos confirmados

### Service Worker
El SW anterior intentaba red antes de caché para recursos del juego y además podía forzar cambio de controlador/recarga durante bootstrap. Se corrigió para:
- servir inmediatamente archivos ya cacheados;
- refrescarlos en segundo plano;
- no hacer `clients.claim()` ni `skipWaiting()` agresivo durante una sesión;
- no depender de red para recursos ya disponibles localmente.

Commit: `4fa63b85e76fe1b35e21a1b452f1e5dd17dec945`.

### Wrapper Android
La pantalla de instalación mostrada por el usuario indica un paquete TDR2 de solo 146.6 KB. El repositorio no contiene un árbol `android/` nativo. Esto es compatible con un wrapper/TWA muy ligero alrededor de la app web, no con el juego y sus assets empaquetados dentro del APK.

Consecuencia: el icono que muestra Android al instalar pertenece al wrapper/APK y no se sustituye simplemente cambiando el icono del `manifest.webmanifest`. El wrapper deberá regenerarse con el icono correcto.

### Build web
GitHub Pages publica correctamente el resultado de Vite (`dist`). El workflow ejecuta `npm run build -- --base=/TopdownCraftrace/` y sube `dist`; se descartó que Pages sirviera directamente `src/main.js`.

### Bundle inicial antiguo
Antes del code splitting, el build generaba un bundle JS inicial de aproximadamente 1.76–1.77 MB sin comprimir. `src/game/game.js` importaba estáticamente Phaser y todas las escenas principales antes de crear el primer juego:
- Boot
- Menu
- Season
- Race
- Garage
- Settings
- Stats
- GarageDetail
- AdminHub
- UpgradeWorkshop
- editores y herramientas de circuitos/entorno

Esto hacía entrar una parte enorme de la aplicación en el grafo inicial aunque el jugador solo necesitara Boot + Lobby.

### Pantalla azul
La pantalla de arranque HTML se ocultaba en cuanto aparecía el `<canvas>` de Phaser. Phaser crea el canvas antes de que `BootScene.preload()` termine; por tanto se quitaba la pantalla bonita demasiado pronto y el usuario veía `#0b1020` mientras aún se cargaban recursos.

Se corrigió para mantener la pantalla de arranque hasta que el lobby real haya terminado su `create()` y haya tenido dos frames para pintarse.

### Bloqueo a 100%
En una iteración, la pantalla de carga llegó a mostrar `CARGANDO RECURSOS · 100%` durante más de 120 s. La causa no era carga real: el overlay esperaba una señal `tdr:bootready` que el menú no emitía.

Se corrigió haciendo que la clase final del lobby emita `tdr:bootready` tras completar `create()` y dos frames de render.

Commit: `3fb6df334a7aea8678374ac68664ab6ad85b0612`.

## Instrumentación de arranque
Commit `ac5556b0ea51acdd097587b2a4497c113e9cac97`:
- pantalla HTML persistente hasta lobby listo;
- cronómetro visible desde el primer HTML;
- fases visibles de arranque;
- barra asociada al progreso real del loader de Phaser.

Esto permitió separar empíricamente:
- tiempo previo a Phaser / carga de motor;
- carga de recursos de Boot;
- construcción del lobby.

## Intro MP4 retirada de la ruta crítica
Primero se hizo no bloqueante en `fbb25f49b08e087462fb62c3cbb5264757b39995`.

Después, al observar arranques todavía variables de hasta ~20 s, se decidió retirarla por completo del arranque normal. La intro sigue en el proyecto y puede reutilizarse en primer inicio, Acerca de o eventos, pero abrir el juego ya no reproduce ni espera `intro.mp4`.

Commit: `d5bb9300659b287ea267be8fb8a864738fd69d69`.

Resultado físico observado inmediatamente después: ~6 s hasta lobby en Android.

Principio adoptado: una presentación decorativa nunca puede formar parte de la ruta crítica de entrada al juego.

## Code splitting / escenas lazy — 27/08
Commit: `d8da8b3540a2e5f2cf08e7a16cb41559a4c5e21e`.

`src/game/game.js` ya no importa estáticamente todas las escenas pesadas.

### Ruta crítica de inicio
El `Phaser.Game` arranca únicamente con:
- `BootScene`
- `MenuScene` final
- alias `MenuScene` → `menu`

El objetivo es mostrar el lobby con el mínimo grafo posible.

### Carga bajo demanda
Se instala un interceptor seguro sobre `ScenePlugin.start()` para destinos lazy. Si el jugador toca una pantalla antes de que haya terminado su precarga en segundo plano:
1. se importa el chunk correspondiente;
2. se registra la escena en `game.scene`;
3. se ejecuta la navegación solicitada.

Así el lobby sigue siendo interactivo durante el calentamiento progresivo y no existe una ventana en la que un botón deba fallar por escena ausente.

### Orden de warm-up después del lobby
Tras `tdr:bootready`, se espera brevemente para no competir con los primeros frames y se cargan de forma secuencial, cediendo tiempo entre chunks:
1. `GarageScene`
2. `upgrade-shop` / Fabricación
3. `SettingsScene`
4. `StatsScene`
5. `season`
6. `TrackGarageScene`
7. `race`
8. `GarageDetailScene`

La carrera instala `installExactRuntimeBeautyPass()` únicamente cuando se importa su chunk.

### Admin y herramientas
NO se precargan en una sesión normal:
- `AdminHubScene`
- `CarEditorScene`
- `TrackEditorScene`
- `TrackStudioScene`
- `EnvironmentBuilderScene`

Solo se descargan cuando una navegación los solicita explícitamente. Esto cumple la decisión de que Admin no tenga coste de arranque ni de warm-up para un jugador normal.

### Build
El workflow `Deploy GitHub Pages` asociado al commit lazy completó `npm run build` correctamente el 27/08/2026. La validación física en Android queda pendiente tras despliegue.

## Prueba siguiente
En Android:
1. cerrar completamente la app;
2. abrir desde icono;
3. medir tiempo hasta lobby visible;
4. una vez dentro, probar inmediatamente Garaje, Fabricación y Jugar para validar tanto warm-up como carga bajo demanda;
5. comprobar después Pase de Temporada, Estadísticas y selector de circuitos;
6. Admin se prueba aparte y solo al activarlo.

Objetivo razonable inmediato: bajar desde ~6 s hacia 2–3 s sin introducir fallos de navegación.
