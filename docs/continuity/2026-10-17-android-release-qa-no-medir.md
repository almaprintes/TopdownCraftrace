# DEV 1.2.265 — Android APK release QA sin MEDIR

Solicitud: probar rendimiento y aptitud para una futura actualización. **Sin publicación en Google Play** y manteniendo la versión pública `1.1.188 / versionCode 8`.

Workflow `.github/workflows/android-sdk-apk.yml` genera una APK autónoma, minificada, con código web de producción `tdr-prod`, igual que un candidato Play en lo que respecta a escenas/performance, **sin MEDIR ni HUD de diagnóstico**. El nuevo `scripts/android-release-candidate-smoke.mjs` comprueba que el código de diagnóstico no esté incluido ni en `dist` ni en el payload Capacitor. Ejecuta pruebas Gradle y produce el artifact `TDR-ANDROID-QA-DEV-1.2.265-SIN-MEDIR`.

**Diferencias frente a Play:** flavor `bridgeTest` utiliza package `com.craftracestudio.topdownrace.bridgetest`, **anuncios de prueba** y no usa RevenueCat real. Firma mediante certificado de CI QA, instalación paralela al juego público. No sirve para subir directamente a Google Play y no valida anuncios reales. No se han actualizado versionCode/versionName Android.

**Pendiente:** no está en GitHub el fichero binario del nuevo Karting Canarias 4096 (`src/game/tracks/library/karting-canarias-4096/source/karting-canarias-4096.tdrtrack`), por tanto en esta APK el selector conserva Canarias antiguo; no usar este build como evidencia de que se ha reemplazado correctamente.

**Probar antes de publicar:** entrada y salida de carrera, al menos Tenerife/Canarias/Américas, calidad gráfica, selector, rendimiento y temperatura tras varios minutos, final de carrera, recuperación cloud, controles y recompensa con anuncios de prueba. Otra QA separada con anuncios reales sería necesaria antes de dar por solucionadas las congelaciones por Ads. Para publicación definitiva: AAB firmado con la clave Play, versionCode>8, verificación en Play Console y aprobación del propietario.
