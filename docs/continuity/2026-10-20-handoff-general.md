# TOP DOWN RACE — Continuidad operativa y estado verificado — 20/10/2026

> **ACTUALIZACIÓN DE CONTINUIDAD 21/10/2026:** este corte del día 20 es histórico. Leer primero **[2026-10-21-android-json-cloud-export-handoff.md](2026-10-21-android-json-cloud-export-handoff.md)**: DEV 1.2.327 en main, prueba de descarga JSON por selector nativo Android en fuente, **APK QA última 1.2.325** aún SIN corrección, Actions web en verde, validación real Android pendiente. No desinstalar ni publicar en Play.

> **LEER PRIMERO EN EL PRÓXIMO CHAT.** Corte documental de 20/10/2026, después de la fuente DEV **1.2.317** y del commit que protege la firma de futuras APK QA. Repositorio: `almaprintes/TopdownCraftrace`, **única rama de desarrollo `main`**. Este documento no ordena compilar, instalar ni publicar nada. Ante cualquier diferencia, volver a consultar `main`, `AGENTS.md`, los workflows y los commits recientes: el repositorio puede haber avanzado después de este corte.

## 1. Cómo reanudar sin perder contexto

1. Leer **`AGENTS.md`**, **`PROJECT_HANDOFF.md`**, este documento y **`.github/workflows/pages.yml`**. Para APK, también **`.github/workflows/android-revenuecat-qa-apk.yml`** y `android/app/build.gradle`.
2. Comprobar HEAD exacto de `main`, la etiqueta DEV en `index.html`, los últimos commits y las ejecuciones GitHub Actions **antes de tocar código**. No basarse en textos históricos de `README.md`, `docs/STATE.md` o `READ_THIS_FIRST.md` sobre ramas beta, ahora obsoletos.
3. Regla del propietario: **una petición = una iteración**, cambios quirúrgicos, conservar lo aprobado, siempre `main`, sin ramas auxiliares; incrementar DEV si se modifica el juego; verificar CI y Deploy **del SHA final** antes de declarar entregada la DEV.
4. `[pwa-only]` evita generar QA Android automáticamente cuando la petición es únicamente web. Compilar APK/AAB **solo por instrucción expresa**, jamás publicar Google Play sin autorización adicional.
5. No confundir «compila», «se publicó el prerelease» y «se probó en un dispositivo»: son estados distintos. No afirmar que una APK actualiza otra sin verificar **packageName, versionCode y certificado del APK final**.

## 2. Dónde estamos exactamente

| Área | Estado al corte |
| --- | --- |
| Código web / DEV | **DEV 1.2.317** en `main`. GitHub Pages DEV: https://almaprintes.github.io/TopdownCraftrace/dev/ |
| Fuente tras la última APK | HEAD base **`33f854c18eab9dd6de16605b7e962b57019a1e2d`**: protección de firma QA, **posterior** a generar APK .317; nuevo commit de documentación puede cambiar HEAD sin cambiar binario |
| Google Play pública | **1.1.188, versionCode 8**, paquete `com.craftracestudio.topdownrace`; no confundir con candidata QA |
| Última APK QA encontrada | **1.2.317**, prerelease `tdr-qa-1.2.317`, archivo `TDR-QA-DEV-1.2.317-REAL-ADS-SIN-MEDIR.apk`, `com.craftracestudio.topdownrace.rewardedtest`, **QA versionCode 1000317**, minificada, AdMob/RevenueCat reales |
| APK Android .300 y .314 | Versiones anteriores que **no** representan todo `main` actual. No prometer actualización in situ por diferencias de firma. |
| Fluidez iPhone | **Regresión intermitente aún NO solucionada definitivamente**: FPS y sensación varían incluso con misma configuración y según calentamiento; ver §6 |
| Rendimiento Android | Históricamente distinto al iPhone. No trasladar sin pruebas cambios experimentales de iOS a Android |
| RALLY 1.0 | **APROBADA Y CONGELADA** en DEV 1.2.301, `docs/continuity/2026-10-19-rally-1-0-approved.md` |
| Publicación | **Ninguna nueva versión de Google Play autorizada** en este corte. QA no equivale a AAB pública ni aceptación final. |

**Firma QA — aviso crítico (20/10):** el prerelease **.317 se generó antes** de corregir la ruta explícita de firmado. Su APK empaquetada mostró SHA-256 **`63c30fb33ef62289ffce961a8dadc2efe85480ce121b1043996370a6949d4358`**, distinto de la clave QA que el job creía haber restaurado **`cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f`**. La protección añadida después en HEAD obliga a usar `qaStable` y comprueba que **el certificado REAL del APK** coincide con la huella esperada, fallando de forma segura. **No modifica el .317 ya publicado**. Cualquier .318 u otra APK posterior debe probarse por su propia firma y actualización real; la caché del runner puede caducar. Para una cadena QA duradera hace falta custodiar una clave dedicada en secretos, sin colocarla en repositorio/logs. **Antes de desinstalar una APK, exportar copia de la partida y comprobar restauración/cuenta**; no borrar datos de Supabase. Documentación extendida en la cabecera de `PROJECT_HANDOFF.md`.

## 3. Qué hemos construido / producto actual

**Visión de producto:** `docs/continuity/2026-10-13-manifiesto-calidad-top-down-race.md`. No perseguir funciones nuevas a costa de conducción, estabilidad, circuitos y competición. Top-down puro, carácter arcade, fotografías aéreas cenitales para escenarios, interfaces premium, progresión y rankings.

**Plataformas:** Phaser 3 + Vite + PWA iPhone, Android con Capacitor; Google Play pública y paquete separado `rewardedtest` para QA. Flujo `main` → Pages DEV; AAB pública independiente. El propietario prueba en hardware real; CI no mide fluidez, temperatura, identidad instalada ni éxito de anuncios.

**Coches:** flota de 17. Avenir Gripline es coche de progresión; Crown Cuper tiene presentación original y Gold con cambios en garaje, Race Control, cartas y recorridos. Conducción y reequilibrado coche a coche no se deben alterar por una tarea de rankings/UI. Vortex drift aprobado en pruebas previas; Cuper y luces tuvieron iteraciones específicas (consultar historial).

**Temporadas:** Inducción (14 hitos) y Crown Cuper (14 misiones) persistentes. Tras inducción y **500 km reales** con Avenir Gripline se habilita Cuper; coche Cuper en misión 2, skin Gold misión 14. Misión 12 exige publicar tiempo de Cuper con confirmación real del servidor/rewarded; recicladora, piezas, pistas y rally tienen objetivos distintos. La siguiente temporada exigirá otros **500 km con Cuper** tras completar Gold; coche sucesor por decidir. **No resetear contadores ni campañas**. Fuentes: `docs/continuity/2026-10-15-cuper-season-implementation.md`, `docs/continuity/2026-10-18-canarias-cuper-android-qa.md`.

**Monetización/identidad:** AdMob rewarded y RevenueCat integrados en QA de anuncios reales. Acciones recompensadas requieren consentimiento, resultado verificado y evitar consumir otro anuncio tras fallo de red posterior a premio confirmado. Nick único con reserva atómica en Supabase, cuenta vinculada a UUID autenticado; no transferir récords/fantasmas al nick de otra identidad. Exportación y restauración de partida locales/nube deben probarse antes de cambiar instalación.

**Interfaces y herramientas:** lobby/ascensor, plataforma y salida del coche a derecha (incluidas correcciones Android), selector de pistas fotográficas, garaje, fábrica, inventario con estética renovada DEV .300, HUD, odómetro por coche, informe final, Race Control con rival/VS/ghost, TrackStudio (pluma Bézier, salida/meta, anchuras), Environment Studio (pluma, colisiones, objetos/zonas, export JSON y protección de salida).

## 4. Seis circuitos visibles y reglas de sus datos

- **Circuito Atlántico** — ID **`circuito-atlantico`**; fuente `track01` mapeada a identidad canónica. Foto de 4344×3258, geometría oficial escalada al **70 % de la fuente** (NO 30 % ni 94 %). Environment autorado reescalado una sola vez; evitar doble escala. Ranking en Supabase verificado.
- **Santa Cruz** — ID `santa-cruz`, foto nativa y entorno autorado; revisadas metas, checkpoints, vueltas limpias y colisiones; verificar en hardware Android QA.
- **Karting Tenerife** — ID `karting-tenerife`, foto propia, meta visual y colisiones, mosaicos WebP; histórico de tirones iOS especialmente pronunciados.
- **Karting Américas** — ID `karting-americas`, fotografía propia, líneas Bézier autoradas, orden y validez de vueltas corregidos en DEV; comprobar en Android.
- **Karting Canarias reconstruido** — ID `karting-canarias-4096`; proyecto **4096×6144**, fuente binaria del propietario verificada, ocho mosaicos WebP; **uno solo Canarias en selector**. Identidades antiguas `karting-canarias` y Narrow70 se conservan en historial/rollback **sin fusionar los récords anteriores ni las físicas**.
- **Arafo–Los Loros** — ID `rally-arafo-los-loros`, rally fotográfico **abierto A→B** con salida y meta distintas, no unir extremos ni convertirlo en vueltas. Fotografía, puertas, colisión Bézier exportada por propietario. Perfil **RALLY 1.0 congelado**: `acceleration:1.00`, `forwardSpeed:0.22`, `reverseSpeed:0.60`, `brakeForce:1.15`, `throttleRampSeconds:0.22`, `initialThrottleFraction:0.75`, `steering:1.35`, `artificialBrakeYaw:false`. La conducción ha sido **aprobada expresamente en iPhone DEV 1.2.301**. No cambiar física, trazado ni colisiones por optimización general.

**Entornos importados:** DEV 1.2.276 incorporó cinco exportaciones del propietario para Tenerife, Canarias 4096, Atlántico, Américas y Santa Cruz (23 líneas Bézier y 20 zonas sólidas en conjunto; tiras decorativas de meta). Arafo tenía exportación propia y en DEV 1.2.303 se reemplazaron sus **27 zonas de colisión** por una sola línea Bézier del autor; DEV 1.2.304 optimizó su índice espacial sin alterar el trazado. Colisiones y meta decorativa **no** son lo mismo que las puertas lógicas de tiempo. Fuentes: `PROJECT_HANDOFF.md` DEV 1.2.273–1.2.304 y los MD de continuidad de cada pista.

## 5. Cronología operativa relevante de octubre

| DEV | Qué quedó en fuente | Qué NO implica |
| --- | --- | --- |
| 1.2.266–1.2.294 | Canarias 4096, campaña Cuper, entornos, escalas, metas/CP, vueltas limpias Américas/Canarias/Santa Cruz, plataforma de lobby Android, insignias | CI ≠ validación en todos los móviles |
| 1.2.295–1.2.300 | Cuenta e insignia CREADOR, skins Cuper Race Control, auditoría ES/EN, renovación de inventario y APK QA .300 | La .300 no contiene arreglos posteriores |
| 1.2.301–1.2.304 | RALLY 1.0 **aprobado**, Environment Studio y colisiones Arafo optimizadas | Prohibido retoque de sensación de rally |
| 1.2.305–1.2.307 | Texto Phaser DEV iOS, diagnóstico CPU real y A/B de resolución con histogramas P95/P99 | No se ha demostrado una cura definitiva iOS |
| 1.2.308–1.2.310 | MEDIR oculto con gesto de 7 toques en Ajustes → Gráficos y permiso temporal, informes con fecha/duración/calor manual; A/B iPhone RAF/TIMEOUT | Ningún muestreo hasta pulsar MEDIR; controles técnicos exclusivos DEV |
| 1.2.311 | **Inducción misión 7 «De compras»**: el lobby vuelve a dibujar únicamente la tarjeta de temporada después de compra efectiva, sin polling | Recompensa/telemetría siguen bajo autoridad original |
| 1.2.312 | **Atlántico/rankings**: cuando falta caché o está vacía, una consulta de recuperación por circuito; después de publicar PB intenta refrescar caché sin segundo anuncio | No corrige por sí mismo países/regiones desconocidos |
| 1.2.313 | **Formulario voluntario de geografía del ranking** al crear nick y en Cuenta: continente, país, región opcional; códigos explícitos; sin GPS/IP; usa `upsert_my_profile` para la identidad autenticada | No imputa ubicaciones a perfiles antiguos `XX` sin consentimiento |
| 1.2.314 | APK real-AdMob/RevenueCat QA consolidada posterior a .300, controles MEDIR ocultos | No Play; instalación encima de otra APK no garantizada |
| 1.2.315–1.2.316 | En compuerta de carga de fotografía, **Gripline lateral hacia la derecha** centrado, ruedas giratorias, carretera/estelas hacia izquierda y texto «CARGANDO CIRCUITO…»; .316 aumenta sensación de velocidad solo CSS | No cambia velocidad real ni tiempos de carga |
| 1.2.317 | APK QA minificada publicada como prerelease con versionCode 1000317, más tarde descubierta **firma final incoherente con la clave prevista** | El parche de firma posterior NO ha reconstruido la .317 |

## 6. iPhone: rendimiento intermitente — abierto

**Hechos medidos por el propietario, no por CI:** con la misma calidad Alta, resolución 1.5, WebGL DESYNC **solicitado** (WebKit no expone confirmación real), texto PHASER y motor ON, se observaron, entre otros:
- Sesión relativamente fluida: **48,4 FPS**, frame medio 20,7 ms, **P95 43 ms / P99 60 ms**, **42/1970** frames >50 ms (**2,1 %**); subjetivamente **más fluido**.
- Sesión mala: **37,1 FPS**, frame medio 26,9 ms, P95 62/P99 86 ms, 115/1012 >50 ms (**11,4 %**), y el propietario indicó que **ya iba mal antes de activar MEDIR**.
- Sesión más prolongada con calentamiento perceptible: **36,5 FPS**, P95 66/P99 87 ms, 239/2160 >50 ms (**11,1 %**), peor frame 175 ms; primera vuelta regular y con medición se sintió peor.
- Prueba A/B resolución **1.0** produjo **40,3 FPS** y P95 61/P99 83 ms: **peor que 1.5**. No degradar resolución por intuición. Las mediciones son sesiones distintas, con posible efecto térmico.

**Interpretación cautelosa:** PASO CPU ronda 0,7–0,9 ms de media; `RENDER CPU` es JS, **no mide directamente GPU**; `OTROS` abarca espera, compositor, navegador y otros costes, **no demuestra causalidad GPU ni calor**. La sensación subjetiva vale más que FPS medios aislados. Históricamente en agosto mejoramos con horneado fotográfico/limpieza DOM y iPhone usaba `forceSetTimeOut`; tras 16/09 regresó a RAF salvo modo seguro. DEV 1.2.310 permite **A/B/A únicamente en iPhone DEV**: `LOOP RAF` (base) frente a `LOOP TIMEOUT` desde MEDIR, reiniciando juego. **No consta validación final RAF/TIMEOUT**. Mantener Android/producción y físicas intactos.

**Diagnóstico de asistencia:** normalmente oculto; Ajustes → Gráficos, **7 toques en CALIDAD GRÁFICA** en 5 segundos, durante 30 min. Pulsar **MEDIR** para empezar; MINIMIZAR continúa una medición activa; COPIAR guarda resumen mínimo local y permite comparar fecha/hora, duración, separación entre informes, ráfagas, P95/P99, salida a segundo plano y calor al tacto seleccionado manualmente (**sin sensor de temperatura en Safari iPhone**). Producción no muestra A/B técnicos. No confundir panel oculto con herramienta borrada.

**Próximo estudio seguro:** A/B/A RAF/TIMEOUT en mismo coche y pista con condiciones comparables, registrar calor y duración, circular SIN MEDIR y CON MEDIR para aislar carga de instrumentación, observar carrera después de 10 min; no sobreinterpretar una sola muestra.

## 7. Supabase / competición y ubicación

Proyecto real **TopDown RACE - Craftrace**, tablas `profiles`, `track_records`, `web_leaderboard_snapshot`, `player_progress`; RPC con Auth/RLS; las marcas/ghost se asocian a `auth.uid()`, no al apodo como clave.

**Auditoría de solo lectura 20/10/2026**: 21 perfiles, **7 con geografía `XX/XX/XX`** porque el procedimiento de reservar nick crea región provisional desconocida. Los tiempos aparecen en GLOBAL, pero legítimamente quedan fuera de EU/ES/ES-CN. Distribución comprobada **récords totales / EU-ES-Canarias**: Atlántico 11/10; Américas 2/0; Canarias antiguo 3/3; Canarias 4096 1/0; Tenerife 3/2; Arafo 1/1; Santa Cruz 7/5. Santa Cruz incluye además 1 marca sin perfil asociado que no puede clasificarse mediante el JOIN a `profiles`. **No falsificar ubicación ni reasignar un registro a otra cuenta**. El usuario propuso registrar ubicación declarada junto al nick y explicar que es para Global/Continente/País/Región; **implantado en DEV 1.2.313**, incluidas correcciones posteriores en Cuenta para perfiles `XX` que se identifiquen; debe verificarse en Android real. Nunca usar geolocalización automática ni inferir España de idioma/IP.

**Atlántico:** los 11 récords sí existían en Supabase; la pantalla Android .300 estaba vacía por caché no recuperada (corregido en fuente DEV .312). La vista pública tenía 10 entradas. No ejecutar migraciones ni borrar récords para «arreglar» un bug de vista.

**Ranking por ámbito:** los filtros responden a **la ubicación del piloto que consulta**; GLOBAL incluye usuarios de todas las regiones, CONTINENTE solo perfiles con el continente correspondiente, PAÍS solo el país correspondiente, REGIÓN solo la región correspondiente. No presentar esos cuatro resultados como si debieran ser idénticos. Si faltan jugadores con región correcta, reproducir por cuenta/ID, comparar la RPC real frente a caché y mostrar diferencia con datos verificables antes de modificar SQL.

## 8. Pruebas todavía pendientes antes de cualquier publicación pública Android

**P0 / evitar pérdida de datos y firma:**
- Comprobar en móvil si .317 ya está instalada; **NO desinstalar .300/.314** sin copia exportada y recuperación verificada. La .317 **puede requerir instalación limpia** por firma; comprobar huella del APK final, packageName y versionCode. El arreglo de firmante en fuente exige nueva build QA autorizada; asegurar clave protegida y comprobar actualización in situ antes de prometer que conserva perfil. No borrar perfiles/tiempos en Supabase.
- Las builds QA `rewardedtest` y Google Play `production` son distintas. Para publicar: decisión explícita del propietario, AAB firmada correctamente, versionCode público >8, Play Console, validación e idioma/datos de seguridad aplicables.

**P1 / jugabilidad y progresión Android:**
- Validar RALLY 1.0 en Arafo (salida→meta, sin cierre visual ni bloqueo de colisión), tiempos/limpias/checkpoints de los seis circuitos, escalas y salidas.
- Reproducir Inducción misión 7 con compra válida → tarjeta del lobby «RECOMPENSA DISPONIBLE» → reclamar **una vez** → misión 8 → persistencia tras reinicio.
- Comprobar desbloqueo 500 km, Cuper etapa 2, misión 12 con anuncio/ACK real y skin Gold final; visuales correctos de garaje/ranking; comprobar en Android físico y no confundir CI verde con aceptación.
- Race Control Atlántico con récord ya existente; alternar pistas, GLOBAL y filtros geográficos, reconexión, cache y clasificación recién publicada; ninguna impresión/recompensa duplicada.
- AdMob/RevenueCat reales: verificar rewarded, congelaciones al entrar/salir anuncios, audio focus, final de carrera e inventario con varios idiomas. Evitar pruebas repetitivas con anuncios reales; registrar tester donde corresponda.

**P2 / rendimiento y UX:**
- iPhone: reproducción intermitente de FPS/temperatura y A/B/A RAF/TIMEOUT. Android gama media: varias carreras seguidas, cierre/retorno, RAM/calor, plataforma lobby, cinemática salida, textos ES/EN y experiencia de inventario. La auditoría bilingüe del 19/10 deja deuda heredada: no afirmar 100 % traducción sin repaso manual.
- Verificar nueva compuerta Gripline 1.2.315–316 en dispositivos Android/iPhone, idioma, accesibilidad `prefers-reduced-motion`, falla de descarga y controles de recuperación.

**P3 / actualización futura autorizada por separado:**
- Sistema de avatares **24 retratos WebP 256×256 prediseñados**, selector Cuenta, persistencia y fallback; decisión documentada en `docs/continuity/2026-10-19-avatar-option-one-future.md`, **no implantar durante QA de publicación**.
- Sombras 2D proyectadas / profundidad visual, nuevas temporadas/coches, refinamientos adicionales; no mezclar con corrección de estabilidad.

## 9. Documentos de referencia por área

- Reglas/versiones/deploy: `AGENTS.md`, `.github/workflows/pages.yml`, `.github/workflows/android-revenuecat-qa-apk.yml`, `android/app/build.gradle`, `PROJECT_HANDOFF.md`.
- Dirección y prioridades: `docs/continuity/2026-10-13-manifiesto-calidad-top-down-race.md`.
- RALLY intocable: `docs/continuity/2026-10-19-rally-1-0-approved.md`.
- Circuitos/metas/colisiones: `docs/continuity/2026-10-18-canarias-cuper-android-qa.md`, `docs/continuity/2026-10-16-arafo-los-loros-import.md`, `docs/continuity/2026-10-17-karting-canarias-4096-staged.md`, `docs/continuity/2026-10-16-owner-environment-collisions.md`, `docs/continuity/2026-10-17-kartings-physical-scale-study.md`, `docs/trackstudio-image-native-reproducible-workflow.md`.
- iPhone/performance: `docs/continuity/2026-10-17-ios-all-tracks-stutter.md`, `docs/continuity/2026-10-17-iphone-webgl-pacing-258.md`, `docs/continuity/2026-10-17-iphone-audio-ab-259.md`, `docs/continuity/2026-10-17-iphone-dom-runtime-261.md`, `docs/continuity/2026-10-17-iphone-text-bridge-ab-262.md`, `docs/continuity/2026-10-19-ios-phaser-text-a-b.md`.
- Cuper/temporadas/avatares: `docs/continuity/2026-10-15-cuper-season-implementation.md`, `docs/continuity/2026-10-19-avatar-option-one-future.md`.
- Online/identidad: `docs/continuity/2026-09-17-supabase-bootstrap.md`, `docs/continuity/2026-09-18-online-leaderboard-ghost.md`; revisiones más recientes **.311/.312/.313** en la parte alta de `PROJECT_HANDOFF.md`.
- Android publicidad, idioma y release: `docs/release/2026-10-19-i18n-es-en-review.md`, `docs/continuity/2026-10-17-android-release-qa-no-medir.md` (histórico), parte alta de `PROJECT_HANDOFF.md` (**.314–.317 y firma**).
- Acceso ChatGPT/GitHub: `docs/continuity/GITHUB_ACCESS_RULE.md` — verificar conector antes de decir que no se puede acceder.

## 10. Primer mensaje recomendado del próximo chat (no ejecutar automáticamente)

«Continúa Top Down RACE desde `almaprintes/TopdownCraftrace`, rama `main`. Lee primero `AGENTS.md`, `PROJECT_HANDOFF.md` y `docs/continuity/2026-10-20-handoff-general.md`; después verifica HEAD, versión DEV, workflows, estado de APK QA y firma. Respeta RALLY 1.0, tiempos/cuentas, una tarea por iteración y no publiques Play ni construyas APK sin mi petición. Quiero retomar desde el estado real del repositorio y lo pendiente de comprobar en Android e iPhone.»

**Importante:** Este corte no autoriza ninguna nueva APK, AAB, instalación, migración SQL, reescritura de físicos, publicación en Play ni cambios en la identidad de usuarios. Solo es un documento de continuidad y evidencia.
