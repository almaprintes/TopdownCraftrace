# TopdownCraftrace — PROJECT HANDOFF

> **DEV 1.3.21 (24/10/2026) — ENSAYO A/B DE ESTABILIDAD AL SALIR DE CURVAS:** El propietario disfruta del mando físico/palanca pero no consigue una conducción tan natural como en otros juegos, incluso tras muchos ajustes de zonas táctiles. Auditoría confirma que TDR ya tiene amortiguación de velocidad lateral al soltar en `RaceWeightTransferScene.js` además de grip durante giro en `RaceScene.js` y coasting en `RaceCoastInertiaScene.js`. Nuevo selector **A · ACTUAL** (predeterminado, físicamente idéntico a 1.3.20) / **B · SALIDA ESTABLE** en Ajustes > Controles; se aplica en la siguiente carrera, separado de método de dirección. B incrementa **solo la tasa de neutralización lateral ×1.45** sobre asfalto con dirección neutra, nunca sobre off-road/rally/freno de mano ni durante giro, sin tocar yaw, velocidad longitudinal, centerline, coches ni crear bucles. B es práctica local: historial y PB se guardan bajo claves `ab-practice-b` específicas por circuito/coche, sin sobrescribir registros oficiales; se evita escribir fantasmas, misiones de vuelta limpia, recompensa básica y botín de fin de sesión. Badge en pista **FÍSICA B · PRUEBA · SIN RÉCORDS**; modo A sin HUD añadido. Test `scripts/physics-ab-neutral-grip-smoke.mjs` en CI Pages. DEV 1.3.21 en main, solo web/PWA, **no APK/AAB/Google Play**. Validar sensaciones mismo coche/pista con palanca en A y B, sin confundir tiempo más bajo con sensación mejor. [Continuidad](docs/continuity/2026-10-24-dev-1-3-21-physics-ab-neutral-stability.md).

> **DEV 1.3.20 (24/10/2026) — DIRECCIÓN INVISIBLE EN MEDIA PANTALLA:** Nuevo modo `steeringMode='invisible'` independiente de Palanca, Botones, Dirección Táctil (`wheel`), RC y Mando. Perfil normal: **zona transparente sobre toda la mitad izquierda** (50vw) en carrera, sin icono ni barra; dedo apoyado crea centro neutro flotante, desplazamiento horizontal relativo a ese punto manda giro RC proporcional (92px hasta máximo, zona neutra 7.5%, invierte/sensibilidad guardadas), mantener dedo fija dirección, levantar/cancelar/pérdida captura devuelve neutro inmediato. **Derecha conserva pedales GAS/FRENO visuales originales, hitboxes grandes y freno de mano**; dos dedos independientes. Modo zurdo espeja lados. Sin geometría ni nuevo RAF/timer: calcula giro solo en pointermove y usa físicas ya existentes. Ajustes añade `◌ INVISIBLE`; editor muestra solo pedales y freno de mano, layout bajo perfil propio. Nuevos `invisibleSteeringGesture.js` / `RaceInvisibleSteeringScene.js`, smoke `scripts/invisible-steering-controls-smoke.mjs`. Solo DEV PWA, **sin APK/AAB ni Play**. Pendiente iPhone: ergonomía y conducción real con dos dedos, que la zona se mantenga invisible y no afecte pedales/HUD. [Continuidad](docs/continuity/2026-10-24-dev-1-3-20-invisible-steering.md).

> **DEV 1.3.19 (24/10/2026) — CORREGIR DISTRIBUCIÓN RC DIESTROS/ZURDOS:** El propietario detecta que las dos palancas RC de DEV 1.3.18 aparecen invertidas de inicio. Se ajusta `rc_twin`: en **diestros** (leftHanded=false), **dirección horizontal a la izquierda** (x=.22) y **gas/freno vertical a la derecha** (x=.73); en zurdos, espejo de posiciones (dirección x=.78, gas x=.27). La migración `migrateLegacyRcDefaultLayout` corrige únicamente distribuciones grabadas que coinciden con el preset de fábrica antiguo (mantiene escala y freno de mano); la personalización auténtica se conserva. El editor RC usa la misma interpretación de los datos. Smoke `scripts/rc-twin-axis-controls-smoke.mjs` ampliado para verificar perfiles, migración y controles personalizados. Sin cambios de físicas, otros métodos, Play ni APK/AAB. **Pendiente conducción y ergonomía real en iPhone**, además de Actions/Pages. [Continuidad](docs/continuity/2026-10-24-dev-1-3-19-rc-handed-defaults.md).

> **DEV 1.3.18 (24/10/2026) — ARREGLAR ZONA TÁCTIL PALANCA + VISIBILIDAD RC:** El propietario mostró captura iPhone con joystick CIRCULAR antiguo a la izquierda y pedales antiguos a la derecha (no el modo RC de dos palancas) y reportó zona diminuta sin movimiento. Se detectó riesgo de desalineación entre hitbox Phaser calculada por centro/radio independientes y el DOM escalado/reubicado de la palanca visible. Nuevo `domStickPointer.js` instala eventos sobre el DOM real y usa su `getBoundingClientRect()`, con captura pointerId y retorno neutro al soltar, solo modo clásico `stick`; visible crecido a 190–236 px. `src/main.js` oculta explícitamente stick y pedales viejos cuando está activo `rc_twin`. Zonas rectangulares RC aumentadas y su hitbox se calcula desde la misma transformación visual. Nuevo smoke `scripts/race-visible-control-hitbox-smoke.mjs` en CI. No cambia física, gamepad, botones ni wheel; perfiles guardados intactos. Versión meta DEV 1.3.18, sin APK/AAB/Play. **Pendiente iPhone:** seleccionar RC · 2 PALANCAS y comprobar barras; PALANCA para joystick antiguo ampliado y arrastre. [Continuidad](docs/continuity/2026-10-24-dev-1-3-18-stick-hitbox-rc-visibility.md).

> **DEV 1.3.17 (24/10/2026) — CONTROL RC DOS PALANCAS DE UN EJE:** El propietario confirma sentirse cómodo con mando y palanca táctil, pero no con la dirección horizontal acumulativa, y propone una emisora clásica RC de doble palanca. Nuevo `steeringMode='rc_twin'` independiente de `stick`, `wheel`, `buttons` y `gamepad`. Palanca vertical izquierda (gas arriba/freno abajo), palanca horizontal derecha (dirección), inversión de lado para zurdos, centros exactos al soltar y ambos dedos simultáneos con captura de puntero independiente; freno de mano tradicional conservado. Intensidades analógicas sobre motor y giro físico existentes, sin simulador nuevo ni geometría ni loops. Posición y escala independientes en Personalizar controles; etiquetas español/inglés. JS `src/game/scenes/RaceRcTwinAxisScene.js` y `src/game/controls/rcTwinAxis.js`, test `scripts/rc-twin-axis-controls-smoke.mjs` en CI. Solo PWA DEV 1.3.17, ningún APK/AAB/Play. **Pendiente test de conducción real** con diestros/zurdos, agarre de ambos dedos, frenada y giro. [Continuidad](docs/continuity/2026-10-24-dev-1-3-17-rc-twin-sticks.md).

> **DEV 1.3.16 (24/10/2026) — CURVAS UN POCO MENOS SENSIBLES:** Tras DEV 1.3.15 el propietario pide reducir otro poco la sensibilidad en curva; se conserva EXACTA la respuesta de 0–22px (zona neutra 5px, potencia 1.8) y se prolonga solo el recorrido superior de 66px a 70px para giro máximo. A 45px el valor analógico baja de 0.487 a 0.448 (~8% menos); a 60px de 0.837 a 0.756 (~10% menos), con recorrido total y contravolante bilateral. Sin modificación de físicas, mapas, otros controles ni cálculos extra por fotograma. Smoke actualizado, meta DEV 1.3.16, solo PWA (sin APK/AAB/Play). Probar mismas curvas y recta en móvil. Ver [continuidad](docs/continuity/2026-10-24-dev-1-3-16-fine-corner-steering.md).

> **DEV 1.3.15 (24/10/2026) — CURVAS MÁS SUAVES, MISMA PRECISIÓN EN RECTA:** En prueba real de DEV 1.3.14 el propietario confirma que la salida de curva ha mejorado mucho, pero todavía gira demasiado hacia el interior durante la curva. Se conserva **exactamente la sensibilidad anterior entre 0 y 22px** de desplazamiento físico (zona neutra 5px, exponente 1.8) y se amplía únicamente el recorrido posterior hasta bloqueo total de 60px a 66px; a 45px hay aprox. 14% menos giro, recuperando 100% a 66px para curvas cerradas. **Sin analizar pista ni trabajo extra por frame**; solo escala magnitud del mismo gesto. Smoke actualizado y CI Pages. Versión DEV 1.3.15. Pendiente conducción física. Palanca, botones, gamepad, vehículos, colisiones, rankings y Android público intactos; no generar APK/AAB. Ver [continuidad](docs/continuity/2026-10-24-dev-1-3-15-touch-corner-calibration.md).

> **DEV 1.3.14 (24/10/2026) — CONTROL TÁCTIL PROGRESIVO SIN GEOMETRÍA NI AYUDA AUTOMÁTICA:** Después de probar 1.3.13 el propietario indica zigzag corrigiendo rumbo tras curvas. Pide pequeños movimientos menos trascendentes que los amplios y prioriza rendimiento iPhone. Se descartó y eliminó asistencia de rumbo con centerline antes de publicarla; NO existe autocorrección del coche ni consulta de carretera por fotograma. Solo se cambió la curva de `relativeSteeringGesture.js` de exponente 1.18 a 1.8, manteniendo 5 px de centro neutro y 60 px para giro máximo; cálculo solo en `pointermove`. `RaceWheelModeScene.js` ahora guarda prefs al crear la zona, no parsea localStorage por gesto. Prueba `scripts/touch-steering-relative-smoke.mjs` actualizada. Meta DEV 1.3.14. Ver [continuidad](docs/continuity/2026-10-24-dev-1-3-14-progressive-touch-steering.md). Falta validar comodidad física en iPhone. Sin tocar física/otros controles/Play/Supabase.

> **DEV 1.3.13 (24/10/2026) — RECTAS ESTABLES CON DIRECCIÓN TÁCTIL:** Feedback real: DEV 1.3.12 permite contravolante pero dificulta mantener recta. En `relativeSteeringGesture.js` se reemplazó la suma de ángulo excesivamente sensible por desplazamiento horizontal virtual con recorrido simétrico de 60 px a bloqueo máximo, zona neutra 5 px y respuesta progresiva `1.18`. El dedo inmóvil conserva giro; centro exacto se ilumina verde. Se amplió smoke de precisión, jitter, inversión, sensibilidad y fin de gesto. Palanca, botones, gamepad, físicas, tiempos y Play sin cambios. Meta DEV 1.3.13; pruebas en móvil pendientes. Ver [continuidad](docs/continuity/2026-10-24-dev-1-3-13-straight-line-touch-steering.md).

> **DEV 1.3.12 (24/10/2026) — DIRECCIÓN TÁCTIL RELATIVA CON CONTRAVOLANTE RÁPIDO:** Tras prueba real en iPhone el propietario indicó que en DEV 1.3.11 era incómodo regresar del giro extremo y corregir al otro lado. Se sustituyó el cálculo anclado en el punto inicial por deltas horizontales de cada movimiento, con retorno rápido hacia neutro al invertir el sentido, y dirección mantenida si el dedo queda quieto; sensibilidad e inversión se conservan. Zona por defecto más centrada para dejar recorrido de pulgar, configuraciones guardadas intactas; palanca, botones, gamepad, físicas, rankings y Google Play no modificados. Smoke `scripts/touch-steering-relative-smoke.mjs` añadido a Pages. Meta DEV 1.3.12. **Pendiente test de conducción real iPhone/Android**, especialmente chicanes, multitouch y personalización. Ver [continuidad](docs/continuity/2026-10-24-dev-1-3-12-relative-touch-steering.md).

> **DEV 1.3.10 (23/10/2026) — SANTA CRUZ: COLISIONES NUEVAS DE ENVIRONMENT STUDIO:** El propietario entregó `santa-cruz.environment(7).json` y aclaró explícitamente **«He añadido colisiones»**. Se comparó el JSON con DEV 1.3.9: **los únicos cambios eran `collisionZones` y `canopyZones`**. Se incorporaron **tres nuevas zonas sólidas reales** de 21/17/26 vértices (64 en total; `solid:true`, formas válidas sin cruces, SHA256 `b2b9185e3973a7019f702b5a2e83db5c501acc74bf4c092e9ca11185d8ab9a78`). También **dos nuevas Copas** de 10/9 vértices, quedando **13 Copas / 317 vértices** en Santa Cruz (SHA256 `861d24c68c83efbd29761ea099a86cc3d4ae8198db7f662e3fc88aeba2f1f448`), preservando las 11 anteriores. Las **cuatro barreras Bézier** originales siguen sin cambios (55 nodos, SHA256 `16215b6783ec5fa49be0309018200cad67f1701df775fa6b3ecd9d7c607cebd0`). **CRÍTICO: actualizados los DOS archivos**, `src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json` (fuente autoritativa del instalador) y `src/game/tracks/library/santa-cruz/santa-cruz.environment.json` (destino), en formato repo v7. Tests: `environment-canopy-occlusion-smoke.mjs` y `santa-cruz-official-source-smoke.mjs` verifican formas, física y conservación tras instalador; el smoke de récords acepta versión DEV 1.3.10. No APK/AAB, Play, Supabase ni tiempos modificados. **Pendiente** conducción visual: verificar bloqueos y ausencia de barreras en la calzada en Normal/Inverso; también FPS de las 13 Copas. Ver [continuidad](docs/continuity/2026-10-23-dev-1-3-10-santa-cruz-solid-collisions.md).


> **DEV 1.3.9 (23/10/2026) — COPAS DE SANTA CRUZ Y KARTING AMÉRICAS:** El propietario envió `santa-cruz.environment(6).json` y `karting-americas.environment(3).json`. Integradas SOLO las `canopyZones` (sin renombrar «Copas»): **Santa Cruz 11 polígonos / 298 puntos** [26,49,48,45,20,23,18,25,19,10,15], **Karting Américas 1 polígono / 85 puntos**. Coordenadas originales exactas, opacidad 0.93, sin autointersecciones; las variantes inversas comparten el environment físico. **CRÍTICO: el instalador `scripts/install-santa-cruz-source.mjs` sobrescribe el environment de Santa Cruz desde `src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json` durante CI: las 11 copas deben mantenerse en ESTA FUENTE (y en el destino), NO solo en `santa-cruz.environment.json`.** Quedan intactas 4 líneas de colisión de Santa Cruz [24,8,11,12] y 8 de Américas [16,3,4,4,4,5,9,27], sin zonas sólidas, fotos y metas intactas, JSON v7. Smoke comprueba checksum SHA256 de todas las zonas y fuente/destino Santa Cruz. **Pendiente** prueba visual y rendimiento con 11 máscaras en Santa Cruz. Solo DEV PWA, sin APK/AAB, Play 1.2.335/vc10 ni cloud. Ver [continuidad 1.3.9](docs/continuity/2026-10-23-dev-1-3-9-santa-cruz-americas-copas.md).


> **DEV 1.3.8 (23/10/2026) — COPAS EN KARTING TENERIFE:** Recibido `karting-tenerife.environment(10).json` (Environment Studio v8; export desde Tenerife Inverso; `trackId: karting-tenerife`). Incorporados **solo** sus 3 polígonos `canopyZones` de 78/94/36 vértices (208, sin redondear, opacidad 0.93) al environment físico de Tenerife, compartidos por Normal e Inverso. **Sin tocar las 5 barreras de colisión ni las 17 zonas sólidas**, ni fotografía/meta/publicidad; JSON canónico continúa v7. Botón genérico **«CARGAR COPAS DEL CIRCUITO»** en Environment Studio, sirve Canarias (8) y Tenerife (3) con confirmación si reemplaza zonas locales; mantenemos el nombre «Copas». CI prueba validez de la geometría, conteos originales y hash SHA256 completo `c885e69bbb936a5601471d202b524e93739032548622aeb64eb8b56ed1e12aa3`. DEV solo PWA, sin APK/AAB, Play ni Supabase. Pendiente validación visual y FPS en teléfono. Ver [continuidad 1.3.8](docs/continuity/2026-10-23-dev-1-3-8-tenerife-three-copas.md).


> **DEV 1.3.7 (23/10/2026) — KARTING CANARIAS: COPAS TERMINADAS:** El propietario mantiene el nombre **«Copas»** (no renombrar UI, claves ni migrar datos; también se podrán usar estas máscaras visuales para puentes peatonales, marquesinas o edificios NO transitables). Importado el nuevo `karting-canarias-4096.environment(2).json` en `canopyZones` oficial: **8 polígonos** con **405 vértices**, conteo [76,56,47,33,16,118,38,21], coordenadas exactas y opacidad 0.93, sin autointersecciones. El import del Editor ahora dice `CARGAR 8 COPAS CANARIAS` y mantiene colisiones. **El JSON adjunto también editaba accidental o deliberadamente la primera barrera Bézier (29 nodos vs 28): NO SE IMPORTÓ ESA MODIFICACIÓN**, al estar este cambio circunscrito a oclusiones; el original del propietario queda disponible como archivo adjunto para una futura revisión de colisiones. Continúan cinco líneas y una zona sólida sin cambios, `environment.version=7`, normal/inverso, y Play 1.2.335/vc10 sin cambios. El smoke obliga a conservar todas las zonas exactas y colisiones. Ver [continuidad 1.3.7](docs/continuity/2026-10-23-dev-1-3-7-complete-canarias-copas.md). **Pendiente aceptación visual y perf iPhone/Android**; no APK/AAB.


> **DEV 1.3.6 (23/10/2026) — COPA PERFILADA POR EL PROPIETARIO INTEGRADA:** A partir del JSON exportado por el propietario (`karting-canarias-4096.environment(1).json`), se reemplazó **solo** `canarias-left-straight-canopy-1` por sus 76 coordenadas milimétricas originales (sin redondear), conservando los otros dos polígonos, las cinco líneas y una zona sólida de colisiones, la meta, la foto y el `environment.version=7` canónico. Identificador visual DEV `1.3.6`. Smoke actualizado para fijar 76/8/7 nodos; validación visual/temperatura en móvil pendiente. No APK/AAB ni Play. Ver [continuidad DEV 1.3.6](docs/continuity/2026-10-23-dev-1-3-6-owner-canopy-outline.md).


> **DEV 1.3.5 (23/10/2026) — COPAS FOTOGRÁFICAS 2.5D EN ENVIRONMENT STUDIO:** Nueva herramienta táctil `EnvironmentBuilderCanopyOcclusionScene.js` de polígonos `canopyZones` (trazar, editar/mover vértices, pan/continuar, guardar/exportar JSON, borrar, 3 zonas piloto importables) que marca ramas de la FOTO existentes para dibujarlas por encima del coche mediante `photoCanopyOcclusion.js` (máscara de geometría y las MISMAS texturas WebP del circuito a depth 31.5, alpha .93, sin física ni nuevos colliders/recursos fotográficos). Prototipo de **tres zonas** en `karting-canarias-4096.environment.json` (dos recta izquierda y una antes de meta), compartido en Normal e Inverso. Deben ajustarse visualmente en Environment Studio sobre la imagen ampliada antes de dar el acabado por aprobado. No altera las 23 líneas ni 20 zonas sólidas originales documentadas, récords, progress, ni Play 1.2.335/versionCode 10; no APK/AAB. Tests de máscaras, geometría, intercambio de escenas, escala de Canarias, cadena de herencia del editor y build **verdes** en [Actions 39939712018](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39939712018), SHA funcional `46f10e6c` (`completed/success`). **Pendiente evaluación visual/rendimiento en iPhone/Android**. Ver [continuidad DEV 1.3.5](docs/continuity/2026-10-23-dev-1-3-5-canopy-occlusion-environment-studio.md).


> **DEV 1.3.4 (23/10/2026) — REINICIO LOCAL AUTORIZADO CON ARCHIVO HISTÓRICO:** El propietario aprobó expresamente empezar de cero SOLO en Santa Cruz y Circuito Atlántico, normales/inversos, con copia de datos locales y sin borrar rankings online. `archiveRetiredTrackRecords.js` archiva todas las claves locales de PB, historial, fantasmas y topReplay de esos cuatro ID en IndexedDB, mediante transacción completada antes de retirar los originales y marcador por circuito para no repetir el borrado. Fallo de backup = conservar intactas las claves. `src/main.js` espera la migración antes de iniciar la partida; índice derivado Race Control se limpia solo en esos cuatro. Primer PB nuevo vuelve a grabar fantasma local con la lógica de 1.3.2. Tests de fallo de archivo, preservación de circuitos ajenos y primera vuelta, más regresión anterior. GitHub Pages [39915231372](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39915231372) **completed/success**, SHA funcional `cc0d0bc6`; pendiente prueba en dispositivo. **No se han eliminado remotamente marcas ni se ha publicado Android**; la migración solo ocurrirá en el almacenamiento de cada dispositivo al abrir la DEV 1.3.4. Ver [continuidad 1.3.4](docs/continuity/2026-10-23-dev-1-3-4-archived-local-record-reset.md).


> **ROLLBACK 23/10/2026 · DEV 1.3.2 RESTAURADA:** El propietario reportó reproducción de fantasma antiguo atravesando el mapa y comportamiento extraño del menú durante la prueba de DEV 1.3.3. Se revirtió el cambio de recuperación directa de `ghostReplayRecovery.js`, su modificación de smoke y el marcador `index.html` a los blobs de la **DEV 1.3.2**, sin afectar Google Play ni eliminar datos. Build/Deploy revertido: [39913714444](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39913714444) `completed/success`. **No declarar solucionado el modo Fantasma:** 1.3.2 también falló en la prueba real. Hallazgo posterior: `RaceTop10ReplayScene` solo guarda el replay Top10 si la vuelta entra entre las 10 mejores del historial; tiempos de geometrías antiguas pueden bloquear grabaciones nuevas. La recuperación de local PB y la validez geométrica requieren rediseño y test real. El propietario propone reiniciar récords antiguos para Santa Cruz/Atlántico, pero **NO SE HA ELIMINADO NI RESTABLECIDO NINGÚN RÉCORD**. Cualquier reset debe ser explícito, por circuito/sentido, con archivo local previo y sin borrar récords ajenos/online.


> **DEV 1.3.3 (23/10/2026) — REPLAY LOCAL AÚN AUSENTE EN PRUEBA REAL 1.3.2:** El propietario reporta que el modo Fantasma sigue solicitando crear una vuelta. Se detectó que la recuperación 1.3.2 dependía del índice reconstruido de Race Control; ante historial truncado/incompleto, podía perder el enlace a un `tdr2:topReplay:<trackId>:...` que sí existía. 1.3.3 explora directamente las claves locales del circuito, valida muestras/tiempos/geométrica y recupera el PB exacto o la mejor vuelta actual **sin tocar récords antiguos ni requerir un anuncio**. El smoke añade el caso índice vacío + replay existente; Build/Deploy [39911763920](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39911763920) `completed/success` en SHA funcional `3d34ad98`. **La validación real sigue pendiente.** No confundir DEV web 1.3.3 con **Google Play 1.2.335 (vc10)**, que NO contiene esta corrección; las partidas del Android nativo y la DEV del navegador viven en almacenes distintos. Ver [docs/continuity/2026-10-23-dev-1-3-3-direct-ghost-replay-scan.md](docs/continuity/2026-10-23-dev-1-3-3-direct-ghost-replay-scan.md). Sin APK/AAB.


> **DEV 1.3.2 (22/10/2026) — FANTASMA PROPIO LOCAL + SANTA CRUZ:** Corregida la desconexión entre replays de Race Control (`tdr2:topReplay:...`) y el modo Fantasma (`tdr2:ghostPb:...` / `tdr2:ghostGeometry:...`). Se recuperan automáticamente las grabaciones locales compatibles y cada PB nuevo se guarda en el dispositivo sin tener que descargarlo desde Race Control ni mostrar anuncio. Los tiempos históricos, rankings, variantes normales/inversas y rivales online permanecen separados. Santa Cruz rechaza fantasmas antiguos fuera del trazado actual; Atlántico conserva la protección 70 %. Los sectores no escriben en una clave de replay ajena. Pruebas en CI, validación física pendiente. **Google Play 1.2.335/versionCode 10, confirmado por captura del propietario; sin APK/AAB ni publicación nueva.** Ver [continuidad DEV 1.3.2](docs/continuity/2026-10-22-dev-1-3-2-local-ghosts-santa-cruz.md).


> **DEV 1.3.1 ABIERTA · 22/10/2026:** El propietario ha confirmado que Top Down RACE ya está publicado y ha pedido iniciar una nueva serie DEV **1.3.1** exclusivamente sobre `main`. Versión visible de la PWA en `index.html`; no equivale a publicar otra APK/AAB ni cambiar `versionCode`. Corregido en `RaceScene.js` el reconocimiento de meta-paddock de Karting Américas normal/inverso por circuito físico, y en `trackReverseVariant.js` la normal de cruce inverso, con pruebas de regresión. Conservados trazado, colisiones, registros históricos, CP y condiciones de vuelta. La versión pública exacta en Play Console debe verificarse cuando vuelva a prepararse una publicación: referencias anteriores a v8 en esta documentación son históricas. Ver [docs/continuity/2026-10-22-dev-1-3-1-start-americas-inverse-paddock.md](docs/continuity/2026-10-22-dev-1-3-1-start-americas-inverse-paddock.md). **No generar ni publicar paquetes Android sin petición expresa.**

> **DEV 1.2.335 (21/10/2026) — FANTASMA ATLÁNTICO 70 %:** Se comprobó que los replays (X/Y absolutas) carecían de versión de trazado y podían pintar un fantasma del antiguo Atlántico 100 % sobre el nuevo 70 %, también en Inverso. `ghostTrackCompatibility.js` valida/huella carretera y distingue 70 % actual vs 100 % obsoleto; `RaceStaticGhostStatusScene` rechaza antiguos locales/online sin borrar tiempos, conserva PB y permite crear repetición nueva en clave separada sin exigir superar el récord previo. `RaceGhostModeScene` normaliza el tamaño mundo del sprite al cambiar textura; Race Control bloquea publicación de un replay obsoleto antes del anuncio. Smoke `ghost-atlantico-world-version-smoke.mjs` en CI. **APK QA 1.2.334 y AAB Play 1.2.334/vc9 son anteriores a este arreglo; no los publicar como solución del problema.** Requiere prueba en móvil y nuevo candidato autorizado. Ver [docs/continuity/2026-10-21-atlantico-ghost-geometry.md](docs/continuity/2026-10-21-atlantico-ghost-geometry.md).

> **PUBLICACIÓN PLAY v9 DESDE EL MAC — RELEVO 21/10/2026:** el usuario ha pedido un nuevo chat para terminar la actualización pública de Top Down RACE tras probar QA .334. Existen **APK QA 1.2.334 firmada**, artifact [12358663791](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39630545275/artifacts/12358663791) (la creación de Release directo falla por permisos 403), y **AAB production 1.2.334/vc9 SIN FIRMAR**, [candidato de GitHub Release](https://github.com/almaprintes/TopdownCraftrace/releases/tag/tdr-play-candidate-1.2.334-vc9). Play publicado sigue 1.1.188/vc8 según último estado conocido. Próximo paso: comprobar QA Android, localizar JKS original en Mac, contrastar certificado de carga en Play Console, firmar AAB con alias `topdownrace-upload` y publicar solo tras OK explícito del propietario. **No usar certificado QA para Play ni generar una clave sustituta.** Leer **[docs/continuity/2026-10-21-mac-play-v9-publication-handoff.md](docs/continuity/2026-10-21-mac-play-v9-publication-handoff.md)** antes de actuar.

> **DEV 1.2.333 · COLISIONES ERRÓNEAS EN PRIMERA CARGA (21/10/2026):** el propietario observó muros invisibles/descolocados al entrar en algunos circuitos que desaparecían al reiniciarlos. Se identificó una causa concreta: `envFor(scene)` en `raceEnvironmentRuntime.js` consultaba `scene.track` todavía perteneciente a la entrada previa de la misma RaceScene; si era Canarias 4096, insertaba sus colisiones incluso en otras pistas. Ya selecciona Environment Studio **solo mediante el trackKey actual inicializado antes del preload**, manteniendo inversos, escalas propias, colisiones originales y excepciones existentes (Canarias narrow70). Smoke de primer arranque/reinicio para todos los circuitos y tests propietarios actualizados. [Ver detalle y evidencias](docs/continuity/2026-10-21-first-entry-collision-isolation.md). Build y Deploy 1.2.333 validados en el pipeline del cambio; **queda pendiente confirmación en dispositivo real**. Última APK QA .328, Play 1.1.188/vc8: no se ha generado binario.

> **LECTURAS DE TANDA DEV 1.2.331 (21/10/2026):** ampliado el banco editorial de `src/game/ui/sessionInsightBank.json` **sin sustituir ni resetear** el anterior: 20 categorías / **1.182 mensajes ES + 1.182 EN** (2.364 textos), conservando inalterados los primeros 24 índices de las 16 categorías originales para que la memoria persistente por piloto siga siendo válida. Nuevos enfoques: mejor vuelta al inicio/final, progreso desde primera vuelta y tandas largas; ampliados freno, inercia, salidas, consistencia, etc. `sessionInsightReader.js` permite nuevos marcadores siempre apoyados en telemetría real. `scripts/session-insight-bank-smoke.mjs` actualizado para validar conteos, 66 salidas sin vueltas antes de repetir, compatibilidad ES/EN, categorías reales y continuidad del informe/exportación. La última APK QA **permanece 1.2.328**; no APK/AAB ni Play por esta petición. Detalles en [docs/continuity/2026-10-21-session-insight-bank.md](docs/continuity/2026-10-21-session-insight-bank.md). Los resultados de Actions deben confirmarse para el SHA final antes de darlo por entregado.

> **CORRECCIÓN CRÍTICA DEV 1.2.330 (21/10/2026):** al auditar el nuevo banco de 768 lecturas (384 ES + 384 EN) integrado en DEV .329, se detectó que `RaceExperienceExportReadingScene._buildReport` **seguía sobrescribiendo `report.verdict` con `sessionEngineerReading()` antiguo** (unos pocos veredictos fijos), haciendo invisible la variedad. Eliminado ese override y sus helpers muertos; `RaceSessionReportScene._buildReport` selecciona una frase del JSON una sola vez y la misma llega al informe, modal final y exportación. Se amplió test para impedir regresión. Corregida la validez de vuelta para respetar `tdrCleanLap===false`. Antirrepetición por piloto/idioma/categoría almacenada solo en el dispositivo; sin modificación de Supabase ni saves. DEV .330 no está en la APK QA .328; **no crear APK ni publicar Play** sin petición. Detalles en [docs/continuity/2026-10-21-session-insight-bank.md](docs/continuity/2026-10-21-session-insight-bank.md).

> **DEV 1.2.329 · LECTURA DE TANDA (21/10/2026):** a petición del propietario (frases excesivamente repetitivas) se implementó un catálogo independiente con **768 frases: 384 ES / 384 EN** distribuidas en 16 situaciones. Frases literales en `src/game/ui/sessionInsightBank.json`; selector basado en telemetría en `src/game/ui/sessionInsightReader.js`, conectado al informe existente `RaceSessionReportScene.js`, con historial antirrepetición en localStorage, por idioma y categoría. Cada categoría tiene **24 mensajes distintos** antes de poder repetir. Se alterna el foco entre categorías relevantes, sin inventar récords, giros ni salidas. El informe y la exportación conservan `verdict`. DEV 1.2.329 desplegada; APK QA .328 anterior NO incluye esta mejora; Google Play sigue 1.1.188/vc8. Documentación: [docs/continuity/2026-10-21-session-insight-bank.md](docs/continuity/2026-10-21-session-insight-bank.md). No preparar APK nueva salvo orden expresa.

> **APK QA 1.2.328 COMPILADA (21/10/2026):** propietario autorizó explícitamente generar APK de prueba desde DEV 1.2.328. Se publicó prerelease [tdr-qa-1.2.328](https://github.com/almaprintes/TopdownCraftrace/releases/tag/tdr-qa-1.2.328), con asset [TDR-QA-DEV-1.2.328-REAL-ADS-SIN-MEDIR.apk](https://github.com/almaprintes/TopdownCraftrace/releases/download/tdr-qa-1.2.328/TDR-QA-DEV-1.2.328-REAL-ADS-SIN-MEDIR.apk); código compilado del commit `7b16b7726be80b50b22ba346217f6c8c7139f54d`, workflow QA [39577128788](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39577128788) `completed/success`, Build + Deploy web [39577128675](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39577128675) `completed/success`. APK verificada: paquete `com.craftracestudio.topdownrace.rewardedtest`, versionCode **1000328**, certificado SHA-256 `cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f` (idéntico al APK .325), SHA-256 del archivo `85f7e2d90a19cfa176e5128771047c00f0275efff569eb8cc6782e54a9b9af53`. Incorpora exportación nativa JSON y fix Atlántico Inverso .326; permanece **PENDIENTE prueba funcional en Android real**. Instalar sobre .325 sin desinstalar; si Android exige borrado, CANCELAR. Ninguna publicación en Google Play. Más detalles en la sección 8 del handoff del 21/10.

> **ESTADO OPERATIVO VERIFICADO — 21/10/2026 · DEV 1.2.328:** después del corte .327, se reforzó `TdrPortableSavePlugin.java` para rechazar copias con `format`/ `data` inválidos y evitar borrar documentos al fallar la escritura. El smoke cubre ambas garantías y se añadió `.github/workflows/android-portable-save-ci.yml`: regenera los archivos de Capacitor y **compila Java real sin empaquetar ni firmar APK**. SHA funcional `592eeeb556256a0f2db4cf29ba170a2540fb7a18`; GitHub Actions **compilación nativa 39575649145 success** y **Build + Deploy Pages 39575649155 success**. La **última APK QA sigue siendo 1.2.325 / versionCode 1000325**: la exportación Android nativa **NO ha sido probada en dispositivo**. Mantener en producción Google Play 1.1.188/vc8; no compilar nueva APK sin autorización. Este estado se amplía en [docs/continuity/2026-10-21-android-json-cloud-export-handoff.md](docs/continuity/2026-10-21-android-json-cloud-export-handoff.md), sección 7.

> **CORTE PREVIO DE CONTINUIDAD (21/10/2026 · DEV 1.2.327):** antes de continuar, leer **[docs/continuity/2026-10-21-android-json-cloud-export-handoff.md](docs/continuity/2026-10-21-android-json-cloud-export-handoff.md)**. DEV web **1.2.327** publicada (Actions 39561387185 verde). Copia remota creada, pero la descarga JSON **no funcionaba en Android .325**: la corrección del guardado nativo está **solo en fuente .327 y todavía NO compilada/probada en APK**. La última APK QA verificada sigue siendo **1.2.325**. No desinstalar sin copia local/online y recuperación verificadas; no publicar Play.

> **RESUMEN CANÓNICO A 20/10/2026 PARA NUEVO CHAT:** leer **[docs/continuity/2026-10-20-handoff-general.md](docs/continuity/2026-10-20-handoff-general.md)** junto con este historial. A continuación se conserva la cronología detallada por DEV; las notas más antiguas son históricas. **Última APK QA .317 NO quedó cubierta por el parche posterior de firma.**

## Android QA — Firma verificada y protección anti-APK incompatible (20/10/2026)

Auditoría complementaria de la APK 1.2.317, motivada por las instalaciones que exigen desinstalar. Encontrada **regresión real de firma en CI**: en el job GitHub Actions 39478142886 el `keytool` creó/restauró `$HOME/.android/debug.keystore` (alias `androiddebugkey`) con certificado SHA-256 `cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f`; sin embargo el `apksigner verify` del APK efectivamente entregado 1.2.317 da **otro certificado** `63c30fb33ef62289ffce961a8dadc2efe85480ce121b1043996370a6949d4358`. Por tanto **NO se ha demostrado que el instalable .317 reutilice la clave cacheada** y no debemos prometer que se actualizará con futuras APK. La firma final de .314 tampoco estaba registrada en su job: no afirmar que .317 se instala encima de .314.

Corrección preventiva: `android/app/build.gradle` contiene `qaStable` apuntando **de forma explícita** al `$HOME/.android/debug.keystore` del servidor; se selecciona para la compilación QA solo con `TDR_CI_QA_STABLE_SIGNING=1` (la flavor production/Play y su versionCode 8 siguen intactos). En el workflow se **fija la huella pública esperada** de esa clave restaurada, se aborta si la clave cambió o desapareció de la caché y se comprueba el SHA-256 del certificado del **APK REAL** firmado por Gradle antes de subir artefacto o release. Una prueba smoke exige estas protecciones. La caché CI no es archivado permanente: si expira, el workflow falla de forma segura; para larga duración hay que custodiar una clave privada dedicada en secrets y verificar su huella antes de usarla. Nunca guardar ni imprimir la clave privada en repo/logs.

**Entrega:** corrección en fuente, `[pwa-only]` deliberado para NO lanzar nueva compilación Android sin autorización. El release .317 existente no se modifica retroactivamente. Una próxima APK debe incrementar su QA versionCode (por ejemplo 1000318), seguir usando exactamente una misma clave respaldada, y comprobar actualización in situ en hardware antes de prometer retención de datos. Si el usuario ya tiene una APK con otra firma y no se conserva la clave anterior, Android no ofrece actualización directa: exportar partida y probar restauración sin eliminar primero la instalación antigua.

## DEV 1.2.317 — APK candidata final Android y actualización de QA instalada

Petición del propietario del 20/10/2026: compilar APK final de prueba a partir de la última DEV 1.2.316 antes de autorizar producción, e intentar que **actualice la APK anterior sin desinstalar ni perder datos del perfil**. Causa técnica comprobada: la flavor `deviceTest` tenía versionCode igual al público 8, y cada runner GitHub efímero generaba una clave debug distinta; Android rechaza actualización si **packageName/firma** no coincide o si versionCode no crece. La nueva QA respeta el mismo packageName `com.craftracestudio.topdownrace.rewardedtest`, pero fija **versionCode 1000317 solo en `deviceTest`**. La flavor `production` conserva Play 1.1.188 / vc8. Se usa caché GitHub Actions `~/.android/debug.keystore`, generando la clave solo si es la primera prueba de esta serie. Esto facilita que .318 y futuras QA actualicen sobre .317 manteniendo el perfil. **No garantiza actualización de .300/.314**, que probablemente tienen otra firma aleatoria: Android no permite conservar sus datos al desinstalar. La caché de Actions puede caducar, por lo que para un proceso de QA permanente se recomienda proteger una clave dedicada mediante un secreto de repositorio; nunca reutilizar el keystore público de Play.

El workflow `android-revenuecat-qa-apk.yml` construye con código web de producción (sin controles experimentales), minificación y datos originales, anuncios reales AdMob/RevenueCat, conserva packageName rewardedtest, valida el versionCode y la firma con aapt/apksigner, publica artefacto y Github prerelease `tdr-qa-1.2.317` con APK directa. Añadido `scripts/android-qa-signing-smoke.mjs` como paso del workflow. **Antes de desinstalar la .300/.314 el jugador debe entrar a Ajustes → Cuenta y descargar copia local; si usa copia nube, verificar que conoce cómo iniciar sesión y restaurarla.** No borrar ningún perfil en Supabase. No se garantiza recuperar datos locales perdidos sin backup. Nada se publica en Play Store; nueva AAB con firma y versionCode público sucesor se hará solo después de la aceptación del propietario.

## DEV 1.2.316 — Más sensación de velocidad en carga de circuito (20/10/2026)

Petición del propietario al ver el Gripline lateral DEV 1.2.315: «Está muy guapo, pero quiero más sensación de velocidad». Solo se aumenta el dinamismo visual de la compuerta de carga `src/game/ui/griplineNativeLoading.js` para fotografía nativa, sin modificar la velocidad real de los coches ni los tiempos de carga. Las ruedas pasan de vuelta cada **0,8 s** a cada **0,26 s** (aprox. x3,1), las líneas bajo el coche se mueven hacia la izquierda cada **0,24 s** en vez de 0,65 s (aprox. x2,7). Se añaden **dos carriles de estelas de aire** detrás de la carrocería, que se desplazan a la izquierda con velocidades ligeramente distintas y son tapados por el coche para reforzar la sensación de movimiento de derecha a izquierda del paisaje; carrocería y coche permanecen quietos y centrados, de perfil mirando a la derecha. Solo CSS transform/opacity y pseudo-elementos, sin `requestAnimationFrame`, `setTimeout`, nuevas texturas, motores, WebGL ni físicas. `prefers-reduced-motion` desactiva también estas estelas. Verificaciones en `scripts/gripline-native-loader-smoke.mjs`. No afectar Android público, circuitos ni RALLY 1.0. Solo PWA DEV en este commit; la APK QA .314 conserva la animación anterior/no incluye esta nueva mejora hasta reconstrucción solicitada.

## DEV 1.2.315 — Avenir Gripline animado al cargar las fotografías (20/10/2026)

La etiqueta técnica «CARGANDO FOTOGRAFÍA» pertenecía exclusivamente a createGate() en src/game/tracks/imageNativeRaceLoader.js, una compuerta necesaria para decodificar fotos de circuitos image-native antes de activar RaceScene. No se cambia la pantalla premium de preparación de carrera ni sus consejos, mapa o progreso.

En esa compuerta se muestra **CARGANDO CIRCUITO…** (LOADING TRACK… en inglés) bajo el **Avenir Gripline lateral mirando a la derecha**, centrado y quieto, con las dos ruedas girando y líneas del suelo deslizándose hacia la izquierda. Los dos pequeños WebP con transparencia provienen de la vista lateral derecha suministrada por el propietario: carrocería separada y rueda reutilizada en ambos ejes, logotipo no espejado. Animación únicamente CSS, sin bucles de juego, consultas de fotogramas, física ni WebGL; respeta prefers-reduced-motion y se retira al cerrar la compuerta.

La ruta de ERROR conserva íntegros los controles de recuperación de foto (incluido archivo .tdrtrack) y «Volver sin cambiar circuito». No se modifica la lógica de decodificación, tiempos de espera, trazados, colisiones ni el perfil aprobado RALLY 1.0. Nuevo verificador scripts/gripline-native-loader-smoke.mjs integrado en prebuild. Solo DEV 1.2.315; no generar APK/AAB ni publicar Play Store.

## DEV 1.2.314 — APK Android QA consolidada solicitada por el propietario (20/10/2026)

Se prepara la **APK deviceTest release QA firmada con clave de pruebas**, con paquete independiente `com.craftracestudio.topdownrace.rewardedtest`, minificada, AdMob y RevenueCat reales como la anterior .300, para comprobar integraciones reales sin publicar en Google Play. El instalable debe salir **exclusivamente del HEAD main** y del workflow `.github/workflows/android-revenuecat-qa-apk.yml`, con tag de GitHub prerelease `tdr-qa-1.2.314`, artefacto y archivo `TDR-QA-DEV-1.2.314-REAL-ADS-SIN-MEDIR.apk`. No mover versionCode/versionName públicos ni AAB.

Incluye los cambios posteriores a .300: geometría/correcciones de Arafo–Los Loros, Inducción misión 7 (`1.2.311`), recuperación de caché de rankings/tiempos de Atlántico (`1.2.312`) y formularios de ubicación autodeclarada Global/Continente/País/Región al crear nick y en Ajustes → Cuenta (`1.2.313`). El paquete prueba no modifica los registros Supabase históricos ni asigna ubicación falsa; el modo oculto MEDIR no aparece durante uso normal. Probar circuitos y Arafo sin alterar físicas RALLY 1.0, rango de rankings de pilotos con y sin región, persistencia de misión 7, y anuncios auténticos sin pruebas repetidas de impresiones.

**Puerta de calidad:** el verificador de Android se actualiza para permitir únicamente el MEDIR de asistencia oculto tras siete toques (introducido en DEV 1.2.308), sin permitir los controles experimentales DEV; no confundir la cadena de ayuda incluida en el paquete con una pantalla visible. No afirmar que existe ni ofrecer enlace de descarga hasta que GitHub Actions confirme job de APK `completed/success`, exista el asset del release público y se verifique el SHA del workflow. No publicar Play.

## DEV 1.2.313 — Alta de piloto con ubicación declarada y rankings geográficos corregibles

Investigación READ ONLY de Supabase 20/10: 21 perfiles, de los cuales siete tienen `continent_code='XX',country_code='XX',region_code='XX'` porque `claim_my_pilot_nick` crea un perfil reservando el nick con ubicación provisional 'XX' (migración 014). Esto hace que GLOBAL incluya sus récords, mientras los rankings EU/ES/ES-CN correctamente no los incluyan; jamás asumir que 'XX' significa España. Distribución real: Atlántico 11/10, Américas 2/0, Canarias 3/3, Canarias 4096 1/0, Tenerife 3/2, Arafo 1/1, Santa Cruz 7/5; Santa Cruz tiene además un registro sin perfil y por diseño no puede aparecer en la clasificación firmada.

Petición: el formulario de creación de nick explica los rankings **Global, Continente, País y Región** e incorpora continente declarado, país (lista ISO con etiquetas localizadas) y región opcional. **No se usa geolocalización, permisos, IP ni idioma del dispositivo para elegir ubicación.** España usa una lista normalizada de comunidades autónomas; Canarias se guarda como `ES-CN`, coincidente con las clasificaciones existentes. Fuera de España se admite nombre/código de región con normalización reproducible (se recomienda código de estado/provincia cuando lo conozcan). Sin región se guarda `XX`: participa en Global/Continente/País pero no Región, explicado al jugador. El alta primero reserva el nick atómicamente con la RPC existente, luego persiste ubicación **en ese mismo user_id** mediante `upsert_my_profile`, y **solo entonces** guarda el nick en el dispositivo. Si falla la red, se puede reintentar; no se da por completada el alta.

Los jugadores anteriores disponen de formulario bajo Ajustes → Cuenta, con lectura del perfil existente y botón `GUARDAR REGIÓN DE RANKING`. Solo actualiza la cuenta cuya identidad coincide exactamente con el nick local (sin transferir perfiles ni récords entre UUID), no asigna códigos a perfiles 'XX' sin interacción explícita. Tras guardado confirmado, invalida exclusivamente las **cachés locales de clasificación**, no tiempos, fantasmas, perfiles, monedas ni anuncios.

El diálogo inicial se hace desplazable también en móviles apaisados. No hay consultas por fotograma ni reescrituras SQL, ni nuevas tablas. No generar APK/AAB ni publicar Play sin orden explícita; APK .300 todavía no incorpora este formulario. Smoke `scripts/pilot-ranking-region-smoke.mjs` forma parte de prebuild.

## DEV 1.2.312 — Recuperación de récords online vacíos en Atlántico / Race Control

QA del propietario en APK Android .300: Atlántico aparece sin tabla online pese a haber publicado un tiempo, mientras que otros circuitos muestran datos. Consulta READ ONLY a Supabase real (20/10/2026): `public.track_records` contiene **11 récords** de `circuito-atlantico` (11 perfiles asociados), mejor 8759 ms; `web_leaderboard_snapshot` contiene 10 entradas públicas con identificador `circuito-atlantico`. **NO hay pérdida de los tiempos en la nube ni se necesita migración SQL.**

Causa de la tabla vacía desde el cliente: `StatsBroadcastScene._renderBroadcastRecords()` mostraba exclusivamente `cloudSnapshotPolicy(trackId).cached.payload`, aun cuando la caché por circuito no existía o contenía `[]`; solo `ACTUALIZAR` hacía consulta. Publicar desde `sessionRecordPublishOffer` confirmaba la subida pero **no guardaba una copia nueva de la clasificación** para la próxima apertura.

Corrección mínima y persistente: al entrar a Race Control, cuando un circuito carezca de clasificación cacheada o ésta esté vacía, intentar **una sola recuperación por circuito y estancia de escena**, primero con `ensureRaceControlPilotProfile → getRaceControlSnapshot` (clasificaciones, VS con autorización), y ante fallo utilizar `getPublicRaceControlSnapshot` solo para GLOBAL sin ghost/VS ni suplantar identidad; guardar bajo `tdr2:leaderboardSnapshot:<trackId>`. Renderizar solo si el mismo circuito sigue seleccionado y la tabla existe. Si no hay red, dejar botón manual ACTUALIZAR y explicar que no pudo cargarse. Sin polling ni llamadas por fotograma. Después de una publicación **confirmada** desde informe de carrera, actualizar la misma caché en lectura no bloqueante; cualquier fallo de lectura **jamás anula el récord publicado ni exige otro anuncio**. En ambos flujos permanece el ID `circuito-atlantico`, no migrar `track01` ni mezclar pistas o cuentas.

Se añade smoke `scripts/online-snapshot-recovery-smoke.mjs` en `prebuild`. No se modifica Supabase, Base de Física, pistas, economía de anuncios ni versión de Play; `[pwa-only]`, sin generar APK. **Importante:** la APK .300 instalada no incluye esta corrección hasta una nueva compilación Android autorizada. Comprobar en la próxima candidata Atlántico GLOBAL con el tiempo ya existente, salir/reabrir Race Control, alternar circuitos y probar reconexión sin crear nuevos tiempos.

## DEV 1.2.311 — Inducción, misión 7 «De compras»: actualizar el lobby tras comprar

Reportado el 20/10 por el propietario probando APK Android «.300» antes de publicación: tras cumplir la misión 7 el panel del lobby sigue sin mostrarla terminada, mientras que el pase de temporada permite reclamarla.

**Causa en main:** la misión `store-buy` usa `storeBuys` de `seasonTelemetry`. Una compra de pack ejecuta `buyMaterialPack() → recordStoreBuy()` desde la Tienda superpuesta sobre la misma escena de lobby; esa compra se guarda correctamente y `SeasonScene` consulta datos frescos al abrirse. Sin embargo, el lobby solo recalculaba `renderDomCards` al montarse o al reclamar en su propia tarjeta: quedaba una fotografía antigua del progreso.

**Arreglo, sin polling:** `recordStoreBuy()` emite `tdr:seasonProgressChanged` *después* de persistir el incremento. El lobby escucha el evento, recalcula solo el panel de temporada mediante `renderDomCards(...,true)`, y reaplica `polishSeasonCard` (aviso RECOMPENSA DISPONIBLE y acceso al pase). La suscripción se limpia al cerrar la escena; no redibuja coche/circuito ni vuelve a cargar sus imágenes. La transacción, economía, misión y reclamación mantienen una única autoridad, sin dar recompensas extra.

**Validación requerida en Android:** reproducir desde un perfil con misión 7 activa: entrar a Tienda desde lobby, adquirir un pack con monedas, cerrar Tienda y comprobar que el panel muestra recompensa disponible, entrar al pase y reclamar exactamente una vez; después debe avanzar a misión 8. Reiniciar y comprobar persistencia. Las compras fallidas no cuentan. El script `scripts/induction-store-lobby-smoke.mjs` valida los enlaces y guardas estáticos. Este cambio en DEV NO actualiza la APK .300 instalada; requiere nueva APK tras autorizar el usuario. No generar APK/AAB ni publicar Google Play por esta iteración.

## DEV 1.2.310 — A/B del bucle Phaser (solo iPhone DEV; RAF frente a setTimeout)

El propietario pidió recuperar la pista histórica del 28–30/08/2026 sin arriesgar Android, cuyos perfiles de rendimiento han sido distintos. En aquel momento iPhone probó `forceSetTimeOut: true` con WebGL `desynchronized: true`; el cambio a `forceSetTimeOut=safeMode&&!forceRafLoop()` se produjo en DEV 1.0.133 (16/09/2026). La coincidencia histórica no demuestra que sea el culpable del rendimiento variable actual.

Se incorpora **exclusivamente en iPhone DEV** un selector reversible dentro del menú de asistencia MEDIR (requiere el acceso oculto habitual: 7 toques en CALIDAD GRÁFICA): `PROBAR LOOP TIMEOUT (REINICIA)` / `VOLVER LOOP RAF (REINICIA)`. El campo `LOOP RAF/TIMEOUT` se incorpora al informe junto con `TIMER NO/SI`. La clave local `tdr2:devIosTimeoutLoop:v1` solo se consulta al crear el juego en una DEV iPhone; el modo por defecto sigue siendo RAF. El cambio exige reiniciar el proceso Phaser. **Producción, Android, iPad y demás navegadores no cambian**, aunque posean la clave en almacenamiento. Si SAFE está activo no se habilita la prueba y se respeta el camino de recuperación original `safeMode&&!forceRafLoop()`.

No se toca ni audio, texto PHASER, resolución, WebGL DESYNC, pistas, cámara, colisiones ni físicas RALLY 1.0. Se incorpora un smoke dedicado a modo por defecto, A/B, regresión Android/producción, modo seguro y estado del botón, y se actualiza el test de estabilidad para verificar la ruta sin imponer un driver global.

**Protocolo en iPhone:** calidad Alta, RES BASE 1.5, WebGL DESYNC solicitado, TEXTO PHASER, MOTOR ON y mismo circuito/coche. Medir RAF 30–60 s, COPIAR; activar TIMEOUT y reiniciar, conducir primero sin MEDIR, repetir medición y COPIAR con observación manual de calor; volver RAF y repetir para un A/B/A. Controlar P95/P99, >50ms, ráfagas, sensación real, tiempo desde apertura y temperatura al tacto. Se mantienen Android y Play Store 1.1.188/vc8; no generar APK.

## DEV 1.2.309 — Contexto temporal y térmico del diagnóstico de rendimiento

Petición del propietario 20/10: contextualizar la intermitencia de fluidez de iPhone por fecha/hora, tiempo entre pruebas, temperatura y otros factores sin activar observación permanente.

El panel MEDIR oculto desde DEV 1.2.308 ahora añade fecha/hora local **inicio** y **actual**, duración de toma, tiempo transcurrido desde apertura de la PWA y desde entrada a carrera, último informe guardado y minutos/horas/días desde su cierre, variación de FPS frente al anterior, circuito (si se identifica), DPR, RAM aproximada cuando navigator.deviceMemory está disponible, número/duración de salidas de segundo plano mientras MEDIR estaba activo y estado de batería si `navigator.getBattery()` está disponible (Safari iOS suele no ofrecerlo). Nada se envía a servidor: al pulsar **COPIAR** se guarda localmente un resumen mínimo de la prueba (hora final, FPS, P95 y porcentaje >50ms) para comparar con la siguiente incluso tras reiniciar el juego; retención máxima 90 días.

**Importante:** la PWA no dispone de sensor público de temperatura interna de iPhone. Botón `CALOR: SIN INDICAR → FRÍO → TEMPLADO → CALIENTE → MUY CALIENTE` en el panel, a seleccionar por el tester. Informe rotulado **CALOR AL TACTO (MANUAL)** con estado de inicio y actual, **SIN SENSOR TÉRMICO**. Para una nueva prueba con estado inicial seleccionado, pulsar REINICIAR tras elegirlo. No se inventan grados Celsius ni temperatura del chipset.

No iniciar ninguna medición si MEDIR no está activo; ningún muestreo periódico adicional, ninguna intervención en físicas RALLY 1.0, colisiones, audio, texturas, resolución ni WebGL. En builds públicas el modo de asistencia sigue oculto tras siete toques en Ajustes → Gráficos, sin opciones de mutación DEV. Verificación mediante `check:performance-context`.

## DEV 1.2.308 — Diagnóstico oculto de asistencia

Solicitud del propietario, 20/10: el botón MEDIR **no debe verse en el juego normal**, pero debe poder activarse en un móvil de un tester para asistir problemas de rendimiento sin reeditar ni recompilar.

Implementado un desbloqueo no anunciado en **Ajustes → Gráficos: tocar 7 veces seguidas el título CALIDAD GRÁFICA en 5 segundos**. La opción de asistencia aparece únicamente tras el gesto y ofrece DESACTIVAR ASISTENCIA. Caduca después de 30 min y usa exclusivamente `sessionStorage` (no cuenta, preferencias, progreso, nube ni servidor). Es un ocultamiento UX, **no una medida de seguridad**.

Al iniciar una carrera, `mountRaceDevFrameDiagnostics` comprueba el permiso temporal. En modo normal no monta el DOM ni suscribe escuchas PRE_STEP, POST_STEP, PRE_RENDER, POST_RENDER, PRE_UPDATE o POST_UPDATE. Con permiso activado, muestra MEDIR, pero **no mide nada hasta tocar MEDIR**, y MINIMIZAR mantiene una medida activa. Al abandonar carrera elimina todas las escuchas y nodos. Lectura de FPS, tiempos de frame y CPU, P95/P99 y ráfagas; salida COPIAR. Funciona en iOS y Android (y otros navegadores); no envía datos automáticamente.

Compilación de producción: solo herramientas **de lectura** (MEDIR, REINICIAR, COPIAR) y sin toggles de audio, textos, HUD, imagen, WebGL o resolución. DEV iPhone sigue conservando su banco de pruebas A/B al activar asistencia. El hecho de que el modo de soporte exista en el código de producción NO implica publicar un nuevo Android: versión Play 1.1.188 vc8 permanece intacta.

Validar gestos y mediciones en hardware iPhone/Android; confirmar que en producción la superficie está oculta por defecto y que, tras 30 min, el permiso expira. Se añade smoke `scripts/support-race-diagnostics-smoke.mjs`, integrado en `prebuild`.

## DEV 1.2.307 — A/B de resolución y cadencia de fotogramas en iPhone

Los resultados de 20/10 con DEV 1.2.306 muestran DESYNC 47,1 FPS, >50 ms 91/2570 (3,5 %) y SYNC 48,0 FPS, >50 ms 60/2099 (2,9 %). El propietario afirma que **SYNC tiene tirones perceptiblemente peores** pese a la media ligeramente superior. La bandera WebGL real sigue siendo `NO DISPONIBLE`; el modo solicitado no confirma si WebKit lo respetó. **DESYNC es la referencia subjetiva preferida**. El selector anterior permanece reversible; la web no puede modificar la preferencia local del propietario por sí sola, así que debe volver a DESYNC antes de la prueba.

DEV añade control del framebuffer **RES BASE / RES 1.0 (REINICIA)** solo en la consola de medición de iPhone: usa localStorage de diagnóstico, no modifica el ajuste gráfico general. Un `baseResolution` de 1.5 pasa temporalmente a 1.0 y vuelve al valor de origen; si el presupuesto original es 1.0, deshabilita la comparación. En producción y en dispositivos no iPhone no se aplica el ajuste, aunque haya quedado la clave local. No reescala fotos, circuitos, colisiones, cuerpos, mundo, HUD, física RALLY 1.0, audio ni WebGL.

El diagnóstico MEDIR incorpora histograma fijo de intervalos de frame (bins 1 ms, cap 250 ms), **P95/P99 aproximados**, número de **ráfagas consecutivas de >50 ms** y máximas rachas de >50 y >33,4 ms, sin ordenar arrays ni crear un segundo RAF mientras se juega. Esto captura saltos molestos que las medias pueden ocultar.

**Prueba recomendada:** confirmar WEBGL DESYNC solicitado, MODO high, TEXTO PHASER y MOTOR ON. Capturar 30 s en RES BASE 1.5; seleccionar RES 1.0 para reiniciar, repetir en mismo circuito con trayectoria comparable, luego restablecer RES BASE. Priorizar sensación y P95/P99, rachas y máximos; la CPU de PASO (0,7–0,8 ms previos) no implica que GPU no pueda ser cuello de botella. No hay APK/AAB ni publicación en Google Play.

## DEV 1.2.306 — Medición iPhone fiable: ESCENA CPU + PASO CPU (sin modificar jugabilidad)

El propietario midió 2152 fotogramas con PHASER y RAF de texto OFF: **38,2 FPS**, 530/2152 (24,6 %) >33,4 ms y 218/2152 (10,1 %) >50 ms, pico 116 ms, MODO high, RES 1.5, SAFE NO, TIMER NO y seis fuentes de motor. Esto es prácticamente idéntico al primer test HTML+audio ON (37,8 FPS, 10,3 % >50 ms), por lo que la mejora puntual PHASER 45,5 FPS **no se replicó**; no proclamar victoria del cambio de textos.

Hallazgo: `UPDATE CPU 0.0 / 0.0 ms` se repite en todos los informes; se instrumentaba mediante modificación del `RaceClass.prototype.update` efectuada tras construir y crear la escena. Phaser puede utilizar una referencia de actualización ya capturada, por lo que ese wrapper tardío no es una fuente fiable. Se elimina ese monkey patch y se sustituyen sus mediciones por eventos nativos Phaser: `Phaser.Scenes.Events.PRE_UPDATE/POST_UPDATE` = **ESCENA CPU** (carrera incl. callbacks), `Phaser.Core.Events.PRE_STEP/POST_STEP` = **PASO CPU** (global), `PRE_RENDER/POST_RENDER` = render JS existente. `OTROS` ahora resta el tiempo del paso medido, no el wrapper ausente. Si no se observa una muestra real, se indica «SIN MUESTRAS» en lugar de 0.0 ms engañoso. Contadores solo activos al pulsar MEDIR, se limpian los cuatro hooks tras salir. Los tests de diagnóstico se actualizaron para verificar todos los hooks, conteo sin muestras y cleanup.

**Solo diagnóstico y versión DEV:** no tocar gráficos, limitadores, WebGL, audio, DOM, colisiones, línea Bézier, físicas RALLY 1.0 ni Google Play. Mantener PHASER por defecto en iPhone DEV durante esta iteración para comparar exactamente la misma configuración. Tras verificar la medición real con un nuevo informe, evaluar A/B del WebGL SYNC desde el propio panel.

## DEV 1.2.304 — Optimización iPhone de la línea Bézier de Arafo (sin modificar colisiones)

Feedback del propietario, 19/10: «En iPhone va peor. No se como irá en android» tras reemplazar 27 zonas por 1 línea Bézier de 190 nodos. Se descarta asumir que «1 línea» implica menos CPU: `sampleCollisionLine(line,18)` genera ~1222 segmentos físicos. Auditoría de `raceEnvironmentRuntime.js` identifica dos fuentes plausibles de sobrecoste:
1. `resolveBodyAgainstColliders` escribía `body.setPosition` y las velocidades **dos veces por fotograma** (según capas/cuerpos) incluso si no había contacto, a diferencia de los 27 polígonos, cuyo resolvedor solo escribe tras una colisión real. Corrección: indicador `hadContact` para círculos y segmentos; si no hay impacto, salida temprana sin setters. Se mantiene idéntica la respuesta a choques reales.
2. Índice espacial por defecto con celdas de 256 px y margen de 96 px entrega demasiados segmentos por vecindad en tramo montañoso. Se aplica **únicamente a Arafo con una línea densa** índice compacto 128 px/margen 40 px. Otros circuitos siguen 256/96. El fallback de radio excepcional conserva exhaustividad.

Comparación geométrica offline de la barrera **sin datos reales de FPS:** >1.200 segmentos, alrededor de 100 candidatos medios por consulta anterior frente a ~35 candidatos en el nuevo índice (reducción aproximada 65 % de candidatos, **no de tiempo de fotograma ni de CPU**). Nuevo test `scripts/arafo-collision-index-optimization-smoke.mjs` verifica reducción, alcance seguro de la búsqueda alrededor de cada barrera, aislamiento entre circuitos, preservación del dataset (190 nodos, 0 zonas) y ausencia de `setPosition` sin choque. Ejecutado en Pages CI y prebuild.

**Nada de volver a 27 zonas:** conservar la única línea Bézier exactamente como la exportó el propietario. Congeladas todas las físicas RALLY 1.0 aprobadas en DEV 1.2.301; sin cambios en `rallyDrivingProfile.js`, conducción, fotografía, meta, pistas ni economía. **Pendiente test A/B en el iPhone** con mismas opciones, después recopilar impresiones Android. No atribuir la regresión de forma definitiva hasta medir en dispositivo. DEV PWA únicamente; sin APK/AAB ni Google Play.

## DEV 1.2.303 — Arafo: 27 zonas antiguas eliminadas, nueva colisión Bézier del propietario

**Autorización (19/10):** el propietario exportó `rally-arafo-los-loros.environment(1).json` desde Environment Studio y confirmó literalmente «Fuera zonas». Se sustituye por completo el fichero publicado `src/game/tracks/library/rally-arafo-los-loros/rally-arafo-los-loros.environment.json` (no se mezclan obstáculos antiguos): **1 única `collisionLine`**, 190 anclajes Bézier exactos del export, tipo `collision`, `halfThickness: 9`; **`collisionZones: []`**, 0 barreras lineales y sin decoraciones/superficies añadidas. Los 27 polígonos (484 vértices) anteriores quedan eliminados del ambiente activo del repositorio; la versión anterior sigue recuperable por historia de Git.

Validación: esquema de export v7, ID y `repositoryPath` correctos, nodos y handles finitos, línea muestreable por `sampleCollisionLine(line,18)` (aprox. 1223 puntos), sin saltos grandes entre muestras; spawn real y los dos checkpoints permanecen a más de 30px del nuevo muro. Cerca del primer punto de la polilínea de centro existe menor holgura que en el spawn real: no mover automáticamente las colisiones dibujadas; verificar en pruebas de conducción si necesita ajuste por el propietario. Se actualiza el `owner-environment-import-smoke.mjs` integrado en CI: impide reintroducir 27 zonas, verifica 190 nodos, resolución en runtime, coherencia y continuidad.

**Importante:** la RALLY 1.0 aprobada se conserva intacta (sin cambios en `rallyDrivingProfile.js`, `CAR_SPECS`, `RaceScene.js` ni frenos). Sin modificar geometría de pista, gates ni cámaras; solo el ambiente/collision dataset, smoke, continuidad y marcador DEV. **PWA DEV 1.2.303 únicamente. No APK, AAB ni Google Play.** Revisar manualmente el comportamiento del coche al golpear muros, especialmente en horquillas y en los extremos del tramo.

## DEV 1.2.302 — Environment Studio: sin cartel de diagnóstico, navegación a dos dedos y margen en bordes

Petición 19/10: al colocar/refinar colisiones de Arafo–Los Loros, eliminar etiqueta rectangular verde «DEV 1.2.225 · A→B CANVAS 2D…» y facilitar el desplazamiento hasta los límites de la fotografía con dos dedos en iPhone. No alterar físicas RALLY 1.0 aprobadas, ni geometry ni zonas guardadas.

`EnvironmentBuilderAmericasImportScene._syncDomStatus` ya no crea el testigo visual A→B; borra incluso el nodo legado `[data-stage-render-state]` si quedase presente. El trazado abierto y la rasterización siguen intactos, y continúa la protección contra escenas de carrera superpuestas.

`environmentMapNavigation.js` centraliza el pan/zoom matemático y el margen editorial de **112 px de pantalla** alrededor de la fotografía. `EnvironmentBuilderPinchAnchorScene` instala bounds **Phaser reales ampliados** (no solo límites JS), conserva el scroll al soltar, aplica el primer movimiento intencionado sin perder distancia y permite seguir desplazándose si un dedo sale un poco del viewport después de comenzar dentro. Dos dedos en herramientas de colisión navegan (no transforman assets), respetando las cancelaciones existentes de trazos provisionales. En SELECT la transformación de assets seleccionados con dos dedos se mantiene. El pan libre con un dedo comparte bounds ampliados.

Protección adicional: al iniciarse un gesto con dos dedos se restauran exactamente los nodos originales de una línea Bézier editada (incluidas inserciones) y los puntos originales de una zona arrastrada; los trazos provisionales de pen/zona siguen cancelándose según el guard ya existente. Los ajustes de fit o selección de circuito recalculan el margen de pantalla para evitar bordes inaccesibles.

Pruebas antirregresión: smoke `environment-stage-runtime-diagnostic-smoke.mjs` ahora verifica ausencia del cartel, márgenes en bordes, traslación pura con dos dedos, zoom anclado a punto común, respeto de gestos de colisión y escenario de rally sin diagonal. `environment-stage-canvas-smoke.mjs` conserva las comprobaciones del raster. No hay modificaciones a archivos `.environment.json` ni a fotos, checkpoints, camera de carrera, física RALLY, piezas ni economía. Sólo PWA DEV 1.2.302; sin APK/AAB ni Play.

## 19/10/2026 — RALLY 1.0 APROBADO por el propietario (congelar conducción DEV 1.2.301)

Tras probar el HÉLIX Spark en Arafo–Los Loros, el propietario confirmó que el manejo hacia delante le resulta excelente y ordenó **mantenerlo tal cual**. Destaca como especialmente buena la progresión natural: primero aprender el tramo a velocidad controlable y después ganar velocidad al instalar piezas. **Decisión de diseño confirmada, no pendiente de validar.**

**Invariante:** preservar exactamente la conducción RALLY 1.0 de DEV 1.2.301 (commit `e4e5252c64e14583f622e6e9bad014223f6f7a4a`): aceleración ×1,00, máxima hacia delante ×0,22, marcha atrás ×0,60, freno ×1,15, rampa de 0,22 s con respuesta inicial al 75 %, dirección ×1,35, sin giro artificial al frenar. Conservar las diferencias entre coches y el efecto de sus mejoras. **No reequilibrar, reajustar ni corregir la «sensación» sin autorización expresa**, tampoco como consecuencia de cambios a física común. Futuros tramos rally usan opt-in; circuitos normales aislados.

Fuente normativa detallada: [`docs/continuity/2026-10-19-rally-1-0-approved.md`](docs/continuity/2026-10-19-rally-1-0-approved.md). Esta iteración es **solo documentación**, sin cambio de código, versión, APK, despliegue web ni Google Play.

## DEV 1.2.301 — Perfil RALLY reutilizable para Arafo–Los Loros

Autorización fase 2 (19/10): convertir la comodidad del Spark marcha atrás en referencia para acelerar hacia delante. Nuevo módulo rallyDrivingProfile.js con perfil RALLY y activación por ID Arafo, o explícita en futuros tramos abiertos mediante meta.drivingProfile=RALLY. Jamás se activa por ser un circuito ordinario; no se cambian CAR_SPECS ni mejoras.

Configuración inicial de prueba, **pendiente de validar en dispositivo**: velocidad de avance ×0,22 (Spark máximo teórico ≈164 px/s frente a marcha atrás ≈156), aceleración ×1,00 con rampa 0,22 s e inicio al 75%, marcha atrás ×0,60, freno ×1,15 también en el postprocesado progresivo, dirección ×1,35. Rotación artificial al frenar desactivada solo para el perfil RALLY; transferencia de pesos y neumáticos existentes siguen actuando. Las demás etapas mantienen la dirección y el giro previo.

Sin cambios en geometría, foto, escala .35, 27 zonas ambientales, 2 checkpoints, salida, meta, cámara, progresión ni economía. Smoke existente ampliada comprueba opt-in estricto, jerarquía de coches, 30/40/60/120 fps, relación Spark adelante/atrás e integración física. PWA DEV únicamente, sin APK/AAB/Google Play. Tras probar sensaciones, ajustar solo multiplicadores del perfil.

## 19/10/2026 — QA tester Android de DEV 1.2.300

El propietario solicita APK para compartir con un tester. Se utiliza el HEAD de main que contiene **DEV 1.2.300**, Inventario renovado y optimizaciones de iPhone, sin modificar la versión pública Google Play 1.1.188 (vc8). Actualizar `.github/workflows/android-revenuecat-qa-apk.yml` al nombre/tag `TDR-QA-DEV-1.2.300-REAL-ADS-SIN-MEDIR.apk` / `tdr-qa-1.2.300` y compilar el paquete separado `com.craftracestudio.topdownrace.rewardedtest` con monetización real AdMob+RevenueCat, sin MEDIR. Incluye la smoke de Inventario en el pipeline Android. Se crea prerelease de GitHub con enlace directo al APK. No AAB, sin Play, no cambia versionCode/name público. Tester debe probar instalación y arranque, Inventario en ES/EN y anuncios sin clicks/impresiones artificiales. Si CI falla, corregir antes de facilitar el enlace.


## DEV 1.2.300 — Inventario renovado (estética + iPhone)

El usuario reporta que Inventario en la **PWA iPhone**, en inglés, quedó congelado sin responder y con texto poco definido. Además considera que su estética es antigua respecto al lobby y Race Control y autoriza un rediseño ligero. No hay reproducción ni captura de traza WebGL: la carga de Graphics y Text es una **hipótesis**, no causa confirmada. La APK QA Android 1.2.299 queda bloqueada como candidata a Play hasta verificar.

Cambios de bajo riesgo: `inventoryPremiumDraw.js` actualiza shell / pestañas / tarjetas con navy + trazos de cian y oro, bahía para imagen, área de cantidad, perfil biselado y pequeños marcadores de estado; todo son gráficos estáticos sin filtros, shaders, bucles ni assets nuevos. Ahora ambos inventarios (lobby y Fábrica) pintan sus fondos con **un solo Phaser.Graphics por modal**, en vez de uno por borde y tarjeta; mismo `setInteractive`, posiciones de controles, economía, filtros, paginación y eventos. La densidad temporal de Text en Inventario del lobby para iPhone baja de `resolution:2` a `1.5` para reducir carga inicial; tamaño de fuente no cambia salvo la cabecera. Se añaden breadcrumbs iOS `tdr2:inventoryOpenTrace:v1` con estados begin / drawn / frame / closed, que sobreviven a reinicio si hay nuevo cuelgue. Fábrica usa claves i18n en el modal de inventario para ES/EN. Prueba antirregresión ampliada en `scripts/inventory-premium-ui-smoke.mjs`.

Solo DEV PWA 1.2.300. No APK/AAB, no Play. Prueba manual aconsejada: abrir/cerrar Inventario varias veces en inglés y español en iPhone; cambiar Materiales/Piezas y filtros; verificar que sigue respondiendo y que el texto se lee bien. Si vuelve a congelarse, inspeccionar breadcrumb antes de introducir cambios nuevos.


## DEV 1.2.299 — Auditoría de idiomas, decisión de avatares aplazada, APK QA Android

**Petición:** antes de actualizar Android, auditar ES/EN en el juego, documentar la decisión de avatares, construir la última APK de prueba. Avatares opción 1 (24 prediseñados, WebP 256x256, Cuenta/lobby/Race Control, sólo guardar `avatarId`): documentado en `docs/continuity/2026-10-19-avatar-option-one-future.md` y EXPLÍCITAMENTE POSPUESTO, no implementar ni tocar datos de usuario hoy.

Revisión `docs/release/2026-10-19-i18n-es-en-review.md`: diccionario base paritario, corregidas claves `replay.lap` y `replay.analysis` ausentes en inglés y entradas ES duplicadas erróneas. Los últimos textos de Cuenta/backup (principal, recuperación avanzada, estados/fecha) se cubren por módulo `src/game/i18n/accountUiTranslation.js` integrado en `canonicalRuntimeText.js` y `cloudAccountUi.js`. `scripts/release-language-audit.mjs` comprueba claves y parámetros ES/EN + UI de Cuenta; informa otros literales históricos que deben verificarse manualmente. No fingir 100% de traducción manual de todo el juego ni convertir la prueba en aprobación de Play.

Única APK Android de test planeada: workflow `.github/workflows/android-revenuecat-qa-apk.yml`, identificador de app **separado** del público, sin herramientas MEDIR, QA real AdMob/RevenueCat (no automatizar impresiones reales), `TDR-QA-DEV-1.2.299-REAL-ADS-SIN-MEDIR.apk`; descargable por artifact y prerelease GitHub con tag `tdr-qa-1.2.299` si Actions verde. El commit con `[pwa-only] [apk-qa]` evita Android Play bridge y activa únicamente el job QA requerido. No genera ni sube AAB, no publica en Google Play y no modifica versionCode 8/versionName 1.1.188. Comprobar SHA main / Pages Build+Deploy y APK + descarga real antes de anunciar lista.


## DEV 1.2.298 — Crown Cuper visible en Race Control (PB y clasificación)

Propietario informa captura Race Control Karting Américas: al utilizar `crown_cuper` aparece un icono de imagen rota en la zona visual de marca personal. Causa confirmada por código y árbol: `StatsBroadcastScene.js` fabricaba siempre `assets/cars/lobby/{carId}.webp`; `public/assets/cars/lobby/crown_cuper.webp` no existe porque el Cuper es un coche con skins y sprites en `public/assets/skins/skin_crown_cuper_original.webp` y `skin_crown_cuper_gold.webp` (ambos presentes y comprobados anteriormente), con ficha `CAR_SPECS.crown_cuper`. Corrección acotada: Race Control reutiliza `carVisualCandidates` / `applyCarVisual` del módulo `carDisplayArt.js` ya usado por estadísticas. La imagen del récord personal y la de cada fila online respetan la apariencia equipada y tienen fallback a Original si falta el asset. Durante la primera ejecución de CI (SHA b6d426e) la smoke detectó que el resolvedor común todavía ofrecía el inexistente `lobby/crown_cuper.webp` como fallback intermedio; se corregió `carDisplayArt.js` para que cualquier coche con skins alternativas vaya directamente de Gold a Original, conservando el lobby normal de todos los coches sin skins. La primera ejecución se consideró fallida y no se publicó; repetida tras la corrección. Se añaden `data-br-car-image` a ambas vistas y se enlaza fallback inmediatamente después de cada render del tablero. No cambiar el ID del coche, tiempos, fantasmas, clasificaciones, física ni bloqueo de skins. Nueva prueba `scripts/race-control-cuper-art-smoke.mjs` integrada en Pages verifica assets, ruta, Original/Gold, ausencia de `lobby/crown_cuper.webp`, fallback real y ambas vistas. Solo PWA DEV, sin APK/AAB/Google Play; pendiente validación visual iPhone.


## DEV 1.2.297 — Insignia CREADOR en todas las clasificaciones de Race Control

El propietario comprobó que JUANFRIKAZO_DEV, nº 1 en Santa Cruz, aparecía sin ✓ CREADOR en el ranking a pesar de tener el distintivo correcto en Cuenta y lobby. Causa: `get_race_control_snapshot` y `StatsBroadcastScene.js` mostraban nick/coche/tiempo sin un indicador verificado de titularidad de badge. Nuevo RPC de lectura autenticado `get_track_creator_badges(track_id)` (migración SQL `supabase/migrations/20261019_018_race_control_creator_badges.sql`, aplicada al proyecto): hace un único join por circuito entre records, UUID propietario, perfil y reserva exacta `CREADOR`; nunca confía en texto editable por el cliente. `raceControlOnline.js` cruza las insignias por `record_ref` en clasificaciones privadas y por nick exacto con validación previa en RPC en snapshot público (sin record_ref). Se añade `creator_badge:'CREADOR'` solo a filas comprobadas, preservando el formato y las credenciales de ghost sin exponer UUID. El fallo del RPC no impide ver tiempos o jugar VS. El ranking pinta una cápsula dorada ✓ CREADOR junto al piloto (tanto TÚ como rivales). Los rankings ya almacenados en caché se enriquecen automáticamente una sola vez por circuito al abrir Race Control, sin exigir al jugador pulsar Actualizar; el resultado se guarda en el cache local existente, sin más gastos por fila. El script `race-control-creator-badges-smoke.mjs` valida mezcla estricta, cache, no badge falso, RPC, fallbacks y UI. No APK/AAB, no Google Play. Falta verificación visual en el iPhone.


## DEV 1.2.296 — El distintivo CREADOR completo dentro de la cabecera de lobby iPhone

El usuario envió captura de que la insignia dorada añadida en DEV 1.2.295 aparecía **cortada por el borde inferior** del encabezado (iPhone PWA horizontal). Causa: la cabecera tiene altura fija, el bloque de piloto estaba organizado en 3 filas (PILOTO/nick/ID) y la insignia se añadía con `accountButton.after(creatorBadge)` creando una **cuarta fila** que desbordaba. En `LobbyDomUi.js` se mueve ID y badge a una sola `.tdr-lobby-identity-row` flexible, con `gap` y padding vertical más compactos; el ID trunca si falta sitio y el badge queda siempre visible dentro de los 180 px de ancho del piloto. CSS responsive especial para alturas <=430px. El distintivo sigue viniendo del RPC autenticado `get_my_pilot_badge`, no depende del nick editable. No se aumenta la altura de la cabecera ni se cambia la posición del logotipo, botones, wallet, coche, pista o interfaz de Cuenta. Se añadió comprobación antirregresión al smoke de Cuenta. Solo PWA DEV y continuidad; no APK/AAB ni Play.


## DEV 1.2.295 — Cuenta simplificada + distintivo CREADOR autentificado

Las capturas del propietario muestran tres grandes botones redundantes, información sobre correo y copia en nube mezcladas y ausencia de insignia de creador. Esta iteración **solo** ajusta la pantalla de Cuenta y el lobby; NO implementa el futuro sistema de avatares prediseñados elegido por el propietario, que se hará después.

En Cuenta: perfil y un ID breve, distintivo dorado ✓ CREADOR basado en `auth.uid()` (nunca solo nick local); un botón principal GUARDAR/ACTUALIZAR COPIA y acceso fácil a DESCARGAR COPIA. El estado/fecha/revisión refleja backup realmente presente, nunca da por verificado el acceso solo porque la copia exista. No se muestran PROTEGER/PASSWORD/VERIFY de email en la pantalla principal; subsisten de forma optativa en «ACCESO ANTIGUO (CORREO)» en avanzadas hasta desplegar realmente TDR ID. Se elimina «Vincula tu correo antes de desinstalar» de la confirmación del guardado y se explica que copia de nube ≠ acceso recuperable. Herramientas de test/restauración quedan en opciones avanzadas. Cabecera general del Settings ahora «AJUSTES GUARDADOS» y no sugiere que haya guardado automático de nube.

Nueva función Supabase `get_my_pilot_badge()` (migración `20261019_017_authoritative_pilot_badge.sql`) busca una reserva de `web_reserved_comment_names` mediante el perfil real del usuario autenticado, coincidencia exacta de nick y badge 'CREADOR'. Revoke para anon y grant exclusivo para authenticated. Verificada en SQL: usuario 4BCDAF7E (actual, fusionado) -> CREADOR, usuario 761C682A (antiguo, sin perfil) -> null. Aparece tanto junto al nombre en Cuenta como bajo el ID en el lobby. No se cambiaron datos de perfiles, Auth, coches, monedas, récords o posts. CI smoke dedicado `account-creator-badge-smoke.mjs`. Solo PWA DEV; sin APK/AAB ni Play. Pendiente comprobar aspecto visual real iPhone. Próxima iteración elegida: avatares prediseñados sin uploads ni coste de imágenes en Supabase; no confundir con el nuevo sistema de identidad TDR ID aún pendiente.


## DEV 1.2.294 — Infraestructura de misiones de vueltas limpias por coche y circuito

Nueva telemetría `src/game/seasons/cleanLapMissionTelemetry.js` persistida en `tdr2:cleanLapMissions:v1` y respaldada por la copia de progreso en la nube. Registra cada vuelta válida por coche, circuito, sesión, estado limpio/sucio y eventId deduplicado. Objetivos futuros `{type:'cleanLaps',target:5,carId:'crown_cuper',trackId:'karting-canarias-4096',consecutive:true/false}`: acumulados desde el momento de activar la misión o 5 limpios seguidos en **una misma sesión**. Las vueltas sucias y los cruces de meta inválidos cortan la racha; cambiar, salir o reiniciar carrera también; los récords de racha ya logrados permanecen completos hasta reclamarse. Los objetivos `combined` también admiten varias partes independientes. `RaceCleanLapScene` conecta la clasificación real limpia/sucia, genera ID único de sesión y resetea al shutdown. Un contador de rechazos de meta añadido al `RaceScene` base solo avisa al sistema de rachas y no afecta a las vueltas, checkpoints ni tiempos. Al reclamar una misión en `raceEvents`, la siguiente se activa inmediatamente sin esperar a abrir Temporadas. No se modifican las 14 misiones del Cuper ni los tipos legacy `clean`. No se atribuyen supuestas vueltas limpias antiguas porque faltaban en el histórico. Prueba `clean-lap-missions-smoke.mjs` automatizada en Pages. PWA DEV desde main, sin APK/AAB ni Play.


## DEV 1.2.293 — Karting Canarias 4096: vueltas limpias sobre el asfalto Bézier original

El propietario confirmó que **Karting Américas ya concede vueltas limpias** con el arreglo DEV 1.2.292, pero que **Karting Canarias** reconoce vueltas y no las registra como limpias. La misma causa afecta al circuito fotográfico rehecho `karting-canarias-4096`: `RaceCleanLapScene.js` comprobaba cada 100ms las celdas procedurales Catmull-Rom, no los bordes Bézier que delimitan el asfalto visible. Se incluye el **ID exclusivo de Canarias 4096** en el uso de `makeKartingShapeMask` para la validación CLEAN LAP solamente. Se preservan las correcciones de Santa Cruz y Karting Américas, las colisiones 5 líneas + 1 zona, los 2 checkpoints activos, la meta, geometría, imagen 4096x6144, dirección de carrera, físicas, controles y tiempos. Fuera del asfalto Bézier se invalida la vuelta; no se entregan vueltas limpias si no cumplen condiciones normales. Nueva prueba `scripts/karting-canarias-clean-lap-photo-smoke.mjs` integrada tras la instalación y smoke oficial en `pages.yml`, verifica geometría publicada, cobertura del centro, clasificación de puntos exteriores y recompensas sin atajos. No APK/AAB ni Play. Verificar conduciendo en DEV tras CI verde.


## DEV 1.2.292 — Karting Américas: vueltas limpias según asfalto fotográfico real

Incidencia del propietario: en **Karting Américas** se reconocen las vueltas pero no se conceden **vueltas limpias**. Se revisaron el instalador reproducible, sentido horario, meta, CP1/CP2 y lógica de `RaceCleanLapScene.js`. Los checkpoints/meta ya poseen pruebas dirigidas y NO se tocan. Se identificó la diferencia entre la fotografía/contornos Bézier creados por el propietario y las celdas de la cinta Catmull-Rom reconstruida: la muestra de limpieza cada 100 ms consultaba esas celdas, por lo que un solo falso «fuera» anulaba toda la vuelta. Igual que la corrección acotada previamente a Santa Cruz, **Karting Américas ahora construye una máscara de la pista Bézier real para evaluar solo la limpieza**. Se exige modo `image-native`, shape válido y cerrado; fuera de ese contexto sigue el detector antiguo. Salirse del asfalto real sigue ensuciando la vuelta. Se conserva el conteo de vueltas, CP, final, progreso, físicas, superficie, colisiones, registros y recompensas. Smoke dedicado `scripts/karting-americas-clean-lap-photo-smoke.mjs` verifica geometría real del instalador, cobertura del centro, puntos fuera de pista y que la validación no eluda la validez de una vuelta. Integrado en `.github/workflows/pages.yml`. Pruebas CI y DEV web, sin APK/AAB ni Play; falta confirmación de pilotaje en el dispositivo.


## DEV 1.2.291 — Humo moderadamente más denso y Karting Canarias 4096 visible

**Humo:** el usuario informa que no se aprecia. Había también un problema geométrico: el lienzo se proyectaba hacia el morro del coche en vez de detrás de él. Se invierte su dirección, conservando la posición trasera; se incrementa suavemente la tinta de cada veladura (≈20%), baja el blur 3.3→2.7px y la opacidad máxima aumenta de 0.70 a 0.76, sin aumentar tamaño. Se mantiene una sola estela progresiva, el coletazo, duración 1600+180+520ms y ausencia de marcas.

**Karting Canarias:** causa confirmada: `trackUnlocks.js` utilizaba `typeof import.meta.glob==='function'`, pero `import.meta.glob` es un macro de Vite transformado durante la compilación y no existe como función durante la ejecución. Eso dejaba `REBUILT_CANARIAS_PRESENT=false` y la lista pública apuntaba al ID viejo `karting-canarias`, mientras `trackRegistry.js` sí detectaba el JSON nuevo instalado durante el prebuild y ocultaba el antiguo. Resultado: **ningún Canarias visible**. Se sustituye el guard por la llamada directa `import.meta.glob('./library/karting-canarias-4096/track.json')`; el selector ve correctamente `karting-canarias-4096` entre los seis publicados y el viejo y narrow70 siguen ocultos. Sin cambios en geometría, fotografía, colisiones, meta, checkpoints, historial ni desbloqueos, más allá de la migración existente del circuito elegido. Se refuerzan `karting-canarias-4096-smoke.mjs` y `lobby-race-departure-smoke.mjs`. Sin APK/AAB ni Play; comprobar visualmente en dispositivo cuando proceda.


## DEV 1.2.290 — Sin marcas: coletazo de trasera y humo continuo en la salida del lobby

El propietario descartó todas las huellas, que eran imperceptibles incluso tras sucesivos cambios. Se eliminan **por completo** `paintLobbyRubber`, `lobbyDepartureWheelTracks`, el canvas de goma, su animación y sus pruebas. El coche realiza un **pequeño coletazo de trasera** de ±4–5° al finalizar el giro de la plataforma, usando el eje delantero de su propio preview como pivote: coche convencional con frente arriba `50% 23%` y Helix con frente abajo `50% 77%`. Se ejecuta **en paralelo con el brillo existente durante los mismos 180ms de hold**, luego la rotación interior vuelve a 0 antes de los 520ms de aceleración, sin afectar a plataforma ni skin/mastery. En esa pausa comienza un **único humo continuo** generado en un solo canvas con 96 veladuras radiales orgánicas y longitud progresiva mediante `clipPath` animado; el mismo humo se sigue revelando durante la salida, se atenúa y desaparece al acabar los 700ms hold+drive. No hay bolitas independientes, barras, imagen extra ni RAF. Es decorativo y no bloquea `scene.start('race')`; el shutdown cancela la animación y destruye la capa. Prueba `scripts/lobby-race-departure-smoke.mjs` protege ausencia total de huellas, pivotes, oscilación, ventana temporal, emisión continua, cleanup y paridad Android/web. Se conserva el ascensor, giro 1600ms, hold 180ms, drive 520ms, dirección de salida, físicas y precarga. Sin APK/AAB ni publicación Play. Pendiente validar el acabado visual en Android/PWA.


## DEV 1.2.289 — Corregida la referencia de coordenadas del lienzo de derrapes

Al revisar la integración de los dos nuevos lienzos de DEV 1.2.288 se detectó que la geometría de los contactos de las ruedas está referida al **centro** de la plataforma, mientras que un canvas dibuja desde su **esquina superior izquierda**. Se añade `rubber.ctx.translate(platformRect.width/2,platformRect.height/2)` antes de pintar los depósitos, para que las dos huellas aparezcan **realmente detrás de las ruedas** y no desplazadas media plataforma. Se protege en `lobby-race-departure-smoke.mjs`. No cambian la textura orgánica, el humo, el ascensor, las físicas ni los tiempos. No APK/AAB ni Play; validación visual pendiente en dispositivo.


## DEV 1.2.288 — Efectos de arrancada orgánicos, sin palos ni bolas

El propietario aportó capturas de DEV 1.2.287 y rechazó los **dos palos negros rectangulares** y el **humo como un círculo de bordes definidos**. Se eliminan completamente los gradientes de bloque y el rectángulo/óvalo animado. Se reemplazan por dos pequeños lienzos transparentes `canvas` de una sola renderización (sin RAF, sin textura remota): **huellas** compuestas por más de 100 microlíneas curvas, fragmentadas, con ancho, opacidad, dispersión y longitud variables (aprox. 50–85 px, 4–7 px de ancho máximo), y **una sola estela de humo** formada por ~58 veladuras radiales solapadas, sin círculos separados ni borde uniforme; la expansión y la deriva tienen lugar detrás del eje trasero. Los pinceles son deterministas para que la estética sea estable y testeable. Dos `canvas` temporales se anclan a `platformPart`, por encima de la plataforma, por debajo de la imagen del coche, y se eliminan/cancelan al cerrar la escena. `scripts/lobby-race-departure-smoke.mjs` comprueba numéricamente el sentido ±90°, trazos curvos de textura, diferencias entre ruedas, número de veladuras y no bloqueo. Sin cambios en ascensor, UI, vehículos, físicas, dimensiones, dirección de salida, precarga ni transición 1600+180+520 ms. DEV web desde `main`, sin APK/AAB ni Play. **Validación visual en dispositivo sigue pendiente**.


## DEV 1.2.287 — Una sola nube de humo y derrapes realmente visibles

Ajuste visual solicitado al comprobar DEV 1.2.286: seis bolitas de humo no parecían naturales y las marcas de derrape resultaban imperceptibles. Ahora existe **una única nube amplia** compartida por las dos ruedas traseras (un único elemento de degradado radial elíptico, no partículas repetidas), con expansión, deriva leve y desaparición. Las **dos huellas de goma** crecen de 2–4 px a 5–10 px en función del coche, llegan hasta 150 px según tamaño de la plataforma, llevan un centro oscuro de goma y bordes de rozadura gris para contrastar sobre el suelo, y mantienen su opacidad casi completa durante la mayor parte de los 520 ms antes de desvanecerse. Se corrige además un error geométrico: antes los trazos avanzaban hacia el morro en vez de prolongarse **detrás de cada rueda**, problema especialmente visible al girar ±90°. Los efectos viven sobre la plataforma, bajo el coche, con dos huellas encima del humo para que no queden tapadas. Sin cambios en ascensor, plataforma, coche, skin, conducción, accesibilidad, lanzamiento de RaceScene, dirección de salida ni tiempos 1600+180+520 ms. Smoke `scripts/lobby-race-departure-smoke.mjs` reforzado: orientación de marcas ±90°, longitudes/grosores, contraste, UNA sola nube y precarga de carrera. Solo DEV web, no generar APK/AAB ni publicar Play. Pendiente comprobar estética visualmente en Android al preparar APK autorizada.


## DEV 1.2.286 — Huellas de neumáticos y humo al salir del lobby

Se completa JUGAR → giro → aceleración → carrera con **dos huellas temporales** de los neumáticos traseros sobre la plataforma y **humo ligero** de arrancada. `LobbyRaceDeparture.js` calcula los puntos de contacto de ambas ruedas con la geometría DOM y la orientación real (también los coches Helix que giran −90°). Durante los **520 ms aprobados** dibuja dos rastros que crecen y se desvanecen, junto con seis bocanadas pequeñas (tres por rueda) mediante degradados radiales que se dispersan y desaparecen. Son hijos de la capa de la plataforma, encima del suelo y debajo del coche; no se desplazan con el vehículo. Animaciones Web Animations API con elementos DOM finitos, sin RAF, canvas, nuevas texturas ni esperas añadidas; fallos de efectos no bloquean la carrera. El `shutdown` retira las capas y cancela las animaciones. Se amplía `scripts/lobby-race-departure-smoke.mjs` para comprobar ambas ruedas, sentidos opuestos, humo y limpieza. Se conservan ascensor, plataforma, coche, los 1600+180+520 ms, precarga y soporte Android nativo de DEV 1.2.285. Solo DEV web; para ver los cambios en la app Android hace falta una futura APK autorizada. Pendiente comprobación visual en dispositivo real. Sin APK/AAB ni Play.


## DEV 1.2.285 — Giro de la plataforma y salida del coche en Android

Incidencia: el ascensor del garaje ya funcionaba en APK Android, pero al seleccionar modo de juego NO giraban plataforma y coche ni se veía la salida hacia la derecha. Causa confirmada: `shouldUseLobbyDeparture()` cortaba SIEMPRE cuando `prod=true`, valor que también reciben los WebView nativos Android a través de `__TDR_PROD_BUILD__`. Se añade la misma excepción acotada que tiene el ascensor: `Capacitor.isNativePlatform() && Capacitor.getPlatform()==='android'`. Web pública de producción sigue desactivada y DEV web permanece como antes. Se respeta el interruptor local `tdr2:devLobbyRaceDeparture='off'` y la preferencia de accesibilidad de movimiento reducido. **No cambiar** el cálculo de dirección: `helix_comet`, `helix_pulse` y `helix_vortex` tienen frente orientado hacia abajo y giran −90°, otros coches +90°; todos se van por el lado derecho con la nariz por delante. Conservar los 1600 ms de giro, 180 ms de pausa, 520 ms de salida y la precarga de carrera. `scripts/lobby-race-departure-smoke.mjs` protege Android producción / web pública, interruptor de reversión y sentido de cada coche. No tocar el ascensor, físicos ni rutas de escena. Sin APK ni Play; confirmar en dispositivo Android cuando se prepare una build autorizada.


## DEV 1.2.284 — Santa Cruz: corregir reconocimiento de VUELTAS LIMPIAS

El propietario precisó que **las vueltas sí se contaban** pero se marcaban como **sucias**. La DEV 1.2.283 revisó CP1/CP2; esta iteración corrige la causa independiente: `RaceCleanLapScene.js` comprobaba `_tdrOriginalIsOnTrack` en cada muestra de 100 ms, una malla de celdas procedurales Catmull-Rom que puede discrepar de los bordes fotográficos de Santa Cruz. Un solo falso OFF invalidaba la vuelta completa. Solo para `santa-cruz` foto nativa se construye UNA vez la máscara autoral Bézier `makeKartingShapeMask(track.trackShape,...)` y se usa EXCLUSIVAMENTE para decidir la limpieza. Los coches, fuerzas de agarre, superficies, colisiones físicas, CP lógicos, vueltas y fotografía NO cambian. Fuera de los bordes reales sigue invalidando. `scripts/santa-cruz-clean-lap-photo-smoke.mjs` comprueba firma del criterio, cobertura del centerline, fuera de mundo y telemetría; incluido en Pages CI. La comprobación jugable del owner sigue siendo necesaria para confirmar una vuelta limpia. No APK/AAB ni Play.


## DEV 1.2.283 — Santa Cruz: vueltas limpias, orden y sentido de CP

Tras reportarse que dos vueltas limpias en Santa Cruz no se registraron, se detectó que el instalador `scripts/install-santa-cruz-source.mjs` **publicaba los dos checkpoints de Track Studio en su orden/normal originales** sin validar orden ni sentido para el juego. `RaceScene.js` exige CP1 → CP2 → META y vector velocidad alineado con cada normal; si un checkpoint está invertido o fuera de orden, jamás concede la vuelta. Santa Cruz pasa por `orderClosedCircuitGates` (igual que Atlántico y Américas), preservando foto, trazado, spline, colisiones y física, pero recalculando **solo las puertas lógicas** para orden y dirección de conducción. El CP sigue ensanchándose sobre los bordes Bézier. La única META lógica se mantiene, `startLine:null` para circuito cerrado. Guardar `meta.gateOrder` de diagnóstico; regresión `scripts/santa-cruz-official-source-smoke.mjs` comprueba intersección real, orden, vector normal y simula **dos vueltas limpias consecutivas** con cruces dirigidos. Versión 1.2.282 anterior tuvo todos los tests verdes, incluyendo corrección de ancho para Atlántico. No APK/AAB ni Play. Pendiente probar dos vueltas conduciendo con esta DEV, porque las pruebas geométricas no sustituyen una sesión real.


## DEV 1.2.282 — Corrección de aserción en auditoría de ancho de meta

La primera ejecución del nuevo `all-circuit-gate-width-smoke.mjs` diagnosticó una desigualdad con signo invertido en el extremo negativo de la puerta: la distancia entre el borde negativo y el extremo A debe ser **positiva**, mientras que el extremo B debe superar el borde positivo (distancia residual negativa). El código de ensanche es correcto; solo se corrige el test para exigir márgenes >=2.5 px en ambos extremos. Los 22 circuitos aparecieron con detección de bordes en la primera auditoría; el CP2 de Tenerife había sido ampliado previamente por su instalador especial y la nueva herramienta conservadora no interpreta ese cruce por sus múltiples curvas. No se modifican fotografías, físicas ni fuentes.


## DEV 1.2.281 — Auditoría y ajuste de anchura de metas/checkpoints de todos los circuitos

Petición del propietario: un checkpoint de Atlántico no cubría todo el asfalto fotográfico. Se incorpora `src/game/tracks/raceGateWidth.js`: en `trackRegistry.js`, al publicar cada pista, la meta y los checkpoints (y salida A→B si existe) amplían sus extremos hasta los bordes **auténticos de la calzada**. En circuitos fotográficos se muestrean las dos curvas Bézier del `trackShape`; en clásicos se usa el ribbon real de `TrackBuilder`. No se modifican centerline, anchos de carretera, fotografías, origen fuente `.tdrtrack`, orden de CP, normal de conducción, física ni spawn. Solo se extienden las puertas lógicas y líneas de HUD sobre la misma recta; never shorten. Protección: se rechazan intersecciones de un mismo borde o demasiado lejanas (que podrían conectar con otra curva), preservando la puerta si la geometría no es fiable. `scripts/all-circuit-gate-width-smoke.mjs` audita la cobertura de todos los circuitos después de los instaladores, con exigencia especial para META+CP1+CP2 de Atlántico; conectado a Actions. Sin APK/AAB ni Play.


## DEV 1.2.280 — Protegido aislamiento de previews locales y Canarias 4096

La verificación antigua de `scripts/trackstudio-image-native-loader-smoke.mjs` comparaba literalmente la allowlist nativa anterior. Se actualiza para admitir `karting-canarias-4096`, manteniendo expresamente prohibida la carga de los entornos de las vistas locales y sin cambiar la lógica física o las colisiones. Confirmado anteriormente: `OWNER FIVE ENVIRONMENTS OK` para 5 metas decorativas, 23 líneas y 20 zonas; compilación de despliegue pendiente.


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
