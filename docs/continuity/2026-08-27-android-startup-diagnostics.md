# Continuidad — 2026-08-27 — Arranque Android / pantalla azul

## Síntoma real
En Android el wrapper instalado puede tardar alrededor de 15 segundos en mostrar el juego. Antes de entrar, el usuario veía durante gran parte de ese tiempo un fondo azul oscuro, y en intentos anteriores incluso podía quedarse bloqueado sin terminar de cargar.

Esto se trata como problema de arranque/rendimiento, no como simple problema estético.

## Hallazgos confirmados

### Service Worker
El SW anterior intentaba red antes de caché para recursos del juego y además podía forzar cambio de controlador/recarga durante bootstrap. Se corrigió previamente para:
- servir inmediatamente archivos ya cacheados;
- refrescarlos en segundo plano;
- no hacer `clients.claim()` ni `skipWaiting()` agresivo durante una sesión;
- no depender de red para recursos ya disponibles localmente.

Commit de esa corrección: `4fa63b85e76fe1b35e21a1b452f1e5dd17dec945`.

### Wrapper Android
La pantalla de instalación mostrada por el usuario indica un paquete TDR2 de solo 146.6 KB. El repositorio no contiene un árbol `android/` nativo. Esto es compatible con un wrapper/TWA muy ligero alrededor de la app web, no con el juego y sus assets empaquetados dentro del APK.

Consecuencia importante: el icono que muestra Android al instalar pertenece al wrapper/APK y no se sustituye simplemente cambiando el icono del `manifest.webmanifest` de la web. El wrapper deberá regenerarse con el icono correcto.

### Build web
GitHub Pages sí publica correctamente el resultado de Vite (`dist`). El workflow ejecuta `npm run build -- --base=/TopdownCraftrace/` y sube `dist`; se descartó que Pages estuviera sirviendo directamente `src/main.js` sin build.

### Bundle inicial
El build actual genera un bundle JS inicial de aproximadamente 1.76–1.77 MB sin comprimir. `src/game/game.js` importa estáticamente Phaser y todas las escenas principales antes de crear el primer juego:
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

Esto significa que una parte muy grande de la aplicación entra en el grafo inicial aunque el jugador solo necesite Boot + menú. Queda como candidato prioritario a code splitting/lazy scene loading tras medir el arranque real.

### Pantalla azul
La pantalla de arranque HTML se estaba ocultando en cuanto aparecía el `<canvas>` de Phaser. Phaser crea el canvas antes de que `BootScene.preload()` termine; por tanto se quitaba la pantalla bonita demasiado pronto y el usuario veía el `backgroundColor #0b1020` mientras aún se cargaban recursos del menú.

## Cambio 27/08 — Instrumentación real
Commit `ac5556b0ea51acdd097587b2a4497c113e9cac97`:
- la pantalla HTML permanece hasta que Boot declara el menú listo;
- ya no desaparece por la mera existencia del canvas;
- muestra cronómetro visible desde el primer HTML;
- fases visibles:
  - `CARGANDO MOTOR`
  - `CARGANDO RECURSOS · N%`
  - `RECURSOS LISTOS`
  - `INICIANDO JUEGO`
  - `ENTRANDO` / `PRESENTACIÓN`
  - `LISTO`
- la barra usa el progreso real del loader de Phaser durante Boot.

Esto permite localizar con una sola prueba física en qué tramo se consumen los segundos.

## Cambio 27/08 — Intro no bloqueante
Commit `fbb25f49b08e087462fb62c3cbb5264757b39995`:
- Boot emite marcas de fase/progreso;
- la intro MP4 deja de ser una dependencia del arranque;
- si la reproducción no ha comenzado realmente en 1.2 segundos, se abandona la intro y se entra al menú;
- se conserva un límite de seguridad de 7 s únicamente para una intro que sí está reproduciéndose.

Principio: una presentación decorativa nunca puede bloquear la entrada al juego.

## Siguiente prueba
En Android, abrir desde cero y observar la pantalla de arranque. Anotar/fotografiar qué texto/fase aparece cuando el contador acumula la mayor espera.

Interpretación:
- muchos segundos en `CARGANDO MOTOR` => descarga/parse/evaluación del bundle inicial; siguiente acción: separar Phaser y cargar escenas pesadas de forma perezosa.
- muchos segundos en `CARGANDO RECURSOS` => revisar tamaños/latencia de los assets concretos de Boot y precache útil.
- espera en `ENTRANDO/PRESENTACIÓN` => revisar intro, aunque ahora ya existe escape a 1.2 s si no comienza.

No aplicar refactor grande de escenas hasta obtener esta medición física.
