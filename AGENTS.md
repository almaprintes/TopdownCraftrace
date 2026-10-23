# REGLAS OBLIGATORIAS DE TRABAJO — TOP DOWN RACE

> **ROLLBACK 23/10/2026 · DEV 1.3.2 RESTAURADA:** El propietario reportó reproducción de fantasma antiguo atravesando el mapa y comportamiento extraño del menú durante la prueba de DEV 1.3.3. Se revirtió el cambio de recuperación directa de `ghostReplayRecovery.js`, su modificación de smoke y el marcador `index.html` a los blobs de la **DEV 1.3.2**, sin afectar Google Play ni eliminar datos. Build/Deploy revertido: [39913714444](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39913714444) `completed/success`. **No declarar solucionado el modo Fantasma:** 1.3.2 también falló en la prueba real. Hallazgo posterior: `RaceTop10ReplayScene` solo guarda el replay Top10 si la vuelta entra entre las 10 mejores del historial; tiempos de geometrías antiguas pueden bloquear grabaciones nuevas. La recuperación de local PB y la validez geométrica requieren rediseño y test real. El propietario propone reiniciar récords antiguos para Santa Cruz/Atlántico, pero **NO SE HA ELIMINADO NI RESTABLECIDO NINGÚN RÉCORD**. Cualquier reset debe ser explícito, por circuito/sentido, con archivo local previo y sin borrar récords ajenos/online.


> **DEV 1.3.3 (23/10/2026) — REPLAY LOCAL AÚN AUSENTE EN PRUEBA REAL 1.3.2:** El propietario reporta que el modo Fantasma sigue solicitando crear una vuelta. Se detectó que la recuperación 1.3.2 dependía del índice reconstruido de Race Control; ante historial truncado/incompleto, podía perder el enlace a un `tdr2:topReplay:<trackId>:...` que sí existía. 1.3.3 explora directamente las claves locales del circuito, valida muestras/tiempos/geométrica y recupera el PB exacto o la mejor vuelta actual **sin tocar récords antiguos ni requerir un anuncio**. El smoke añade el caso índice vacío + replay existente; Build/Deploy [39911763920](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39911763920) `completed/success` en SHA funcional `3d34ad98`. **La validación real sigue pendiente.** No confundir DEV web 1.3.3 con **Google Play 1.2.335 (vc10)**, que NO contiene esta corrección; las partidas del Android nativo y la DEV del navegador viven en almacenes distintos. Ver [docs/continuity/2026-10-23-dev-1-3-3-direct-ghost-replay-scan.md](docs/continuity/2026-10-23-dev-1-3-3-direct-ghost-replay-scan.md). Sin APK/AAB.


> **DEV 1.3.2 (22/10/2026) — FANTASMA PROPIO LOCAL + SANTA CRUZ:** Corregida la desconexión entre replays de Race Control (`tdr2:topReplay:...`) y el modo Fantasma (`tdr2:ghostPb:...` / `tdr2:ghostGeometry:...`). Se recuperan automáticamente las grabaciones locales compatibles y cada PB nuevo se guarda en el dispositivo sin tener que descargarlo desde Race Control ni mostrar anuncio. Los tiempos históricos, rankings, variantes normales/inversas y rivales online permanecen separados. Santa Cruz rechaza fantasmas antiguos fuera del trazado actual; Atlántico conserva la protección 70 %. Los sectores no escriben en una clave de replay ajena. Pruebas en CI, validación física pendiente. **Google Play 1.2.335/versionCode 10, confirmado por captura del propietario; sin APK/AAB ni publicación nueva.** Ver [continuidad DEV 1.3.2](docs/continuity/2026-10-22-dev-1-3-2-local-ghosts-santa-cruz.md).


> **DEV 1.3.1 ABIERTA · 22/10/2026:** El propietario ha confirmado que Top Down RACE ya está publicado y ha pedido iniciar una nueva serie DEV **1.3.1** exclusivamente sobre `main`. Versión visible de la PWA en `index.html`; no equivale a publicar otra APK/AAB ni cambiar `versionCode`. Corregido en `RaceScene.js` el reconocimiento de meta-paddock de Karting Américas normal/inverso por circuito físico, y en `trackReverseVariant.js` la normal de cruce inverso, con pruebas de regresión. Conservados trazado, colisiones, registros históricos, CP y condiciones de vuelta. La versión pública exacta en Play Console debe verificarse cuando vuelva a prepararse una publicación: referencias anteriores a v8 en esta documentación son históricas. Ver [docs/continuity/2026-10-22-dev-1-3-1-start-americas-inverse-paddock.md](docs/continuity/2026-10-22-dev-1-3-1-start-americas-inverse-paddock.md). **No generar ni publicar paquetes Android sin petición expresa.**

> **DEV 1.2.335 (21/10/2026) — FANTASMA ATLÁNTICO 70 %:** Se comprobó que los replays (X/Y absolutas) carecían de versión de trazado y podían pintar un fantasma del antiguo Atlántico 100 % sobre el nuevo 70 %, también en Inverso. `ghostTrackCompatibility.js` valida/huella carretera y distingue 70 % actual vs 100 % obsoleto; `RaceStaticGhostStatusScene` rechaza antiguos locales/online sin borrar tiempos, conserva PB y permite crear repetición nueva en clave separada sin exigir superar el récord previo. `RaceGhostModeScene` normaliza el tamaño mundo del sprite al cambiar textura; Race Control bloquea publicación de un replay obsoleto antes del anuncio. Smoke `ghost-atlantico-world-version-smoke.mjs` en CI. **APK QA 1.2.334 y AAB Play 1.2.334/vc9 son anteriores a este arreglo; no los publicar como solución del problema.** Requiere prueba en móvil y nuevo candidato autorizado. Ver [docs/continuity/2026-10-21-atlantico-ghost-geometry.md](docs/continuity/2026-10-21-atlantico-ghost-geometry.md).

> **PUBLICACIÓN PLAY v9 DESDE EL MAC — RELEVO 21/10/2026:** el usuario ha pedido un nuevo chat para terminar la actualización pública de Top Down RACE tras probar QA .334. Existen **APK QA 1.2.334 firmada**, artifact [12358663791](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39630545275/artifacts/12358663791) (la creación de Release directo falla por permisos 403), y **AAB production 1.2.334/vc9 SIN FIRMAR**, [candidato de GitHub Release](https://github.com/almaprintes/TopdownCraftrace/releases/tag/tdr-play-candidate-1.2.334-vc9). Play publicado sigue 1.1.188/vc8 según último estado conocido. Próximo paso: comprobar QA Android, localizar JKS original en Mac, contrastar certificado de carga en Play Console, firmar AAB con alias `topdownrace-upload` y publicar solo tras OK explícito del propietario. **No usar certificado QA para Play ni generar una clave sustituta.** Leer **[docs/continuity/2026-10-21-mac-play-v9-publication-handoff.md](docs/continuity/2026-10-21-mac-play-v9-publication-handoff.md)** antes de actuar.

> **21/10/2026 · DEV 1.2.333 · COLISIONES DE PRIMERA CARGA:** corregida contaminación de colisiones entre circuitos al reutilizar RaceScene: `raceEnvironmentRuntime.envFor` ya no puede usar `scene.track` / `scene.track.meta` del circuito anterior para decidir si importar obstáculos de Canarias 4096. El `trackKey` activo tras `init` es la única identidad válida en preload y create. Prueba `scripts/environment-first-entry-isolation-smoke.mjs` compara 1.ª entrada y reinicio para normales, inversos y rally con metadata residual simulada. `scripts/karting-canarias-owner-project-smoke.mjs` y `scripts/owner-five-environments-smoke.mjs` actualizados para no exigir el antiguo comportamiento erróneo. DEV web; **APK QA sigue 1.2.328** sin el arreglo. No declarar validación en móvil hasta prueba real. Ver `docs/continuity/2026-10-21-first-entry-collision-isolation.md`. Solo main, no Play ni APK/AAB sin autorización.

> **ACTUALIZACIÓN 21/10/2026 · DEV 1.2.331:** ampliación editorial de «LECTURA DE LA TANDA» a 1.182 mensajes por idioma en 20 categorías, sobre el mismo JSON persistente del DEV .330. Ver `docs/continuity/2026-10-21-session-insight-bank.md`. Última APK QA .328, Play 1.1.188/vc8; NO generar binarios sin nueva autorización.

> **ESTADO MÁS RECIENTE 21/10/2026 · DEV 1.2.330:** motor de «LECTURA DE LA TANDA» con banco `src/game/ui/sessionInsightBank.json` de **384 frases ES + 384 EN**, 16 categorías, selección según telemetría y antirrepetición persistente local por idioma/categoría. Selector en `src/game/ui/sessionInsightReader.js`, integrado en `RaceSessionReportScene.js`. En DEV 1.2.330 se ha eliminado la capa de informe posterior que sobreescribía los 768 mensajes con 9 frases fijas: ahora `report.verdict` del catálogo llega íntegro a la pantalla y exportación. Memoria antirrepetición por piloto/idioma/categoría, con señal de vuelta no limpia tomada de `tdrCleanLap`. Comprobación `scripts/session-insight-bank-smoke.mjs` obligatoria. **Última APK QA sigue 1.2.328**, creada y firmada; usuario satisfecho con ella, pendiente validar exportación JSON en Android real. DEV .330 web, no está en esa APK. Solo `main`; no generar APK/AAB ni publicar Play sin autorización. Ver `PROJECT_HANDOFF.md` y `docs/continuity/2026-10-21-session-insight-bank.md`.

> **CONTINUIDAD 20/10/2026:** Leer primero [docs/continuity/2026-10-20-handoff-general.md](docs/continuity/2026-10-20-handoff-general.md) y [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) antes de reanudar. Advertencia especial: APK QA .317 y riesgo de firma distinta; no instalar/desinstalar ni generar otra APK por lectura de documentos. La fuente vigente sigue siendo `main`, no ramas beta históricas.

**Continuidad activa (14/10/2026):** Para cualquier tarea de CROWN Cuper, skins, calibración visual o Fábrica, leer primero [`docs/continuity/2026-10-14-cuper-factory-3-quarter.md`](docs/continuity/2026-10-14-cuper-factory-3-quarter.md). Es la referencia actualizada; documentación histórica puede contener nombres de imágenes de fábrica obsoletos. El jugador equipa la skin desde su garaje; Admin Hub únicamente configura recursos y geometría. Fábrica usa 3/4, NO lateral ortográfico.

Estas reglas prevalecen sobre cualquier costumbre anterior del repositorio.

1. NO crear ramas nuevas para trabajo normal.
2. Trabajar SIEMPRE en `main` para el desarrollo actual.
3. La versión pública de Google Play es 1.1.188 (versionCode 8). `beta-1.0` es histórica y obsoleta; no usarla para compilar o publicar.
4. `main` es la única línea de desarrollo actual. No asumir que una rama histórica representa Google Play; comprobar siempre el versionado Android y el estado real de publicación antes de preparar una release.
5. NO mezclar código, assets ni builds desde ramas auxiliares, antiguas, recovery, lab, preview, feat, fix, tmp, backup o similares.
6. NO cambiar el origen de `/dev` fuera de `main`.
7. NO publicar automáticamente en Google Play al hacer cambios en `main`.
8. Una nueva versión de Google Play solo se prepara/publica cuando el propietario lo indique explícitamente y tras las validaciones correspondientes.
9. Antes de cualquier cambio de despliegue, verificar este archivo y `.github/workflows/pages.yml`.
10. Si una tarea parece requerir una rama nueva, detenerse y buscar una solución dentro de `main` salvo autorización explícita del propietario.

Estado de versiones actualizado 2026-10-03:
- `main` contiene actualmente Android `versionCode 8`, `versionName 1.1.188` (fuente de verdad: `android/app/build.gradle`).
- `beta-1.0` y `beta-0.0.3` son históricas y no deben usarse como referencia del estado actual de Google Play.
- El número de versión del `package.json` no sustituye al versionado Android para releases de Google Play.
- Antes de incrementar `versionCode`/`versionName`, confirmar la siguiente release y validar el AAB en el Mac/dispositivo cuando corresponda.

Objetivo operativo: una única línea de desarrollo en `main`, simple y predecible, con releases Android verificadas antes de publicar.

## PROTOCOLO OBLIGATORIO DE ENTREGA DEV — 22/09/2026

11. Tras cualquier cambio que deba publicarse en DEV, NO responder al propietario con estados intermedios del despliegue.
12. Vigilar GitHub Actions de forma autónoma hasta que el workflow correspondiente al HEAD exacto de main termine.
13. Si Build, verificadores o Deploy fallan, diagnosticar el fallo, corregirlo en main y volver a vigilar la nueva ejecución SIN requerir una nueva iteración del propietario, salvo que la corrección implique una decisión de producto o un cambio de alcance.
14. Solo comunicar que una versión está lista cuando el HEAD final tenga Build + Deploy en estado completed/success.
15. Una respuesta del tipo «pendiente», «en cola», «compilando» o «todavía no» no constituye entrega y debe evitarse cuando el propietario haya pedido esperar hasta que esté lista.
16. El objetivo operativo es que el propietario pueda despreocuparse del pipeline: cuando el asistente responda que está lista, debe significar que el despliegue completo ha sido comprobado.

## Fuente única de publicación — 10/10/2026
- Única rama activa de desarrollo y despliegue: `main`.
- GitHub Pages publica la página informativa de Google Play desde main, y `/dev` y `/dev-live` exclusivamente del mismo SHA de main.
- `dev-first-update` y `beta-1.0` dejan de ser fuentes válidas de desarrollo o despliegue. Pueden eliminarse al verificar el despliegue de main.
- La versión Android pública 1.1.188 sigue gestionada por Google Play y no se modifica con commits web.
- Última versión DEV anterior a Image Mode: 1.2.97. Siguiente versión 1.2.98.
- No generar un APK por cambios exclusivos de TrackStudio hasta autorización expresa.

## DEV consolidada — 08/10/2026
- Main integra el progreso de DEV 1.2.75 con las correcciones y la copia en la nube, nueva versión DEV 1.2.76.
- dev-first-update queda como historial de DEV 1.2.75. No desarrollar ni desplegar desde esa rama.
- GitHub Pages y las pruebas Android deben usar el mismo commit exacto de main.
- Google Play sigue en Android 1.1.188/versionCode 8; no publicar otra release sin autorización expresa.
