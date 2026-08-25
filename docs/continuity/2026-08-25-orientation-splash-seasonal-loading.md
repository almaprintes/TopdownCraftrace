# Orientation splash — runtime ligero, temporadas y carga futura

Fecha: 2026-08-25

## Decisión de producto

La pantalla de orientación no se considera una simple advertencia de "gira el móvil". Es la primera pieza gráfica que ve el jugador y debe conservar nivel visual alto. Se tratará como un **splash premium de orientación y branding**, reutilizable para temporadas, eventos y novedades.

## Master y runtime

- Master preservado: `assets/ui/orientation_portrait.png`.
- Master medido: **1024×1536 · 2.288.993 bytes** (~2,29 MB).
- El master NO debe usarse directamente en runtime ni duplicarse dentro de `public/`.
- Runtime generado: `public/assets/ui/orientation_portrait_runtime.webp`.
- Runtime medido en GitHub Actions: **1024×1536 · 115.160 bytes** (~112,5 KiB).
- Ahorro medido: **95,0 %**, manteniendo la resolución completa del master.
- El runtime se genera automáticamente mediante `scripts/generate-orientation-runtime.mjs`.
- Parámetros congelados provisionalmente: ancho máximo 1290 px, WebP calidad 84, effort 6, sin ampliar imágenes pequeñas.
- `npm run dev` y `npm run build` generan previamente el asset runtime.
- El WebP generado está ignorado por Git: es un artefacto reproducible, no una segunda fuente maestra.

## Regla de empaquetado

No volver a introducir el PNG master en `public/assets/ui/`. El master debe permanecer fuera de los assets enviados al jugador. La distribución utiliza exclusivamente el WebP runtime generado.

El build de validación confirmó además que desaparecen del preview tanto la antigua copia hash `orientation_portrait-*.png` como `assets/ui/orientation_portrait.png`, y se crea únicamente `assets/ui/orientation_portrait_runtime.webp`.

## Uso estacional futuro

La pantalla puede evolucionar a un pequeño sistema de campañas visuales. Ejemplos:

- splash estándar;
- Raven Hollow / off-road;
- Halloween;
- invierno / Navidad;
- lanzamiento de coche o circuito;
- nueva temporada;
- resumen visual de novedades.

La variante estacional debe mantener siempre una versión master de calidad y producir una versión runtime optimizada mediante el mismo pipeline.

Una futura implementación puede usar un manifest de temporada para seleccionar el splash activo sin cambiar la lógica de orientación. No está implementado todavía.

## Oportunidad de carga en segundo plano

Mientras el jugador está en portrait viendo el splash, el juego puede aprovechar ese tiempo para adelantar carga de recursos prioritarios (menú, coche activo, circuito probable, fuentes o audio). El objetivo es que el splash oculte trabajo útil y reduzca la espera percibida al girar el dispositivo.

**Estado actual:** esta estrategia de precarga en segundo plano está documentada como evolución futura; no debe considerarse implementada hasta que exista código específico y prueba real en iPhone.

## Criterio de calidad

La optimización no debe convertir esta pantalla en una advertencia genérica o pobre. Prioridad:

1. primera impresión gráfica;
2. legibilidad instantánea;
3. posibilidad de tematización;
4. peso runtime contenido;
5. tiempo de carga corto.

El primer runtime queda por debajo incluso del objetivo orientativo inicial de 150–350 KB. Se mantiene `q84` porque consigue ~115 KB sin reducir resolución. La decisión final de congelarlo depende de inspección visual real en iPhone.

## Archivos implicados

- `assets/ui/orientation_portrait.png` — master.
- `scripts/generate-orientation-runtime.mjs` — generador WebP.
- `public/assets/ui/orientation_portrait_runtime.webp` — salida generada, no versionada.
- `index.html` — referencia runtime para desarrollo/build normal.
- `.github/source-index.html` — referencia runtime usada por el workflow de preview.
- `package.json` — hooks de generación.
- `.gitignore` — exclusión del runtime generado.

## Validación

Build de preview exitoso: run `32792745475`, job `97637523857`.

Resultado:

- master: 1024×1536 · 2.288.993 bytes;
- runtime: 1024×1536 · 115.160 bytes;
- ahorro: 95,0 %;
- build Vite: éxito;
- preview: publicada con el WebP y sin las PNG runtime antiguas.

Pendiente únicamente: **validación visual en iPhone** antes de considerar congelados calidad 84 y este encuadre.
