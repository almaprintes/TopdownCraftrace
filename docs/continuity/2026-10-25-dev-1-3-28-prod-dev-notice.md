# DEV 1.3.28 — impedir que aviso DEV bloquee Google Play (25/10/2026)

## Incidencia real
Un jugador que instaló desde Google Play encontró el diálogo «JUANFRIKAZO_DEV / VERSIÓN DE DESARROLLO» y no podía pulsar «ENTENDIDO» porque quedaba fuera de su pantalla. `src/game/scenes/BootScene.js` mostraba el modal incondicionalmente, aunque `__TDR_PROD_BUILD__` ya distinguía compilaciones.

## Correcciones
- BootScene importa `IS_PROD_BUILD` y salta directamente a `menu` para producción, sin crear aviso ni pedir consentimiento.
- El aviso de DEV conserva su función para pruebas, con contenido desplazable y botón fijo visible en tamaños reducidos.
- El plugin de producción en `vite.config.js` elimina del HTML inicial los avisos DEV en español e inglés del panel de orientación; exige encontrar ambos para evitar cambios silenciosos.
- `scripts/prod-bundle-smoke.mjs` falla si en el paquete de producción aparece cualquiera de los textos de DEV o el contenedor del modal; comprueba además HTML de orientación.
- La PWA sigue siendo DEV, meta versión 1.3.28. No cambia Supabase, rankings, progresión, gráficos, publicidad, circuitos ni Android versionCode.

## Verificación requerida
El workflow Pages `main` ejecuta `npm run build:prod` (incluye smoke) antes de construir DEV; exigir resultado verde y despliegue HEAD exacto. Antes de actualizar Google Play, construir y probar un nuevo candidato **productionRelease** firmado con la clave de subida original, comprobar arranque limpio en pantallas pequeñas/Android y confirmar Play Console. No subir el AAB de 1.2.334/vc9 por considerarlo anterior al arreglo ni publicar sin confirmación del propietario.
