# DEV 1.1.177 — investigación del bootstrap Android

## Causa demostrada

La APK `1.1.176-rewarded-test` instalada pedía el módulo principal en `/top-down-race-2/assets/index-dlwwQfSn.js`, el CSS en `/top-down-race-2/assets/index-B4pyM-Ka.css` y el logo en `/top-down-race-2/assets/logo-DBm_5LTx.webp`. Sus entradas ZIP reales estaban en `assets/public/assets/`, sin el prefijo `top-down-race-2`. Capacitor sirve ese directorio desde `https://localhost/`. El HTML inline animaba el contador aunque no se cargase el módulo principal.

`vite.config.js:27` en el HEAD anterior elegía `/${package.name}/` cuando no se definía BASE. No se modificó ese archivo entre 1.1.174 y 1.1.176: el detonante fue el procedimiento local de empaquetado, no un cambio nuevo de esa expresión. La tarea anterior «Diagnosticar anuncios recompensados» indicó `npm run build:prod` seguido de `npx cap sync android` sin `BASE=./`, sobre `d7d56c4a334ce383718058282ccbef0f677e15b5`.

Se recuperó `/private/tmp/tdr-rewarded-8FwIOX/worktree`: HEAD d7d56c4a; únicas modificaciones rastreadas, cuatro iconos regenerados. La APK de esa carpeta tiene el mismo SHA-256 que la extraída del teléfono. No había diferencias locales del código nativo respecto de main en ese wrapper. CI sí establecía BASE=./; por ello no detectó el build local defectuoso.

## Aislamiento físico

- Se reprodujo el loading y logo roto en la APK instalada, sin borrar datos.
- Se reempaquetó esa misma APK cambiando únicamente `/top-down-race-2/` por `/` en los recursos web; DEX, manifiesto y SDK intactos. Se firmó con la misma clave de diagnóstico.
- Esa prueba pasó a la pantalla de orientación y el plugin registró `bridge_status ready=true configured=true release=true`. Esto demuestra que el módulo empezó a ejecutarse y llegó a Java; no constituye por sí solo una prueba del lobby.
- La release 1.1.177 minificada llegó al lobby físico primero sin configuración publicitaria (3.871 ms), luego configurada (3.666 ms), y con Wi-Fi desactivado (2.869 ms). Wi-Fi restaurado.
- En la ejecución configurada, WebView registró `bridge_types=object|function` y `ads_initialized=false`. No hubo excepción fatal en las capturas del proceso. Los tiempos parten del HTML, no del toque del icono.

No se atribuye el bloqueo a una excepción Java, R8, SSV, RevenueCat ni inyección de JavaScript: el experimento de rutas mantiene esos componentes. La inicialización nativa terminaba en el APK defectuoso; el módulo principal no llegaba a ejecutarse.

## Comparación con el wrapper de beta

También se inspeccionó la copia local histórica `429bdd6d` bajo el proyecto de ChatGPT, conservando sus seis commits divergentes y cambios locales. No se mezcló con main. Su manifiesto tenía `sensorLandscape`, inicialización automática AdMob desactivada, release sin minificación y configuración local. El wrapper versionado desde `5206e848` cambió esos elementos, versiones SDK, iconos y configuración. La BETA 1.1.173 instalada fue extraída: su HTML usa `./assets/index-BpZvw8qb.js`. No se reconstruyó ni se alteró beta.

El wrapper nuevo mantiene registro de plugin antes de super.onCreate; no utiliza evaluateJavascript ni loadUrl para instalar rewarded. Su espera JS tenía un límite de cinco segundos: no explica los 1500 segundos con el módulo ausente, pero se eliminó del camino crítico. La desaparición de sensorLandscape es otra diferencia demostrada y se restituye solo para Android.

## Correcciones

- Producción Vite usa base relativa por defecto; `npm run build:android` fija BASE=./, comprueba entradas, sincroniza y vuelve a comprobar.
- Gradle rechaza payloads con rutas de Pages o archivos ausentes incluso si alguien omite el script.
- Phaser arranca inmediatamente; la carga del módulo rewarded y su respuesta nativa son independientes.
- RevenueCat se configura bajo demanda al solicitar el anuncio; AdMob sigue detrás de UMP. Se retira la preparación publicitaria de onCreate y el proveedor automático de AdMob.
- Diagnóstico HTML antes de los módulos: HTML, JS principal, Phaser, recursos, datos locales y lobby. Watchdog de 30 s y errores de carga sin imprimir mensajes arbitrarios/tokens. Logcat release filtra códigos de diagnóstico.
- Se retira el antiguo fallback que ocultaba loading por la mera presencia de un canvas; solo el lobby real declara game-ready.
- Tests instrumentados comprueban ahora lobby/canvas/fin del loading además del bridge, también tras recrear Activity.
- Verificadores y DEV avanzan de 1.1.176 a 1.1.177, versionCode 7. No hay cambios de física, audio, economía, circuitos ni interfaz del lobby. Los iconos regenerados por prebuild no se incluyen en el commit.

## Race Control y rewarded

`src/game/online/raceControlOnline.js` es idéntico al baseline 56372d98; se conserva la configuración pública de 1.1.174. No se modificaron Supabase ni sus políticas. La prueba manual del propietario mostró ERROR/REINTENTAR; por tanto, conexión online Android NO VERIFICADA. Desde el Mac se ejecutó el cliente real con un usuario anónimo de diagnóstico: autenticación, upsert_my_profile y get_race_control_snapshot respondieron correctamente. Se pidió repetir en el teléfono con Wi-Fi restablecido. Los toques ADB están bloqueados por INJECT_EVENTS.

La disponibilidad production sigue dependiendo de un bridge real. `completed === true && verified === true`, idempotencia y SSV se conservan. No se añadieron mocks ni concesiones locales.

| Placement | Interacción manual completa en esta incidencia | SSV real |
|---|---|---|
| ×2 postcarrera | NO VERIFICADO | NO VERIFICADO |
| Publicar récord | NO VERIFICADO | NO VERIFICADO |
| Descargar ghost | NO VERIFICADO | NO VERIFICADO |
| Recycler exchange 2 | NO VERIFICADO | NO VERIFICADO |
| Recycler exchange 3 | NO VERIFICADO | NO VERIFICADO |
| +100 monedas / 4 h | NO VERIFICADO | NO VERIFICADO |

El teléfono rechazó el APK de instrumentación dos veces con INSTALL_FAILED_USER_RESTRICTED. No se interpreta ese bloqueo como fallo del juego ni éxito de pruebas. La presencia del bridge se comprobó mediante typeof ejecutado por la propia release dentro de su WebView y registrado en Logcat. Los seis placements no se declaran verificados por el mero hecho de figurar en código.

La APK probada es la variante deviceTest release minificada, con applicationId separado y firma de diagnóstico; no es la APK production firmada por Play ni valida una actualización de los datos de la beta. No se generó AAB ni se subió nada a Play.

## Commits posteriores a DEV 1.1.174 (antes de esta corrección)

```
5206e84866fdb10a1d486d3716b503590ce0a3ff DEV 1.1.175: version Android rewarded bridge
a55194cf5ff9cb27e43d7f003bbcabec42ea0412 CI: use hosted Android SDK for release bridge
acfd75466faac36b85f5d3b434ebec880f982685 CI: run Capacitor bridge build on Node 22
ef83ca21643a78b6b16dfcb320b0f99e0e6cdc22 Android: declare rewarded adapter API dependencies
23c0da2e18f1c217740ce9bcf604930ec325cea1 CI: enable KVM for release WebView test
dc16a26141b486b3d1159b6b01d816ce0e103333 CI: start emulator ADB from Android SDK
bf94817066b695e6882cd1163d9843e046490455 Test: inspect minified release WebView without bridge getter
686557297aa51fecf342768e2dedbb0ad35fd842 Test: avoid Kotlin runtime helpers in release probe
89b1dd211953c8c755a24da3f5924083b012071f Test: allow release WebView bootstrap on emulator
c316bf81cca50cc5cc85f94c0470613beb817a48 Fix Android rewarded bridge consent and release proof
4c13799ee03dd91579122fe8d4f197afe26bec95 Test rewarded ads safely on physical Android
8a85c5602c850b807451cd6b3a639617168a9093 Test all six rewarded placements end to end
d7d56c4a334ce383718058282ccbef0f677e15b5 Probe AdMob test device without showing an ad
```

Los commits 5206e848 y c316bf81 introducen la integración y ciclo de arranque; los intermedios ajustan dependencias, CI/emulador y pruebas release; 4c13799e/8a85c560/d7d56c4a añaden pruebas físicas y probe publicitario. Ninguno modifica las físicas ni el cliente Race Control del baseline.

## Lista completa de archivos modificados desde 56372d98 hasta d7d56c4a

```
M	.github/workflows/pages.yml
M	AGENTS.md
M	PROJECT_HANDOFF.md
A	android/.gitignore
A	android/app/.gitignore
A	android/app/build.gradle
A	android/app/capacitor.build.gradle
A	android/app/proguard-rules.pro
A	android/app/src/androidTest/java/com/craftracestudio/topdownrace/RewardedBridgeReleaseTest.kt
A	android/app/src/main/AndroidManifest.xml
A	android/app/src/main/java/com/craftracestudio/topdownrace/MainActivity.java
A	android/app/src/main/java/com/craftracestudio/topdownrace/RewardedRequestPolicy.kt
A	android/app/src/main/java/com/craftracestudio/topdownrace/TdrAdsConsentManager.kt
A	android/app/src/main/java/com/craftracestudio/topdownrace/TdrApplication.kt
A	android/app/src/main/java/com/craftracestudio/topdownrace/TdrRewardedAdsPlugin.kt
A	android/app/src/main/res/drawable-land-hdpi/splash.png
A	android/app/src/main/res/drawable-land-mdpi/splash.png
A	android/app/src/main/res/drawable-land-xhdpi/splash.png
A	android/app/src/main/res/drawable-land-xxhdpi/splash.png
A	android/app/src/main/res/drawable-land-xxxhdpi/splash.png
A	android/app/src/main/res/drawable-port-hdpi/splash.png
A	android/app/src/main/res/drawable-port-mdpi/splash.png
A	android/app/src/main/res/drawable-port-xhdpi/splash.png
A	android/app/src/main/res/drawable-port-xxhdpi/splash.png
A	android/app/src/main/res/drawable-port-xxxhdpi/splash.png
A	android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml
A	android/app/src/main/res/drawable/ic_launcher_background.xml
A	android/app/src/main/res/drawable/splash.png
A	android/app/src/main/res/layout/activity_main.xml
A	android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
A	android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
A	android/app/src/main/res/mipmap-hdpi/ic_launcher.png
A	android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png
A	android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
A	android/app/src/main/res/mipmap-mdpi/ic_launcher.png
A	android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png
A	android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
A	android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
A	android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png
A	android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
A	android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
A	android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png
A	android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
A	android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
A	android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png
A	android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
A	android/app/src/main/res/values/ic_launcher_background.xml
A	android/app/src/main/res/values/strings.xml
A	android/app/src/main/res/values/styles.xml
A	android/app/src/main/res/xml/file_paths.xml
A	android/app/src/test/java/com/craftracestudio/topdownrace/RewardedRequestPolicyTest.kt
A	android/build.gradle
A	android/capacitor.settings.gradle
A	android/gradle.properties
A	android/gradle/wrapper/gradle-wrapper.jar
A	android/gradle/wrapper/gradle-wrapper.properties
A	android/gradlew
A	android/gradlew.bat
A	android/settings.gradle
A	android/variables.gradle
A	capacitor.config.json
A	docs/continuity/2026-09-23-android-rewarded-release-bridge.md
M	index.html
M	package-lock.json
M	package.json
A	scripts/android-rewarded-bridge-smoke.mjs
M	scripts/prod-bundle-smoke.mjs
A	src/game/monetization/installNativeRewardedBridge.js
M	src/main.js
M	src/ui/settingsLegalEnhancer.js
```

## Actualización manual del 24/09

El propietario confirma que «funcionan todos ya, menos el x2 porque ni siquiera aparece el botón después de la carrera». Se ha pedido distinguir botones/accesos de anuncios completados y confirmar si la carrera se ejecutó en la app de pruebas o en Play. No se convierte ese mensaje en una verificación SSV. Se añaden diagnósticos fijos de elegibilidad/layout de x2, sin imprimir identificadores ni cambiar concesiones.

Se detectó además que el provider permitía activar el vídeo DEV mediante una preferencia persistida en release. La build de producción ahora excluye esa ruta y los tests comprueban que ni el toggle ni /dev habiliten el mock sin bridge real.
