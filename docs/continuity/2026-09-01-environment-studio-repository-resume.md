# Environment Studio — reanudación desde decoración del repositorio

Fecha: 2026-09-01
Rama: develop
Versión: DEV 0.0.2

## Problema detectado

Environment Studio podía abrir un circuito real del registro del juego, pero su acción `CARGAR` solo consultaba `localStorage` mediante `tdr2:environmentBuilder:v1:<trackId>`. Si el borrador local no existía —por cambio de dispositivo, reset, limpieza de almacenamiento o porque el trabajo ya se había exportado y subido al repositorio— el editor mostraba el circuito sin decoración aunque existiera un `<trackId>.environment.json` oficial en `src/game/tracks/library/<trackId>/`.

El juego ya disponía de `src/game/tracks/environmentRegistry.js`, que indexa los archivos `environment.json` y `*.environment.json` del repositorio, pero Environment Studio no lo usaba para recuperar proyectos editables.

## Comportamiento corregido

La carga de Environment Studio sigue desde ahora esta prioridad:

1. **Borrador local**: si existe `tdr2:environmentBuilder:v1:<trackId>`, se carga primero para no perder trabajo aún no exportado.
2. **Versión del repositorio**: si no existe borrador local, se usa `createTrackEnvironment(trackId)` y se reconstruye el proyecto editable desde el JSON oficial incluido en la build.
3. **Vacío**: solo se presenta un proyecto sin decoración cuando no existe ni borrador local ni archivo de environment registrado para ese circuito.

Los mensajes de estado distinguen `CARGADO · BORRADOR LOCAL` y `CARGADO · VERSIÓN DEL REPO`.

## Consecuencia práctica

Un circuito ya decorado, exportado y añadido al repositorio puede abrirse de nuevo en Environment Studio para mover, añadir, eliminar o modificar decoración y superficies. Después se puede guardar un nuevo borrador local y volver a exportar el JSON actualizado.

## Fuente de verdad

- Runtime oficial: `src/game/tracks/environmentRegistry.js`.
- Archivos publicados: `src/game/tracks/library/<trackId>/<trackId>.environment.json` (también se admite `environment.json`).
- Borrador local del editor: `tdr2:environmentBuilder:v1:<trackId>`.

## Regla para futuras modificaciones

No volver a implementar una carga del editor que dependa únicamente de `localStorage`. El repositorio es la fuente persistente de una decoración ya publicada; `localStorage` es solo un borrador de trabajo con prioridad temporal.

## Commit

- `fb83f209a47b12cfa04601b28964446de9a8f8f8` — Environment Studio carga el environment oficial del repo cuando no existe borrador local.
