# 28/10/2026 · Admin Hub: conversión multiformato y comparador A/B

## Alcance

- Rama de trabajo: `feat/admin-image-converter-multiformat-20261028`. No se modifica la versión publicada en Google Play ni Supabase.
- El botón del Admin Hub pasa a `CONVERTIR IMÁGENES`; se mantiene la importación dinámica de `adminImageWebpTool.js`, fuera del bundle de carreras.
- Salidas: WebP (mantiene codificador nativo más respaldo libwebp/Web Worker en Safari), PNG, JPG y `Mantener formato original`.
- `Mantener formato original` con escala 1 devuelve exactamente el fichero original (sin nueva codificación); con ampliación admite WebP, PNG y JPG. Para HEIC/AVIF ampliado se muestra un error explicativo y se pide seleccionar un formato de salida exportable en navegador.
- Escalas disponibles 1, 1.5, 2, 2.5 y 3. Se utiliza Canvas 2D con `imageSmoothingQuality='high'`; respeta proporciones, pero NO es un modelo de superresolución ni puede reconstruir detalle no presente.
- PNG sin pérdidas de codificación, JPG con fondo blanco si la fuente es transparente. Calidad 50–95 para WebP/JPG; selector desactivado para PNG.
- Conversión por lotes de hasta ocho, controles de 8192 px por lado, 16 MP en móvil / 32 MP escritorio, sin `fetch`/carga a servidores. Se siguen liberando lienzos y URLs temporales.

## Comparación visual antes / después

- Cada resultado tiene `VER ANTES / DESPUÉS`, una ventana opaca sobre el Admin Hub con las dos imágenes superpuestas y un deslizador de revelado. La mitad izquierda muestra la versión procesada y la mitad derecha el original, con etiquetas visibles.
- Botones `AJUSTAR` y `100 %`. En 100% se usa el tamaño en píxeles de la imagen de salida en CSS, con desplazamiento horizontal y vertical, sin construir un canvas gigante para comparar.
- La comparación mantiene un encuadre común aunque el usuario haya ampliado la resolución. El navegador ajusta el original al mismo encuadre de salida: esa comparación indica diferencias visuales de proceso, no la recuperación real de detalles. El peso en MB no demuestra por sí solo degradación visual.
- Solo se crea una vista previa bajo petición y se destruye al cerrar, cambiar de lote o salir del Admin Hub; se revocan las URL objeto temporales. No se decodifican de golpe ocho parejas para comparar.

## QA

- Se han comprobado las funciones de formatos, extensiones, dimensiones y la sintaxis del módulo en JavaScript, y los caminos PNG/JPG/WebP/original con un Canvas simulado.
- Smoke `scripts/admin-webp-converter-smoke.mjs` ampliado para la exportación multiformato y el comparador.
- **Pendiente validación en navegador y dispositivos reales**: deslizador, pellizco o scroll en 100%, ahorro de memoria en Safari iOS, limpieza al cerrar y exportación en navegadores reales.
