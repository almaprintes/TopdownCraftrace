# Atlántico — Environment Studio runtime optimization

## Estado

**VALIDADO EN DISPOSITIVO REAL — 2026-08-28.**

Atlántico empezó funcionando muy fluido, pero tras varias vueltas el rendimiento se degradaba progresivamente hasta llegar a FPS muy bajos. El patrón observado era importante: `RENDER` permanecía bajo mientras `OTHER` acumulaba tiempos/picos muy altos. No se encontró una reconstrucción de Environment Studio por vuelta ni crecimiento del ghost por vuelta.

La corrección que el usuario confirmó posteriormente con **“Va bien”** fue mantener la decoración y reducir el coste sostenido de sus assets/runtime.

## Procedimiento aprobado para circuitos decorados

Este es el procedimiento que debe replicarse al implantar decoración de Environment Studio en otros circuitos:

1. **NO modificar el JSON de decoración para optimizar rendimiento.** Mantener coordenadas, rotaciones, escalas/display widths y composición visual aprobada.
2. **NO eliminar decoración como primera solución.** Primero optimizar sus assets runtime.
3. Conservar el asset fuente/original recuperable y usar para carrera una versión WebP de resolución razonable para el tamaño real en pantalla.
4. Como regla conservadora, dimensionar el runtime con margen aproximado de hasta ~2.5× respecto al mayor tamaño de visualización previsto, incluyendo zoom/Retina; no reducir automáticamente todo al mismo tamaño.
5. **Verificar dimensiones reales del archivo codificado**, no solo los KiB. Reducir peso sin reducir resolución no soluciona el principal coste de memoria de textura/GPU.
6. Mantener **culling por cámara** en Environment Studio. Los objetos lejanos siguen existiendo y conservan su posición, pero no se renderizan hasta acercarse a la cámara. El culling es complementario a la optimización del asset, no un sustituto.
7. Tras implantar/optimizar un circuito, probar en dispositivo real una sesión larga (idealmente 7–10 vueltas) y comparar FPS iniciales con FPS tardíos. Una pista que va bien en la primera vuelta pero se degrada progresivamente NO se considera validada.
8. Si persiste degradación con `RENDER` bajo y grandes picos en `OTHER`, investigar carga sostenida, memoria/GC y posible thermal throttling antes de culpar a la geometría o retirar decoración.

## Atlántico — assets runtime validados

| Asset | Runtime actual | Resolución runtime |
|---|---:|---:|
| `public/assets/environment/vegetation/palm_tall_01.webp` | 73.5 KiB | 512×512 |
| `public/assets/environment/tree_deciduous_01.webp` | 111.6 KiB | 253×258 |
| `public/assets/environment/vegetation/tree_broad_02.webp` | 118.4 KiB | 512×473 |
| `public/assets/environment/barriers/tire_stack_compact_01.webp` | 17.9 KiB | 384×256 |
| `public/assets/environment/structures/grandstand_half_01.webp` | 161.7 KiB | 1024×683 |
| `public/assets/environment/props/direction_sign_01.webp` | 16.6 KiB | 512×341 |
| `public/assets/environment/props/light_post_short_01.webp` | 17.9 KiB | 384×576 |
| `public/assets/environment/barriers/guardrail_straight_01.webp` | 4.1 KiB | 384×384 |

El optimizador verifica las dimensiones desde el buffer codificado antes de reemplazar cada asset runtime. Los originales siguen recuperables desde el historial de Git. Las rutas runtime, coordenadas de Environment Studio, rotaciones y display widths permanecen sin cambios.

## Referencias técnicas de esta corrección

- Culling Environment Studio: commit `8423755eff4413261a8ff772070527ab85695c7a`.
- Corrección/verificación del optimizador de dimensiones: commit `d2fa336965fadda38a2e4c6200cd5c1265279d0a`.
- Script: `scripts/optimize-atlantico-environment.mjs`.

## Regla de oro

**Para los siguientes circuitos: decorar → auditar resoluciones → crear/usar runtime optimizado → mantener culling → prueba larga en dispositivo real.**

Atlántico queda como circuito patrón para este procedimiento.