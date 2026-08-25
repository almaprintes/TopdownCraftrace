# Orientation splash — runtime ligero, temporadas y carga futura

Fecha: 2026-08-25

## Decisión de producto

La pantalla de orientación no se considera una simple advertencia de "gira el móvil". Es la primera pieza gráfica que ve el jugador y debe conservar nivel visual alto. Se tratará como un **splash premium de orientación y branding**, reutilizable para temporadas, eventos y novedades.

## Master y runtime

- Master preservado: `assets/ui/orientation_portrait.png`.
- Peso del master actual: **2.288.993 bytes** (~2,29 MB).
- El master NO debe usarse directamente en runtime ni duplicarse dentro de `public/`.
- Runtime generado: `public/assets/ui/orientation_portrait_runtime.webp`.
- El runtime se genera automáticamente mediante `scripts/generate-orientation-runtime.mjs`.
- Parámetros iniciales: ancho máximo 1290 px, WebP calidad 84, effort 6, sin ampliar imágenes pequeñas.
- `npm run dev` y `npm run build` generan previamente el asset runtime.
- El WebP generado está ignorado por Git: es un artefacto reproducible, no una segunda fuente maestra.

## Regla de empaquetado

No volver a introducir el PNG master en `public/assets/ui/`. El master debe permanecer fuera de los assets enviados al jugador. La distribución utiliza exclusivamente el WebP runtime generado.

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

Objetivo orientativo inicial del runtime: **150–350 KB** si la calidad visual lo permite. Si una variante premium necesita algo más, se decide por inspección visual real en iPhone, no solo por el número de bytes.

## Archivos implicados

- `assets/ui/orientation_portrait.png` — master.
- `scripts/generate-orientation-runtime.mjs` — generador WebP.
- `public/assets/ui/orientation_portrait_runtime.webp` — salida generada, no versionada.
- `index.html` — referencia runtime para desarrollo/build normal.
- `.github/source-index.html` — referencia runtime usada por el workflow de preview.
- `package.json` — hooks de generación.
- `.gitignore` — exclusión del runtime generado.

## Validación pendiente

Tras el primer build exitoso del pipeline nuevo, registrar aquí las dimensiones y peso reales del WebP y comparar ahorro frente a los 2.288.993 bytes del master. Después validar visualmente en iPhone antes de congelar la calidad/escala definitivas.
