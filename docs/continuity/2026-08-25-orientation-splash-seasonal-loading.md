# Orientation splash — runtime ligero, temporadas y carga futura

Fecha: 2026-08-25

## Decisión de producto

La pantalla de orientación no se considera una simple advertencia de "gira el móvil". Es la primera pieza gráfica que ve el jugador y debe conservar nivel visual alto. Se tratará como un **splash premium de orientación y branding**, reutilizable para temporadas, eventos y novedades.

El usuario validó visualmente en iPhone la primera conversión WebP como **espectacular**. Ese nivel queda aprobado como referencia para las variantes de temporada.

## Master y runtime

- Master actual preservado: `assets/ui/orientation_portrait.png`.
- Master medido: **1024×1536 · 2.288.993 bytes** (~2,29 MB).
- El master NO debe usarse directamente en runtime ni duplicarse dentro de `public/`.
- Runtime activo estable: `public/assets/ui/orientation_active.webp`.
- Primera conversión medida en GitHub Actions: **1024×1536 · 115.160 bytes** (~112,5 KiB).
- Ahorro medido: **95,0 %**, manteniendo la resolución completa del master.
- El runtime se genera automáticamente mediante `scripts/generate-orientation-runtime.mjs`.
- Parámetros aprobados de referencia: ancho máximo 1290 px, WebP calidad 84, effort 6, sin ampliar imágenes pequeñas.
- `npm run dev` y `npm run build` generan previamente el asset runtime.
- El WebP generado está ignorado por Git: es un artefacto reproducible, no una segunda fuente maestra.

## Selector de temporada implementado

El selector ya está implementado en:

`assets/ui/orientation/manifest.json`

Campos principales:

- `active`: clave de la variante que debe mostrarse;
- `output`: ruta estable del runtime generado;
- `defaults`: calidad, ancho máximo y effort compartidos;
- `variants`: catálogo de campañas/splashes disponibles.

La variante `default` apunta al master histórico aprobado `assets/ui/orientation_portrait.png`. No se mueve ni se regenera ese binario para evitar tocar innecesariamente un asset ya validado.

Las próximas variantes deben usar esta convención:

- `assets/ui/orientation/orientation_halloween_master.png`
- `assets/ui/orientation/orientation_winter_master.png`
- `assets/ui/orientation/orientation_raven_hollow_master.png`
- etc.

Para activar una temporada basta con:

1. añadir su master;
2. añadir su entrada en `variants`;
3. cambiar `active` a la clave deseada;
4. ejecutar el build normal.

`index.html` y `.github/source-index.html` apuntan siempre a `./assets/ui/orientation_active.webp`; no hay que editarlos al cambiar de temporada.

## Regla de empaquetado

No volver a introducir masters PNG en `public/assets/ui/`. Los masters permanecen fuera de los assets enviados al jugador. La distribución utiliza exclusivamente `orientation_active.webp`.

El build anterior de validación confirmó que desaparecían del preview tanto la antigua copia hash `orientation_portrait-*.png` como `assets/ui/orientation_portrait.png`, entrando únicamente el WebP runtime.

## Campañas visuales previstas

Ejemplos:

- `default` — splash estándar;
- `raven_hollow` — off-road / Raven Hollow;
- `halloween`;
- `winter` — invierno / Navidad;
- lanzamiento de coche o circuito;
- nueva temporada;
- resumen visual de novedades.

Cada variante estacional debe mantener un master de alta calidad y producir el runtime mediante el mismo pipeline. El estándar visual aprobado es el formato vertical 1024×1536 con calidad equivalente al splash actual.

## Oportunidad de carga en segundo plano

Mientras el jugador está en portrait viendo el splash, el juego puede aprovechar ese tiempo para adelantar carga de recursos prioritarios (menú, coche activo, circuito probable, fuentes o audio). El objetivo es que el splash oculte trabajo útil y reduzca la espera percibida al girar el dispositivo.

**Estado actual:** esta estrategia de precarga en segundo plano sigue siendo evolución futura; no debe considerarse implementada hasta que exista código específico y prueba real en iPhone.

## Criterio de calidad

La optimización no debe convertir esta pantalla en una advertencia genérica o pobre. Prioridad:

1. primera impresión gráfica;
2. legibilidad instantánea;
3. posibilidad de tematización;
4. peso runtime contenido;
5. tiempo de carga corto.

El primer runtime quedó incluso por debajo del objetivo orientativo inicial de 150–350 KB. `q84` queda aprobado como referencia porque consiguió ~115 KB sin reducir resolución y fue validado visualmente en iPhone.

## Archivos implicados

- `assets/ui/orientation_portrait.png` — master histórico/default aprobado.
- `assets/ui/orientation/manifest.json` — selector de temporada y catálogo.
- `assets/ui/orientation/*_master.png` — futuros masters estacionales.
- `scripts/generate-orientation-runtime.mjs` — generador WebP guiado por manifest.
- `public/assets/ui/orientation_active.webp` — salida activa generada, no versionada.
- `index.html` — referencia estable para desarrollo/build normal.
- `.github/source-index.html` — referencia estable usada por el workflow de preview.
- `package.json` — hooks de generación.
- `.gitignore` — exclusión de runtimes generados.

## Validación histórica

Primer build WebP exitoso: run `32792745475`, job `97637523857`.

Resultado base:

- master: 1024×1536 · 2.288.993 bytes;
- runtime: 1024×1536 · 115.160 bytes;
- ahorro: 95,0 %;
- build Vite: éxito;
- validación visual en iPhone: aprobada.

Tras introducir el manifest, cada cambio de temporada debe comprobar en CI que `orientation_active.webp` se genera correctamente antes de darlo por publicado.
