# Top Down RACE — Handoff operativo · 21/10/2026 · DEV 1.2.327

> **NOTA DE ACTUALIZACIÓN · DEV 1.2.328 (21/10/2026):** la sección 7 documenta la auditoría nativa posterior a .327, la compilación Java real en Actions y el límite explícito de validación Android. El título original .327 permanece como corte histórico.

**Repositorio**: `almaprintes/TopdownCraftrace` · **única rama**: `main` · **DEV web**: https://almaprintes.github.io/TopdownCraftrace/dev/

> Esta nota complementa, NO sustituye, `AGENTS.md`, `PROJECT_HANDOFF.md` y `docs/continuity/2026-10-20-handoff-general.md`. La información siguiente es un corte verificado del 21/10/2026; al retomarla consultar la rama, los commits y los Actions **de nuevo**.

## 1. Estado confirmado al documentar

- DEV **1.2.327**, `index.html`, con código en `main` a partir de SHA `4913c7aeb56aca3ada5c0f8ef2a85570acda505d`. Tras actualizar esta documentación habrá un HEAD de documentación más reciente sin cambios funcionales.
- GitHub Actions **Deploy Top Down Race**, ejecución **39561387185**, SHA funcional `4913c7a`: **build completed/success**, **deploy completed/success**; job opcional `Android release WebView bridge` **skipped** (NO significa que Java/Android se haya compilado).
- **Última APK QA realmente generada y comprobada**: **1.2.325**, `deviceTest`, `versionCode 1000325`, `com.craftracestudio.topdownrace.rewardedtest`, publicación de prueba `tdr-qa-1.2.325`, archivo `TDR-QA-DEV-1.2.325-REAL-ADS-SIN-MEDIR.apk`; incluye anuncios AdMob/RevenueCat reales. **NO lleva la corrección nativa de exportación JSON de .327 ni el fix de escala Atlántico Inverso de .326.**
- **Google Play** sigue en **1.1.188 / vc8**, app pública distinta; NO se ha modificado ni se ha autorizado publicar.
- El `android/app/build.gradle` y `.github/workflows/android-revenuecat-qa-apk.yml` continúan apuntando a **QA .325**. Un nuevo test Android requerirá incrementar QA versionCode, actualizar smoke/workflow e identificar su certificado; **no confundir DEV web .327 con APK .327**.
- Conservar certificado QA estable en workflow; NO desinstalar apps sin tener restauración de la partida comprobada.

## 2. Incidencia activa: guardar copia online y descargar JSON en Android

**Reporte del propietario (21/10, ~07:04):**
1. En Ajustes → Mi cuenta, creó una copia online. UI muestra **«Partida guardada en la nube», revisión 1**, fecha y hora y copia existente. No hay evidencia de pérdida de esa copia.
2. Al pulsar **«DESCARGAR COPIA»** apareció el aviso **«Exportación JSON iniciada. Si Android no la descarga, usa un navegador compatible»**, pero **ningún archivo se creó o quedó localizable**.
3. No confundir **crear copia remota**, **descargar copia JSON** y **restaurar partida**. No escribir ni sobrescribir progresos sin consentimiento y copia verificada.

**Causa auditada:** `src/game/social/cloudProgress.js` usaba descarga de `Blob` + enlace `<a download>`, que Android Capacitor WebView no gestiona como archivo descargado garantizado. `cloudAccountUi.js` redirigía el botón primario a exportar LOCAL incluso existiendo copia ONLINE, y mostraba éxito optimista.

## 3. Corrección implementada en fuente DEV 1.2.327 (PWA + código Android)

- **`android/app/src/main/java/com/craftracestudio/topdownrace/TdrPortableSavePlugin.java`**: nuevo plugin Capacitor nativo `TdrPortableSave`. `saveJsonFile({json,filename})` valida estructura/tamaño/nombre, abre el selector Android `ACTION_CREATE_DOCUMENT` (Storage Access Framework), escribe JSON UTF-8 en URI elegida, y devuelve `{saved:true}` solo después de escribir/cerrar el stream. Cancelación `{cancelled:true}`, errores explícitos; sin permisos amplios de almacenamiento.
- **`android/app/src/main/java/com/craftracestudio/topdownrace/MainActivity.java`**: registra el plugin ANTES de `super.onCreate`.
- **`src/game/social/cloudProgress.js`**: `downloadPortableSave` ahora asíncrona; en Android nativo usa `registerPlugin('TdrPortableSave')`; estados `saved/cancelled`; navegador web mantiene `Blob` pero solo anuncia `requested`, nunca éxito definitivo.
- **`src/game/social/cloudAccountUi.js`**: botón primario `DESCARGAR COPIA` exporta la copia de la nube **si existe** (`exportCloudProgressJson`); si no existe exporta la local. Las opciones avanzadas permiten ambas por separado. Mensajes según archivo guardado, cancelación o petición en navegador. Descargar no restaura ni cambia cuenta/partida.
- **`scripts/android-portable-save-smoke.mjs`**, incluido en `.github/workflows/pages.yml`: smoke estático de registro, ruta SAF, validación, mensajes, semántica remota/local y protección de progreso.
- Se corrigió un error **en el propio smoke** que hizo fallar dos primeros workflows (39560562107, 39560953961). El siguiente, **39561387185**, terminó completamente **verde**.
- Estos tests NO prueban que el plugin se compile en Gradle ni una descarga Android real. **Falta APK de prueba nueva y validación en dispositivo**.

## 4. Antecedentes de circuitos y UI recientes que deben conservarse

- **DEV .319**: pausa larga no descoordina cronómetro, DELTA y fantasma.
- **DEV .320–.322**: cinco circuitos cerrados con versiones Normal/Inverso sobre las mismas fotos, geometría y colisiones, ID de récord distinto. Nomenclatura visible aprobada: nombre original para la variante normal; sufijo **«Inverso»** solo para la otra. **Karting Tenerife horario = Normal**; antihorario histórico = Inverso conservando tiempos antiguos.
- **DEV .323**: inversos cargan Environment Studio compartiendo las colisiones del circuito físico original. No duplicar entornos.
- **DEV .324–.325**: Race Control lateral legible con nombres completos **SIN agrandar la columna ni recortar el panel principal central**. El panel central manda.
- **DEV .326**: `imageNativeRaceLoader.js` reconoce `physicalCircuitId('circuito-atlantico-inverso')` para aplicar exclusivamente la escala oficial `0.70` de Atlántico; los otros inversos ya estaban comprobados por el propietario. La APK .325 da error al iniciar Atlántico Inverso; DEV web .326+ incluye la corrección.
- Rally actual Arafo → Los Loros y físicas **RALLY 1.0**: intocables. Futuro inverso pactado **Los Loros → Arafo**, todavía no implementado.

## 5. Trabajo pendiente y prueba de aceptación

**Próxima prioridad:** verificar el nuevo exportador real Android y asegurar que se puede conservar la partida ANTES de futuras instalaciones o pruebas de compatibilidad de firma.

1. Releer `AGENTS.md`, `PROJECT_HANDOFF.md`, este archivo, `android/app/build.gradle`, `.github/workflows/android-revenuecat-qa-apk.yml`. Confirmar `main`, versión DEV, Actions y estado de release QA.
2. Auditar en serio el nuevo `TdrPortableSavePlugin.java` (interfaces y compatibilidad con la versión Capacitor del proyecto, método `@ActivityCallback`, registro en `MainActivity`, límites/tipos de JSON, tratamiento de cancelación y cierre del stream). **No dar por hecho que ya compila Android**.
3. No publicar en Google Play. **Solo si el propietario pide una nueva APK**, subir versión QA y compilar con workflow estable y firma comprobada; validar APK real (packageName, versionCode, SHA-256 del certificado, firma, archivo release, link directo). Nunca instalar/desinstalar a distancia ni afirmar que conserva datos sin prueba.
4. En Android con nueva APK: **crear/actualizar copia online, DESCARGAR COPIA, aceptar diálogo nativo, seleccionar carpeta Descargas, confirmar que existe JSON legible y tamaño no cero**. Cancelar una segunda descarga y comprobar mensaje; probar exportación LOCAL por separado; no pulsar RESTAURAR sobre partida actual.
5. Contrastar la revisión remota guardada y progreso local, sin suponer que la descarga equivale a recuperación completa. Más adelante validar restauración únicamente en perfil/dispositivo de prueba o tras plan de seguridad acordado.
6. En esta etapa no cambiar físicas, audio, imágenes, misiones, rankings ni sistemas de pago salvo fallo directamente implicado. **Una petición = una iteración**.

## 6. Reglas de entrega en próximo chat

- Desarrollo solo en `main`, sin ramas nuevas. Cada cambio funcional eleva la DEV y debe cerrar con GitHub Actions **Build + Deploy completed/success del SHA final**.
- No generar ni publicar APK/AAB salvo petición expresa.
- Nunca confundir `DEV 1.2.327` publicada en Pages con una `APK 1.2.327`: a esta fecha **NO existe APK .327 confirmada**.
- El error del screenshot de Android era **«Exportación JSON iniciada» sin archivo**, aunque la **copia ONLINE revisión 1 sí aparecía guardada**.
- Si el chat previo se corta o muestra «Streaming interrumpido», recuperar estado de GitHub y Actions, no reiniciar trabajo por conjeturas.

## 7. Actualización 21/10 — auditoría Android nativa y DEV 1.2.328

**Estado del código**: DEV **1.2.328**, `main`; primer SHA funcional auditado `592eeeb556256a0f2db4cf29ba170a2540fb7a18`. El commit siguiente puede cambiar documentación y verificadores sin modificar la lógica de exportación. La APK QA instalada/distribuida sigue siendo **1.2.325 / vc1000325** y no incorpora la solución nativa. No se ha autorizado ni creado un APK nuevo en esta iteración.

**Auditoría técnica y cambios mínimos:**

- `TdrPortableSavePlugin.java`: validación adicional en Android del campo numérico `format` (1 o 2) y del objeto `data` ANTES del selector del sistema. Se mantiene validación JS completa y límite de tamaño. Si falla `openOutputStream`, `write`, `flush` o `close`, el plugin informa de error, **sin eliminar automáticamente el URI elegido** (podría apuntar a un documento propio del usuario gestionado por un proveedor externo). El error advierte de revisar un posible archivo incompleto. Solo se responde `saved:true` tras cerrar el stream sin excepción. Cancelar produce `cancelled:true`; nunca restaura ni borra progreso.
- `scripts/android-portable-save-smoke.mjs`: cobertura de esas invariantes y de que existe la ejecución nativa de compilación, además de las comprobaciones anteriores (registro del plugin, SAF, interfaz online/local, cancelación y ausencia de falso éxito).
- `.github/workflows/android-portable-save-ci.yml`: workflow **compile-only**, disparado por cambios en Java/exportación/tests o manualmente; instala dependencias Capacitor 8, sincroniza con un HTML temporal mínimo (para generar los archivos Gradle/plugin no versionados), ejecuta el smoke y `./gradlew :app:compileBridgeTestDebugJavaWithJavac --stacktrace`. No ejecuta tareas `assemble`/`bundle`, no firma y no publica archivos instalables. Las primeras pruebas del nuevo CI fallaron por faltar ficheros generados de Capacitor; se corrigió la preparación del runner, **no se detectó error de compilación Java en el plugin**.

**Evidencia CI, tras corregir el runner:**

- [Compilación Capacitor/Java 39575649145](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39575649145): `completed/success` para `592eeeb5`.
- [Deploy Top Down Race 39575649155](https://github.com/almaprintes/TopdownCraftrace/actions/runs/39575649155): `build completed/success` + `deploy completed/success` para el mismo SHA; job opcional Android bridge `skipped` deliberadamente con `[pwa-only]`. Si el HEAD avanza, comprobar su ejecución de nuevo.

**Límites de lo probado:** compilación Java real y smoke estructural pasan; **NO** se ha comprobado todavía el selector SAF ni la escritura física del JSON en Android instalado. Una compilación satisfactoria no certifica descarga ni actualización de instalación. No prometer retención de datos hasta validar firma, packageName, versionCode y actualización sobre una APK anterior sin desinstalar.

**Siguiente paso solo previa orden explícita del propietario:** preparar QA con `deviceTest`, `versionCode > 1000325`, paquete rewardedtest y el certificado estable esperado `cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f`. Probar en dispositivo descargar copia **online** mediante selector Android (archivo JSON legible y no vacío), cancelar otra descarga, exportar local, y verificar que Supabase, partidas, carreras y colisiones no cambian. No pulsar «Recuperar partida» durante la prueba de exportación. No publicar Google Play; preservar Atlántico Inverso .326 y RALLY 1.0.

## 8. QA autorizada, compilada y publicada el 21/10/2026 — Android 1.2.328

**Orden explícita del propietario:** «Haz la apk para probarla». Desde `main`, sin ramas, se incrementó **solo** `deviceTest` en `android/app/build.gradle` a `versionCode 1000328` y `versionName 1.2.328-qa`; producción Play sigue 1.1.188 / vc8. La DEV web sigue 1.2.328. Commit exacto empaquetado: `7b16b7726be80b50b22ba346217f6c8c7139f54d`.

**Compilación y firma:**
- Workflow APK QA `39577128788`: `completed/success`, se ejecutaron verificadores de copia portátil, circuitos Normal/Inverso, colisiones, Race Control, Gradle Release y validación de APK mediante `aapt` + `apksigner`.
- Firma SHA-256 verificada **en APK .325 anterior y APK .328 actual**: `cd626199aa6234d9bdc3c07ca0c8686e7fb994eb8c4d5d02ade2fff1dcbeca6f`. Paquete idéntico `com.craftracestudio.topdownrace.rewardedtest`, versionCode anterior `1000325`, nuevo `1000328`. Compatibilidad por firma/versión verificada en binarios; retención de datos todavía necesita prueba instalando sobre .325 real.
- SHA-256 del nuevo APK: `85f7e2d90a19cfa176e5128771047c00f0275efff569eb8cc6782e54a9b9af53`. Prerelease: https://github.com/almaprintes/TopdownCraftrace/releases/tag/tdr-qa-1.2.328
- **Enlace directo del APK:** https://github.com/almaprintes/TopdownCraftrace/releases/download/tdr-qa-1.2.328/TDR-QA-DEV-1.2.328-REAL-ADS-SIN-MEDIR.apk
- Workflow Pages `39577128675`: Build + Deploy `completed/success` mismo SHA. No Play Store, ni nuevo AAB.

**Prueba pendiente en hardware del propietario (NO marcar resuelta la descarga):**
1. Intentar instalar .328 **encima de .325 sin desinstalar ni borrar datos**. Si pide desinstalación, no continuar.
2. Confirmar que sigue el piloto, progreso, monedas, circuitos y el estado online.
3. Ajustes → Cuenta: comprobar revisión de copia ONLINE, pulsar DESCARGAR COPIA, seleccionar carpeta con el diálogo nativo Android, aceptar, localizar `top-down-race-nube.json` en Archivos/Descargas, tamaño no cero, abrir como JSON válido. No confundir con hacer copia remota.
4. Repetir la operación y pulsar Cancelar: debe informar cancelación, sin falsos éxitos ni alterar progreso. Probar exportación LOCAL por separado desde opciones avanzadas (`top-down-race-partida.json`).
5. Probar Atlántico Inverso (antes fallaba al cargar en .325), colisiones Normal/Inverso, Race Control y RALLY 1.0 sin modificar física.
6. No usar RESTAURAR PARTIDA durante estas pruebas, no eliminar APK si los archivos no se han verificado. Anuncios reales: no generar impresiones artificiales.

**Estado final a la entrega:** binario firmado y enlace público **comprobados**; descarga de JSON en Android real **no comprobada todavía**.
