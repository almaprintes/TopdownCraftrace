# Circuitos — TopdownCraftrace

## Arquitectura

Los circuitos se cargan automáticamente desde:

`src/game/tracks/library/*/track.json`

mediante `trackRegistry.js` y `import.meta.glob`.

La escena de selección visible para el jugador es `TrackGarageFixedScene.js`, que actualmente expone los circuitos reales disponibles y deja que el preview se genere desde su `centerline`.

Las mejoras visuales de carrera (asfalto, líneas de arcén, pianos, vegetación, HUD, minimapa y cámara) se aplican en la cadena de `RaceScene`, por lo que un circuito nuevo basado en el mismo formato hereda automáticamente el sistema visual actual.

## Circuitos actuales

### track01

Circuito original usado durante el desarrollo visual y de rendimiento. Vuelta aproximada observada por el usuario: ~14 s.

### forest-endurance

Añadido el 08/08/2026 como circuito alternativo largo para pruebas térmicas y sesiones prolongadas.

- Nombre visible: `FOREST ENDURANCE`
- Categoría: `Rápido / técnico`
- Dificultad: `Media-Alta`
- Longitud: `Larga`
- Mundo: 7400 × 4400
- Anchura nominal: 162 px
- Centerline cerrado con variación suave de anchura
- Usa el mismo pipeline de pista, pianos, entorno, HUD, minimapa y cámara que `track01`
- Aparece en el selector de circuitos con preview generado automáticamente desde el trazado

Commits relevantes:

- `a3a24f5` — creación del circuito `forest-endurance`
- `9bc28c9` — exposición del nuevo circuito en el selector

## Regla para circuitos futuros

No copiar soluciones visuales a mano. Los circuitos nuevos deben aportar principalmente geometría y metadatos; las capas comunes de pista, pianos, vegetación, HUD y rendimiento deben seguir siendo reutilizables y coherentes entre todos los trazados.
