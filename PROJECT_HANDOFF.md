# TopdownCraftrace — PROJECT HANDOFF

## DEV 1.2.279 — Prueba actualizada para Américas y Canarias 4096

La prueba `scripts/karting-americas-official-smoke.mjs` asumía literalmente el allowlist anterior del entorno fotográfico y fallaba al añadir correctamente el circuito `karting-canarias-4096`. Se actualiza la aserción para verificar el nuevo allowlist que mantiene a Américas y añade Canarias 4096. Sin cambios de colisiones, decoraciones, fotos, coche, físicas ni gate de meta. Mantener íntegramente los cinco proyectos de DEV 1.2.276 y aprobar todas las pruebas y Pages antes de mostrar la actualización. No APK ni Play.


## DEV 1.2.278 — Test de enrutamiento Canarias reconstruido

Se actualiza `scripts/karting-canarias-owner-project-smoke.mjs` para reflejar que la lista segura de entornos fotográficos ahora incluye `karting-canarias-4096` además de `karting-canarias`. Se añade aserción que exige preferir el nuevo entorno 4096 sobre el de ×2,5, manteniendo aisladas las vistas locales. La DEV anterior paró por aserción obsoleta del listado antiguo; sin cambios a la geometría de usuario. Mantener versión 70% Atlántico y cinco proyectos oficiales.


## DEV 1.2.277 — Actualizar prueba de Tenerife al nuevo decorado de meta

La primera compilación tras importar los cinco proyectos se detuvo en `scripts/karting-official-source-smoke.mjs`, un smoke anterior que exigía `environment:[]` para Tenerife. Se adapta para exigir **únicamente el asset `finish_line_checkered`** sobre la fotografía, sin restaurar texturas viejas, ni modificar geometría. Los cinco entornos y su ruta, escalas, colliders y publicidad permanecen intactos. CI nuevo obligatorio antes de declarar DEV lista.


## DEV 1.2.276 — Cinco entornos definitivos exportados por el propietario

El propietario entregó cinco `.environment.json` (Karting Tenerife, Karting Canarias 4096, Circuito Atlántico, Karting Américas, Santa Cruz). Contienen **cinco tiras de meta visual** (`finish_line_checkered`) y en conjunto **23 líneas Bézier de colisión + 20 zonas sólidas**:
- `karting-tenerife/karting-tenerife.environment.json`: 5 líneas + 17 zonas. Geometría idéntica a la oficial anterior y `advertising` mantenido (`campaign:default`), aunque la exportación nueva no llevaba esa configuración.
- `karting-canarias-4096/karting-canarias-4096.environment.json`: 5 líneas + 1 zona. Archivo nuevo en carpeta oficial del circuito reconstruido **4096×6144**; allowlist en `raceEnvironmentRuntime.js` y prioridad explícita al circuito 4096 si el selector conserva el alias viejo. NO usar el factor ×2,5 del Canarias obsoleto; entorno legacy conservado solo por compatibilidad.
- `track01/track01.environment.json` (identidad `circuito-atlantico`): 1 línea + 2 zonas; el archivo recibido estaba en coordenadas de la foto original 4344×3258, **sin coordinateSpace** (exportación anterior a la corrección de editor). Se archiva sin escalar en `track01/source/circuito-atlantico-owner-original.environment.json` y se publica derivado al **70 % aprobado** con `coordinateSpace:'race-world'`, ajustando nodos, asas, zonas, posición y ancho de meta, evitando doble escalado en juego.
- `karting-americas/karting-americas.environment.json`: 8 líneas intactas + meta; cero zonas.
- `santa-cruz/santa-cruz.environment.json`: 4 líneas (55 nodos) + meta; retira 17 props y barreras de la foto anterior. **Crítico:** `install-santa-cruz-source.mjs` sobreescribe entorno desde `santa-cruz/source/santa-cruz-photo.environment.json`, por lo que también se actualizó esa fuente con la exportación del propietario, preservando así las colisiones y la meta en cada build.

No se modificaron fotografías, cuerpos de coches, físicas, trazados ni puertas lógicas de cronometraje. La tira WebP decorativa no genera colisiones. `scripts/owner-five-environments-smoke.mjs` valida los 5 proyectos, las colisiones, la independencia de la meta lógica y la conversión única de Atlántico; enlazado en `.github/workflows/pages.yml`. No APK/AAB ni Google Play. Revisar en DEV conduciendo los cinco circuitos antes de publicar Android.


## DEV 1.2.275 — Atlántico: paridad de coordenadas de la fotografía en Environment Studio

Se corrige una desalineación preexistente: Environment Studio cargaba los mosaicos de la fotografía de Atlántico a escala fuente 100%, aunque el circuito aprobado es al 70%. Ahora las teselas del editor se dibujan también a `worldScale=0.70`, tanto posición como tamaño, alineadas con `createTrack('circuito-atlantico')`. Los elementos gráficos, META decorativa y futuras colisiones se colocan visualmente en coordenadas **race-world** aprobadas; al exportar un proyecto de Atlántico se añade `coordinateSpace:'race-world'` y el runtime NO vuelve a escalar esos datos. JSON heredado que no lleve ese campo se interpreta como coordenadas de la fotografía original y mantiene la conversión previa con `scaleAtlanticoEnvironment` por compatibilidad. No cambia la escala aprobada, la foto, los coches, sus físicas, las puertas de tiempo ni otros circuitos. Test ampliado `scripts/environment-finish-line-asset-smoke.mjs`. Sin APK/AAB ni Play.


## DEV 1.2.274 — Línea de meta decorativa en Environment Studio

El propietario subió a `main` el WebP transparente optimizado `public/assets/environment/finish-line-checkered-optimized.webp` (1024×177, 78.878 bytes). Se registra como `finish_line_checkered`, nombre visible «LÍNEA DE META», categoría PROPS, ancho inicial 300 px. Aparece en el panel DOM, la biblioteca táctil y el catálogo Phaser; está incluido en el preload activo (`EnvironmentBuilderVegetationToolStateScene.js`), en `EnvironmentBuilderScene.js` y en el catálogo desplazable `EnvironmentBuilderScrollScene.js`. Los controles existentes permiten mover, rotar, escalar y duplicar; exportación y carga conservan su ruta y posición. Es una imagen decorativa que no añade barreras ni colisiones y no altera las puertas de meta/checkpoints. No se coloca automáticamente en ningún circuito: el propietario deberá posicionarla, guardar y exportar el `.environment.json` y subirlo al proyecto. Para Atlántico, el motor aplica la escala mundo aprobada 0,70 al objeto cuando el JSON está instalado. Regresión `scripts/environment-finish-line-asset-smoke.mjs` añadida a Pages CI. No APK/AAB ni Google Play.


## DEV 1.2.273 — Corrección porcentual Atlántico: escala 70% del original

El propietario precisó que desde DEV 1.2.271 (escala 94%) quería bajar a **70% del tamaño original**, o sea **24 puntos porcentuales menos**, NO reducir un 70% para dejarlo a 30%. Se corrige el ajuste provisional erróneo de DEV 1.2.272 a `ATLANTICO_WORLD_SCALE=0.70` y se añaden regresiones para exigir anchura de mundo 3040.8 y altura 2280.6 (fuente 4344×3258). Se mantiene la limpieza de assets antiguos, los 394 puntos, los bordes Bézier, CP1/CP2, META y posición del coche a escala proporcional de la foto. Foto maestra, seis teselas y sus bytes, coche, físicas y cámara sin alterar. Las futuras colisiones dibujadas sobre foto fuente se convierten también a escala 0.70. No generar APK/AAB ni publicar Play sin indicación explícita.


## DEV 1.2.272 — Circuito Atlántico escala al 30% del original

A petición del propietario, reducir **un 70%** el espacio fotográfico y la geometría del circuito (conservar 30%, no 70%). Constante `ATLANTICO_WORLD_SCALE=0.30` en `src/game/tracks/atlanticoWorldScale.js`, compartida por trazado, 14+14 Bézier, salida/meta, 2 checkpoint gates y las futuras colisiones exportadas desde Environment Studio sobre imagen fuente de 4344×3258. La foto original, sus seis teselas (y variantes iOS), carScale y físicas/cámaras de los coches son inmutables. Dimensión del mundo publicado: 1303.2 × 977.4 unidades. Atlántico sigue sin colisiones físicas definidas por el propietario (el entorno de legacy ya se retiró en 1.2.271). Pruebas de geometría y autenticidad en `scripts/circuito-atlantico-official-smoke.mjs`. No APK/AAB ni Play. Si el trazado se siente demasiado estrecho o recorrido demasiado corto a 30%, decidir con el propietario antes de cambios adicionales.


## DEV 1.2.271 — Circuito Atlántico foto 94%, sin entorno antiguo

El owner confirmó que Atlántico ya es fotográfico pero el coche parecía pequeño. Se ajusta *solo Atlántico* a factor mundo 0.94 en `src/game/tracks/atlanticoWorldScale.js`: `install-circuito-atlantico-source.mjs` instala geometría escalada (centerline, forma Bézier, meta, spawn, checkpoint y dimensiones mundo) y `imageNativeRaceLoader.js` muestra los seis mosaicos originales con `imageNative.worldScale=0.94`. El WebP maestro 4344×3258, hash SHA-256 original y los mosaicos fuente NO cambian. Coche, físicas y cámaras intactos. Retirados 36 objetos, 8 barreras y texturas PBR de `track01.environment.json`; el archivo queda versión 7 vacío (sin colisiones todavía). Las futuras colisiones creadas en coordenadas de la foto original del Environment Studio se convertirán 0.94 al cargarse en carrera. Test extendido `scripts/circuito-atlantico-official-smoke.mjs`. No APK ni Google Play. Siguiente acción del owner: probar Atlántico y dibujar/enviar `.environment.json` nuevo en base a su foto fuente.


## DEV 1.2.270 — Excluir assets Environment sin uso en builds de producción

Inventario sobre main 1.2.269: 59 recursos gráficos en public/assets/environment, 27.35 MiB; solo 19 recursos (14.21 MiB) directamente referenciados por los JSON de entorno existentes, pero algunas referencias han sido reemplazadas por las fotografías oficiales al prebuild. No comprimir fotos, no recortar iconos/objetos, no borrar fuentes. El script `scripts/prune-unused-production-environment-assets.mjs` se ejecuta exclusivamente **después** de Vite `--mode tdr-prod` en `build:prod`, nunca en el build editor. Examina código final y todas las configuraciones `.environment.json` del proyecto; protege rutas y nombres de assets que puedan utilizarse dinámicamente, elimina del **dist** solamente recursos sin referencias. Conserva íntegra la carpeta `public/assets/environment` y los archivos de los circuitos `public/assets/tracks`. Android ejecuta `build:prod` y aprovecha el mismo ahorro. Test de regresión: `scripts/prune-unused-production-environment-assets-smoke.mjs`. La cifra exacta de ahorro de cada build se muestra en su log. No APK/AAB ni Play; comprobar Actions verdes y mantener fuentes editor completas.


## DEV 1.2.269 — Retirada del acceso Ship-a-ton

Se elimina el menú y panel de jueces, códigos, insignia, observador del DOM, RPC cliente y bypass de coches/circuitos/garaje, eliminando por completo `ShipatonJudgeMode.js`. Se borra solo la preferencia local obsoleta al iniciar el juego, sin alterar otros datos. Admin Hub, recompensas AdMob/RevenueCat, temporadas y economía normal permanecen. Se retiran textos ES/EN del concurso. En Supabase, `supabase/migrations/20261018_016_retire_shipaton_judge_access.sql` elimina únicamente sus dos funciones y dos tablas privadas; las migraciones iniciales 009/010 permanecen en historial de auditoría (no reaplicarlas). Prueba `scripts/shipaton-retirement-smoke.mjs` en Pages CI. Solo DEV, sin APK/AAB ni Google Play.


## DEV 1.2.268 — Estadísticas / Race Control: solo circuitos jugables y desbloqueados

El módulo puro `src/game/stats/playableStatisticsTracks.js` cruza exclusivamente `PUBLISHED_TRACK_IDS` con `TRACK_REGISTRY`, el indicador `meta.hiddenFromTrackSelect` y `isTrackUnlocked`. Tanto las fichas de coche en Estadísticas como la lista de «Mis circuitos» de Race Control consultan la misma regla, sin mostrar prototipos, variantes retiradas, ni circuitos bloqueados. Selecciones históricas/URL/replay de circuitos ya no visibles retroceden al primer circuito permitido. Los récords y fantasmas viejos permanecen almacenados intactos; no se migran ni borran. También se omiten los récords mejores de circuitos ocultos en la ficha resumen de cada coche. Ver `scripts/stats-unlocked-circuits-smoke.mjs`, ejecutado en Pages CI. No APK/AAB/Play; esperar Actions verdes para DEV 1.2.268.


## DEV 1.2.267 — lobby logo 150% y garaje misterioso

Logo lobby: la imagen escala 1.5 (25% adicional sobre 1.2) sin mover su botón/hitbox/admin. Garaje jugador: tarjetas de coches bloqueados muestran solo ?, jamás solicitan foto/carta real ni procesan ni exhiben rendimiento; el hero elimina la URL anterior y la oculta. Tras desbloquear regresan foto, skins y datos. Admin Hub y físicas intactos. Pruebas: `scripts/lobby-car-header-settings-skin-smoke.mjs` y `scripts/garage-track-paddock-skin-smoke.mjs`. Solo DEV web en main; NO APK ni AAB ni Play. Canarias 4096 conserva colisiones pendientes del propietario.


## DEV 1.2.266 — CANARIAS 4096 / CUPER / ANDROID REAL ADS QA

Corregido source Canarias 4096 confirmado en main, SHA256 1c3e92545c12e0b9941f10e81f8ca6c58e233c909e59005c465507d3b90bc086. El prebuild instala las ocho teselas 2048x1536 y la geometría. DEV y Android usan un solo Canarias visible; originales antiguos quedan en Git como respaldo. Los récords viejos NO se renombran.

Cuper mantiene 14 misiones: coche #2, Gold #14, acceso tras inducción y 500 km reales de Avenir Gripline. Lobby muestra odómetro grande, 500km, progreso y distancia restante. Misión #12 exige anuncio verificado y confirmación online. APK QA usa deviceTestRelease con SDK real AdMob/RevenueCat, firmado QA y sin MEDIR. NO publicar Google Play ni generar AAB sin aprobación. Documento: docs/continuity/2026-10-18-canarias-cuper-android-qa.md.


## ANDROID RELEASE QA — DEV 1.2.265 (SIN MEDIR)

[Alcance y pasos](docs/continuity/2026-10-17-android-release-qa-no-medir.md). APK release minificada de sabor `bridgeTest` aislado, usa `tdr-prod` sin panel MEDIR ni diagnóstico iOS. Test AdMob, sin RevenueCat ni AAB, no sustituye Google Play y NO verifica congelaciones de anuncios reales. Canarias 4096 requiere subir bundle binario antes de considerar publicación. Workflow `.github/workflows/android-sdk-apk.yml`, artifact `TDR-ANDROID-QA-DEV-1.2.265-SIN-MEDIR`.


## CANARIAS REHECHO 4096 — FUENTE BINARIA PENDIENTE

[Preparación para el Track Studio corregido y una única pista activa](docs/continuity/2026-10-17-karting-canarias-4096-staged.md). `scripts/install-karting-canarias-4096-source.mjs` espera un ÚNICO archivo binario de 4,1MB bajo `src/game/tracks/library/karting-canarias-4096/source/karting-canarias-4096.tdrtrack`. Al subirlo, prebuild separa foto+geometría y genera 8 teselas fotográficas; en la PWA DEV cambia el único Canarias visible de `karting-canarias` a `karting-canarias-4096`, separando récords. Narrow70 está oculto. Los archivos antiguos permanecen como respaldo, no se borran del repositorio antes de validar la sustitución. **NO AFIRMAR QUE EL CIRCUITO ESTÁ INSTALADO HASTA QUE EL BINARIO EXISTA Y ACTIONS SEA VERDE.** Meta visible ajedrezada ya preparada en `imageNativeRaceLoader.js`, sin edición de foto ni RAF.

## DEV 1.2.264 — CANARIAS NARROW-70

Separate PWA DEV experimental track karting-canarias-narrow70, canonical Canarias unchanged. Same centerline (16,328px), photo/world x2.5, nominal width 70 source instead of 105; preserves 18 hand-authored Bezier edge handles and per-sector widths (scaled inward 70/105). The alternate WebP photo is re-warped OFFLINE at build into four tile assets; no runtime extra frame-loop or culling. Original Environment Studio barriers reused. Separate ID and record keys, dev selector only, not published. Read docs/continuity/2026-10-17-karting-canarias-narrow70-264.md.


## REFERENCIA VISUAL DE RECTAS EN LOS TRES KARTINGS — 17/10/2026

[Rectas candidatas, porcentaje del mismo Spark y coordenadas FOTO](docs/continuity/2026-10-17-karting-straight-visual-reference.md) + [JSON de datos](docs/continuity/data/2026-10-17-karting-straights-candidates.json). Análisis 36 estaciones/track (NO culling): Tenerife 2 rectas 18,4–20,7 %; Américas 4 rectas 14,8–21,2 %; Canarias 3 rectas 9,9–12,4 %. **Margen simétrico es cálculo teórico, no margen medido a cada borde**. Confirmar puntos en foto original antes de cambiar escala. Mantener ×2,5 de Canarias hasta decisión, no reintroducir culling ni tocar físicas.

## ESCALA FÍSICA ORIGINAL — LOS TRES KARTINGS (17/10)

[Estudio de foto/Bezier/mundo/metraje externo](docs/continuity/2026-10-17-kartings-physical-scale-study.md). Canarias ×2,5 NO es bug: se eligió en DEV 1.2.246 para reproducir la duración/escala del circuito histórico y que el coche se viera menos grande. La conversión global da Tenerife 754 m, Américas 742 m, Canarias 839 m; los operadores publican Tenerife 1200 m y Américas 857 m, mientras que OnPole no oficial atribuye 440 m a Canarias. La foto de Canarias es recreación IA, no georreferenciada. No aplicar factores métricos nuevos, ni reactivar culling, ni cambiar físicas/rankings sin aprobación.

## RESULTADO REAL DE SILUETAS ALFA — 17/10/2026 — CORRECCIÓN

[Informe verificado](docs/continuity/2026-10-17-actual-alpha-kartings-results.md): las cifras nominales anteriores incluían espacios transparentes. Cuper original y Gold **34,71 px** visibles, Spark **31,13 px**, Colossus **45,51 px**. **Cuper NO es tan ancho como Colossus y NO requiere redimensionado automático.** Con el mismo Spark, proporción estimada: Tenerife **18,54 %**, Américas **14,82 %**, Canarias **10,22 %**. Antes de modificar Canarias ×2,5, validar origen físico/geometría y preservar datos de carrera. Sin nuevo culling.

## AUDITORÍA ALFA DE COCHES Y KARTINGS — 17/10/2026

Ver [auditoría de carrocerías y kartings](docs/continuity/2026-10-17-car-alpha-kartings-audit.md): el script `scripts/audit-car-alpha-kartings.mjs` mide el contorno alfa visible en los 18 coches y Gold de Cuper y compara Tenerife / Américas / Canarias después de instalar el trazado. Genera artefacto TDR-car-alpha-kartings-audit desde Pages. Es solo un análisis; no cambia la escala del coche, fotografía, colisiones ni versión DEV.

## RESULTADO DE LAS 108 COMBINACIONES — 17/10/2026 — SOLO ANÁLISIS

[Clasificación completa de escalas de 18 coches × 6 circuitos](docs/continuity/2026-10-17-108-track-car-combinations-classified.md): Karting Canarias mundo ×2,5 reduce la proporción Spark/carretera a 10,6 % frente al 19,3 % de Tenerife; Arafo coche ×0,35 mantiene 18,1 % y **no debe agrandarse a ciegas**; Cuper tiene WebP nominal 47,52 px, pero la inspección alfa posterior confirma **34,71 px visibles**, por lo que aquella sospecha de sobredimensionado queda rectificada. La matriz completa, las excepciones y las prioridades P0–P3 están documentadas. **No cambiar físicas ni reactivar culling.**

## INVENTARIO AUTOMÁTICO DE ESCALA — 17/10/2026 — DEV 1.2.263

Desde el build, ejecutar `node scripts/audit-track-car-scale.mjs --out-dir reports/track-car-scale`. El workflow en `main` lo ejecuta DESPUÉS de los instaladores oficiales y adjunta `INFORME.md` + `inventory.json` como artifact `TDR-track-car-scale-audit`; no altera la PWA ni originales. El informe cuantifica secciones normales de carretera Bézier, coches+overrides+skins por defecto, hitboxes, escalas mundo, texeles y estimación GPU; leer advertencias de curvas próximas y validación manual. Ver [documentación previa](docs/continuity/2026-10-17-track-car-scale-culling-decisions.md). **No activar culling dinámico**.

## CONTINUIDAD CRÍTICA — 17/10/2026 — CIRCUITOS, COCHES, CULLING YA PROBADO Y CALIDAD iPHONE

**Lectura prioritaria antes de modificar circuito, escala de coches, cámara, fotografía o rendimiento:** [Arquitectura real, experimentos fallidos y plan de homogeneización](docs/continuity/2026-10-17-track-car-scale-culling-decisions.md). Verifica expresamente la desactivación histórica del culling por fotograma en iOS (DEV 1.2.52) y que la ruta fotográfica actual ya omite el viejo culling de asfalto. No recomendar streaming/culling dinámico sin nueva evidencia; no confundir zoom común con proporción coche/carretera. Los `track.json` post-build pueden diferir de los versionados. **Este cambio es solo documentación:** DEV runtime sigue 1.2.262, sin desplegar nada ni modificar Google Play.

## CONTINUIDAD ACTUAL — 14/10/2026 — CROWN CUPER / SKINS / FÁBRICA (DEV 1.2.197)

**Lectura prioritaria para chats nuevos:** [CROWN Cuper: decisiones, archivos, calibrador, estado de implementación y pendientes](docs/continuity/2026-10-14-cuper-factory-3-quarter.md).

- Un solo coche `crown_cuper`, dos skins `original` y `gold`; el jugador viste el coche en su **garaje**, el Admin Hub **solo configura** los recursos/posiciones. Progreso y físicas compartidos.
- La Fábrica usa imagen **tres cuartos**, **no perfil lateral duro**. Rutas vigentes: `public/assets/cars/workshop/mini_cooper_black_white.webp` y `mini_cooper_black_gold.webp`; cenitales `public/assets/skins/skin_crown_cuper_{original,gold}.webp`. Los cuatro WebP constan en el árbol de Git.
- Los dos ajustes geométricos por skin se separan (cenital y fábrica 3/4) y exportan JSON; es el inicio de un sistema extensible a futuras skins de toda la flota.
- DEV 1.2.197 es la implementación identificada al escribir este bloque. **Verificar siempre `main`, `index.html` y Actions del HEAD real**. No confundir el pipeline con aprobación visual en dispositivo. No tocar Google Play.
- No reutilizar instrucciones históricas de recortar con fondos, inventar enlaces de descarga o generar una vista lateral estricta. Los archivos WebP deben tener alfa real; cuando el usuario solicita conversión, NO volver a generarlos.

## ACTUALIZACIÓN 23/09/2026 — DEV 1.1.177: ARRANQUE ANDROID

La APK de pruebas 1.1.176 instalada pedía `/top-down-race-2/assets/`, pero empaquetaba los recursos bajo `assets/public/assets/`. Se reprodujo en el teléfono y un cambio exclusivo de rutas permitió cargar JS y responder al bridge nativo. La release 1.1.177 llegó al lobby físico con anuncios no configurados (`game-ready` a 3.871 ms). Se restituye `sensorLandscape`, se elimina la espera del bridge antes de Phaser y los SDK de publicidad pasan a inicializarse bajo demanda.

Generar el payload con `npm run build:android`; Gradle rechaza rutas de Pages o archivos inexistentes. Los marcadores `TDR_BOOT` funcionan en release y el watchdog HTML detecta ausencia del módulo principal. No hay premio sin `completed && verified`, no se cambia la configuración pública de Race Control ni se publica en Play. Informe y límites de validación: `docs/continuity/2026-09-23-android-bootstrap-regression.md`.

La descripción histórica siguiente de 1.1.176 (esperar al bridge antes de las escenas) queda sustituida por el arranque independiente de 1.1.177.

## ACTUALIZACIÓN 23/09/2026 — BRIDGE REWARDED ANDROID VERSIONADO

DEV 1.1.176 conserva el wrapper Capacitor Android versionado y registra `TdrRewardedAdsPlugin` antes de crear el WebView. El bootstrap web espera la respuesta nativa antes de crear escenas y solo entonces publica `window.__tdrRewardedAds`. Google UMP se resuelve antes de inicializar/cargar AdMob y `show()` falla cerrado si `canRequestAds()` no autoriza anuncios; cierres, errores o SSV sin recompensa verificada continúan sin concesión.

La CI compila y ejecuta una variante release minificada específica que comprueba dentro del WebView los tipos del global y realiza un viaje JS → plugin nativo → JS sin recompensa simulada. La configuración production ahora es obligatoria al generar su release. El AAB versionCode 4 y su wrapper local anterior no estaban disponibles, por lo que no existe verificación binaria retrospectiva ni prueba real AdMob/SSV en este entorno. Alcance, archivos y frontera de publicación: `docs/continuity/2026-09-23-android-rewarded-release-bridge.md`.

## ACTUALIZACIÓN 22/09/2026 — REWARDED COMPLETO Y ACCESO SEGURO PARA JUECES

DEV 1.1.170 añade placements RevenueCat separados para publicar un récord, descargar un fantasma, los intercambios 2.º/3.º de la Recicladora y las 100 monedas de Tienda cada cuatro horas, manteniendo el x2 postcarrera. Todas las acciones exigen `completed + verified`; un cierre, error o SSV fallido no concede nada. Publicar actualiza inmediatamente el leaderboard del circuito.

El acceso Shipaton ya no se autoriza con `localStorage`: Supabase valida un código hasheado y concede un entitlement temporal al UUID anónimo. El modo de evaluación usa un Garaje/Factory en memoria y no altera la progresión real. Migraciones, placements, seguridad y validación: `docs/continuity/2026-09-22-rewarded-actions-and-shipaton-judge-access.md`.

## ACTUALIZACIÓN 22/09/2026 — GRIPLINE CON MOTOR RPM Y SPARK MÁS VIVO

DEV 1.1.169 asigna al primer desbloqueable, AVENIR Gripline, un perfil de motor de seis capas RPM. Reutiliza el banco CC0 local ya auditado, pero con ralentí, corte, curva, pitch y ecualización propios: resulta más agudo y rápido que Spark sin añadir ninguna dependencia de red. El runtime generaliza el banco mediante `ProfiledRpmEngineModel.js`; Spark conserva su modelo exacto y Vortex conserva `JEEP`.

Spark sube `RACE_STARTER` de `0.60` a `0.72`: 0–84 km/h pasa de ~7,6 s a ~6,4 s, conservando su punta sostenible de ~84,5 km/h y la curva continua de retención. `TOURING` 0.30 permanece disponible. Audio, cifras, pruebas y alcance de salida: `docs/continuity/2026-09-22-gripline-audio-and-launch-triage.md`.

## ACTUALIZACIÓN 22/09/2026 — SPARK RECUPERA CARÁCTER DE CARRERAS

DEV 1.1.168 eleva la respuesta longitudinal de Spark de `0.30` a `0.60`: conserva la punta stock publicada de ~84 km/h, pero pasa de 0 a 84 km/h en ~7,6 s en lugar de ~14,8 s. El régimen a fondo con el coche parado sube ahora a ~4.200 RPM, y la progresión móvil continúa vinculada a la velocidad real.

La curva anterior no se pierde: queda como `LONGITUDINAL_PROFILES.TOURING` para un futuro turismo. Spark usa `RACE_STARTER`. Documentación y cifras: `docs/continuity/2026-09-22-spark-race-response.md`.

El sonido aprobado del HÉLIX Vortex también queda congelado en esta versión como perfil reutilizable `ENGINE_AUDIO_PROFILES.JEEP`, sin cambiar su muestra ni sus curvas de pitch y ganancia. El Vortex declara el perfil en `carSpecs.js`; parámetros, fuente CC0 y prueba de regresión: `docs/continuity/2026-09-22-vortex-jeep-audio-profile.md`.

## ACTUALIZACIÓN 22/09/2026 — RESPUESTA LONGITUDINAL HÉLIX SPARK

DEV 1.1.167 corrige la curva física que hacía que el Spark publicado alcanzase 45 km/h en aproximadamente 0,7 s y cambiase bruscamente su retención al cruzar 15 km/h. El ajuste es exclusivo de Spark: escala conjuntamente empuje y drag para conservar su punta sostenible real de 84 km/h, amplía la transición de retención a 12–45 km/h y elimina la compensación que prolongaba en exceso la caída desde velocidad media.

El audio conserva el banco y la mezcla de DEV 1.1.166. Solo cambia el objetivo de RPM: al moverse sigue la velocidad sostenible real del coche y el gas añade carga, de modo que el último sample llega con la punta en vez de inmediatamente al pisar. Cifras, alcance y prueba: `docs/continuity/2026-09-22-spark-longitudinal-response.md`.

## ACTUALIZACIÓN 22/09/2026 — RECONSTRUCCIÓN DEL MOTOR HÉLIX SPARK

DEV 1.1.166 sustituye la ruta experimental de seis `HTMLAudioElement` remotos por un único grafo WebAudio con muestras locales. Los seis WAV CC0 viven en `public/assets/audio/engine/spark/`, se descargan y decodifican antes del gesto de encendido cuando la plataforma lo permite, comienzan sobre el mismo reloj de audio y se mezclan por RPM con crossfade de potencia constante. Spark no tiene fallback procedural: cualquier fallo del banco real queda visible en consola.

La señal de audio lee exclusivamente `carBody.body.velocity`, `touch.throttle` y las teclas de aceleración ya usadas por la carrera. No escribe input, aceleración ni física. El gas puede subir RPM con el coche parado desde que se enciende el motor. El grafo se cierra tanto en resultados como en `shutdown`, y reintenta reanudar el `AudioContext` después de suspensión de página.

Auditoría, hashes, licencia, arquitectura y checklist de dispositivo: `docs/continuity/2026-09-22-spark-engine-audio-rebuild.md`.

## ACTUALIZACIÓN 21/09/2026 — TIENDA / IAP DE MONEDAS APLAZADO
- Los packs de monedas por dinero real se han retirado del código/runtime de la build actual antes de revisión de Google Play. No reintroducirlos hasta una actualización futura explícita.
- La tienda actual conserva packs de materiales comprados con moneda interna, recompensas y recicladora.
- El renderer visible final de tarjetas de materiales está en MenuDuelModeScene.js (override del renderer heredado).
- DEV 1.1.96 elimina el doble recorte de textos durante el scroll: la máscara geométrica del contenedor es la autoridad para clipping y la limpieza de visibilidad ocurre al asentarse el movimiento.
- Continuidad detallada: docs/continuity/2026-09-21-store-material-cards-coin-iap-deferred.md


> Documento vivo para continuar el proyecto en un chat nuevo sin perder decisiones, soluciones técnicas ni el estado de trabajo.
> Fuente oficial: `almaprintes/TopdownCraftrace`. Desarrollo normal en `main`; beta pública estable en `beta-1.0`.


## ACTUALIZACIÓN DE CONTINUIDAD — 19/09/2026 — BETA GOOGLE PLAY 1.0.214: INCIDENCIAS REALES

La beta cerrada de Google Play fue actualizada correctamente desde 1.0.0 a **1.0.214 (versionCode 2)** y quedó disponible para los 16 testers. Prueba real en Android mediante actualización desde Play Store, sin desinstalar: **progreso local preservado** (monedas, coche seleccionado, temporada y PB locales). `beta-1.0` queda congelada; no tocarla.

### PRIORIDAD ABSOLUTA AL ABRIR DEV 1.1.x
Antes de implementar VS Ghost, rewarded nuevos o compras reales, reproducir/auditar y corregir estas incidencias de la build Android publicada. No asumir causas sin inspección/profiling.

1. **Rendimiento Android release: ~25 FPS en carrera.** Confirmado visualmente por el contador FPS en la build de Google Play, también fuera del modo Fantasma. Es prioridad nº1: medir antes de degradar gráficos al azar. Investigar WebView/Capacitor, DPR/render scale, Phaser, HUD/minimapa, objetos/vegetación, efectos y regresiones recientes. No añadir carga de VS Ghost hasta entenderlo.
2. **Race Control online no conecta en el AAB publicado.** La UI/local funciona y conserva PB, pero ACTUALIZAR pasa de SIN CACHÉ a ERROR/REINTENTAR. Hipótesis fuerte pendiente de verificación: el build local usado para el AAB no recibió `VITE_TDR_ONLINE_URL` y `VITE_TDR_ONLINE_PUBLIC`; GitHub Pages DEV sí las inyecta explícitamente. El cliente lanza `Online backend not configured` si faltan. Verificar el contenido/build Android antes de tocar Supabase. No tocar tablas/RLS/backend por esta incidencia sin evidencia.
3. **Rewarded x2 ausente.** Tras finalizar una sesión aparece BOTÍN DE LA SESIÓN (piezas, vueltas premiadas, bonus, cofre) pero no aparece opción x2. Auditar integración Android real de AdMob/RevenueCat/placement y detección de plataforma. No asumir que comparte causa con Supabase.
4. **Selector de circuitos: último elemento no recibe toque.** En Android el elemento inferior visible (Circuito Atlántico en la prueba) no se puede seleccionar. Investigar hit area/overlay/overflow/z-index/viewport del modal/lista; no modificar datos/coordenadas de circuitos para corregirlo.
5. **Modo Fantasma: HUD flotante mal adaptado en Android.** Los elementos que se estabilizaron en iPhone no quedan correctamente posicionados en este viewport Android; DELTA/estado de fantasma/minimapa invaden zonas. Corregir responsive/safe-area específicamente sin romper el HUD estable de iPhone ni tocar DELTA funcional.

### Validaciones positivas de la build publicada
- Google Play ofreció ACTUALIZAR sobre la instalación anterior y Play Protect la verificó.
- El juego arrancó tras actualizar sin reinstalar.
- Perfil de piloto nuevo funcionó (prueba: JUANFRIKI).
- Se conservaron 5.100 monedas, Hélix Spark seleccionado, progreso 1/3 de temporada y PB locales (ej. Santa Cruz 0:13.744).
- Race Control carga correctamente su capa local y lista de circuitos/PB; el fallo aparece al intentar la operación online.
- Carrera y entrega de botín funcionan; el problema de rendimiento es real pero el loop base no quedó bloqueado.

### Regla nueva de publicación Android
Antes de subir el próximo AAB a Play Console, instalar/probar el **release Android equivalente** y exigir como mínimo: progreso preservado al actualizar; Race Control conecta a Supabase; rewarded x2 aparece y completa correctamente; selector de circuitos totalmente táctil; modo Fantasma/HUD correcto en Android; FPS aceptables en los escenarios de referencia; y, cuando se implemente, compra de prueba Google Play/RevenueCat sin doble entrega. Verificar además que las variables públicas de Supabase están embebidas en el build release. No publicar basándose únicamente en que DEV web funciona.

### Orden recomendado para el chat DEV 1.1.x
Primero auditoría y diagnóstico de estas cinco incidencias, empezando por rendimiento Android y configuración del AAB. Después corregirlas en bloques pequeños verificables. Solo entonces continuar con VS Ghost, rewarded para Race Control y paquetes consumibles de monedas. La función protagonista de la próxima actualización sigue siendo **VS Ghost / desafíos online**; monetización se integra en la misma etapa, pero no debe ocultar estos bugs de la beta real.

## ACTUALIZACIÓN DE CONTINUIDAD — 18/09/2026

### Leaderboard online / ghost validado

Se completó la investigación real en dispositivo del formato de ghost online. La arquitectura, mediciones Atlántico/Tenerife, decisiones de monetización, estado de Supabase y próximos pasos están documentados en:

- `docs/continuity/2026-09-18-online-leaderboard-ghost.md`

Decisión vigente: conservar todas las muestras nativas `{t,x,y,r}`, cuantizar X/Y a 0,25 unidades y rotación a 0,0001 rad, y serializar el movimiento con delta + ZigZag + varint. No usar remuestreo fijo de 20–50 ms: las pruebas demostraron más error de trazada y/o más tamaño.

DEV 1.0.197 validó en Tenerife 596 muestras con **ROUNDTRIP EXACT** tras encode binario -> decode. Flujo de movimiento real: 3.475 B frente a 48.061 B del replay local completo; el binario no añade pérdida respecto al NATIVE cuantizado. El replay local no se sustituye ni se modifica.

Tras la validación se retiró el panel visual de laboratorio de Race Control. El codec validado permanece para la futura integración. Próximo paso: esquema/RPC atómico de récord+ghost en Supabase, referencia pública opaca y descarga controlada; después integración cliente/rewarded.

## ACTUALIZACIÓN DE CONTINUIDAD — 17/09/2026

### Supabase / leaderboard online

Se creó y configuró el proyecto Supabase para preparar los futuros leaderboards online. La configuración completa y las decisiones de seguridad/privacidad quedan registradas en:

- `docs/continuity/2026-09-17-supabase-bootstrap.md`

Estado a 17/09/2026: organización `CraftRace Studio`, plan Free, proyecto `TopDown RACE - Craftrace` en West EU (Ireland), PostgreSQL estándar, GitHub autorizado únicamente para este repositorio, Data API activada, exposición automática de tablas nuevas desactivada, Automatic RLS activado y Auth anónimo activado con Email y demás proveedores no usados/desactivados.

Arquitectura prevista: UUID anónimo de Supabase asociado al nick que ya pide Craftrace. Los usuarios anónimos usan rol `authenticated`, por lo que las futuras políticas RLS deberán aplicar mínimo privilegio mediante `auth.uid()` y no conceder acceso general por el mero rol. Antes de publicar una build que envíe UUID/nick/datos de leaderboard habrá que revisar y actualizar Data Safety en Google Play según la implementación real.

**Todavía NO se han creado tablas ni integrado Supabase en el código del juego.** La conexión GitHub de Supabase tampoco implica despliegue automático de migraciones: el futuro esquema/migraciones SQL deberá versionarse en el repo y su despliegue configurarse explícitamente. No guardar contraseña DB, `service_role` ni secretos en GitHub.

Esta actualización es solo documental y no cambia la versión visible de DEV ni toca `beta-1.0`.

## ESTADO OPERATIVO — 13/09/2026

### Reglas obligatorias

- Trabajar SOLO sobre `main` para desarrollo.
- NO tocar `beta-1.0` sin autorización explícita del propietario. Es la beta pública/final 1.0 congelada.
- NO reutilizar `beta-0.0.3` ni mezclar código/assets desde ramas antiguas, recovery, lab, preview, feat, fix, tmp o backup.
- `/dev` y `/dev-live` salen de `main`; `/` sale de `beta-1.0` mediante `.github/workflows/pages.yml`.
- Antes de cambios de despliegue leer `AGENTS.md` y `.github/workflows/pages.yml`.
- Cada cambio visible de DEV debe incrementar el marcador de versión y la verificación del workflow.
- No afirmar que un deploy está listo hasta comprobar GitHub Actions.
- No tocar DELTA, minimapa, física, pedales u otras capas estables al corregir una UI concreta salvo necesidad demostrada.

### Estado DEV actual — 1.0.76

La línea de desarrollo ha avanzado hasta **DEV 1.0.76**. La beta pública `beta-1.0` permanece congelada y no se ha modificado.

Trabajo reciente relevante para pruebas de calidad y para documentar ante Google Play:

- Race Control dispone de reproducción real embebida de vueltas guardadas y análisis visual de trazada.
- Se corrigieron presentación/sincronización de Race Control, metadatos del coche del récord y representación de marcas.
- Se corrigió la actualización del inventario tras usar la recicladora.
- Se añadió/compactó la sección Legal.
- Se ajustó la experiencia de carga para Android y posteriormente se aisló el ajuste a Android para evitar una regresión visual en iPhone.
- Se han realizado pruebas manuales repetidas en dispositivo real durante el desarrollo, detectando y corrigiendo incidencias de interacción táctil y pausa.

### Pausa de carrera — correcciones DEV 1.0.74–1.0.76

Durante pruebas manuales se reprodujo un caso límite al pulsar pausa justo antes de la luz verde del semáforo de salida. Al continuar, la carrera podía quedar iniciada mientras el semáforo permanecía visualmente apagado/fijo sobre la pista.

Diagnóstico: la pausa histórica detenía la física, pero el reloj/tweens de la escena podían continuar avanzando. Eso permitía que la lógica/presentación de la salida y la física quedaran en estados diferentes.

**DEV 1.0.74:** se añadió un guard de pausa que congela también el reloj de la escena y los tweens durante la pausa y los reanuda al continuar. Resultado validado manualmente: el caso límite del semáforo queda corregido.

Posteriormente se observó que la salida del menú de pausa parecía tardar varios segundos. Las pruebas manuales permitieron precisar que no era latencia de reanudación: algunos toques sobre `CONTINUAR` no estaban disparando la acción al primer intento.

**DEV 1.0.75:** se eliminó el `backdrop-filter: blur(8px)` a pantalla completa del overlay de pausa para reducir trabajo innecesario de composición sobre el canvas WebGL, especialmente relevante en móvil/iPhone.

**DEV 1.0.76:** `src/game/ui/racePauseUi.js` dejó de depender exclusivamente de `click`. Los botones del menú responden directamente a `pointerup`, mantienen `click` como respaldo y usan protección contra doble activación. Resultado de prueba en dispositivo real confirmado por el propietario: el problema queda **completamente corregido** y `CONTINUAR` responde al primer toque.

Este bloque es evidencia útil del ciclo de prueba cerrada: se detectó un caso límite real mediante uso del juego, se reprodujo, se aisló la causa, se corrigió y se volvió a validar en dispositivo real.

### Publicación de la beta 1.0 y plataformas

La beta pública 1.0 fue separada del desarrollo mediante la rama `beta-1.0`. `main` continúa como línea DEV independiente. Google Play Console tiene la app **Top Down RACE: CraftRace** en prueba cerrada. La prueba cerrada y el proceso de testers forman parte del camino a producción; no confundir el build DEV web con la beta de Play.

Integraciones preparadas durante esta fase:

- AdMob: apps Android/iOS creadas en la cuenta AlmaPrint; rewarded en integración/prueba.
- RevenueCat: clave pública SDK de Google Play configurada y vinculación Play Console ↔ RevenueCat realizada para la app.
- Android: keystore release local creada; Java/OpenJDK 17 preparado para build.
- Soporte web: `topdownrace.almaprint.es`.
- Shipaton 2026 sigue siendo objetivo de publicación/presentación.

### DELTA — congelado

El sistema DELTA funciona y se considera estable. No modificar salvo bug concreto reportado.

- Referencia local por sesión.
- V1 crea referencia; V2 compara inmediatamente contra V1.
- Una vuelta más rápida pasa a ser la siguiente referencia.
- El cruce del seam de progreso no se trata como meta falsa.
- DEV 1.0.22 compensó el tiempo de pausa para que no entre en delta/cronometraje.
- DEV 1.0.23 conserva panel DELTA abierto/cerrado al pausar/reanudar desde el control propio.
- DEV 1.0.24 añadió variación determinista/local del texto de informe de sesión, sin IA/backend.
- IA generativa para informes queda aplazada.

### Controles de dirección — DOM

Tras varios intentos con objetos Phaser afectados por el zoom/cámara, los botones IZQUIERDA/DERECHA se migraron a DOM fijo.

Principio vigente: los controles de pantalla que deban permanecer absolutamente inmóviles no deben compensar cada frame `getWorldPoint()` + `1/zoom` si pueden vivir en DOM.

Los botones DOM conservan posiciones de `readControlLayout().layout.left/right`, separación mínima y clamping aprobados, semántica `this.touch.buttonSteer = -1 / 1 / 0`, interacción táctil/estado pulsado y compatibilidad con layout zurdo. No tocar gas/freno/freno de mano ni física al trabajar en estos botones.

### Texto de diagnóstico — eliminado

El texto de diagnóstico provenía del `RaceScene.js` base (`_diagText` / `_diag`). `src/game/scenes/RaceNoDiagScene.js` neutraliza `_diag`, destruye `_diagText` y elimina firmas de diagnóstico en `postupdate`. Debe permanecer eliminado tanto en iOS como Android.

### Minimapa — DOM/SVG estático

DEV 1.0.34 migró el minimapa visible fuera de la cámara Phaser mediante `src/game/scenes/RaceStaticMinimapScene.js`. Trazado, meta y marcador se presentan en SVG/DOM fijo; el marcador sigue posición/orientación real del coche y el panel ya no respira con el zoom dinámico.

### Panel FANTASMA / RÉCORD CARGADO

DEV 1.0.35 migró el panel a DOM fijo mediante `src/game/scenes/RaceStaticGhostStatusScene.js`, evitando microdesplazamientos producidos por la cámara. Caja y texto comparten el mismo sistema de coordenadas y permanecen anclados al canvas.

### Historial reciente útil

- DEV 1.0.24: informe de sesión con wording local variable; DELTA estable.
- DEV 1.0.25–1.0.27: intentos fallidos de estabilizar controles; no reutilizar esas aproximaciones.
- DEV 1.0.28: restauración segura del sistema anterior de dirección.
- DEV 1.0.29–1.0.31: investigación del acoplamiento a cámara.
- DEV 1.0.32: dirección migrada a DOM fijo.
- DEV 1.0.33: capa robusta para eliminar diagnóstico.
- DEV 1.0.34: minimapa migrado a DOM/SVG fijo.
- DEV 1.0.35: panel de estado fantasma migrado a DOM fijo.
- DEV 1.0.62–1.0.68: evolución de Race Control/replay y análisis de trazada.
- DEV 1.0.69: reparación de sincronización de inventario tras recicladora.
- DEV 1.0.70–1.0.71: sección Legal.
- DEV 1.0.72–1.0.73: experiencia de carga móvil y aislamiento Android.
- DEV 1.0.74: pausa coherente durante la secuencia del semáforo.
- DEV 1.0.75: overlay de pausa sin blur global costoso.
- DEV 1.0.76: respuesta táctil del menú de pausa mediante `pointerup`; validado en dispositivo real.

### Criterios técnicos aprendidos

En iOS la `uiCam` está desactivada por estabilidad y gran parte del HUD histórico se renderiza mediante la cámara principal. Para HUD puramente de pantalla que necesite inmovilidad absoluta, preferir DOM fijo bien anclado al canvas.

En UI táctil móvil crítica, no depender únicamente de `click` cuando existe una capa que captura/bloquea gestos. `pointerup` ofrece respuesta directa y puede conservarse `click` como fallback con un guard contra doble ejecución.

Una pausa completa debe mantener sincronizados física, reloj de escena, tweens y presentación visual; pausar únicamente la física puede crear estados incoherentes en secuencias temporizadas como la salida.

No migrar masivamente sistemas estables: corregir de forma aislada y validar en dispositivo real.

## Estado histórico anterior

Las decisiones previas de fabricación, inventario, tienda, economía, IA de Supervivencia, assets, garaje, pistas y demás trabajo anterior a la beta siguen disponibles en el historial Git y en `docs/`. Este handoff prioriza el estado operativo posterior a la publicación de beta 1.0 para evitar que un chat nuevo parta de información obsoleta.


## Backlog visual futuro — profundidad 2D mediante sombras proyectadas

> Idea documentada el 27/09/2026 para una actualización posterior. **No implementar en la versión de lanzamiento actual.**

### Objetivo

Aumentar la sensación de volumen y profundidad de los circuitos manteniendo el juego y sus assets en 2D cenital. La referencia visual surgió al observar sombras largas de palmeras proyectadas sobre el asfalto: aunque la geometría siga siendo plana, una sombra coherente hace que el cerebro interprete altura y separación respecto al suelo.

### Enfoque preferido

- Usar **fake projected shadows / sombras 2D proyectadas**, no iluminación 3D real.
- Definir una única dirección de luz/“sol” coherente por circuito o por escena.
- Elementos altos (palmeras, árboles, postes, gradas/estructuras): sombra desplazada y alargada según una altura visual estimada.
- Elementos bajos (arbustos, neumáticos y pequeños props): sombra corta o contact shadow próxima al asset.
- Mantener la sombra propia del coche como sistema independiente si ya existe; no mezclar esta mejora con la física ni con el comportamiento del vehículo.
- Sombras con opacidad contenida, borde ligeramente suavizado y sin negros puros para evitar aspecto artificial.

### Rendimiento / Android

La prioridad es **no degradar FPS en Android**. Para decoración estática, preferir sombras precalculadas/bakeadas en la construcción del circuito o en una capa estática antes que deformar, difuminar o recalcular sprites cada frame. Evitar filtros/blur dinámicos costosos en carrera.

Si se estudian sombras dinámicas para objetos móviles en el futuro, deben implementarse aparte y medirse en dispositivo Android real antes de generalizarlas.

### Plan de prueba recomendado

1. Prototipar en **un solo circuito** y en una rama/DEV futura.
2. Empezar únicamente con palmeras/árboles altos, donde el efecto visual es más evidente.
3. Comparar capturas antes/después y medir FPS, frame time y estabilidad en Android.
4. Si el coste es despreciable, extender gradualmente a postes, estructuras y objetos bajos.
5. No modificar todos los circuitos hasta aprobar visualmente y validar rendimiento del prototipo.

### Principio de diseño

La meta no es convertir CraftRace en un juego 3D ni cambiar su identidad cenital. Es añadir una capa de profundidad visual sutil: que los decorados dejen de sentirse “pegados al suelo” sin perder legibilidad de pista, trazada ni rendimiento.
