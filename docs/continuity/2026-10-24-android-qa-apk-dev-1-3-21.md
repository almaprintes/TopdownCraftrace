# DEV 1.3.21 — APK instalable para comparar Android con iPhone (24/10/2026)

El propietario pide expresamente una APK Android para probar el juego porque la experiencia en iPhone continúa siendo deficiente. **No solicita AAB ni publicación en Google Play.**

## Alcance fijado
- Empaquetar el HEAD de `main` que ya contiene DEV 1.3.21, métodos Palanca, Botones, Táctil, RC dos palancas, Invisible, mando, y A/B de física de salida de curva. No modificar las físicas ni los controles para fabricar esta APK.
- Utilizar flavor Android `bridgeTestRelease`, package `com.craftracestudio.topdownrace.bridgetest`, firma Android de prueba. Se instala separadamente y NO sustituye la versión oficial `com.craftracestudio.topdownrace`. No borra progreso de Play.
- Compilar el payload con `npm run build:android` (build de distribución sin diagnósticos de desarrollo expuestos) y `./gradlew :app:testBridgeTestReleaseUnitTest :app:assembleBridgeTestRelease`. Validar con `scripts/android-release-candidate-smoke.mjs`, `scripts/verify-android-launcher.mjs`, aapt badging, apksigner y comprobación ZIP.
- Publicar un GitHub Release **prerelease** con el APK de descarga directa, más copia de Actions artifact 30 días. La URL de descarga solo es válida después de que la ejecución termine correctamente y la release exista realmente.
- Identificadores de anuncio de prueba, sin inventario AdMob real; no usar para evaluar anuncios de producción.
- La APK de pruebas puede tener firmante distinto a otras builds antiguas `.bridgetest`; si Android no permite la actualización, desinstalar **solo la app de pruebas** antes de instalar, nunca la de Google Play.
- El rendimiento y sensación de conducción **no** pueden validarse en CI: compare el mismo coche, circuito y preset en Android frente a iPhone. Evitar dar por reparado iOS.

## Verificación
- Workflow nuevo `.github/workflows/android-dev-installable-apk.yml`, activado exclusivamente por su propio cambio o ejecución manual, con SHA exacto.
- APK artefacto separado y release fijo asociado a SHA; no se publica en Play ni se genera AAB.
