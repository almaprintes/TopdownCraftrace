# Player Racing History v1 — 2026-09-05

## Estado
Implementado en DEV 0.0.4w.

## Objetivo
Conservar desde 1.0 un historial deportivo local que pueda aprovecharse en una futura 1.5/2.0 sin recoger ni transmitir datos del jugador en esta fase.

## Privacidad y autoridad
- Almacenamiento únicamente local en el dispositivo.
- `remoteCollectionEnabled: false`.
- `automaticUploadEnabled: false`.
- Fuente: `local-device`.
- Autoridad: `client`.
- Verificación: `local-only`.
- Los datos históricos 1.0 no son automáticamente elegibles para leaderboards oficiales futuras.
- Una futura migración requerirá acción explícita del jugador y cambios previos en declaraciones/política de privacidad si se habilita transmisión.

## Archivo
`src/game/results/playerRacingHistory.js`

## Storage
Clave: `tdr2:playerRacingHistory:v1`

## Datos agregados
- Total de vueltas.
- Vueltas válidas.
- Vueltas marcadas para revisión local.
- Tiempo total de vueltas.
- Uso y mejores tiempos por circuito.
- Uso y mejores tiempos por coche.
- Mejores tiempos por combinación circuito+coche.
- Referencias `raceId` / `resultId` del mejor resultado.
- Versiones de físicas, circuito y balance asociadas al récord.

## Bootstrap
Al detectar por primera vez el nuevo historial, se importa de forma no destructiva lo que esté disponible en la ventana de `RaceResult v1`. El bootstrap se marca como completado y no se reconstruye después, para evitar perder estadísticas acumuladas cuando la ventana de resultados recientes rote.

## Incremental
Cada nuevo `RaceResult` terminado se agrega una sola vez mediante `resultId`. El historial agregado puede seguir creciendo aunque `RaceResult` mantenga solo una ventana limitada de resultados recientes.

## Preparación de migración futura
`createPlayerHistoryMigrationPackage()` construye un paquete local con:
- `exportSchemaVersion`.
- historial agregado.
- resultados recientes disponibles.
- `uploadEnabled: false`.
- `requiresExplicitPlayerAction: true`.

La función no realiza red, upload ni fetch. Es únicamente un contrato local para una futura versión online.

## Regla para 1.5/2.0
El historial 1.0 se podrá importar como `LEGACY HISTORY`. No se mezclará automáticamente con resultados oficiales servidor-verificados. Estadísticas acumulativas sí podrán migrarse; récords competitivos antiguos requerirán política específica de revisión/certificación.
