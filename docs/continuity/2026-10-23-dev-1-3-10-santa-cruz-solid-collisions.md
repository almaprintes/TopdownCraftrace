# DEV 1.3.10 — Santa Cruz: tres zonas sólidas nuevas y dos copas

Fecha: 23/10/2026 · rama main · actualización DEV PWA solamente.

## Solicitud y archivos

El propietario entregó `santa-cruz.environment(7).json` (Environment Studio v8, `trackId: santa-cruz`) y confirmó explícitamente **«He añadido colisiones»**. A diferencia de la iteración anterior limitada a las Copas, **este cambio SÍ DEBE instalar las nuevas colisiones sólidas**.

Se comparó el JSON íntegro con `src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json` y con `src/game/tracks/library/santa-cruz/santa-cruz.environment.json` oficiales de DEV 1.3.9. Los únicos campos modificados por el usuario eran `collisionZones` y `canopyZones`; el resto (incluidas las 4 barreras Bézier, meta, fotografía, propiedades, etc.) era exactamente igual. El `version:8` de exportación de Studio se conserva como `version:7` en la fuente de producción, porque así funcionan los tests existentes.

## Cambios aplicados a AMBOS archivos

Se instalaron exactamente los 3 polígonos `collisionZones` del usuario, con `solid:true`:
- `solid-zone-1792791747923-0`: 21 vértices.
- `solid-zone-1792791772437-1`: 17 vértices.
- `solid-zone-1792791799971-2`: 26 vértices.

Son **64 vértices decimales exactos**, dentro de la foto oficial Santa Cruz 3072 × 4608, validados sin autointersecciones, con área suficiente, ID único y `compileCollisionZone` compatible con runtime. SHA256 de `JSON.stringify(collisionZones)`: `b2b9185e3973a7019f702b5a2e83db5c501acc74bf4c092e9ca11185d8ab9a78`.

Se preservan las primeras 11 Copas ya integradas en 1.3.9, y se añaden las 2 que trae el nuevo JSON, sin cambiar las anteriores: `canopy-1792791821152-11` (10 puntos) y `canopy-1792791832465-12` (9 puntos). Santa Cruz ahora tiene **13 Copas / 317 vértices**, opacidad .93, misma fotografía compartida por Normal/Inverso. SHA256 `JSON.stringify(canopyZones)`: `861d24c68c83efbd29761ea099a86cc3d4ae8198db7f662e3fc88aeba2f1f448`.

**Se mantuvieron SIN ALTERAR las cuatro barreras Bézier**, nodos [24,8,11,12] (55 en total). SHA256 `JSON.stringify(collisionLines)`: `16215b6783ec5fa49be0309018200cad67f1701df775fa6b3ecd9d7c607cebd0`.

**CRÍTICO**: el instalador `scripts/install-santa-cruz-source.mjs` reconstruye el environment desde `src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json` en cada Build. Las 3 nuevas zonas y las 13 copas se han grabado tanto en el archivo de fuente COMO en `src/game/tracks/library/santa-cruz/santa-cruz.environment.json`; cualquier modificación futura debe actualizar primero la fuente.

## Verificación y aceptación

- `scripts/environment-canopy-occlusion-smoke.mjs`: tres colisiones sólidas, todas compilan; 13 Copas, normalización, hash completo de ambas series; cuatro barreras sin cambios; fuente igual a destino.
- `scripts/santa-cruz-official-source-smoke.mjs`: después de instalar la foto se comprueba que aparecen las 3 zonas reales y 13 Copas, y que el runtime compila polígonos.
- DEV visible: **1.3.10**. Sin APK/AAB, ni cambios de Play, ni récords/progresión.

Pendiente: comprobar conduciendo en Santa Cruz Normal e Inverso que las nuevas zonas sólidas bloquean correctamente, **sin obstáculos invisibles en calzada**; comprobar visualmente las dos nuevas copas y FPS de iPhone/Android. La validación automatizada no reemplaza la prueba en el juego.
