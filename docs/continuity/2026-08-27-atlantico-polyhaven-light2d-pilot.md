# Atlántico — piloto Poly Haven + Light2D (2026-08-27)

## Objetivo
Probar en `track01` (CIRCUITO ATLÁNTICO) un material de superficie con iluminación real basada en normal maps, sin alterar físicas, geometría ni el renderer del resto de circuitos.

## Assets elegidos por el usuario
Poly Haven CC0:
- asfalto: `asphalt_02`
- tierra: `rocky_trail_02`
- hierba: `sparse_grass`

El usuario aportó packs Blender 1K, 2K y 4K. Los packs contienen diffuse, OpenGL normal, roughness y displacement; `sparse_grass` añade mask.

## Piloto runtime
`RaceRealSurfaceAssetsScene.js` activa el piloto únicamente cuando:
- circuito = `track01`
- calidad = MEDIUM o HIGH
- iOS safe mode no está activo

Para aislar coste y resultado visual, esta primera prueba usa 1K diffuse + 1K OpenGL normal map desde el CDN de Poly Haven. Phaser 3.90 asocia el normal map con `load.image(key, [diffuse, normal])` y las superficies `grass`, `off` y `asphalt` reciben `Light2D`.

LOW queda sin cambios como referencia de rendimiento y continúa usando los fallbacks ligeros. Los demás circuitos continúan con las superficies aprobadas anteriores.

## Iluminación
- ambient: `0xb8c0c8`
- una luz cálida de gran radio, desplazada hacia arriba/izquierda de la cámara
- la luz acompaña el worldView para mantener dirección visual estable durante la carrera
- los objetos de superficie creados por culling se detectan a 5 Hz y reciben `Light2D` una sola vez

## Fuera de esta fase
Roughness y displacement NO se cargan aún. El Light2D nativo de Phaser usa iluminación difusa + normal map, no roughness PBR. Añadir roughness requiere shader propio y debe evaluarse en una segunda fase después de validar aspecto y coste del normal map.

## Criterio de validación
1. Entrar en CIRCUITO ATLÁNTICO con MEDIUM/HIGH y comprobar relieve aparente en asfalto, tierra y hierba.
2. Comparar con LOW como A/B visual y de rendimiento.
3. Vigilar zoom dinámico/moaré y `RENDER` en HUD.
4. Si el resultado convence y el coste es aceptable, versionar los assets localmente y definir la política 1K/2K/4K con profiling real antes de extender a otros circuitos.
