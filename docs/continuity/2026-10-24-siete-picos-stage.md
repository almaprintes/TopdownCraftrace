# 7 Picos — estructura preparada para subir fuente de TrackStudio

- Carpeta `src/game/tracks/library/siete-picos/source/` lista para importar
  `7-picos.tdrtrack` con el SHA exacto del proyecto más reciente del propietario.
- Se incorporó `scripts/install-siete-picos-source.mjs` a `predev` y `prebuild`;
  antes de subir el archivo el script termina sin efectos.
- La fuente trae 26 nodos de forma, 730 puntos de línea central, foto PNG
  1448 × 1086, startLine y 2 checkpoints; no trae `finishLine` separado.
- El instalador convierte esa startLine cerrada en META única (sin `startLine`
  de rally), ordena CP en el sentido de vuelta, deriva spawn antes de META,
  preserva geometría autorada, y genera la fotografía WebP + variante iOS.
- El `siete-picos.environment.json` oficial comienza sin colisiones, Copas,
  materiales ni props; puede editarse desde Environment Studio.
- La pista queda `hiddenFromTrackSelect:true` hasta recibir colisiones y QA.
- No tocar otras pistas, sus inversiones, Google Play ni recompensas.
- Pendiente: subida del binario, compilación de Pages y apertura en el editor.