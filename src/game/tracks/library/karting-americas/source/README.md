# Karting Américas — fuente Track Studio x2.5 (borrador)

**Estado: esperando el paquete binario original para habilitar la edición de colisiones.**

Esta carpeta guarda el proyecto fuente del **Karting Américas**, trazado por el propietario en Track Studio. No sustituye ningún circuito del juego, no activa rankings y no debe aparecer como pista pública mientras se trabaja con Environment Studio.

## Subir este archivo

`trackstudio-image-1792095082437_x2.5.tdrtrack`

El paquete ya se entregó en ChatGPT. Debe subirse **íntegro, sin convertirlo a JSON ni extraer la imagen**, directamente a esta misma carpeta de GitHub.

- Formato: `TDR-IMAGE-PROJECT-V1` (cabecera, JSON editable e imagen PNG)
- Resolución x2.5: **2862 × 3435 píxeles**
- 26 nodos Bézier, 730 puntos de centerline, circuito cerrado
- 2 checkpoints, meta, borde izquierdo/derecho editables
- Anchura de pista aproximada: 200 unidades
- Imagen integrada PNG: 14.286.730 bytes
- SHA-256 del paquete esperado: `dbd1f8841af860ece78be3ffa847502c03dac974c7c63190672b0bc590aa0fef`

Tras subir el paquete y verificar su SHA, el siguiente paso es registrar una pista **solo DEV / privada**, instalar la imagen 1:1 y preparar el fichero `karting-americas.environment.json` con colisiones inicialmente vacías para editarlas. No se deben generar barreras automáticamente: el propietario colocará cada colisión en Environment Studio.

**IMPORTANTE:** esta carpeta por sí sola no significa que el circuito esté ya cargado ni disponible para editar colisiones. Las pistas activas en `src/game/tracks/library/*/track.json` permanecen intactas.
