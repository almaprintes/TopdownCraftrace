# Karting Américas — circuito oficial permanente

Fuente: `trackstudio-image-1792095082437.tdrtrack` (SHA-256 `dbd1f8841af860ece78be3ffa847502c03dac974c7c63190672b0bc590aa0fef`).

Karting Américas se instala desde su paquete original al compilar con `node scripts/install-karting-americas-source.mjs`. Se genera `../track.json`, WebP optimizado `public/assets/tracks/karting-americas/karting-americas-official.webp` y seis mosaicos WebP de 1431 × 1145 para teléfonos. La geometría y la imagen son 1:1 en 2862 × 3435: 730 puntos, 27 nodos Bézier por borde, 2 checkpoints, salida y meta.

Las ocho colisiones oficiales (60 nodos) viven en `../karting-americas.environment.json`. El circuito se registra con ID `karting-americas`, es seleccionable y desbloqueado, tiene sus propias carreras y claves de tiempos/rankings. No depende de la importación local en el navegador. Environment Studio carga la versión oficial directamente.

Google Play se actualiza por separado y no se publica sin permiso expreso.
