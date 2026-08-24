# iPhone 12 / Safari — estabilidad de memoria (2026-08-24)

## Síntomas observados

En un iPhone 12:
- entrar en Configuración puede congelar el juego;
- entrar a pista puede expulsar Safari / cerrar la pestaña;
- tras varios intentos Safari muestra: “ha generado problemas repetidamente”.

Esto es compatible con un cierre del proceso WebKit por presión de memoria, aunque Configuración debe volver a probarse tras estabilizar primero la escena de carrera.

## Hallazgo inmediato en RaceRealSurfaceAssetsScene

La escena cargaba, además de los tres materiales realmente visibles (`grass`, `off`, `asphalt`), cinco mapas PBR de asfalto que estaban declarados como referencia y NO participaban en el render activo:
- AO
- normal
- roughness
- height
- metalness

Una textura 2048×2048 descomprimida puede rondar 16 MiB en RGBA8 antes de contar copias/overhead del renderer. Mantener cinco mapas 2K inútiles residentes puede añadir del orden de decenas de MiB de presión gráfica en dispositivos iOS.

## Mitigación aplicada

Commit `fad3de2357218767b3bcc9a4442c23fd3c51b489`:
- elimina del preload de carrera todos los mapas PBR no usados;
- mantiene solo los tres mapas visuales activos: `grass`, `off`, `asphalt`;
- desactiva temporalmente el feather grass/off mientras se valida estabilidad en iPhone 12.

No se han cambiado físicas, geometría, IA, checkpoints ni clasificación de superficies.

## Protocolo de prueba

1. Cerrar por completo Safari en el iPhone 12 para liberar el proceso WebKit anterior.
2. Abrir de nuevo el juego.
3. Probar Configuración desde un arranque limpio.
4. Volver al menú y entrar a una carrera.
5. Si ya no hay expulsión, medir FPS/FMAX y recuperar después la transición grass/off con una solución de bajo coste.
6. Si Configuración sigue congelándose desde arranque limpio, auditar por separado los assets residentes de Boot/Menu (cards, tutoriales y fondos) y la lógica de SettingsScene.
