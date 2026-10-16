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

## Edición de colisiones desde DEV 1.2.217
1. Descarga el archivo íntegro `trackstudio-image-1792095082437_x2.5.tdrtrack` al dispositivo.
2. Abre **Environment Studio** en la DEV web y pulsa **📂 IMPORTAR KARTING AMÉRICAS .TDRTRACK**, debajo del panel DIBUJAR Y NAVEGAR.
3. Selecciona el archivo: la imagen 2862×3435 se carga en mosaicos de 1024px para ahorrar memoria y se guarda en IndexedDB junto a la geometría original. La foto no es un simple mapa de referencia: queda alineada 1:1 en el lienzo y el trazado procedural se oculta.
4. Coloca líneas de colisión y zonas en su propio proyecto, usando **GUARDAR**; con **EXPORTAR** se descarga `karting-americas.environment.json`.
5. El circuito aparece en el selector de **ese navegador/dispositivo** después de importarlo; la importación no crea una pista pública, no toca registros online, ni habilita el juego automáticamente.

El archivo .tdrtrack binario original todavía NO está en GitHub. La importación directa no sustituye la futura subida de su fuente definitiva al repositorio.
