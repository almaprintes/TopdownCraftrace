# DEV 1.2.107 — Eliminar decoración heredada en Karting Tenerife (imagen nativa)

## Error observado en iPhone (capturas 11/10/2026)
En la carrera local `karting-tenerife-studio` aparecen superpuestos a la imagen master edificios, gradas, garajes, torre, vegetación y otros objetos que el usuario no colocó en TrackStudio.

## Origen exacto
Los wrappers `RaceKartingTenerifeIdentityVegetationScene`, `RaceKartingTenerifeStructuresScene` y `RaceKartingTenerifePaddockScene` usan `id.includes('karting-tenerife')`; por tanto interpretan incorrectamente `karting-tenerife-studio` como si fuera el circuito clásico. Además el wrapper de identidad reescribía `track.id`/`track.key`/`track.meta.circuitId` con la identidad original. El ambiente genérico también tenía rutinas que reconocían esa misma cadena.

## Alcance del cambio
- Nuevo predicado `isImageNativeTrackScene(scene)`, aislado en `src/game/tracks/imageNativeTrackIdentity.js`, reconoce exactamente el slug local de TrackStudio o su metadato `localPreview` + `source`.
- En preview, se omiten los tres módulos decorativos de Karting Tenerife y se prohíbe cambiar su identidad por la oficial.
- Se omiten el generador de entorno de circuito, su callback diferido y el entorno authored para el modo de fotografía nativa.
- Al activar la imagen, limpiar por seguridad los arrays de decoración legacy si ya existían en escena.
- Los circuitos antiguos siguen usando sus rutinas normales. La imagen del usuario (1672×941), centerline, bordes, meta, checkpoints y físicas no se modifican.
- No se toca la Play Store 1.1.188 ni se genera APK; publicación PWA únicamente en `main`.

## Validación
`node scripts/karting-image-native-no-legacy-decor-smoke.mjs` comprueba el predicado, los guardas en cada módulo, la limpieza preventiva y la ausencia de renombrado. El workflow Pages exige pasar esta prueba junto al build y deploy de la misma SHA.

La prueba real en iPhone debe verificar que sólo aparece la fotografía de TrackStudio, el coche y HUD, sin props añadidos por módulos antiguos. Los objetos que estén pintados **dentro de la propia fotografía** no pueden desaparecer mediante estos guardas, pues son parte del fondo y requerirían otra edición de imagen.
