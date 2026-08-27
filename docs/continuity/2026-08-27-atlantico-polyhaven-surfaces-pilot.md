# CIRCUITO ATLÁNTICO — piloto Poly Haven de superficies iluminadas (2026-08-27)

## Objetivo
Validar en `track01` (CIRCUITO ATLÁNTICO) el uso real de materiales Poly Haven con normal maps e iluminación Light2D antes de extenderlo a todos los circuitos o activar 2K/4K.

## Superficies elegidas
- Asfalto: `asphalt_02`
- Tierra: `rocky_trail_02`
- Hierba: `sparse_grass`

El usuario aportó packs Blender 1K, 2K y 4K de las tres superficies. Los packs incluyen diffuse, OpenGL normal, roughness y displacement; `sparse_grass` añade mask.

## Estado runtime en main
- LOW e iOS safe mode conservan el renderer ligero anterior.
- MEDIUM/HIGH en Atlántico activan el piloto.
- `RaceWorldAlignedMaterialsScene.js` contiene la capa de asfalto Light2D enmascarada por la geometría exacta de pista y una luz grande tipo sol.
- `RaceRealSurfaceAssetsScene.js` carga para Atlántico `sparse_grass` y `rocky_trail_02` como pares diffuse + normal OpenGL 1K y pone `bgGrass`/`bgOff` en pipeline `Light2D` para que compartan la misma luz.
- El diffuse base de asfalto de Atlántico pasa a `asphalt_02` 1K.
- El resto de circuitos no cambia.

## Decisión de rendimiento
El primer A/B se hace a 1K para aislar el coste de añadir normal maps. No se activan aún roughness ni displacement. Phaser Light2D consume diffuse + normal; roughness requiere shader propio y displacement no compensa todavía para cámara cenital móvil.

## Validación en dispositivo
1. Probar CIRCUITO ATLÁNTICO en MEDIUM/HIGH.
2. Comparar visualmente con LOW.
3. Revisar relieve aparente de asfalto/tierra/hierba, escala del patrón, repetición y moaré durante el zoom dinámico.
4. Revisar HUD de rendimiento, especialmente RENDER.
5. Solo después decidir política definitiva 1K/2K/4K y si merece shader de roughness.

## Commits
- `1a85d1f091245de23c7bbf5c35d381d04e02ef09` — piloto de asfalto normal-mapped en Atlántico.
- `6c0a7fed533e11ed24b01e78a0fc66f2ad8123bc` — añade `sparse_grass` y `rocky_trail_02` normal-mapped al mismo Light2D y usa `asphalt_02` como diffuse base en Atlántico.
