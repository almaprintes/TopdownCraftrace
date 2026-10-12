# DEV: reducción de calor y stutter en iPhone 12 (Karting Tenerife)

La fuente original Track Studio sigue siendo **3344×1882** en WebP; no se cambia el mundo, bordes Bézier, zonas sólidas, posición del coche ni sus físicas.

## Cambios
- **Menos píxeles por fotograma** en iPhones compactos (ancho mínimo de pantalla CSS ≤430): modo Alto pasa de escala 1,5 a 1,0. Esto reduce en torno a **56 %** la cantidad de píxeles del framebuffer procesados por fotograma; no implica automáticamente el mismo ahorro de energía o FPS. En Ultra permanece 1,5. iPads, Android y escritorio conservan sus escalas.
- **Rendimiento / Medio** en estos iPhones aplica ahora `fps.limit=30` real, no solo el `target=60` indicativo. El modo Alto **sigue sin limitar FPS** para mantener la máxima respuesta. Es una opción de ahorro y no una alteración del tick de física.
- El profiler de DEV antes instalaba otro `requestAnimationFrame` continuo en iOS; ahora solo se activa si el usuario marca `video.showFPS=true`. Permite medir cuando se necesita sin instrumentar todas las tandas.
- Las barreras de pluma, ya incorporadas al JSON oficial, se guardan en una **rejilla de consulta espacial**. Los coches prueban solo segmentos próximos; la resolución precisa de colisiones y las 17 zonas sólidas quedan intactas. Con un radio de coche extraordinariamente grande se vuelve automáticamente al algoritmo exhaustivo.
- No se genera SDK, IPA ni APK.

## Prueba en iPhone
1. Dejar enfriar el dispositivo y cerrar otras apps exigentes. No probar mientras está cargando.
2. Arrancar Karting Tenerife en Alto. Jugar 5 minutos y comparar **fluidez al seguir al coche** y calor en la carcasa con la DEV anterior, usando condiciones similares.
3. Si sigue calentándose, seleccionar calidad **Rendimiento** para probar la limitación de 30 FPS; esto reduce consumo pero puede hacer menos fluidas las animaciones.
4. Revisar impactos contra las **5 líneas Bézier** y **17 zonas sólidas** para asegurar que los coches no atraviesan obstáculos.
5. Para comparar numéricamente, activar voluntariamente el indicador FPS; desactivarlo en tandas ordinarias para no añadir trabajo de diagnóstico.

## Validación
`node scripts/ios-photo-thermal-budget-smoke.mjs`
Ejecutar desde el directorio del proyecto con Node 20, más las pruebas existentes y GitHub Actions Build+Deploy del HEAD exacto de main.

**Limitación:** no hay datos de instrumentación de un iPhone 12 real disponibles remotamente. Las causas y beneficios térmicos exactos deberán verificarse con pruebas sostenidas en el dispositivo.
