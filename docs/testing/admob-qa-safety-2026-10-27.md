# TDR · Publicidad segura en Android QA (27/10/2026)

## Incidente y alcance

El 27/10/2026 Google notificó suspensión temporal por tráfico no válido a la cuenta de editor asociada a los anuncios de TDR. Google **no proporcionó el dispositivo, fuente ni evento causante**: atribuirlo exclusivamente a las pruebas del propietario sería especulación.

Auditoría verificada en el repositorio:
- El flujo anterior de `deviceTest` usaba unidades AdMob de producción y la variable `TDR_ADMOB_TEST_DEVICE_IDS` vacía.
- La cuenta del flujo antiguo coincide con la identificada en la notificación recibida.
- No hay prueba de que esas solicitudes causasen la suspensión; sí eran un riesgo evitable.

## Política técnica aplicable desde QA 1.2.336

- `production` conserva identificadores reales, integración RevenueCat SSV y paquete original de Google Play. **No se ha subido ninguna release nueva a Google Play.**
- `deviceTest`, `bridgeTest` y `cloudTest` usan únicamente los ID de demostración oficiales de Google (app `ca-app-pub-3940256099942544~3347511713`, rewarded `ca-app-pub-3940256099942544/5224354917`), incluso en builds `release`.
- No se inyecta ningún ID o SDK key de anuncios monetizados en el flujo de compilación QA.
- El puente nativo Android rechaza cualquier intento de usar una unidad no-demo desde un sabor distinto de producción (`qa_ad_config_unsafe`).
- **Las reproducciones de demostración nunca confirman recompensas de RevenueCat.** El callback se resuelve como `completed=false, verified=false` por diseño. Esto implica que no se pueden validar end-to-end las acciones basadas en SSV desde esta APK QA; esas pruebas deben hacerse con una estrategia aislada que evite inventario real y no publique recompensas como verificadas.
- `node scripts/android-test-ads-safety-smoke.mjs` comprueba esta separación antes de compilar cada APK QA.
- APK QA `1.2.336` mantiene paquete `.rewardedtest` y firmante QA para ofrecer actualización directa a instalaciones compatibles. **No desinstalar una APK anterior sin backup verificado**. Si Android muestra incompatibilidad de firma, detenerse.

## Acción inmediata en los dispositivos

1. Dejar de solicitar anuncios desde APK QA antiguas (por ejemplo `1.2.335` «REAL-ADS»). Esas versiones no se actualizan a distancia y siguen siendo peligrosas si se siguen utilizando.
2. Instalar la nueva APK QA con demo ID **solo cuando su build y firma hayan pasado los checks**. Comprobar que el identificador de paquete sea `com.craftracestudio.topdownrace.rewardedtest` y que el APK proceda del GitHub Actions aprobado.
3. En la aplicación de Google Play, **evitar por ahora pruebas repetitivas o interacción con anuncios reales en los móviles del desarrollador**, especialmente durante la suspensión. No tocar anuncios propios.
4. En Google AdMob > Configuración > Dispositivos de prueba, registrar los dispositivos del desarrollador. Esto permite testear la app publicada con anuncios de AdMob en modo prueba; esperar confirmación de que el modo se aplica.
5. Si se añade mediación de otras redes, configurar explícitamente también su test mode: registrar un dispositivo en AdMob **no basta** para proteger automáticamente todas las redes mediadas.

## Estado de Race Control durante la suspensión

La ausencia de inventario válido puede impedir acciones que requieren una recompensa SSV. La solución QA demo-only **no** cambia el comportamiento del juego distribuido por Google Play. Cualquier modo gratuito temporal para funciones competitivas requerirá decisión de producto y pruebas antiabuso, sin falsear ingresos ni verificaciones.

Fuentes oficiales:
- https://developers.google.com/admob/android/test-ads
- https://support.google.com/admob/answer/9691433

