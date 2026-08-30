# Top Down RACE — auditoría completa de repositorio

Fecha: 2026-08-30

Estado auditado: `main` con el modelo experimental de freno de mano tipo bicicleta activo.

## Resumen ejecutivo

El juego no tiene un único problema de rendimiento en iPhone. Tiene varios costes pequeños y medianos que se acumulan en el hilo principal, más un riesgo serio de memoria GPU por las Beauty Layers. La prioridad no debería ser reducir la calidad visual a ciegas, sino eliminar trabajo repetido, sincronizaciones innecesarias, cargas en segundo plano durante la navegación y retención de texturas.

Los hallazgos de mayor impacto son:

1. `scheduleSceneWarmup()` contradice el lazy loading: 250 ms después de `tdr:bootready` empieza a importar/evaluar en cadena casi todas las escenas de usuario, incluida `race`. En iPhone esto puede coincidir exactamente con la pantalla de selección de modo y crear un long task o presión de memoria.
2. `src/main.js` mantiene un `requestAnimationFrame` permanente para los controles DOM. Cada frame busca la escena `race`, comprueba orientación, oculta de nuevo objetos Phaser ya ocultos, cambia estilos/clases CSS y, en determinadas condiciones, vuelve a parsear `localStorage`. Ese bucle existe incluso fuera de carrera.
3. El motor se fuerza a `setTimeout` en todos los iPhone (`forceSetTimeOut=true`) pese a que el valor por defecto de Phaser es `false` y `requestAnimationFrame` está sincronizado con el repaint del navegador. Debe medirse A/B; no hay evidencia en el repo de que el experimento con `setTimeout` haya ganado.
4. `RaceGraphicsPresetScene._enforceGraphicsPreset()` recorre todas las celdas de pista para esconder overlays y/o todos los children para buscar partículas en cada frame. Es trabajo de configuración convertido en trabajo por frame.
5. El safe mode de iOS (`RaceSafeModeRuntimeScene`) crea un array y funciones de restauración y sustituye/restaura métodos de objetos Phaser cada frame para saltarse actualizaciones de HUD. Es precisamente el tipo de churn que un modo seguro debería evitar.
6. `playerStats.js` hace un escaneo completo de `localStorage` y parsea todos los historiales TT dentro de `loadPlayerStats()`. Durante carrera, `RaceMileageStatsScene` hace flush cada 3.5 s y llega a provocar varios de esos escaneos síncronos. Esto puede generar tirones periódicos muy claros.
7. Las Beauty Layers se cargan completas como cuatro texturas de mundo. Algunos circuitos equivalen a más de 100 MB de RGBA8 una vez subidos a WebGL; además, en modo normal las texturas no se eliminan del Texture Manager al abandonar el circuito. Visitar varias pistas puede acumular memoria GPU. Este es un candidato serio a cuelgues/reloads de Safari.
8. Hay dos gestores distintos del viewport/orientación: uno embebido en `index.html` y otro en `orientationViewportSettle.js`, con listeners solapados y criterios distintos para elegir las dimensiones. El primero incluso redispara manualmente `resize`. Hay que tener una sola autoridad.
9. Hay dos registros del Service Worker: uno en `index.html` y otro en `src/main.js`. Además, `main.js` envía `SKIP_WAITING`, pero `sw.js` declara expresamente que ignora esos mensajes. El código de actualización se contradice a sí mismo.
10. El workflow `build-pages.yml` sustituye el `index.html` real por `.github/source-index.html`, que está claramente desfasado. Por tanto preview y GitHub Pages pueden estar ejecutando shells distintos y producir bugs diferentes. Esto debe eliminarse antes de depurar iPhone.
11. La escena de carrera es una cadena de decenas de subclases `Race*Scene` que llaman `super.update()` y `super.create()`. Code search devuelve decenas de wrappers activos. El orden de efectos está implícito en la herencia, resulta muy difícil conocer qué código corre cada frame y facilita regresiones como las vistas con HUD, freno de mano y rendimiento.
12. No hay `test`, `lint` ni validación estática en `package.json`. Con la arquitectura actual, una regresión solo se detecta jugando manualmente.

## Fase 1 — arquitectura y código sobrante

### P0 — dejar de construir la carrera como una torre de parches

La ruta actual comienza, entre otras capas, así:

`RaceHandbrakeFrontAxleFixScene -> RaceCleanLapScene -> RaceLapBreakdownProfilerScene -> RaceHudPerformanceScene -> RaceMobilePerformanceScene -> RaceKerbHapticsScene -> RaceMasteryRoofScene -> RaceMileageStatsScene -> ...`

No es solo un problema de orden. Cada wrapper puede aportar `create`, `update`, listeners, timers y side effects. Un cambio aparentemente local puede llamar por dispatch dinámico a un método redefinido varias capas por encima.

Objetivo recomendado: una `RaceScene` de composición con sistemas explícitos:

- `RacePhysicsSystem`
- `RaceInputSystem`
- `RaceAISystem`
- `RaceHudSystem`
- `RaceVfxSystem`
- `RaceAudioSystem`
- `RaceStatsSystem`
- `RacePerformancePolicy`

Cada sistema debería tener, como máximo, `create/update/destroy` y una frecuencia documentada. Así se podrá ver qué corre a 60 Hz, 20 Hz, 10 Hz o solo por evento.

### Código que se puede quitar ya o sacar de producción

- Bloque `carFactoryModal` + CSS de `index.html`: las búsquedas del repositorio no encuentran referencias a `carFactoryModal` ni `cf-input` fuera del propio `index.html`. Es DOM muerto cargado en cada arranque.
- Primer overlay global de errores de `src/main.js`: duplica el manejador `showFatal()` del mismo archivo y además `runtimeCrashDiagnostics.js` instala un tercer sistema de captura. En producción, un error puede provocar múltiples interfaces de error a la vez. Mantener un único diagnóstico.
- Segundo registro del SW en `src/main.js`: centralizar el registro en un módulo y dejar una única política de actualización.
- `src/game/dev/rafCadenceDiagnostic.js`: code search no encuentra consumidores externos. Mantenerlo fuera del build de producción o eliminarlo si ya no se usa.
- `src/game/dev/CarFactoryScene.js`: no aparece registrado en `game.js`; verificar la última dependencia del Admin Hub y, si no existe, retirar del árbol de producción.

### Código que NO borraría aún

No eliminar archivos `Race*Scene` por nombre aunque parezcan antiguos. Muchos están unidos por la cadena de herencia aunque no aparezcan en `game.js`. Primero hay que reemplazar la cadena por sistemas y después ejecutar una auditoría de imports para borrar huérfanos de forma demostrable.

## Fase 2 — arranque, navegación y cuelgue en selección de modo

### Warmup que derrota al lazy loading

`game.js` define escenas con `import()` dinámico, lo cual es correcto. Pero `scheduleSceneWarmup()` empieza 250 ms después de `tdr:bootready` y carga una tras otra Garage, Workshop, Settings, Stats, Season, TrackGarage, Race y GarageDetail con solo 70 ms entre ellas.

Eso hace que Safari tenga que descargar/parsear/evaluar chunks justo cuando el usuario ya está interactuando con el lobby. Es especialmente sospechoso para el cuelgue visto en la selección de modo.

Cambio recomendado:

- iPhone/iPad: **cero warmup automático** durante los primeros segundos.
- Escritorio: solo `requestIdleCallback`/idle real y abortar al primer input del usuario.
- Precargar únicamente la siguiente escena probable cuando el usuario entra en un flujo concreto.
- Nunca calentar `race` mientras se está manipulando un modal de menú.

### Selector de modo

`MenuGameModeSnapScene` crea y destruye los objetos de las tarjetas con `removeAll(true)` en cada cambio y puede iniciar el Loader de Phaser desde `_drawModeSnapCards()`. Los WebP son pequeños, por lo que no parecen ser el problema principal, pero el patrón puede simplificarse:

- precargar las 5 tarjetas una sola vez en el preload del menú;
- crear tres slots de tarjeta una vez;
- en cada swipe cambiar textura/posición/alfa, no destruir y reconstruir el árbol;
- bloquear nuevos gestos hasta completar transición sin depender de `pointerout` como final implícito.

### Preview y producción no son iguales

`build-pages.yml` hace `cp .github/source-index.html index.html` antes del build. Ese source-index no contiene el arranque/viewport/SW moderno del `index.html` real. `pages.yml`, en cambio, sí compila el index real.

Recomendación: una sola fuente `index.html`. Si preview necesita diferencias, usar variables Vite, no un HTML paralelo.

## Fase 3 — iPhone / frame pacing

### A/B inmediato: dejar de forzar `setTimeout`

Actualmente:

`const forceSetTimeOut=iosDevice;`

Eso fuerza el game loop de Phaser a `setTimeout` en todos los dispositivos iOS. Phaser documenta `forceSetTimeOut` con default `false`; rAF se sincroniza con el repaint del navegador. MDN también recomienda rAF para animación porque permite al navegador coordinar el trabajo con el refresco.

No afirmo que rAF vaya a resolver todo: hay comentarios en el repo que indican que `setTimeout` nació de una investigación anterior. Lo correcto es A/B reproducible:

- variante A: rAF normal;
- variante B: `forceSetTimeOut=true`;
- mismas 5 vueltas, mismo dispositivo, misma pista;
- registrar media, p95/p99 de delta y número de frames >25/33/50 ms.

Si A gana, eliminar el workaround global y dejar `setTimeout` únicamente como fallback activable por diagnóstico.

### El loop DOM de controles debe desaparecer

`src/main.js` ejecuta un rAF perpetuo. Dentro del tick:

- busca `race` en SceneManager;
- consulta orientación;
- toca `display`, variables CSS y clases;
- vuelve a ocultar visuales legacy Phaser;
- puede leer y parsear ajustes de localStorage.

Cambiar a un sistema event-driven:

- instalar los controles al entrar en carrera y retirarlos al salir;
- actualizar visuales solo cuando cambia throttle/brake/steer o como máximo 20–30 Hz;
- cachear el modo de dirección, no leer localStorage desde un frame loop;
- ocultar los controles legacy una vez en `create`, no 60 veces por segundo.

### `RaceGraphicsPresetScene`: configuración por frame

`_enforceGraphicsPreset()` recorre `track.gfxByCell.values()` cada frame cuando `_forceNoOverlay`, y recorre `this.children.list` cada frame cuando se desactivan partículas.

Debe ejecutarse:

- al crear pista;
- al crear una nueva celda/partícula;
- al cambiar de preset.

Nunca como barrido global a 60 Hz.

### Safe Mode reescribe métodos cada frame

`RaceSafeModeRuntimeScene.update()` crea `restore=[]`, sustituye varios métodos (`setText`, `setPosition`) y crea closures para restaurarlos en cada frame que no toca refrescar HUD.

Sustituir por una variable simple:

`this._hudUpdateDue = now >= nextHudAt`

Y que HUD/minimapa consulten esa bandera antes de actualizar. Cero monkey-patching en el hot path.

### Safe Mode basado en capacidad, no en tamaño de pantalla

`isLegacyIOSPhone()` solo activa automáticamente safe mode para teléfonos con dimensión máxima <=844 o con flag manual. Un iPhone moderno puede sufrir presión térmica, memoria o un long task y nunca entrar en safe mode.

Usar política adaptativa:

- si 2 ventanas consecutivas de 1–2 s superan p95 de 33/40 ms, bajar VFX/HUD;
- si hay `webglcontextlost` o reload inesperado, siguiente sesión arranca en safe mode;
- tras una sesión estable se puede volver a subir gradualmente;
- guardar el motivo del downgrade, no solo un booleano.

`runtimeCrashDiagnostics.js` ya recopila el contexto necesario; falta conectarlo con la política de rendimiento.

## Fase 4 — memoria GPU y assets

### Beauty Layers: principal riesgo de memoria

Los WebP pueden ser pequeños en disco, pero WebGL trabaja con texturas descomprimidas. RGBA/UNSIGNED_BYTE representa 4 bytes por texel.

Ejemplos del catálogo actual:

- `forest-endurance`: 7400 × 4700 = ~34.78 Mpx = ~139 MB solo para RGBA8 de terreno.
- `chicane-vale`: 6700 × 4500 = ~30.15 Mpx = ~121 MB.
- `f1-shanghai`: 5200 × 4000 = ~20.8 Mpx = ~83 MB.
- `karting-tenerife`: 2813 × 2602 = ~7.32 Mpx = ~29 MB.

No incluyo aquí coche, UI, render targets, máscaras, buffers ni posibles copias temporales de decodificación.

Además `_destroyTrackBeautyLayer()` destruye los `Image`, pero no quita las texturas del Texture Manager en el modo normal. Por tanto las texturas de circuitos visitados pueden permanecer residentes durante toda la sesión.

Plan:

1. En móvil, al salir de una carrera, retirar las texturas Beauty de la pista anterior (`textures.remove`) después de destruir los objetos.
2. Mantener como máximo un LRU de 1 pista en móvil.
3. Generar variante `mobile` a 50–65 % de resolución lineal. 50 % por eje reduce texels/memoria aproximadamente 75 %.
4. Para pistas grandes, cargar tiles según cercanía/ventana y liberar los lejanos; dividir en 4 tiles no ahorra memoria si siempre se cargan los 4.
5. Añadir presupuesto VRAM estimado por pista al catálogo generado y rechazar builds que superen un límite móvil.

### PBR

El piloto PBR de Atlántico está aislado y se salta en low/safe mode. Bien. Aun así, en iPhone yo no activaría normal maps hasta tener resuelto presupuesto de textura y frame pacing; no es el cuello que merece prioridad ahora.

## Fase 5 — persistencia y tirones periódicos

`loadPlayerStats()` llama a `overlayTiming()`, y `overlayTiming()` llama a `readTimeTrialIndex()`. Esa función recorre **todo `localStorage`**, busca todas las claves `tdr2:ttHist:*`, parsea cada historial y reconstruye el índice de tiempos.

`RaceMileageStatsScene` hace flush de distancia cada 3500 ms. En el flush llama a `loadPlayerStats()` y después a `addCarDistance()`. Esta última termina en `savePlayerStats()`, que vuelve a llamar `overlayTiming()`.

Resultado: durante una carrera pueden producirse varios escaneos/parses síncronos de historiales cada 3.5 segundos.

Corregir así:

- `savePlayerStats()` debe guardar y devolver solo estadísticas persistidas; no reconstruir timing.
- `addCarDistance()` debe usar exclusivamente el store de distancia.
- `overlayTiming()` solo en la pantalla de estadísticas o al pedir explícitamente datos combinados.
- mantener un índice TT incremental cuando se completa una vuelta, en vez de reconstruirlo escaneando storage.
- flush de kilometraje al completar vuelta / pausar / salir, con un respaldo temporal de 10–15 s, no cada 3.5 s.

Este cambio puede eliminar microparones periódicos incluso en dispositivos potentes.

## Fase 6 — HUD / DOM

`RaceLapBreakdownProfilerScene` ya ha destruido muchos diagnósticos antiguos, lo cual es bueno, pero el HUD nuevo sigue haciendo múltiples `querySelector` y `querySelectorAll` cada 80 ms.

Guardar referencias una vez al crear el HUD:

- lap
- sector
- last
- best
- delta
- speed
- clock
- pos
- arrays de barras

Luego actualizar solo los nodos cuyo valor haya cambiado. Evitar `innerHTML` para posición; usar `textContent` + nodos preparados.

El nombre `RaceLapBreakdownProfilerScene` ya no describe lo que hace: ahora es básicamente el HUD shipping. Renombrarlo al consolidar arquitectura.

## Fase 7 — Service Worker y caché

Problemas:

- `index.html` registra `sw.js` antes del módulo.
- `src/main.js` lo registra otra vez tras `load`.
- `src/main.js` envía `SKIP_WAITING` y espera `controllerchange`.
- `sw.js` dice explícitamente que ignora `SKIP_WAITING` y no hace `clients.claim()`.
- el shell usa cache-first + refresh-in-background, así que una beta puede arrancar intencionadamente con el código anterior y actualizar para la próxima apertura.

Esto explica por qué las pruebas de física pueden parecer cacheadas incluso después de publicar un commit.

Recomendación:

- un solo registro;
- política `beta`: network-first/revalidate para `index.html`, JS y JSON de tuning; assets pesados cache-first;
- política `release`: cache-first estable con aviso de actualización;
- mostrar SHA/build-id visible en un panel de diagnóstico para saber exactamente qué versión está ejecutando el teléfono.

## Fase 8 — física

### Freno de mano

El modelo activo está en `RaceHandbrakeFrontAxleFixScene.js`, pero el contenido ya no es un “front axle fix”: es un bicycle model experimental. Renombrar cuando se consolide.

Puntos buenos actuales:

- misma ecuación para izquierda/derecha;
- separa heading de vector de velocidad;
- eje trasero tiene menor cornering force;
- invariant de seguridad impide que el freno de mano añada velocidad.

Pendientes:

- `absU = max(55, abs(u))` pierde el signo de marcha; revisar comportamiento de freno de mano en reversa.
- la recuperación al soltar es casi instantánea en fuerzas; `yawRate` solo se amortigua. Añadir recuperación progresiva de rear grip durante unas décimas.
- mover constantes a un perfil común (`handbrake.frontCornering`, `rearCorneringLocked`, `rearGripRecovery`, `yawDamping`) para poder homologar coches sin editar escena.
- no tocar coordenadas del coche para simular el pivote; continuar con fuerzas/velocidad angular.

### Resolver parámetros

El merge de `resolveCarParams()` ya fue corregido para incluir `baseSpec.steering/engine/tires`, lo cual arregló el caso Momentum. Conviene añadir tests de precedencia: profile < spec < profile override < car override.

El multiplicador global `FACTORY_MAX_FWD_MULT = 1.40` es una regla de balance oculta dentro del resolver. Documentarlo como parte de la especificación de velocidad o absorberlo en datos; los “magic multipliers” dificultan comparar stats mostradas con física real.

## Fase 9 — build y calidad

`package.json` solo tiene dev/build/preview y scripts de generación. No hay:

- test unitario;
- lint;
- typecheck;
- test de import graph;
- test de presupuesto de assets;
- smoke test del juego.

Mínimo recomendado:

1. `npm run check`: sintaxis/imports + lint.
2. tests para `resolveCarParams`, lap timing, game modes, standings, stats y surface detection.
3. smoke Playwright/Chromium para boot -> menú -> modo -> pista -> carrera. Safari real seguirá requiriendo dispositivo, pero evita muchas roturas antes de llegar al iPhone.
4. workflow CI separado de deploy. Ningún deploy debe ocurrir si build/check falla.
5. script de auditoría de imports para listar módulos no alcanzables desde `src/main.js` y scripts/workflows permitidos.

## Orden exacto recomendado de intervención

### P0 — antes de volver a perseguir microajustes

1. Unificar `index.html` de preview/Pages.
2. Desactivar `scheduleSceneWarmup()` en iOS/móvil.
3. Eliminar el rAF permanente de controles DOM.
4. Sacar `_enforceGraphicsPreset()` de cada frame.
5. Quitar los escaneos TT de `playerStats` del hot path de carrera.
6. Añadir liberación/LRU de Beauty textures en móvil.
7. Sustituir monkey-patching por frame del safe mode.

### P1 — A/B iPhone

8. rAF Phaser vs `forceSetTimeOut` con métricas p95/p99.
9. Una sola autoridad de viewport; eliminar listeners duplicados.
10. Política safe-mode adaptativa basada en frame gaps/crash, no modelo de pantalla.
11. HUD DOM con referencias cacheadas.

### P2 — deuda estructural

12. Desmontar la cadena de decenas de `Race*Scene` y pasar a sistemas.
13. Limpiar módulos muertos demostrados por import graph.
14. Renombrar clases/archivos cuyo nombre ya no corresponde a la función actual.
15. Añadir tests/CI.

## Prueba objetiva para iPhone

Antes y después de cada P0 medir la misma carrera:

- FPS medio no basta.
- registrar delta p50/p95/p99;
- frames >25 ms, >33 ms y >50 ms;
- mayor gap de frame;
- número de GameObjects;
- número de texturas y estimación de bytes;
- tiempo de JS por subsistema cuando se pueda;
- temperatura no es accesible desde Safari, por lo que usar degradación temporal (primer minuto vs quinto minuto) como señal de throttling.

El objetivo de “suave” debería ser: muy pocos frames >33 ms y ningún patrón periódico de jank, aunque la media sea 60 FPS.

## Conclusión

Hay margen real para mejorar mucho iPhone **antes de Capacitor**. Los cuellos más prometedores no están en la física base: están en trabajo repetido del main thread, persistencia síncrona, warmup agresivo, política de loop iOS y memoria de texturas.

La prioridad técnica es dejar de añadir capas de “fix scene” y empezar a quitar trabajo. El juego ya contiene varias optimizaciones correctas —proyección de centerline local, tire marks desactivados en iOS, PBR aislado, VFX de emergencia—, pero están rodeadas de parches que añaden su propio coste y hacen difícil medir el efecto real de cada uno.
