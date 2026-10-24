# DEV 1.3.24 — Conversor WEBP en Admin Hub

24 de octubre de 2026 · rama main · solo web/PWA DEV.

El propietario necesita convertir imágenes de los circuitos a WebP sin depender del Mac, con la misma lógica de calidad que el instalador Sharp. Se añade en cabecera del Admin Hub el botón **IMÁGENES → WEBP** junto a maestrías; se conserva intacta la cuadrícula de 8 acciones. Código cliente en `src/game/ui/adminImageWebpTool.js`, importado dinámicamente solo cuando se pulsa.

### Operación
- Selección local de hasta 8 PNG, JPG, WebP, AVIF/HEIC si el navegador los descodifica, en secuencia; ninguna transferencia de datos a servidor ni persistencia automática.
- Canvas a WebP con `toBlob('image/webp', calidad/100)`, calidad 50–95, default 86. Los instaladores Node siguen usando Sharp/libvips, por lo que no se garantizan ficheros idénticos ni mismo nivel de compresión.
- Mantener píxeles, escalar ×2, ×2,5 o ×3; mostrar dimensiones/bytes antes→después. En iPhone opción Guardar/Compartir por Web Share File API cuando disponible; enlace de descarga alternativo.
- Conserva transparencia. Recursos WebP generados conservan alpha con lienzo transparente.
- Protección de memoria: canvas ≤8192 píxeles por lado, ≤32 MP escritorio, ≤16 MP móvil, ≤60 MB por fichero y ≤8 fotos por lote; conversión de una en una; libera lienzos y revoca Object URLs al cerrar / salir del Admin Hub.
- No hay nuevos bucles, RAF, dependencias ni red. Sin tocar circuitos, Environment Studio, TrackStudio, Google Play o APK/AAB.
- Importante: multiplicar los píxeles antes de trazar no crea detalle real; una vez trazado, la geometría también debe coincidir. Para 7 Picos ya usamos worldScale en el instalador.

Prueba `scripts/admin-webp-converter-smoke.mjs` desde prebuild y `npm run check:admin-webp`.
