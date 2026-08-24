# iPhone 12 / Safari — estabilidad de memoria (2026-08-24)

## Síntomas observados

En un iPhone 12:
- Configuración puede congelar el juego;
- entrar al selector/carrera puede expulsar Safari / cerrar la pestaña;
- tras varios intentos Safari muestra: “ha generado problemas repetidamente”;
- el diagnóstico llegó a mostrar `TrackGarageScene` y posteriormente `escena unknown` tras un reinicio inesperado.

`unknown` no identifica por sí solo una escena culpable: significa que WebKit reinició la página cuando el diagnóstico no pudo recuperar una escena Phaser activa. Esto refuerza la hipótesis de cierre brusco del proceso / presión de memoria en lugar de un error JavaScript normal capturable.

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

Resultado: el problema global persiste.

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

### Mitigación aplicada

Commit `b8e06e38f13726d23eb680ac5832d68b0debf938`:
- miniaturas reducidas a `240×150`;
- hero reducido a `640×380`;
- limpieza explícita de las texturas canvas premium en `shutdown`.

Resultado: el fallo persiste y Configuración vuelve a poder congelarse, por lo que el problema no puede atribuirse únicamente a TrackGarage.

## Hallazgo 4 — assets globales residentes desde Boot

`BootScene` mantenía residentes desde el arranque dos grupos grandes de recursos aunque el usuario no entrara nunca en esas pantallas:
- las 16 cartas del garaje;
- las 5 imágenes PNG del tutorial de dropping.

### Mitigación aplicada

Commit `a661bbda01daf962dc50b10b762d397a0f0d6c8d`:
- Boot deja de precargar las 16 cards;
- Boot deja de precargar las 5 diapositivas del tutorial.

Commit `93fe694839f75817d0ec18f8138be1ff19305ab2`:
- las cards se cargan únicamente al entrar en Garaje.

Commit `729200c0b1da9265f6621457b7900a618b2b5412`:
- las imágenes del tutorial se cargan únicamente al abrirlo.

Commit `f7a4992175543ac67952b6f3c80f2355d604b722`:
- `game.js` usa esos loaders bajo demanda.

Resultado: el iPhone 12 sigue cerrando/reiniciando WebKit.

## Mitigación 5 — modo seguro agresivo para iPhone 12

Ante la persistencia del fallo se introduce un perfil de supervivencia específico para teléfonos iOS de clase iPhone 12 / pantalla lógica de hasta 844 px de lado largo.

Commit `a157ddb88c6582da61f00ac8e6d5a70bb6150faf`:
- resolución interna forzada a `0.72`;
- objetivo de `30 FPS`;
- antialias y antialiasGL desactivados;
- `roundPixels` activado;
- `powerPreference: low-power`;
- batch del renderer reducido para bajar picos de memoria;
- el resto de iPhone modernos conserva el perfil normal.

Commit `f051d3bee140abe853ee2692d6379ab6b4845816`:
- Boot deja de cargar globalmente `karting-tenerife-completo.png` (~3,2 MB comprimido), `asphaltOverlay` y las siete imágenes de semáforo que no deben permanecer residentes desde el arranque;
- en modo seguro iOS se omite por completo la decodificación/reproducción del MP4 de intro y se entra directamente al menú;
- en el resto de dispositivos el vídeo usa `preload=metadata` y una limpieza más estricta.

El objetivo de esta fase no es calidad máxima sino comprobar si el iPhone 12 deja de ser expulsado por WebKit. Si estabiliza, se recuperarán opciones visuales una a una hasta localizar el margen real.

## Corrección de salida — semáforo normal + cuenta atrás ligera

Al retirar los siete PNG del semáforo de `BootScene`, la carrera seguía intentando usar las claves `start_base` / `start_l1..6` sin volver a cargarlas. Resultado observado: cuadro negro / textura missing en la salida.

Commit `52e5e180164ed0d394eb96b43df17bdc4f8487fc`:
- añade `RaceAdaptiveStartScene`;
- en dispositivos normales, las siete imágenes del semáforo se cargan únicamente al entrar en carrera;
- en modo seguro, no se cargan ni decodifican esos PNG;
- el modo seguro muestra una cuenta atrás Phaser `3 → 2 → 1 → ¡YA!` de coste mínimo;
- la lógica real de salida, bloqueo del coche, cronómetro e IA sigue siendo la del RaceScene base, por lo que no cambia el gameplay.

Commit `91011fad8e9392450440552cda45f8b924f430bf`:
- `game.js` enruta la carrera a través de `RaceAdaptiveStartScene`.

Objetivo de diseño: mantener la experiencia completa de semáforo en dispositivos con margen suficiente y usar una salida textual muy ligera en perfiles de bajos recursos, sin alterar tiempos ni reglas.

## Protocolo de prueba actual

1. Cerrar Safari completamente desde multitarea.
2. Abrir el juego desde cero. En iPhone 12 debería saltarse la intro y entrar directamente al menú.
3. Entrar primero en Configuración y comprobar si ya responde al tacto.
4. Volver al menú y entrar en Circuitos.
5. Seleccionar pista y entrar a carrera.
6. En modo seguro debe verse `3 → 2 → 1 → ¡YA!`; en dispositivos normales debe volver a verse el semáforo completo.
7. Si aguanta, repetir el ciclo Configuración → Circuitos → Carrera dos veces para comprobar acumulación.

No se han cambiado físicas, geometría, IA, checkpoints ni clasificación de superficies durante este diagnóstico.
