# 28/10/2026 — DEV PADDOCK 1.0 (rediseño Admin Hub)

## Objetivo
Modernizar la pantalla de inicio del Admin Hub con apariencia de paddock de competición aprobada por el propietario, sin cambiar ninguna herramienta ni su lógica de juego.

## Estructura
- Cuatro tarjetas principales: TRACK STUDIO, ENVIRONMENT BUILDER, VEHICLE LAB (GarageScene modo admin), IMAGE LAB (conversor PNG/JPG/WebP y comparación).
- Tres tarjetas secundarias: DIAGNÓSTICO (el informe local existente), LABORATORIO QA y HERRAMIENTAS HEREDADAS (editor Bézier).
- Acciones QA preservadas: garaje jugador, coches DEV ON/OFF, kit de homologación, nueve insignias. El kit ahora requiere confirmación explícita antes de modificar el inventario.
- Botón SALIR siempre en cabecera.
- Fotografías oficiales ligeras del selector de circuitos y tarjeta de coche ya existentes; no se añaden descargas ni imágenes remotas. El constructor de miniaturas original genera las fotos en prebuild.
- Se retienen los métodos `_showLastRuntimeError`, `_showMasteryPreview`, `_grantHomologationKit`, `_toggleFullCarAccess` y la navegación existente, invocados desde el nuevo módulo de presentación.
- Hoja de estilos aislada con safe areas, columnas adaptativas, scroll vertical iPhone horizontal y preferencia de movimiento reducido.
- Sólo se importa bajo demanda al entrar en el Admin Hub de DEV. No cambia el bundle de carreras ni se incorpora a la build productiva por la frontera `DEV_LAZY_SCENES`.

## Verificación
- `scripts/admin-paddock-smoke.mjs` se ejecuta en `prebuild`. Verifica la existencia de las cuatro tarjetas principales, tres secundarias, 11 rutas/acciones, cambio dinámico de coches DEV y protección del kit.
- Prueba de ejecución de smoke simulada contra contenido de la rama, completada correctamente antes de integrar.
- Pendiente verificar visualmente en Safari iPhone horizontal, iMac Chrome/Safari y estado Vercel antes de considerar cerrada la tarea.

## Límites
- El rediseño no crea «último proyecto», «coche en pruebas», telemetría en vivo, guardado histórico ni herramientas de diagnóstico nuevas que no existan. Esto evita presentar datos ficticios.
- El editor Bézier permanece disponible como legado; no se borra.
- Sin cambios en Supabase, física, inventario salvo acciones explícitas del usuario, pistas, producción Android ni iOS nativo.
