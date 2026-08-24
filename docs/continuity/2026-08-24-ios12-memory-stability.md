# iPhone 12 / Safari — estabilidad de memoria (2026-08-24)

## Síntomas observados

En un iPhone 12:
- inicialmente Configuración podía congelar el juego;
- entrar al selector/carrera puede expulsar Safari / cerrar la pestaña;
- tras varios intentos Safari muestra: “ha generado problemas repetidamente”.

Tras la primera mitigación, Configuración funciona correctamente pero el problema al entrar en circuitos continúa. En una de las ocasiones apareció una referencia visible a `TrackGarageScene`, por lo que la investigación se desplazó del render de carrera al selector de circuitos.

## Hallazgo 1 — RaceRealSurfaceAssetsScene

La escena cargaba, además de los tres materiales realmente visibles (`grass`, `off`, `asphalt`), cinco mapas PBR de asfalto que estaban declarados como referencia y NO participaban en el render activo:
- AO
- normal
- roughness
- height
- metalness

Una textura 2048×2048 descomprimida puede rondar 16 MiB en RGBA8 antes de contar copias/overhead del renderer. Mantener cinco mapas 2K inútiles residentes puede añadir del orden de decenas de MiB de presión gráfica en dispositivos iOS.

### Mitigación aplicada

Commit `fad3de2357218767b3bcc9a4442c23fd3c51b489`:
- elimina del preload de carrera todos los mapas PBR no usados;
- mantiene solo los tres mapas visuales activos: `grass`, `off`, `asphalt`;
- desactiva temporalmente el feather grass/off mientras se valida estabilidad en iPhone 12.

Resultado: Configuración deja de dar problemas, pero TrackGarage/carrera sigue expulsando Safari.

## Hallazgo 2 — previews oficiales embebidas

El selector cargaba un módulo con previews WEBP oficiales embebidas en base64. Se eliminó su precarga del runtime del selector en el commit `0c417493bf521a1b651accb81433641feba7db07`.

Resultado: en iPhone 12 el fallo persiste.

## Hallazgo 3 — canvases premium de TrackGarage

`TrackGarageCleanTypographyScene` genera una preview premium para cada circuito al construir la colección.

Antes del ajuste:
- miniatura por circuito: `720×620` (~1,70 MiB RGBA sin overhead);
- hero: `1440×860` (~4,72 MiB RGBA sin overhead);
- la lista crea miniaturas para todos los circuitos de una vez;
- las texturas canvas quedaban registradas en Phaser y no se retiraban explícitamente al salir de la escena.

Esto puede acumular una cantidad muy alta de memoria gráfica en WebKit aunque cada canvas solo se muestre a 84 px en la lista.

### Mitigación aplicada

Commit `b8e06e38f13726d23eb680ac5832d68b0debf938`:
- miniaturas reducidas a `240×150` (siguen teniendo casi 3× la resolución de presentación real);
- hero reducido a `640×380`;
- las texturas premium creadas por la escena quedan registradas como propiedad de TrackGarage;
- todas esas texturas se eliminan explícitamente del TextureManager en `shutdown`;
- no se altera geometría, físicas, catálogo, selección ni lógica de circuito.

La reducción aproximada por miniatura pasa de ~1,70 MiB a ~0,14 MiB RGBA, unas 12 veces menos antes de overhead.

## Protocolo de prueba actual

1. Cerrar Safari completamente desde multitarea en el iPhone 12.
2. Abrir el juego desde cero.
3. Entrar directamente en `Circuitos`.
4. Moverse por varios circuitos y cambiar selección varias veces.
5. Pulsar `SELECCIONAR` y entrar a carrera.
6. Si aguanta, salir al menú y repetir una segunda vez para verificar que el `shutdown` libera las previews.
7. Si aún cae antes de carrera, el siguiente paso será dejar de construir miniaturas de todos los circuitos y virtualizar la lista: generar solo las visibles + seleccionada.

No se han cambiado físicas, geometría, IA, checkpoints ni clasificación de superficies durante este diagnóstico.
