# Environment Studio — importación segura a runtime

## Objetivo
Importar una decoración creada con Environment Studio sin modificar el circuito base ni su Beauty Layer.

## Regla principal
El archivo de Environment Studio se guarda junto al circuito como:

`src/game/tracks/library/<trackId>/<trackId>.environment.json`

El runtime lo descubre automáticamente mediante `environmentRegistry.js` y `RaceAuthoredEnvironmentScene.js`.

## Preflight obligatorio
Antes de publicar:

1. Verificar `version`, `trackId` y `baseTrack.id`.
2. Confirmar que `baseTrack.locked === true` cuando el circuito base no debe editarse.
3. Revisar `surfaces`:
   - `[]` = decoración pura; no modifica superficies visuales.
   - cualquier entrada = revisar expresamente antes de publicar.
4. Comprobar que cada `environment[].path` existe en `public/assets/`.
5. Comprobar que cada `linearBarriers[].path` existe en `public/assets/`.
6. No tocar `track.json`, Beauty Layer, geometría, física, checkpoints o pianos para una importación puramente decorativa.

## Runtime
`RaceAuthoredEnvironmentScene`:

- carga los assets declarados por `path`;
- respeta `x`, `y`, `rotation`, `displayWidth`, `flipX`, `flipY` y `z`;
- convierte `linearBarriers` en piezas visuales siguiendo sus puntos;
- renderiza `surfaces` solo si existen;
- sustituye el entorno legacy cuando existe un entorno authored para ese circuito.

## Atlántico — primera importación homologada

Archivo:
`src/game/tracks/library/track01/track01.environment.json`

Origen: Environment Studio v5.

Características:
- `trackId: track01`
- `baseTrack.locked: true`
- `surfaces: []`
- 18 objetos decorativos authored
- 2 barreras lineales de guardarraíl

La importación no rebakea ni modifica las superficies aprobadas de Atlántico.

## Reversión
Si una decoración causa problemas, eliminar/desactivar únicamente el archivo `<trackId>.environment.json`. El circuito base y su Beauty Layer permanecen intactos.
