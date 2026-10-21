# Top Down RACE — Handoff operativo · 21/10/2026 · DEV 1.2.327

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
