# Atlántico — Environment Studio runtime optimization

## Estado

**PENDIENTE DE DIAGNÓSTICO SOSTENIDO — 2026-08-28.**

Atlántico empieza funcionando muy fluido, pero en pruebas repetidas vuelve a degradarse a partir aproximadamente de la segunda vuelta. La optimización de assets y el culling mejoraron la carga inicial, pero NO resolvieron de forma definitiva la degradación progresiva.

La última evidencia en dispositivo real muestra que `RENDER` puede seguir bajo mientras `UPDATE` y/o `OTHER` aumentan mucho. Por tanto, no se debe seguir atribuyendo automáticamente el problema a la decoración o al render. El circuito queda oficialmente reabierto hasta identificar qué subsistema crece de coste vuelta tras vuelta.

## Procedimiento aprobado para circuitos decorados

1. **NO modificar el JSON de decoración para optimizar rendimiento.** Mantener coordenadas, rotaciones, escalas/display widths y composición visual aprobada.
2. **NO eliminar decoración como primera solución.** Primero optimizar sus assets runtime.
3. Conservar el asset fuente/original recuperable y usar para carrera una versión WebP de resolución razonable para el tamaño real en pantalla.
4. Como regla conservadora, dimensionar el runtime con margen aproximado de hasta ~2.5× respecto al mayor tamaño de visualización previsto, incluyendo zoom/Retina; no reducir automáticamente todo al mismo tamaño.
5. **Verificar dimensiones reales del archivo codificado**, no solo los KiB. Reducir peso sin reducir resolución no soluciona el principal coste de memoria de textura/GPU.
6. Mantener **culling por cámara** en Environment Studio. Los objetos lejanos siguen existiendo y conservan su posición, pero no se renderizan hasta acercarse a la cámara. El culling es complementario a la optimización del asset, no un sustituto.
7. Tras implantar/optimizar un circuito, probar en dispositivo real una sesión larga (idealmente 7–10 vueltas) y comparar FPS iniciales con FPS tardíos. Una pista que va bien en la primera vuelta pero se degrada progresivamente NO se considera validada.
8. Si persiste degradación con `RENDER` bajo, investigar lógica/update, memoria/GC, timers/listeners, telemetría/ghost, HUD, audio/haptics y thermal throttling antes de culpar a geometría o decoración.

## Diagnóstico nuevo: profiler por vuelta

Se añadió `src/game/scenes/RaceLapBreakdownProfilerScene.js` y se insertó en la cadena antes de `RaceGraphicsPresetScene`.

Solo se activa cuando `show FPS` está habilitado. No modifica física, input, IA, cronometraje ni render. Acumula durante cada vuelta:

- coste total/medio/máximo del `update`;
- llamadas y coste de progreso de vuelta/proyección;
- on-track/kerb/band/nearest;
- ghost record/play y cierre de vuelta;
- audio y hápticos;
- HUD/minimapa/standings;
- AI/CPU/partículas/cámara;
- lookahead/preset gráfico y culling de Environment Studio cuando existan.

Al cambiar de vuelta conserva un resumen de las últimas vueltas cerradas para comparar L1 → L2 → L3 y detectar qué bloque crece progresivamente. La próxima decisión de optimización debe basarse en ese panel, no en conjeturas.

## Atlántico — assets runtime ya optimizados

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

## Referencias técnicas

- Culling Environment Studio: `8423755eff4413261a8ff772070527ab85695c7a`.
- Verificación real de dimensiones runtime: `d2fa336965fadda38a2e4c6200cd5c1265279d0a`.
- Profiler por vuelta: `193279a7b4d26bf09bc36e02ae4a9904992cef3a`.
- Activación del profiler en la cadena: `b072d35da05b8ed6d4bff9cdf15684b9a826bf44`.
- Script de assets: `scripts/optimize-atlantico-environment.mjs`.

## Regla de oro

**No declarar un circuito validado por una única tanda corta.** Para rendimiento sostenido: probar varias vueltas, comparar L1 contra vueltas tardías y, si hay degradación, instrumentar antes de optimizar a ciegas.
